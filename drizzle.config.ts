import { defineConfig } from 'drizzle-kit'

// Décision #5 — Drizzle / Décision #4 — Neon (Postgres)
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
})
