import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { timingSafeEqualString } from '../lib/timingSafeEqual.js'

test('lik nøkkel', () => {
  assert.equal(timingSafeEqualString('abc', 'abc'), true)
})

test('ulik nøkkel', () => {
  assert.equal(timingSafeEqualString('abc', 'abd'), false)
})

test('ulik lengde', () => {
  assert.equal(timingSafeEqualString('a', 'ab'), false)
})
