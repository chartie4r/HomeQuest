/**
 * Liste des profils du foyer pour l'écran de sélection — Décision #9.
 * N'expose que id + nom (jamais le hash du NIP).
 */
export default defineEventHandler(async () => {
  const db = useDrizzle()
  return db
    .select({ id: tables.users.id, name: tables.users.name })
    .from(tables.users)
    .orderBy(asc(tables.users.name))
})
