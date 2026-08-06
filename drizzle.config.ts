import { defineConfig } from 'drizzle-kit'

// Décision #5 — Drizzle / Décision #4 — SQLite via libSQL
export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL ?? 'file:./data/homequest.db',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
})
