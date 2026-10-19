import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WORDS, MAX_WORD_LEN } from '../src/lab/engine/words.ts'

test('pool is large enough for varied text', () => {
  assert.ok(WORDS.length >= 400, `only ${WORDS.length} words`)
})

test('every word is lowercase a-z', () => {
  for (const w of WORDS) {
    assert.match(w, /^[a-z]+$/, `bad word: ${w}`)
  }
})

test('no word exceeds the layout cap', () => {
  for (const w of WORDS) {
    assert.ok(w.length <= MAX_WORD_LEN, `too long: ${w}`)
  }
})

test('pool has no duplicates', () => {
  assert.equal(new Set(WORDS).size, WORDS.length)
})
