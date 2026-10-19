import type { TypingState } from './typing.ts'

/**
 * Derived test statistics — pure functions over a TypingState (or, for the
 * live display, a running state + current clock).
 */

export interface TestStats {
  /** Net WPM: correct chars / 5 / minutes. */
  wpm: number
  /** Raw WPM: all counted keystrokes / 5 / minutes (ignores accuracy). */
  rawWpm: number
  /** Correct keystrokes as % of all counted keystrokes. */
  accuracy: number
  /** 0..1 — 1 = perfectly even typing (stddev of per-second WPM vs mean). */
  consistency: number
  correctChars: number
  errorChars: number
  durationSec: number
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length)
}

function statsAt(s: Pick<TypingState, 'samples'> & {
  correctChars: number
  errorChars: number
  elapsedMs: number
}): TestStats {
  const minutes = Math.max(s.elapsedMs, 1) / 60000
  const wpm = s.correctChars / 5 / minutes
  const rawWpm = (s.correctChars + s.errorChars) / 5 / minutes
  const total = s.correctChars + s.errorChars
  const accuracy = total === 0 ? 100 : (s.correctChars / total) * 100
  const m = mean(s.samples)
  const consistency = m === 0 ? 1 : clamp(1 - stddev(s.samples) / m, 0, 1)
  return {
    wpm,
    rawWpm,
    accuracy,
    consistency,
    correctChars: s.correctChars,
    errorChars: s.errorChars,
    durationSec: s.elapsedMs / 1000,
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Stats for a finished test. */
export function computeStats(s: TypingState): TestStats {
  const elapsed = (s.endedAt ?? (s.startedAt ?? 0)) - (s.startedAt ?? 0)
  return statsAt({ ...s, elapsedMs: Math.max(elapsed, 1) })
}

/** Stats for a running test at clock value `now` (drives the live readout). */
export function liveStats(s: TypingState, now: number): TestStats {
  if (s.status === 'done') return computeStats(s)
  const elapsed = s.startedAt === null ? 0 : Math.max(now - s.startedAt, 1)
  return statsAt({ ...s, elapsedMs: Math.min(elapsed, s.timeMs) })
}
