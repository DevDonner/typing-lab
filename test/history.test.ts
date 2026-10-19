import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addRun, averageWpm, bestRun, HISTORY_CAP, type RunRecord } from '../src/lab/engine/history.ts'

function run(wpm: number, date: number): RunRecord {
  return {
    wpm,
    rawWpm: wpm + 5,
    accuracy: 95,
    consistency: 0.8,
    durationSec: 30,
    timeMs: 30_000,
    seed: 1,
    date,
  }
}

test('addRun prepends (newest first)', () => {
  const h = addRun([], run(80, 1))
  const h2 = addRun(h, run(120, 2))
  assert.deepEqual(
    h2.map((r) => r.wpm),
    [120, 80],
  )
})

test('addRun trims to the cap', () => {
  let h: RunRecord[] = []
  for (let i = 0; i < 3; i++) h = addRun(h, run(100 + i, i), 3)
  assert.equal(h.length, 3)
  assert.deepEqual(
    h.map((r) => r.wpm),
    [102, 101, 100],
  )
})

test('default cap is 50', () => {
  let h: RunRecord[] = []
  for (let i = 0; i < 60; i++) h = addRun(h, run(100, i))
  assert.equal(h.length, HISTORY_CAP)
})

test('bestRun picks the max wpm', () => {
  const h = [run(50, 1), run(200, 2), run(120, 3)]
  assert.equal(bestRun(h)?.wpm, 200)
  assert.equal(bestRun([]), null)
})

test('averageWpm averages all runs', () => {
  const h = [run(100, 1), run(200, 2)]
  assert.equal(averageWpm(h), 150)
  assert.equal(averageWpm([]), null)
})
