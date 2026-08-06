# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable

# --- Build : toutes les deps + compilation Nitro ---
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# --- Deps de production seules (embarque le binaire natif libSQL linux) ---
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# --- Runtime : process Node long-running (Décision #8) ---
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_DATABASE_URL=file:/app/data/homequest.db \
    NUXT_RUN_MIGRATIONS_ON_STARTUP=true

# Bundle applicatif + node_modules prod (binaire natif) + migrations
COPY --from=build /app/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/server/database/migrations ./server/database/migrations

EXPOSE 3000
VOLUME ["/app/data"]

# Le plugin Nitro applique les migrations au démarrage (flag ci-dessus).
CMD ["node", ".output/server/index.mjs"]
