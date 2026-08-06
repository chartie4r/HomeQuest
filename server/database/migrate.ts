import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDbClient } from './client'

/**
 * Applique les migrations Drizzle — commande de déploiement (Décision #5).
 * Utilise notre client libSQL (qui crée le dossier de base au besoin) plutôt
 * que la connexion interne de drizzle-kit.
 */
const url = process.env.NUXT_DATABASE_URL ?? 'file:./data/homequest.db'
const db = createDbClient(url)

await migrate(db, { migrationsFolder: './server/database/migrations' })
console.log('✓ Migrations appliquées')
