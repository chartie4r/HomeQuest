// Normalisation des étapes à l'écriture — PIN-210 §5.3.
//
// SQLite ne contraint rien dans une colonne JSON : sans ce garde-fou,
// `$type<string[]>()` ne serait qu'un mensonge poli de TypeScript.
const MAX_STEPS = 10
const MAX_STEP_LENGTH = 120

/**
 * Trim chaque ligne, retire les vides, refuse au-delà de 10 étapes et de
 * 120 caractères par libellé. Échoue bruyamment plutôt que de tronquer
 * silencieusement — même style que `xp`/`points`, `notNull` sans défaut.
 */
export function normalizeSteps(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error('normalizeSteps: la valeur fournie n\'est pas un tableau')
  }

  const steps = input
    .map((step) => (typeof step === 'string' ? step.trim() : ''))
    .filter((step) => step.length > 0)

  if (steps.length > MAX_STEPS) {
    throw new Error(`normalizeSteps: maximum ${MAX_STEPS} étapes, ${steps.length} fournies`)
  }

  const tooLong = steps.find((step) => step.length > MAX_STEP_LENGTH)
  if (tooLong) {
    throw new Error(`normalizeSteps: étape de plus de ${MAX_STEP_LENGTH} caractères ("${tooLong.slice(0, 40)}…")`)
  }

  return steps
}
