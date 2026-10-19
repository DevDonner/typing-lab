/**
 * Private, local typing history — pure list ops here, storage adapter in
 * storage.ts. Kept entirely in localStorage: a typing test with no account
 * and no network is the point.
 */

export interface RunRecord {
  wpm: number
  rawWpm: number
  accuracy: number
  consistency: number
  durationSec: number
  timeMs: number
  seed: number
  /** Wall-clock ms at completion. */
  date: number
}

export const HISTORY_KEY = 'typing-lab.history.v1'
export const HISTORY_CAP = 50

/** Prepend a run; trim to cap; newest first. Pure. */
export function addRun(history: RunRecord[], run: RunRecord, cap = HISTORY_CAP): RunRecord[] {
  return [run, ...history].slice(0, cap)
}

export function bestRun(history: RunRecord[]): RunRecord | null {
  if (history.length === 0) return null
  return history.reduce((a, b) => (b.wpm > a.wpm ? b : a))
}

export function averageWpm(history: RunRecord[]): number | null {
  if (history.length === 0) return null
  return history.reduce((a, r) => a + r.wpm, 0) / history.length
}
