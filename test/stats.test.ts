import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyKey, createTest, tick } from '../src/lab/engine/typing.ts'
import { computeStats, liveStats } from '../src/lab/engine/stats.ts'

function runTest(timeMs: number): ReturnType<typeof createTest> {
  let s = createTest({ timeMs, wordCount: 8, seed: 11, now: 0 })
  // Type 10 correct chars quickly, then let the clock finish the test.
  for (let i = 0; i < 10; i++) {
    s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 100 + i * 10)
  }
  s = tick(s, timeMs + 100)
  return s
}

test('wpm = correct chars / 5 / minutes', () => {
  // 10 correct chars in a 1s test → 10/5 * 60 = 120 wpm
  const s = runTest(1000)
  const st = computeStats(s)
  assert.equal(s.correctChars, 10)
  assert.ok(Math.abs(st.wpm - 120) < 1, `wpm ${st.wpm}`)
})

test('accuracy = correct / all counted keystrokes', () => {
  let s = createTest({ timeMs: 1000, wordCount: 8, seed: 11, now: 0 })
  const expected = s.text.stream[0]
  const wrong = expected === 'q' ? 'w' : 'q'
  s = applyKey(s, { kind: 'char', ch: wrong }, 100) // 1 error
  for (let i = 0; i < 9; i++) {
    s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 110 + i * 10)
  }
  s = tick(s, 1100)
  const st = computeStats(s)
  assert.ok(Math.abs(st.accuracy - (9 / 10) * 100) < 0.01, `acc ${st.accuracy}`)
  assert.ok(st.rawWpm >= st.wpm, 'raw must be >= net')
})

test('empty test: zero wpm, 100% accuracy, no crash', () => {
  const s = createTest({ timeMs: 1000, wordCount: 8, seed: 11, now: 0 })
  const s2 = tick(s, 1100) // never started → still idle
  assert.equal(s2.status, 'idle')
  const st = computeStats(s2)
  assert.equal(st.wpm, 0)
  assert.equal(st.accuracy, 100)
})

test('consistency is 1 for perfectly even typing', () => {
  let s = createTest({ timeMs: 3000, wordCount: 8, seed: 11, now: 0 })
  // 5 chars in each of 3 full seconds, ticking past every boundary
  // (steady operation) → samples [60, 60, 60]
  for (let i = 0; i < 5; i++) s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 100 + i * 100)
  s = tick(s, 1100)
  for (let i = 0; i < 5; i++) s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 1200 + i * 100)
  s = tick(s, 2100)
  for (let i = 0; i < 5; i++) s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 2200 + i * 100)
  s = tick(s, 3100) // crosses boundary 3 AND expires
  assert.equal(s.status, 'done')
  assert.deepEqual(s.samples, [60, 60, 60])
  const st = computeStats(s)
  assert.equal(st.consistency, 1)
})

test('consistency is clamped to [0, 1] for spiky typing', () => {
  let s = createTest({ timeMs: 4000, wordCount: 8, seed: 11, now: 0 })
  // 10 chars in second 0, silence for 3 seconds
  for (let i = 0; i < 10; i++) s = applyKey(s, { kind: 'char', ch: s.text.stream[s.pos] }, 100 + i * 20)
  s = tick(s, 4100)
  const st = computeStats(s)
  assert.ok(st.consistency >= 0 && st.consistency <= 1, `c=${st.consistency}`)
  assert.ok(st.consistency < 1)
})

test('liveStats tracks the clock while running', () => {
  let s = createTest({ timeMs: 30_000, wordCount: 20, seed: 11, now: 0 })
  s = applyKey(s, { kind: 'char', ch: s.text.stream[0] }, 10_000)
  const half = liveStats(s, 10_500) // 1 correct char in 0.5s → 24 wpm
  assert.ok(half.wpm > 20 && half.wpm < 30, `wpm ${half.wpm}`)
  const later = liveStats(s, 11_000)
  assert.ok(later.wpm <= half.wpm, 'wpm should not grow with time at same char count')
})
