import { HISTORY_KEY, type RunRecord } from './history.ts'

/**
 * Thin localStorage adapter around the pure history ops. Every access is
 * try/catch-guarded: private-browsing / blocked-storage must degrade to
 * "no history", never crash the lab.
 */

export function loadHistory(): RunRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RunRecord =>
        typeof r === 'object' && r !== null &&
        typeof (r as RunRecord).wpm === 'number' &&
        typeof (r as RunRecord).accuracy === 'number' &&
        typeof (r as RunRecord).seed === 'number' &&
        typeof (r as RunRecord).date === 'number',
    )
  } catch {
    return []
  }
}

export function saveHistory(history: RunRecord[]): boolean {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    return true
  } catch {
    return false
  }
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* nothing to do */
  }
}
