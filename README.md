# HomeQuest

Application familiale de quêtes/tâches gamifiées, pensée pour la **tablette
partagée du foyer** : chaque membre a un profil, on change de profil d'un tap et
on déverrouille avec un NIP.

Projet **open-source auto-hébergé** : un déploiement = un foyer. Aucun service
tiers requis — on clone, on lance, c'est en ligne.

## Décisions techniques

| # | Décision | Choix |
|---|----------|-------|
| 1 | Framework front | Vue 3 + Pinia |
| 2 | Architecture | Nuxt 4 fullstack (routes serveur Nitro) |
| 3 | Langage | TypeScript |
| 4 | Base de données | SQLite via libSQL (fichier local, driver `@libsql/client`) |
| 5 | ORM | Drizzle |
| 6 | Styling | Tailwind 4, tokens dans le thème (`@theme`) |
| 7 | Temps réel | Polling 5 s |
| 8 | Hébergement | Auto-hébergé — process Node long-running (Docker sur VPS) |
| 9 | Auth | nuxt-auth-utils + profils à NIP haché (bcrypt) |
| 10 | Traitements différés | Calcul paresseux à la lecture, aucun cron |
| 11 | Tests | Aucun en v1 (seed pré-vieilli à la place) |
| 12 | Mode de rendu | SPA (`ssr: false`) |
| — | Gestionnaire de paquets | pnpm |

> **Pourquoi pas Vercel / Neon / Clerk ?** Ces choix supposaient un hébergement
> serverless SaaS. Comme HomeQuest est auto-hébergé (un foyer par instance, faible
> surface de sécurité), on privilégie un stack **sans dépendance externe** : un
> fichier SQLite sur un volume, une auth locale par NIP, un process Node. Le driver
> libSQL garde toutefois la porte ouverte à une base distante (`libsql://…`) sans
> réécriture, si besoin un jour.

## Prérequis

- Node ≥ 20 (testé sur 24)
- pnpm ≥ 9

## Démarrage

```bash
pnpm install
cp .env.example .env      # ajuster NUXT_SESSION_PASSWORD (≥ 32 caractères)
pnpm db:migrate           # crée ./data/homequest.db et applique le schéma
pnpm db:seed              # (optionnel) profil de démo « Démo », NIP 1234
pnpm dev                  # http://localhost:3000
```

## Variables d'environnement

| Variable | Rôle | Défaut |
|----------|------|--------|
| `NUXT_DATABASE_URL` | URL libSQL de la base | `file:./data/homequest.db` |
| `NUXT_SESSION_PASSWORD` | Secret de chiffrement de session (≥ 32 car.) | — (requis) |

Générer un secret : `openssl rand -base64 32`.

## Base de données

Scripts Drizzle :

```bash
pnpm db:generate   # génère une migration à partir du schéma
pnpm db:migrate    # applique les migrations (crée le dossier ./data au besoin)
pnpm db:push       # pousse le schéma sans migration (dev rapide)
pnpm db:studio     # explorateur Drizzle
pnpm db:seed       # seed de démonstration
```

Le fichier `./data/homequest.db` (et son dossier `./data`) est ignoré par git.
Pour sauvegarder : copier ce fichier.

## Build & déploiement

```bash
pnpm build                 # sortie Nitro dans .output/
node .output/server/index.mjs
```

En production, l'application tourne comme un **process Node long-running** sur le
VPS, avec le dossier `./data` monté sur un volume persistant. Enchaîner
`pnpm db:migrate` avant de démarrer le serveur.

> Le `Dockerfile` / `docker-compose.yml` de déploiement ne sont pas encore fournis
> (prochaine étape).

## Structure

```
app/                    # front SPA (assets, app.vue) — pas encore d'écrans
server/
  database/
    schema.ts           # schéma Drizzle (SQLite)
    client.ts           # fabrique du client libSQL (partagée runtime/CLI)
    migrate.ts          # applique les migrations
    seed.ts             # seed de démonstration
    migrations/         # migrations générées
  utils/
    drizzle.ts          # useDrizzle() — client mémoïsé côté serveur
    auth.ts             # hashPin() / verifyPin() (bcrypt)
```
