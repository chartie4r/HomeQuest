/**
 * Route protégée d'exemple : renvoie l'utilisateur de la session courante,
 * ou 401 si non connecté. Sert de patron pour protéger les futures routes.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return user
})
