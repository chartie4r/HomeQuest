// Types de session pour nuxt-auth-utils — Décision #9.
// Étend la forme de `useUserSession()` / `setUserSession()`.
declare module '#auth-utils' {
  interface User {
    id: string
    name: string
  }

  interface UserSession {
    // Champs additionnels de session (dates, rôles…) à compléter plus tard.
  }

  interface SecureSessionData {
    // Données jamais exposées au client.
  }
}

export {}
