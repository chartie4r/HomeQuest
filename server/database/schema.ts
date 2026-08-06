import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

/**
 * Schéma de base — Décision #5 (Drizzle) + Décision #9 (auth via NIP haché).
 *
 * Volontairement minimal : seule la table `users` nécessaire à l'auth est
 * posée ici. Le reste du domaine sera modélisé au fil des features.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  // Décision #9 — NIP jamais stocké en clair, seulement le hash bcrypt.
  pinHash: varchar('pin_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
