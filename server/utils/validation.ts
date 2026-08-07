// Règles de validation partagées — Décision #9.
export const PIN_LENGTH = 4
const PIN_REGEX = /^\d{4}$/
const NAME_MAX = 80

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin)
}

export function normalizeName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > NAME_MAX) return null
  return trimmed
}
