import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Schéma de base — Décision #5 (Drizzle) sur SQLite/libSQL (Décision #4)
 * + Décision #9 (auth locale par NIP haché).
 *
 * Volontairement minimal : seule la table `users` nécessaire à l'auth est
 * posée ici. Un déploiement = un foyer, donc pas de notion de tenant.
 */
export const users = sqliteTable('users', {
  // SQLite n'a pas de type uuid natif : id texte + UUID généré applicativement.
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  // Décision #9 — NIP jamais stocké en clair, seulement le hash bcrypt.
  pinHash: text('pin_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
