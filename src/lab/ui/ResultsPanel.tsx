import type { TestStats } from '../engine/stats.ts'
import type { RunRecord } from '../engine/history.ts'

/**
 * End-of-test results card. Pure presentational — the parent owns stats,
 * history, and the actions (retry / copy share link).
 */

export interface ResultsPanelProps {
  stats: TestStats
  timeSec: number
  best: RunRecord | null
  /** True when this run met or beat every previous run (computed by parent). */
  newBest: boolean
  copied: boolean
  onRetry: () => void
  onShare: () => void
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-edge bg-ink/60 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">{label}</p>
      <p className="font-mono text-lg text-slate-100">
        {value}
        {hint && <span className="ml-1 text-xs text-mute">{hint}</span>}
      </p>
    </div>
  )
}

export function ResultsPanel({
  stats,
  timeSec,
  best,
  newBest,
  copied,
  onRetry,
  onShare,
}: ResultsPanelProps) {
  const wpm = Math.round(stats.wpm)

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Test results"
        className="w-full max-w-md rounded-xl border border-edge bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              net speed · {timeSec}s
            </p>
            <p className="font-mono text-6xl font-bold text-[#7ee787]">
              {wpm}
              <span className="ml-2 text-xl font-normal text-mute">wpm</span>
            </p>
          </div>
          {newBest && (
            <span className="rounded-full border border-[#7ee787]/40 bg-[#7ee787]/10 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#7ee787]">
              NEW BEST
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="raw" value={String(Math.round(stats.rawWpm))} hint="wpm" />
          <Stat label="accuracy" value={stats.accuracy.toFixed(1)} hint="%" />
          <Stat label="consistency" value={`${Math.round(stats.consistency * 100)}`} hint="%" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="chars" value={String(stats.correctChars)} hint={`+${stats.errorChars} err`} />
          <Stat
            label="personal best"
            value={best ? String(Math.round(best.wpm)) : '—'}
            hint={best ? 'wpm' : undefined}
          />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onRetry}
            className="flex-1 rounded-lg bg-[#7ee787] px-4 py-2.5 font-semibold text-ink transition hover:brightness-110"
          >
            Type again <span className="ml-1 font-mono text-xs opacity-70">↵</span>
          </button>
          <button
            onClick={onShare}
            className="flex-1 rounded-lg border border-edge px-4 py-2.5 text-slate-200 transition-colors hover:border-[#7ee787]/60 hover:text-[#7ee787]"
          >
            {copied ? 'Link copied ✓' : 'Share this text'}
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-mute">
          results stay in this browser only — nothing is sent anywhere
        </p>
      </div>
    </div>
  )
}
