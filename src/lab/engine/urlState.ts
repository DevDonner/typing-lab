/**
 * Shareable URL state — pure parse/build over `location.search`.
 *
 * Contract (same as the sort visualizer): invalid fields are dropped
 * individually, never fatal; the canonical form is `?time=30` with no seed
 * (a seed appears only when one was shared).
 */

export const TEST_TIMES = [10, 15, 20, 30] as const
export type TestTime = (typeof TEST_TIMES)[number]

export interface UrlParams {
  /** Test duration in seconds. Always valid (defaults to 30). */
  time: TestTime
  /** Shared seed, or null for "generate a new one". */
  seed: number | null
}

export function defaultParams(): UrlParams {
  return { time: 30, seed: null }
}

export function parseUrl(search: string): UrlParams {
  const p: UrlParams = { time: 30, seed: null }
  const q = new URLSearchParams(search)

  const t = Number(q.get('time'))
  if ((TEST_TIMES as readonly number[]).includes(t)) p.time = t as TestTime

  const s = q.get('seed')
  if (s !== null && /^\d+$/.test(s)) {
    const n = Number(s)
    if (Number.isSafeInteger(n) && n >= 0 && n < 2 ** 31) p.seed = n
  }
  return p
}

/** Canonical search string for the params (no trailing `?`). */
export function buildSearch(p: UrlParams): string {
  const q = new URLSearchParams()
  if (p.time !== 30) q.set('time', String(p.time))
  if (p.seed !== null) q.set('seed', String(p.seed))
  const s = q.toString()
  return s ? `?${s}` : ''
}
