import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleText, wordCountFor } from '../src/lab/engine/sample.ts'
import { WORDS } from '../src/lab/engine/words.ts'

test('same seed yields identical text', () => {
  assert.deepEqual(sampleText(42, 30), sampleText(42, 30))
})

test('different seeds yield different text', () => {
  assert.notDeepEqual(sampleText(1, 30).words, sampleText(2, 30).words)
})

test('exact word count; all words from the pool', () => {
  const s = sampleText(7, 57)
  assert.equal(s.words.length, 57)
  const set = new Set(WORDS)
  for (const w of s.words) assert.ok(set.has(w), `not in pool: ${w}`)
})

test('no adjacent duplicate words', () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const s = sampleText(seed, 200)
    for (let i = 1; i < s.words.length; i++) {
      assert.notEqual(s.words[i], s.words[i - 1])
    }
  }
})

test('stream is words.join(" ") and wordStarts line up', () => {
  const s = sampleText(5, 40)
  assert.equal(s.stream, s.words.join(' '))
  s.words.forEach((w, i) => {
    assert.equal(s.stream.slice(s.wordStarts[i], s.wordStarts[i] + w.length), w)
  })
})

test('wordCountFor covers fast typists with headroom', () => {
  // 200 wpm for 30s = 100 chars… no: 100 words. +20 headroom.
  assert.ok(wordCountFor(30) >= 120)
  assert.ok(wordCountFor(10) >= 60)
  assert.ok(wordCountFor(30) > wordCountFor(10))
})
