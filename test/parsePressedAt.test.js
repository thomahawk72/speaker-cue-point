import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { parsePressedAtMs } from '../lib/parsePressedAt.js'

test('avrundinger flyttall til heltall ms', () => {
  assert.equal(parsePressedAtMs(1713616496789.7), 1713616496790)
})

test('ISO-8601-streng', () => {
  assert.equal(parsePressedAtMs('2020-01-01T00:00:00.000Z'), 1577836800000)
})

test('null ved manglende eller ugyldig verdi', () => {
  assert.equal(parsePressedAtMs(undefined), null)
  assert.equal(parsePressedAtMs(null), null)
  assert.equal(parsePressedAtMs(''), null)
  assert.equal(parsePressedAtMs('not-a-date'), null)
  assert.equal(parsePressedAtMs(Number.NaN), null)
  assert.equal(parsePressedAtMs(Number.POSITIVE_INFINITY), null)
})

test('null ved objekt', () => {
  assert.equal(parsePressedAtMs({}), null)
})
