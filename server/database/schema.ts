import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { todayInHouseholdTz } from '../utils/date'

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

/**
 * `routines` / `tasks` — modèle de données de la définition d'une tâche.
 * Voir docs/modele-definition.md §2.1/§2.2 (PIN-210) : ce bloc en est la
 * traduction littérale, colonne pour colonne.
 */
export const routines = sqliteTable(
  'routines',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // « Avant l'école », « Le matin ». Porte AUSSI le moment de la journée :
    // il n'existe aucune colonne timeOfDay (PIN-214).
    title: text('title').notNull(),

    // Seul et unique porteur du ciblage (PIN-216).
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Cadence. La tâche n'en porte aucune ; elle hérite (PIN-215).
    recurrence: text('recurrence', {
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    })
      .notNull()
      .default('daily'),

    // Date civile 'YYYY-MM-DD'. Phase de la règle ET premier jour d'existence.
    // Défaut applicatif : le jour courant DANS LE FUSEAU DU FOYER — surtout pas
    // sql`(date('now'))`, qui rend la date UTC et décalerait d'un jour toute
    // routine créée en soirée (PIN-215).
    anchorDate: text('anchor_date')
      .notNull()
      .$defaultFn(() => todayInHouseholdTz()),

    // Active ⇔ NULL. Pas de booléen : le timestamp sait dire ce qui était actif
    // à une date passée (PIN-213).
    archivedAt: integer('archived_at', { mode: 'timestamp' }),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('routines_owner_id_idx').on(t.ownerId)],
)

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    title: text('title').notNull(),

    // Lue en direct par l'écran de détail. Nullable : la plupart des tâches de
    // routine (« Faire son lit ») n'en ont pas.
    description: text('description'),

    // LE DISCRIMINANT (PIN-211).
    //   renseigné → tâche de routine : non réclamable, absente du tableau ;
    //   vide      → tâche du tableau : réclamable, ouverte à tous.
    // Aucune colonne `type` : les deux filtres du tableau s'en dérivent.
    routineId: text('routine_id').references(() => routines.id, {
      onDelete: 'restrict',
    }),

    // Ordre des tâches DANS une routine. Entiers denses (0,1,2), réécrits en bloc
    // au réordonnancement. Pas d'unicité sur (routine_id, position) : SQLite n'a
    // pas d'unique différé, la contrainte exploserait en pleine réécriture.
    // Sans signification pour une tâche du tableau (PIN-212).
    position: integer('position').notNull().default(0),

    // Récompense. Deux valeurs INDÉPENDANTES — ni l'une ni l'autre n'est dérivée.
    // notNull SANS défaut : une tâche qui ne paie rien est une erreur de saisie,
    // pas un cas par défaut. Un formulaire ou un seed qui oublie le champ doit
    // échouer bruyamment plutôt que créer une tâche à 0.
    xp: integer('xp').notNull(),
    points: integer('points').notNull(),

    // Tableau de chaînes. L'ordre est l'ordre du tableau : aucune colonne de
    // position, aucune identité par étape — les coches sont éphémères (PIN-212).
    // .default(sql`'[]'`) et non .default([]) : la forme SQL brute est sans
    // ambiguïté sur une colonne text({ mode: 'json' }).
    steps: text('steps', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    // Minutes entières, purement informatif. Nullable : les tâches de routine
    // n'en portent pas dans le design. Aucune contrainte « multiple de 5 ».
    // NE PAS INDEXER — rien ne trie, ne filtre ni n'agrège dessus (PIN-214).
    estimatedMinutes: integer('estimated_minutes'),

    // Booléen d'ÉPUISEMENT, pas une cadence (PIN-215).
    //   false (défaut) → offre permanente, réclamable autant de fois qu'elle se présente
    //   true           → une fois faite, la définition quitte le tableau pour de bon
    // ⚠️ N'a de sens que si routineId est vide. Pour une tâche de routine, elle est
    // IGNORÉE : la vie de la tâche est réglée par sa routine. État représentable-
    // mais-vide-de-sens assumé, au même grain que le reste du discriminant.
    oneTime: integer('one_time', { mode: 'boolean' })
      .notNull()
      .default(false),

    archivedAt: integer('archived_at', { mode: 'timestamp' }),

    // Seule source de la ligne de fil « Mylène a ajouté "Arroser les plantes" au
    // tableau ». notNull : le seed pré-vieilli attribue ses définitions à un adulte
    // comme n'importe quelle création, donc pas de branche « si nul » à l'affichage.
    // Conséquence assumée : empêchera de retirer un membre ayant créé une tâche.
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('tasks_routine_id_idx').on(t.routineId)],
)

export type Routine = typeof routines.$inferSelect
export type NewRoutine = typeof routines.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
