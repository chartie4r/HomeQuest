import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'
import { hashPin } from '../utils/auth'

/**
 * Seed — Décision #11 : pas de tests en v1, on s'appuie sur un jeu de données
 * « pré-vieilli » (dates dans le passé) pour valider les calculs paresseux.
 *
 * Scaffold minimal pour l'instant : crée un utilisateur de démo. À enrichir
 * quand le domaine sera modélisé.
 */
async function seed() {
  const url = process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw new Error('NUXT_DATABASE_URL manquant — voir .env.example')

  const db = drizzle(neon(url), { schema, casing: 'snake_case' })

  await db
    .insert(schema.users)
    .values({ name: 'Démo', pinHash: await hashPin('1234') })
    .onConflictDoNothing()

  console.log('✓ Seed terminé')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
