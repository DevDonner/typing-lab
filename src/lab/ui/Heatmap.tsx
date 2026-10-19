/**
 * Per-key error heat map — QWERTY layout + spacebar. Cell color intensity
 * scales with that key's error count (saturates at 8).
 */

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbm']

export interface HeatmapProps {
  errorKeys: Record<string, number>
  className?: string
}

export function Heatmap({ errorKeys, className = '' }: HeatmapProps) {
  const cell = (ch: string, key: string, wide = false) => {
    const n = errorKeys[ch] ?? 0
    const t = Math.min(1, n / 8)
    return (
      <span
        key={key}
        title={n > 0 ? `${n} error${n === 1 ? '' : 's'}` : undefined}
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded border border-edge px-1 font-mono text-[11px] ${
          wide ? 'w-24 sm:w-40' : ''
        } ${n > 0 ? 'text-slate-950' : 'text-mute'}`}
        style={n > 0 ? { backgroundColor: `rgba(248,113,113,${0.35 + 0.6 * t})` } : undefined}
      >
        {ch === ' ' ? '␣' : ch}
      </span>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} aria-label="Per-key error heat map">
      {ROWS.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.split('').map((ch) => cell(ch, ch))}
        </div>
      ))}
      <div>{cell(' ', 'space', true)}</div>
    </div>
  )
}

/** Compact "most mistyped" chips for small screens. */
export function ErrorChips({ errorKeys }: { errorKeys: Record<string, number> }) {
  const top = Object.entries(errorKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (top.length === 0) {
    return <p className="text-xs text-mute">No errors yet — clean sheet.</p>
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-mute">most mistyped</span>
      {top.map(([ch, n]) => (
        <span
          key={ch}
          className="rounded border border-[#f87171]/40 bg-[#f87171]/10 px-1.5 py-0.5 font-mono text-xs text-[#f87171]"
        >
          {ch === ' ' ? '␣' : ch} ×{n}
        </span>
      ))}
    </div>
  )
}
