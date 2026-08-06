import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-05',

  // Décision #12 — rendu SPA (pas de SSR)
  ssr: false,

  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    'nuxt-auth-utils',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      // Décision #6 — Tailwind 4 (plugin Vite officiel)
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    // Surchargé par NUXT_DATABASE_URL — Décision #4 (Neon)
    databaseUrl: '',
    public: {
      // Décision #7 — polling temps réel (ms)
      pollingInterval: 5000,
    },
  },

  future: {
    compatibilityVersion: 4,
  },
})
