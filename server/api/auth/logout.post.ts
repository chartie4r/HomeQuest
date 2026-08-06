/**
 * Déconnexion : efface la session courante — Décision #9.
 */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
