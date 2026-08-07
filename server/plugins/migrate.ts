import { migrate } from 'drizzle-orm/libsql/migrator'

/**
 * Applique les migrations Drizzle au démarrage du serveur (Décision #5).
 * Désactivé par défaut ; activé en conteneur via
 * NUXT_RUN_MIGRATIONS_ON_STARTUP=true. En dev on utilise `pnpm db:migrate`.
 *
 * Réutilise le migrator officiel Drizzle → même table de suivi que la CLI,
 * pas de divergence dev/prod.
 */
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  if (!config.runMigrationsOnStartup) return

  try {
    await migrate(useDrizzle(), { migrationsFolder: config.migrationsFolder })
    console.log('[migrate] migrations appliquées au démarrage')
  } catch (err) {
    console.error('[migrate] échec des migrations au démarrage', err)
    throw err
  }
})
