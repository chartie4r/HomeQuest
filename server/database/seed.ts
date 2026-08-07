import { createDbClient } from './client'
import * as schema from './schema'
import { hashPin } from '../utils/auth'

/**
 * Seed — Décision #11 : pas de tests en v1, on s'appuie sur un jeu de données
 * « pré-vieilli » (dates dans le passé) pour valider les calculs paresseux.
 *
 * Scaffold minimal pour l'instant : crée un profil de démo (NIP 1234). À
 * enrichir quand le domaine sera modélisé.
 */
async function seed() {
  const url = process.env.NUXT_DATABASE_URL ?? 'file:./data/homequest.db'
  const db = createDbClient(url)

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
