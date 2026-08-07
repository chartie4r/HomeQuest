import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-08-05',

  // Décision #12 — rendu SPA (pas de SSR)
  ssr: false,

  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    // Décision #9 — auth locale : profils + NIP haché (bcrypt), session en cookie scellé.
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
    // Décision #4 — SQLite (libSQL). Surchargé par NUXT_DATABASE_URL.
    // En self-host : fichier local. Pour une éventuelle instance distante : URL libsql://.
    databaseUrl: 'file:./data/homequest.db',
    // Migrations appliquées au démarrage du serveur (activé en conteneur via
    // NUXT_RUN_MIGRATIONS_ON_STARTUP=true). En dev on lance `pnpm db:migrate`.
    runMigrationsOnStartup: false,
    migrationsFolder: './server/database/migrations',
    // nuxt-auth-utils — cookie de session (Décision #9).
    // secure=false par défaut pour autoriser l'accès en HTTP (LAN / IP:3000).
    // Derrière HTTPS (prod Caddy) : NUXT_SESSION_COOKIE_SECURE=true.
    session: {
      cookie: {
        secure: false,
      },
    },
    public: {
      // Décision #7 — polling temps réel (ms)
      pollingInterval: 5000,
      // Fuseau du foyer (nom IANA). Un déploiement = un foyer = un seul fuseau.
      // Décision #10 (aucun cron) : « aujourd'hui » se dérive à la lecture, donc
      // les timestamps UTC doivent être ramenés à la date locale du foyer avant
      // d'être comparés à une cadence. Surchargé par NUXT_PUBLIC_TIMEZONE.
      timezone: 'America/Montreal',
    },
  },

  future: {
    compatibilityVersion: 4,
  },
})
