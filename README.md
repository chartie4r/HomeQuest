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
| `NUXT_PUBLIC_TIMEZONE` | Fuseau du foyer (nom IANA) | `America/Montreal` (heure de l'Est) |

Générer un secret : `openssl rand -base64 32`.

### `NUXT_PUBLIC_TIMEZONE`

Un déploiement = un foyer = **un seul fuseau** : ce n'est pas un réglage par
membre. La Décision #10 (aucun cron, calcul paresseux à la lecture) fait que
« aujourd'hui » se dérive au moment de la requête — il faut donc ramener les
timestamps, stockés en UTC (`unixepoch()`), à la date locale du foyer avant de
les comparer à une cadence. Sans ça, une tâche cochée à 20 h à Montréal compte
pour le lendemain et casse les séries tous les soirs.

Valeur attendue : un nom IANA (`America/Montreal`, `Europe/Paris`…), pas une
abréviation comme `EST`.

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

En production, l'application tourne comme un **process Node long-running** (Décision
#8), avec le dossier `./data` monté sur un volume persistant.

### À faire à chaque déploiement

- [ ] `NUXT_SESSION_PASSWORD` — un secret propre à l'instance (≥ 32 caractères).
- [ ] `NUXT_PUBLIC_TIMEZONE` — **le fuseau du foyer**, en nom IANA. Par défaut
      `America/Montreal` (heure de l'Est) ; à changer si le foyer est ailleurs,
      sinon les journées et les séries seront décalées.
- [ ] `NUXT_SESSION_COOKIE_SECURE=true` si l'instance est servie en HTTPS.
- [ ] Volume persistant monté sur `./data`.

### Docker (recommandé)

```bash
export NUXT_SESSION_PASSWORD="$(openssl rand -base64 32)"
docker compose up -d --build
# → http://localhost:3000
```

Déploiement sur un VPS Hostinger en une commande (HTTP ou HTTPS auto) :
voir **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Le conteneur applique les migrations au démarrage
(`NUXT_RUN_MIGRATIONS_ON_STARTUP=true`, déjà positionné dans l'image) et persiste
la base dans le volume `homequest-data`. C'est le mode de déploiement visé sur le
VPS.

> **Layout `node_modules`** : `pnpm-workspace.yaml` fixe `nodeLinker: hoisted`.
> C'est nécessaire pour que le binaire natif de libSQL soit résolvable depuis le
> bundle Nitro au runtime.

## API d'authentification

Décision #9 — profils du foyer + NIP, session en cookie scellé (nuxt-auth-utils).

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/auth/profiles` | Liste des profils (id + nom) pour l'écran de sélection |
| `POST` | `/api/auth/profiles` | `{ name, pin }` → crée un profil (NIP à 4 chiffres) |
| `POST` | `/api/auth/login` | `{ userId, pin }` → ouvre la session |
| `POST` | `/api/auth/logout` | Ferme la session |
| `GET` | `/api/me` | Route protégée d'exemple (401 si non connecté) |

Côté client, `useUserSession()` (nuxt-auth-utils) donne l'état de session ; un
middleware global redirige vers `/login` si non connecté.

### Écrans

- `/login` — sélection du profil (grille d'avatars + « Ajouter »)
- `/login/:id` — clavier NIP du profil choisi
- `/login/new` — création d'un profil
- `/` — accueil connecté (placeholder, protégé)

## Structure

```
app/                    # front SPA
  pages/                # login (picker / NIP / création) + accueil
  components/
    PinPad.vue          # clavier NIP réutilisable
  middleware/
    auth.global.ts      # garde d'authentification
server/
  api/
    auth/               # profiles (GET/POST) / login / logout
    me.get.ts           # route protégée d'exemple
  database/
    schema.ts           # schéma Drizzle (SQLite)
    client.ts           # fabrique du client libSQL (partagée runtime/CLI)
    migrate.ts          # applique les migrations (CLI)
    seed.ts             # seed de démonstration
    migrations/         # migrations générées
  plugins/
    migrate.ts          # migrations au démarrage (conteneur)
  utils/
    drizzle.ts          # useDrizzle() — client mémoïsé côté serveur
    auth.ts             # hashPin() / verifyPin() (bcrypt)
```
