import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

/**
 * Fabrique le client Drizzle/libSQL — partagé entre le runtime Nitro
 * (`useDrizzle()`) et les scripts CLI (seed, migrate).
 *
 * Volontairement sans dépendance à Nitro (pas de `useRuntimeConfig`) pour
 * rester utilisable depuis un simple `tsx`.
 */
export function createDbClient(url: string) {
  // libSQL n'ouvre pas un fichier dont le dossier parent n'existe pas
  // (→ SQLITE_CANTOPEN). On crée le dossier au besoin pour une base fichier.
  if (url.startsWith('file:')) {
    const dir = dirname(url.slice('file:'.length))
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  return drizzle(createClient({ url }), { schema, casing: 'snake_case' })
}
