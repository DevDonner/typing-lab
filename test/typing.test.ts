import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyKey, createTest, tick, type TypingState } from '../src/lab/engine/typing.ts'

const NOW0 = 1_000_000

function fresh(wordCount = 5, timeMs = 60_000): TypingState {
  return createTest({ timeMs, wordCount, seed: 42, now: NOW0 })
}

function typeCorrectly(s: TypingState, count: number, startNow = NOW0 + 10): TypingState {
  let t = s
  for (let i = 0; i < count; i++) {
    t = applyKey(t, { kind: 'char', ch: t.text.stream[t.pos] }, startNow + i * 30)
  }
  return t
}

test('first character starts the clock; backspace while idle is a no-op', () => {
  const s = fresh()
  assert.equal(s.status, 'idle')
  const bs = applyKey(s, { kind: 'backspace' }, NOW0 + 5)
  assert.equal(bs, s)
  const a = applyKey(s, { kind: 'char', ch: s.text.stream[0] }, NOW0 + 5)
  assert.equal(a.status, 'running')
  assert.equal(a.startedAt, NOW0 + 5)
  assert.equal(a.pos, 1)
  assert.equal(a.correctChars, 1)
})

test('correct characters advance the caret and count', () => {
  const s = fresh()
  const t = typeCorrectly(s, 10)
  assert.equal(t.pos, 10)
  assert.equal(t.correctChars, 10)
  assert.equal(t.errorChars, 0)
})

test('wrong character is an error: counts, marks the key, keeps advancing', () => {
  const s = fresh()
  const expected = s.text.stream[0]
  const wrong = expected === 'q' ? 'w' : 'q'
  const t = applyKey(s, { kind: 'char', ch: wrong }, NOW0 + 10)
  assert.equal(t.errorChars, 1)
  assert.equal(t.correctChars, 0)
  assert.equal(t.pos, 1)
  assert.equal(t.errorKeys[wrong], 1)
  assert.deepEqual(t.errors, [0])
})

test('backspace retreats the caret and un-marks the last error', () => {
  let s = fresh()
  const expected = s.text.stream[0]
  const wrong = expected === 'q' ? 'w' : 'q'
  s = applyKey(s, { kind: 'char', ch: wrong }, NOW0 + 10) // error at 0
  s = applyKey(s, { kind: 'char', ch: s.text.stream[1] }, NOW0 + 20)
  assert.deepEqual(s.errors, [0])
  s = applyKey(s, { kind: 'backspace' }, NOW0 + 30)
  assert.equal(s.pos, 1)
  assert.equal(s.backspaces, 1)
  assert.equal(s.errorChars, 1) // counts are never un-counted
  s = applyKey(s, { kind: 'backspace' }, NOW0 + 40)
  assert.equal(s.pos, 0)
  assert.deepEqual(s.errors, []) // the marked error is gone
})

test('typing the full stream ends the test early', () => {
  let s = fresh(2, 60_000) // "word word"
  const len = s.text.stream.length
  s = typeCorrectly(s, len)
  assert.equal(s.status, 'done')
  assert.ok(s.endedAt !== null && s.endedAt >= NOW0)
  const after = applyKey(s, { kind: 'char', ch: 'a' }, NOW0 + 9999)
  assert.equal(after, s) // done state ignores input
})

test('clock expiry ends the test at exactly startedAt + timeMs', () => {
  let s = fresh(5, 2000)
  s = applyKey(s, { kind: 'char', ch: s.text.stream[0] }, 10_000)
  s = tick(s, 11_000)
  assert.equal(s.status, 'running')
  s = tick(s, 12_001)
  assert.equal(s.status, 'done')
  assert.equal(s.endedAt, 12_000) // 10_000 + 2000
  assert.equal(s.endedAt - (s.startedAt as number), s.timeMs)
})

test('per-second WPM samples land on second boundaries', () => {
  let s = fresh(5, 10_000)
  s = typeCorrectly(s, 5, 10_000) // 5 chars in second 0
  s = tick(s, 11_000)
  assert.deepEqual(s.samples, [60]) // 5 chars/s * 12 = 60 wpm
  s = tick(s, 12_000)
  assert.deepEqual(s.samples, [60, 0]) // idle second samples 0
  s = typeCorrectly(s, 5, 12_000) // 5 more, still second 2
  s = tick(s, 13_000)
  assert.deepEqual(s.samples, [60, 0, 60])
})

test('long pauses produce one sample per missed second', () => {
  let s = fresh(5, 60_000)
  s = typeCorrectly(s, 1, 10_000)
  s = tick(s, 13_500) // missed seconds 1, 2, and the boundary of 3
  assert.equal(s.samples.length, 3)
  assert.deepEqual(s.samples, [12, 0, 0])
})

test('input is pure: the previous state is never mutated', () => {
  const s = fresh()
  const before = JSON.stringify(s)
  applyKey(s, { kind: 'char', ch: 'z' }, NOW0 + 10)
  tick(s, NOW0 + 5000)
  assert.equal(JSON.stringify(s), before)
})
