import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSearch, parseUrl, TEST_TIMES } from '../src/lab/engine/urlState.ts'

test('empty search → defaults', () => {
  assert.deepEqual(parseUrl(''), { time: 30, seed: null })
})

test('valid time and seed parse', () => {
  for (const t of TEST_TIMES) {
    assert.deepEqual(parseUrl(`?time=${t}&seed=42`), { time: t, seed: 42 })
  }
})

test('invalid time falls back to 30, seed is kept', () => {
  assert.deepEqual(parseUrl('?time=99&seed=7'), { time: 30, seed: 7 })
  assert.deepEqual(parseUrl('?time=abc'), { time: 30, seed: null })
  assert.deepEqual(parseUrl('?time=2.5'), { time: 30, seed: null })
})

test('invalid seeds are dropped individually, never fatal', () => {
  assert.deepEqual(parseUrl('?seed=abc&time=15'), { time: 15, seed: null })
  assert.deepEqual(parseUrl('?seed=-1'), { time: 30, seed: null })
  assert.deepEqual(parseUrl('?seed=1.5'), { time: 30, seed: null })
  assert.deepEqual(parseUrl('?seed=99999999999999999999'), { time: 30, seed: null })
})

test('buildSearch canonical form: defaults produce empty string', () => {
  assert.equal(buildSearch({ time: 30, seed: null }), '')
})

test('buildSearch round-trips', () => {
  const cases = [
    { time: 10 as const, seed: null },
    { time: 15 as const, seed: 42 },
    { time: 30 as const, seed: 0 },
  ]
  for (const c of cases) {
    assert.deepEqual(parseUrl(buildSearch(c)), c)
  }
})
