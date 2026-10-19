import { mulberry32 } from './rng.ts'
import { MAX_WORD_LEN, WORDS } from './words.ts'

export interface SampledText {
  /** The words, in order. */
  words: string[]
  /** `words.join(' ')` — the flat string the typing engine compares against. */
  stream: string
  /** Index in `stream` where each word starts (for rendering). */
  wordStarts: number[]
}

/**
 * Deterministic word sampling for a test of `wordCount` words.
 *
 * Rules:
 * - seeded → same seed always yields the same text (shareable URLs)
 * - never two adjacent words are identical (feels less mechanical)
 * - oversized words (> MAX_WORD_LEN) are rejected and re-rolled
 */
export function sampleText(seed: number, wordCount: number): SampledText {
  const rand = mulberry32(seed)
  const words: string[] = []
  let prev = -1
  for (let i = 0; i < wordCount; i++) {
    let idx: number
    do {
      idx = Math.floor(rand() * WORDS.length)
    } while (idx === prev || WORDS[idx].length > MAX_WORD_LEN)
    prev = idx
    words.push(WORDS[idx])
  }
  const stream = words.join(' ')
  const wordStarts: number[] = []
  let pos = 0
  for (const w of words) {
    wordStarts.push(pos)
    pos += w.length + 1
  }
  return { words, stream, wordStarts }
}

/**
 * How many words a test needs to never run dry: a 200 WPM typist for the
 * full duration, plus headroom, rounded up to a safe minimum.
 */
export function wordCountFor(timeSec: number): number {
  const needed = Math.ceil((timeSec / 60) * 200) + 20
  return Math.max(60, needed)
}
