import { createDbClient } from '../database/client'
import * as schema from '../database/schema'

// Ré-exports pratiques pour les helpers de requête (auto-importés côté serveur).
export { sql, eq, and, or, desc, asc } from 'drizzle-orm'

export const tables = schema

let _db: ReturnType<typeof createDbClient> | null = null

/**
 * Client Drizzle sur SQLite via libSQL — Décisions #4 et #5.
 *
 * En self-host : `file:./data/homequest.db` (zéro dépendance externe).
 * Le même driver accepte une URL `libsql://…` si un jour on veut une base
 * distante, sans réécrire cette couche.
 *
 * Instancié paresseusement puis mémoïsé pour la durée de vie du process.
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
    _db = createDbClient(url)
  }
  return _db
}
