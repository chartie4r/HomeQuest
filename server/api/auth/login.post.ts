/**
 * Connexion : sélection d'un profil + NIP — Décision #9.
 * Vérifie le NIP contre le hash bcrypt puis ouvre une session en cookie scellé.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ userId?: string; pin?: string }>(event)
  const userId = body?.userId?.trim()
  const pin = body?.pin?.trim()

  if (!userId || !pin) {
    throw createError({ statusCode: 400, statusMessage: 'userId et pin requis' })
  }

  const db = useDrizzle()
  const user = await db.query.users.findFirst({
    where: eq(tables.users.id, userId),
  })

  // Message identique profil-inexistant / NIP-faux : pas d'énumération.
  if (!user || !(await verifyPin(pin, user.pinHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Profil ou NIP invalide' })
  }

  await setUserSession(event, { user: { id: user.id, name: user.name } })
  return { id: user.id, name: user.name }
})
