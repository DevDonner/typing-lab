import type { RunRecord } from '../engine/history.ts'

/**
 * Local history drawer — last 10 runs, best, average. LocalStorage only.
 */

export interface HistoryPanelProps {
  history: RunRecord[]
  best: RunRecord | null
  average: number | null
  onClose: () => void
  onClear: () => void
}

export function HistoryPanel({ history, best, average, onClose, onClear }: HistoryPanelProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 mx-auto mt-14 w-[min(92%,540px)] rounded-xl border border-edge bg-surface p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">
          Local history
          <span className="ml-2 text-xs font-normal text-mute">
            best {best ? Math.round(best.wpm) : '—'} · avg {average ? average.toFixed(0) : '—'} wpm
          </span>
        </h2>
        <div className="flex gap-2">
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="rounded-md border border-edge px-2 py-1 text-xs text-mute transition-colors hover:border-[#f87171]/50 hover:text-[#f87171]"
            >
              clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close history"
            className="rounded-md border border-edge px-2 py-1 text-xs text-mute transition-colors hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 pb-2 text-sm text-mute">
          No runs yet — finish a test and it lands here.
        </p>
      ) : (
        <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
          {history.slice(0, 10).map((r, i) => (
            <li
              key={r.date + '-' + i}
              className="flex items-center justify-between rounded-md border border-edge/60 bg-ink/50 px-3 py-1.5 font-mono text-xs"
            >
              <span className="text-[#7ee787]">
                {Math.round(r.wpm)} <span className="text-mute">wpm</span>
              </span>
              <span className="text-mute">{r.accuracy.toFixed(1)}% acc</span>
              <span className="text-mute">{r.timeMs / 1000}s</span>
              <span className="text-mute">
                {new Date(r.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
                {' '}
                {new Date(r.date).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
