export const meta = {
  name: 'execute-ticket',
  description: 'Implement an approved Linear ticket: dev → QA + security → fix loop → PR + Linear update',
  phases: [
    { title: 'Prepare',   detail: 'fetch ticket + approved plan + approved UX spec, create branch' },
    { title: 'Implement', detail: 'dev agent applies the plan' },
    { title: 'Verify',    detail: 'QA + security in parallel, max 3 fix cycles' },
    { title: 'Deliver',   detail: 'PR + Linear comment/status, or failure report' },
  ],
}

const ticket = typeof args === 'string' ? args.trim() : args?.ticket
if (!ticket) throw new Error('No ticket id passed as args')

// ---- Phase 1: gather context + create branch -------------------------------
phase('Prepare')
const prep = await agent(
  `Fetch Linear issue ${ticket} via the linear-server MCP. Find (a) the latest "🤖 📋 Full plan" ` +
  `comment (the complete plan; older tickets may have it inside the "🤖 AI Implementation Plan" ` +
  `comment instead — use whichever is fullest) plus the human reply starting with APPROVED on ` +
  `the approval-card comment, and (b) likewise the latest "🎨 📋 Full UX spec" comment (or legacy ` +
  `"🎨 AI UX Spec") and ITS human APPROVED reply, if the UX stage wasn't skipped. Treat any extra ` +
  `remarks in the approval replies as mandatory addendums. Then create the work branch following the ` +
  `MANDATORY naming convention [epic]/[ticket]-name, all lowercase kebab-case: ` +
  `first segment = the parent (epic) issue's identifier + slugified title, ` +
  `second segment = this ticket's identifier + slugified title. ` +
  `Example: epic PIN-1 "Dashboard", ticket PIN-2 "Section XYZ" → pin-1-dashboard/pin-2-section-xyz. ` +
  `Fetch the parent issue from Linear to build the epic segment; if the ticket has NO parent ` +
  `epic, use the ticket segment alone. IGNORE Linear's suggested gitBranchName field — the ` +
  `convention above is the only source of truth. ` +
  `Commands: git fetch origin && git checkout main && git pull, then if the branch already ` +
  `exists locally (leftover from an aborted run) delete it with git branch -D <branch>, ` +
  `then git checkout -b <branch>. Retries must always start from a clean branch off main. ` +
  `Return the full plan text, the human-approved UX spec text (or empty if skipped), the ` +
  `combined approval remarks, and the branch name.`,
  { schema: { type: 'object', required: ['plan', 'branch'], properties: {
      plan: { type: 'string' }, uxSpec: { type: 'string' },
      approvalRemarks: { type: 'string' }, branch: { type: 'string' } } } }
)

// ---- Phase 2: implementation ------------------------------------------------
phase('Implement')
let devReport = await agent(
  `Implement this APPROVED plan on branch ${prep.branch}.\n\nPLAN:\n${prep.plan}` +
  `\n\nAPPROVAL REMARKS:\n${prep.approvalRemarks || 'none'}` +
  `\n\nHUMAN-APPROVED UX SPEC (follow it verbatim):\n${prep.uxSpec || 'No user-facing changes.'}`,
  { agentType: 'dev' }
)

// ---- Phase 3: verify, with a HARD 3-cycle fix loop -------------------------
// A reviewer that runs out of turns before writing its VERDICT block returns
// an EMPTY string, which is not the same thing as a real FAIL/BLOCK verdict —
// treating it as one masks whatever the agent actually found and can send a
// perfectly good change down the failure path. So: on an empty return, retry
// ONCE with an explicit instruction to wrap up and verdict immediately. Only
// after that second empty return do we fall back to the hard-fail text, and
// even then the log line says TIMEOUT so a human skimming it isn't misled
// into thinking real findings caused the fail.
async function verifyOrRetry(kind, prompt, opts) {
  let result = await agent(prompt, opts)
  if (!result || !result.trim()) {
    log(`${opts.label}: returned empty (likely ran out of turns) — retrying once, told to verdict immediately`)
    result = await agent(
      prompt + `\n\nIMPORTANT: a previous attempt at this review ran out of turns before reaching a ` +
      `verdict. Skip or abbreviate expensive checks (e.g. browser/CDP screenshot verification) if ` +
      `needed, mark anything you can't verify in time as FAIL/BLOCKing-per-your-own-rules, but your ` +
      `FINAL message MUST end with a VERDICT block no matter what.`,
      opts
    )
  }
  return result
}

phase('Verify')
let qa = '', sec = '', passed = false
for (let cycle = 1; cycle <= 3; cycle++) {
  const results = await parallel([
    () => verifyOrRetry('qa', `Verify this implementation against the plan's acceptance criteria.\n\n` +
                `PLAN:\n${prep.plan}\n\nDEV REPORT:\n${devReport}`,
                { agentType: 'qa', phase: 'Verify', label: `qa:cycle${cycle}` }),
    () => verifyOrRetry('sec', `Audit the current change for security issues. Base branch: main.\n\n` +
                `DEV REPORT:\n${devReport}`,
                { agentType: 'security', phase: 'Verify', label: `sec:cycle${cycle}` }),
  ])
  const qaTimedOut = !results[0] || !results[0].trim()
  const secTimedOut = !results[1] || !results[1].trim()
  qa = qaTimedOut ? 'VERDICT: FAIL — QA agent did not return a verdict after 2 attempts (turn limit)' : results[0]
  sec = secTimedOut ? 'VERDICT: BLOCK — security agent did not return a verdict after 2 attempts (turn limit)' : results[1]
  const qaPass = qa.includes('VERDICT: PASS')
  const secPass = sec.includes('VERDICT: PASS')
  if (qaPass && secPass) { passed = true; break }
  log(`Cycle ${cycle}: QA ${qaTimedOut ? 'TIMEOUT (no verdict)' : qaPass ? 'PASS' : 'FAIL'}, ` +
      `Security ${secTimedOut ? 'TIMEOUT (no verdict)' : secPass ? 'PASS' : 'BLOCK'}`)
  if (cycle < 3) {
    devReport = await agent(
      `Fix ONLY these findings on branch ${prep.branch} — no scope creep.\n\n` +
      `QA FINDINGS:\n${qa}\n\nSECURITY FINDINGS:\n${sec}\n\nORIGINAL PLAN:\n${prep.plan}`,
      { agentType: 'dev', phase: 'Verify', label: `fix:cycle${cycle}` }
    )
  }
}

// ---- Phase 4: deliver ------------------------------------------------------
phase('Deliver')
if (passed) {
  const delivery = await agent(
    `Finalize ticket ${ticket} on branch ${prep.branch}: commit any remaining changes, push the ` +
    `branch, open a PR with gh pr create (body = plan summary + QA verdict + security verdict + ` +
    `"Closes ${ticket}"). If gh pr create fails with a server error (5xx), retry once, then try ` +
    `the REST endpoint: gh pr list / gh api may be unavailable — in that case do NOT fake success: ` +
    `post a Linear comment saying delivery is paused by a GitHub outage (include branch + commit + ` +
    `verdicts), LEAVE the ai:in-progress label in place, and stop. ` +
    `On success: on Linear (linear-server MCP) post a comment with the PR URL and a summary, move ` +
    `the issue to "In Review" (or the team's nearest equivalent, e.g. "Code Review"), remove label ` +
    `ai:in-progress, add ai:done. NEVER merge the PR, NEVER push to main. Return the PR URL.`
  )
  return { status: 'success', ticket, pr: delivery }
} else {
  await agent(
    `Ticket ${ticket} failed verification after 3 fix cycles. Push branch ${prep.branch} as-is ` +
    `for human inspection (do NOT open a PR). On Linear (linear-server MCP): remove label ` +
    `ai:in-progress, add ai:failed, and post a comment listing these unresolved findings:\n\n` +
    `QA:\n${qa}\n\nSECURITY:\n${sec}`
  )
  return { status: 'failed', ticket, qa, sec }
}
