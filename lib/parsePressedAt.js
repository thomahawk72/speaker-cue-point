/**
 * Klientens `pressedAt` (tall = ms siden epoch, eller ISO-8601) → heltall ms, eller null.
 * @param {unknown} value
 * @returns {number | null}
 */
export function parsePressedAtMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  if (typeof value === 'string' && value.length > 0) {
    const t = Date.parse(value)
    if (!Number.isNaN(t)) return t
  }
  return null
}
