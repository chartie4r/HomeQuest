import bcrypt from 'bcryptjs'

// Décision #9 — NIP haché (bcrypt). Coût 10 : suffisant pour un NIP court.
const SALT_ROUNDS = 10

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS)
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}
