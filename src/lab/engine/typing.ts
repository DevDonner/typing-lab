import { sampleText, type SampledText } from './sample.ts'

/**
 * Typing test state machine — pure, immutable, clock-injected.
 *
 * The engine knows nothing about DOM, events, or React. A test is a flat
 * character stream (`words.join(' ')`); the user's caret is `pos`. Every
 * transition returns a new state, so the UI keeps the whole history in
 * React state and every branch is unit-testable.
 *
 * Time model: `now` (ms epoch) is injected on every call. Two transitions
 * exist:
 * - `applyKey` — one user keystroke (also starts the clock on the first char)
 * - `tick`     — a clock pulse with no input; the UI calls this ~10 Hz so
 *                per-second WPM samples and the end-of-test boundary are
 *                wall-clock accurate even while the user pauses.
 * The test ends the first time `now - startedAt >= timeMs` is observed.
 */

export type KeyInput = { kind: 'char'; ch: string } | { kind: 'backspace' }

export type TestStatus = 'idle' | 'running' | 'done'

export interface TestOptions {
  /** Test duration in ms (e.g. 30_000). */
  timeMs: number
  /** How many words to sample (see wordCountFor). */
  wordCount: number
  /** PRNG seed → shareable text. */
  seed: number
  /** Clock value at creation; the test is `idle` until the first char. */
  now: number
}

export interface TypingState {
  status: TestStatus
  timeMs: number
  seed: number
  text: SampledText
  /** Caret position in `text.stream`. */
  pos: number
  startedAt: number | null
  endedAt: number | null
  correctChars: number
  errorChars: number
  backspaces: number
  /** WPM for each completed second of the test (index = second). */
  samples: number[]
  /** Elapsed ms at which the last sample was taken. */
  sampleMark: number
  /** Per-key error counts (char → count; ' ' for space). Drives the heat map. */
  errorKeys: Record<string, number>
  /** Stream positions currently marked as errors (for character styling;
      backspacing over an error removes it — counts are never un-counted). */
  errors: number[]
}

export function createTest(opts: TestOptions): TypingState {
  return {
    status: 'idle',
    timeMs: opts.timeMs,
    seed: opts.seed,
    text: sampleText(opts.seed, opts.wordCount),
    pos: 0,
    startedAt: null,
    endedAt: null,
    correctChars: 0,
    errorChars: 0,
    backspaces: 0,
    samples: [],
    sampleMark: 0,
    errorKeys: {},
    errors: [],
  }
}

/** Apply one user key. While idle, the first char starts the clock. */
export function applyKey(s: TypingState, input: KeyInput, now: number): TypingState {
  if (s.status === 'done') return s
  if (s.status === 'idle') {
    if (input.kind !== 'char') return s
    return advance({ ...s, status: 'running', startedAt: now }, input, now)
  }
  return advance(s, input, now)
}

/** Clock pulse with no input — samples time and enforces the end boundary. */
export function tick(s: TypingState, now: number): TypingState {
  if (s.status !== 'running') return s
  return advance(s, null, now)
}

function advance(s: TypingState, input: KeyInput | null, now: number): TypingState {
  const n: TypingState = {
    ...s,
    text: s.text,
    samples: s.samples,
    errorKeys: s.errorKeys,
    errors: s.errors,
  }
  n.startedAt = s.startedAt ?? now

  if (input !== null) {
    if (input.kind === 'char') {
      if (n.pos < n.text.stream.length) {
        const expected = n.text.stream[n.pos]
        if (input.ch === expected) n.correctChars += 1
        else {
          n.errorChars += 1
          n.errorKeys = { ...n.errorKeys, [input.ch]: (n.errorKeys[input.ch] ?? 0) + 1 }
          n.errors = [...s.errors, n.pos]
        }
        n.pos += 1
      }
    } else if (n.pos > 0) {
      n.pos -= 1
      n.backspaces += 1
      if (n.errors[n.errors.length - 1] === n.pos) {
        n.errors = n.errors.slice(0, -1)
      }
    }
  }

  // Sample per-second WPM at each second boundary crossed since last pulse.
  const elapsed = now - n.startedAt
  const seconds = Math.floor(elapsed / 1000)
  const last = Math.floor(n.sampleMark / 1000)
  if (seconds > last) {
    const correctAtMark = n.samples.reduce((a, v) => a + v / 12, 0) // wpm→chars/second
    // With several missed seconds the per-second deltas are unrecoverable, so
    // the whole delta is attributed to the first missed second — a
    // burst-then-pause reads as such, which is what consistency measures. In
    // steady 10 Hz operation exactly one second crosses per tick: exact.
    for (let sec = last + 1; sec <= seconds; sec++) {
      const delta = sec === last + 1 ? n.correctChars - correctAtMark : 0
      n.samples = [...n.samples, Math.max(0, Math.round(delta * 12))]
    }
    n.sampleMark = elapsed
  }

  // Termination: clock ran out, or the stream was exhausted.
  if (elapsed >= n.timeMs) {
    n.status = 'done'
    n.endedAt = n.startedAt + n.timeMs
    // Close out the final partial second — but only if typing actually
    // happened there (a trailing 0 would skew consistency for even typing).
    const correctAtMark = n.samples.reduce((a, v) => a + v / 12, 0)
    const delta = n.correctChars - correctAtMark
    if (delta > 0) n.samples = [...n.samples, Math.max(0, Math.round(delta * 12))]
  } else if (n.pos >= n.text.stream.length) {
    n.status = 'done'
    n.endedAt = now
  }
  return n
}
