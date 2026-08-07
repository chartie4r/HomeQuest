// Date civile du foyer — PIN-210 §5.1.
//
// Volontairement lu depuis `process.env` plutôt que `useRuntimeConfig()` :
// cette fonction est appelée par `schema.ts` (défaut de `routines.anchor_date`),
// que `server/database/client.ts` importe et que les scripts `tsx` (migrate,
// seed) chargent hors du runtime Nitro — `useRuntimeConfig` (alias `#imports`)
// n'y résout pas. Même variable d'override que `nuxt.config.ts`
// (`public.timezone`, surchargeable par `NUXT_PUBLIC_TIMEZONE`), même défaut.
const DEFAULT_TIMEZONE = 'America/Montreal'

/**
 * La date civile du jour, dans le fuseau du foyer, au format 'YYYY-MM-DD'.
 *
 * Ne jamais dériver cette date d'UTC directement (ex. `sql`(date('now'))``) :
 * ça décalerait d'un jour toute routine créée en soirée (PIN-215).
 */
export function todayInHouseholdTz(): string {
  const timezone = process.env.NUXT_PUBLIC_TIMEZONE ?? DEFAULT_TIMEZONE
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // Locale 'en-CA' formate déjà en 'YYYY-MM-DD'.
  return formatter.format(new Date())
}
