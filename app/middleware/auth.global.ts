/**
 * Garde d'authentification globale — Décision #9.
 * Redirige vers /login si non connecté, et hors de /login si déjà connecté.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession()

  // En SPA, l'état de session peut ne pas être encore chargé : on le rafraîchit
  // tant qu'on se croit déconnecté (couvre le 1er rendu et l'après-logout).
  if (!loggedIn.value) await fetch()

  const onLoginRoute = to.path === '/login' || to.path.startsWith('/login/')

  if (!loggedIn.value && !onLoginRoute) {
    return navigateTo('/login')
  }
  if (loggedIn.value && onLoginRoute) {
    return navigateTo('/')
  }
})
