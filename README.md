# HomeQuest

## Décisions techniques

| # | Décision | Choix |
|---|----------|-------|
| 1 | Framework front | Vue 3 + Pinia |
| 2 | Architecture | Nuxt 4 fullstack (routes serveur Nitro) |
| 3 | Langage | TypeScript |
| 4 | Base de données | Neon (Postgres) |
| 5 | ORM | Drizzle |
| 6 | Styling | Tailwind 4, tokens dans le thème |
| 7 | Temps réel | Polling 5 s |
| 8 | Hébergement | Vercel seul |
| 9 | Auth | nuxt-auth-utils + NIP hachés (bcrypt) |
| 10 | Traitements différés | Calcul paresseux à la lecture, aucun cron |
| 11 | Tests | Aucun en v1 (seed pré-vieilli à la place) |
| 12 | Mode de rendu | SPA (`ssr: false`) |
| — | Gestionnaire de paquets | pnpm |
