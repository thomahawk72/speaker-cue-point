import crypto from 'node:crypto'

/**
 * Konstant-tids sammenligning av to strenger (API-nøkkel).
 * @param {string} a
 * @param {string} b
 */
export function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
