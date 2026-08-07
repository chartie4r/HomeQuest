/**
 * Création d'un profil du foyer — Décision #9.
 *
 * Modèle de confiance familial (appareil partagé) : la création est ouverte,
 * pas d'authentification préalable requise. Le NIP est immédiatement haché.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: unknown; pin?: unknown }>(event)

  const name = normalizeName(body?.name)
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nom invalide (1 à 80 caractères)' })
  }
  if (!isValidPin(body?.pin)) {
    throw createError({ statusCode: 400, statusMessage: 'Le NIP doit contenir 4 chiffres' })
  }

  const db = useDrizzle()
  const [user] = await db
    .insert(tables.users)
    .values({ name, pinHash: await hashPin(body.pin as string) })
    .returning({ id: tables.users.id, name: tables.users.name })

  setResponseStatus(event, 201)
  return user
})
