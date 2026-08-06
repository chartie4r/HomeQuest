import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../database/schema'

// Ré-exports pratiques pour les helpers de requête (auto-importés côté serveur).
export { sql, eq, and, or, desc, asc } from 'drizzle-orm'

export const tables = schema

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

/**
 * Client Drizzle sur Neon (HTTP serverless) — Décisions #4 et #5.
 * Instancié paresseusement puis mémoïsé pour la durée de vie du worker.
 */
export function useDrizzle() {
  if (!_db) {
    const url = useRuntimeConfig().databaseUrl
    if (!url) {
      throw createError({
        statusCode: 500,
        statusMessage: 'NUXT_DATABASE_URL manquant — voir .env.example',
      })
    }
    _db = drizzle(neon(url), { schema, casing: 'snake_case' })
  }
  return _db
}
