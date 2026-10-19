import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { meta } from './meta.ts'
import {
  applyKey,
  createTest,
  tick,
  type TypingState,
} from './engine/typing.ts'
import { computeStats, liveStats, type TestStats } from './engine/stats.ts'
import { randomSeed } from './engine/rng.ts'
import { wordCountFor } from './engine/sample.ts'
import {
  TEST_TIMES,
  buildSearch,
  parseUrl,
  type TestTime,
  type UrlParams,
} from './engine/urlState.ts'
import { addRun, averageWpm, bestRun, type RunRecord } from './engine/history.ts'
import { clearHistory, loadHistory, saveHistory } from './engine/storage.ts'
import { WordStream } from './ui/WordStream.tsx'
import { Sparkline } from './ui/Sparkline.tsx'
import { ErrorChips, Heatmap } from './ui/Heatmap.tsx'
import { ResultsPanel } from './ui/ResultsPanel.tsx'
import { HistoryPanel } from './ui/HistoryPanel.tsx'

/**
 * Typing Lab root.
 *
 * Contract (portfolio LABS.md): default export, no props, fills its
 * container, imports only react + files in this folder.
 *
 * Input model: a single hidden, uncontrolled <input> is the source of all
 * characters — physical and virtual keyboards both emit `input` events,
 * which keeps mobile + desktop behavior identical and dodgeable-free.
 * keydown is reserved for Enter/Escape (restart). Only a-z + space count;
 * punctuation and pastes are dropped, never counted as errors.
 */

export interface TypeLabDebug {
  getState(): TypingState
  typeText(text: string): void
  advance(ms: number): void
  restart(): void
}

declare global {
  interface Window {
    __TYPELAB__?: TypeLabDebug
  }
}

function makeTest(timeSec: number, seed: number, now = Date.now()): TypingState {
  return createTest({ timeMs: timeSec * 1000, wordCount: wordCountFor(timeSec), seed, now })
}

function isUsableKey(s: string): boolean {
  return s.length === 1 && /^[a-z ]$/.test(s)
}

export default function TypingLab() {
  // Canonicalize the URL on load: a shared seed is kept, otherwise a fresh
  // one is minted and written back so every load is shareable.
  const [params, setParams] = useState<UrlParams>(() => {
    const p = parseUrl(window.location.search)
    if (p.seed === null) {
      const np = { ...p, seed: randomSeed() }
      window.history.replaceState(null, '', buildSearch(np))
      return np
    }
    return p
  })
  const [test, setTest] = useState<TypingState>(() =>
    makeTest(params.time, params.seed as number),
  )
  const [now, setNow] = useState(() => Date.now())
  const [history, setHistory] = useState<RunRecord[]>(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const [visible, setVisible] = useState(() => (window.innerWidth >= 768 ? 14 : 9))
  const inputRef = useRef<HTMLInputElement>(null)
  const testRef = useRef(test)
  testRef.current = test
  const recordedRef = useRef<TypingState | null>(null)

  const stats: TestStats = test.status === 'done' ? computeStats(test) : liveStats(test, now)
  const remaining =
    test.startedAt === null
      ? params.time
      : Math.max(0, params.time - (now - test.startedAt) / 1000)

  const restart = useCallback(
    (newSeed = true) => {
      const seed = newSeed ? randomSeed() : (params.seed ?? randomSeed())
      const np: UrlParams = { time: params.time, seed }
      window.history.replaceState(null, '', buildSearch(np))
      setParams(np)
      setTest(makeTest(np.time, seed))
      setNow(Date.now())
      recordedRef.current = null
      setCopied(false)
      setNewBest(false)
      setShowHistory(false)
    },
    [params.time, params.seed],
  )

  const setTime = useCallback(
    (t: TestTime) => {
      const seed = params.seed ?? randomSeed()
      const np: UrlParams = { time: t, seed }
      window.history.replaceState(null, '', buildSearch(np))
      setParams(np)
      setTest(makeTest(t, seed))
      recordedRef.current = null
      setCopied(false)
      setNewBest(false)
    },
    [params.seed],
  )

  // Clock: 10 Hz while running — drives the live readout, per-second WPM
  // samples, and the end-of-test boundary.
  useEffect(() => {
    if (test.status !== 'running') return
    const id = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      setTest((t) => (t.status === 'running' ? tick(t, n) : t))
    }, 100)
    return () => window.clearInterval(id)
  }, [test.status])

  // Restart keys. Modifier combos (cmd/ctrl/alt + anything) pass through.
  // Listened on document (not window) so keydowns dispatched at the
  // document node without bubbling are caught too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'enter' || k === 'escape') {
        e.preventDefault()
        restart()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [restart])

  useEffect(() => {
    const onResize = () => setVisible(window.innerWidth >= 768 ? 14 : 9)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Auto-focus capture on desktop only (never pop the mobile keyboard).
  useEffect(() => {
    if (window.matchMedia('(hover: hover)').matches) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [])

  // Record finished tests into local history — exactly once per test.
  useEffect(() => {
    if (test.status !== 'done' || recordedRef.current === test) return
    recordedRef.current = test
    const s = computeStats(test)
    const prevBest = bestRun(history)
    const rec: RunRecord = {
      wpm: s.wpm,
      rawWpm: s.rawWpm,
      accuracy: s.accuracy,
      consistency: s.consistency,
      durationSec: s.durationSec,
      timeMs: test.timeMs,
      seed: test.seed,
      date: Date.now(),
    }
    setNewBest(prevBest === null || s.wpm > prevBest.wpm)
    const next = addRun(history, rec)
    setHistory(next)
    saveHistory(next)
  }, [test, history])

  const onHiddenInput = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const val = el.value
    el.value = '' // keep the field empty; it is a key buffer, not a text field
    const n = Date.now()
    if (val.length === 1) {
      if (val === '\n' || val === '\r') {
        restart()
        return
      }
      const ch = val.toLowerCase()
      if (isUsableKey(ch)) {
        setTest((t) => applyKey(t, { kind: 'char', ch }, n))
        setNow(n)
      }
      // non a-z/space: dropped silently (punctuation, dead keys, IME junk)
    } else if (val.length === 0) {
      setTest((t) => applyKey(t, { kind: 'backspace' }, n))
      setNow(n)
    }
    // val.length > 1 → paste: rejected, never counted
  }

  const share = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}${buildSearch(params)}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this share link:', url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [params])

  // Debug seam (browser verification + user tinkering): deterministic
  // typing without a keyboard.
  window.__TYPELAB__ = {
    getState: () => testRef.current,
    typeText: (s: string) => {
      let t = testRef.current
      let n = t.startedAt ?? Date.now()
      for (const raw of s) {
        n += 40
        const ch = raw.toLowerCase()
        if (ch === ' ') t = applyKey(t, { kind: 'char', ch }, n)
        else if (/^[a-z]$/.test(ch)) t = applyKey(t, { kind: 'char', ch }, n)
        else if (ch === '\b') t = applyKey(t, { kind: 'backspace' }, n)
      }
      testRef.current = t // keep getState() consistent before React re-renders
      setTest(t)
      setNow(n)
    },
    advance: (ms: number) => {
      let t = testRef.current
      let n = t.startedAt ?? Date.now()
      const steps = Math.max(1, Math.ceil(ms / 100))
      for (let i = 0; i < steps; i++) {
        n += Math.min(100, ms)
        t = tick(t, n)
      }
      testRef.current = t
      setTest(t)
      setNow(n)
    },
    restart: () => restart(),
  }

  const srStatus =
    test.status === 'idle'
      ? 'Ready. Start typing to begin the test.'
      : test.status === 'running'
        ? `Test running. ${remaining.toFixed(0)} seconds left. ${Math.round(stats.wpm)} words per minute.`
        : `Test complete. ${Math.round(stats.wpm)} words per minute, accuracy ${stats.accuracy.toFixed(0)} percent.`

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      <input
        ref={inputRef}
        aria-hidden
        tabIndex={-1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        onInput={onHiddenInput}
        className="fixed -left-[1000px] top-0 h-px w-px opacity-0"
      />

      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-edge px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="font-mono text-sm font-bold text-[#7ee787]">{'>'}_</span>
          <h1 className="font-display text-sm font-semibold tracking-tight text-slate-100">
            {meta.title}
          </h1>
          <span className="hidden truncate text-xs text-mute lg:inline">— {meta.tagline}</span>
        </div>
        <div aria-hidden className="flex items-center gap-4 font-mono text-xs sm:text-sm">
          {test.status === 'idle' ? (
            <span className="text-mute">ready — start typing</span>
          ) : (
            <>
              <span className="tabular-nums text-[#fbbf24]">{remaining.toFixed(1)}s</span>
              <span className="tabular-nums text-[#7ee787]">
                {Math.round(stats.wpm)} wpm
              </span>
              <span className="hidden tabular-nums text-mute sm:inline">
                {stats.accuracy.toFixed(0)}% acc
              </span>
            </>
          )}
        </div>
      </header>
      <p className="sr-only" aria-live="polite">
        {srStatus}
      </p>

      {/* options */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge/60 px-4 py-2 sm:px-6">
        {TEST_TIMES.map((t) => (
          <button
            key={t}
            onClick={() => setTime(t)}
            aria-pressed={params.time === t}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              params.time === t
                ? 'border-[#7ee787]/60 bg-[#7ee787]/10 text-[#7ee787]'
                : 'border-edge text-mute hover:text-slate-200'
            }`}
          >
            {t}s
          </button>
        ))}
        <button
          onClick={() => restart(true)}
          className="rounded-md border border-edge px-2.5 py-1 font-mono text-xs text-mute transition-colors hover:text-slate-200"
        >
          ↻ new text
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
              showHistory
                ? 'border-[#7ee787]/60 text-[#7ee787]'
                : 'border-edge text-mute hover:text-slate-200'
            }`}
          >
            history ({history.length})
          </button>
          <span className="hidden text-xs text-mute md:inline">enter ↻ · esc ↻</span>
        </div>
      </div>

      {/* the stream */}
      <main className="flex min-h-0 flex-1 items-center px-4 py-2 sm:px-8">
        <WordStream
          text={test.text}
          pos={test.pos}
          errors={test.errors}
          visible={visible}
        />
      </main>

      {/* instrumentation */}
      <footer className="border-t border-edge px-4 pb-4 pt-3 sm:px-8">
        <div className="flex items-end gap-8">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
              sustained wpm
            </p>
            <Sparkline samples={test.samples} seconds={params.time} />
          </div>
          <div className="hidden shrink-0 md:block">
            <p className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wider text-mute">
              errors by key
            </p>
            <Heatmap errorKeys={test.errorKeys} />
          </div>
        </div>
        <div className="mt-2 md:hidden">
          <ErrorChips errorKeys={test.errorKeys} />
        </div>
      </footer>

      {test.status === 'done' && (
        <ResultsPanel
          stats={stats}
          timeSec={params.time}
          best={bestRun(history)}
          newBest={newBest}
          copied={copied}
          onRetry={() => restart()}
          onShare={share}
        />
      )}

      {showHistory && (
        <HistoryPanel
          history={history}
          best={bestRun(history)}
          average={averageWpm(history)}
          onClose={() => setShowHistory(false)}
          onClear={() => {
            setHistory([])
            clearHistory()
          }}
        />
      )}
    </div>
  )
}
