---
name: plan-ticket
description: Team-lead flow — produce a PO plan for a Linear ticket and post it for human approval.
disable-model-invocation: true
---

You are the TEAM LEAD. Ticket to plan: $ARGUMENTS (a Linear issue identifier like PIN-81).

1. Fetch the full ticket from the **linear-server** MCP: title, description, ALL comments.
   If any comment after the latest "🤖 AI Implementation Plan" comment starts with
   "CHANGES:", this is a RE-PLAN — treat that feedback as mandatory constraints.
2. Delegate to the `po` agent. Pass it the COMPLETE ticket content in the prompt
   (id, title, description, relevant comments, and any CHANGES feedback) — the po
   agent has no Linear access of its own. Ask for the 8-section plan.
3. Review the result before posting:
   - all 8 sections present, in order
   - "UX notes" starts with exactly `User-facing changes: YES` or `User-facing changes: NO`
   - acceptance criteria are numbered and independently testable
   If anything is missing or the approach contradicts the codebase, send it back to
   `po` ONCE with your specific objections; accept the second version.
4. Post TWO comments, in this order:

   a. First, the FULL plan as a comment prefixed exactly:
      "🤖 📋 **Full plan** (pipeline reference — you don't need to read this)"
      This is what the dev/ux/qa agents will consume. All 8 sections, complete.

   b. Then the APPROVAL CARD — a separate comment the human actually reads,
      prefixed exactly:
      "🤖 **AI Implementation Plan** — reply `APPROVED` to continue,
      or `CHANGES: <your feedback>` to request a revision."
      HARD LIMIT: 15 lines / ~120 words after the prefix. Phone-readable. Format:
      - **What:** one or two sentences, plain language.
      - **Key decisions:** up to 3 one-line bullets (only genuinely debatable ones).
      - **Won't do:** one line.
      - **⚠️ Needs your attention:** blockers and real questions ONLY — omit the
        section entirely if there are none. This is the most important section;
        never bury a blocker in the full plan.
      - **Size:** S/M/L · N acceptance criteria.
      No headings beyond these bolded labels, no code blocks, no criterion lists.

5. Update the ticket labels: remove `ai:planning`, add `ai:awaiting-approval`.
6. If anything fails irrecoverably: remove `ai:planning`, add `ai:failed`, and post a
   comment explaining exactly what went wrong.

Rules: you never write code in this flow. Keep the plan comment self-contained —
the human reads and approves it on a phone.
