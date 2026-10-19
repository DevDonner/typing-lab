# Typing Lab — design document

**One interesting thing:** a quiet, terminal-style typing test that measures
what typing tests measure (WPM, accuracy, consistency) and *shows* where you
are losing — per-second sustained curve and a per-key error heat map.

## Goals

1. **Functional first.** This is a tool people actually use, not a toy:
   accurate WPM/accuracy math, a persistent local history, and shareable
   text (same `?seed=` for everyone).
2. **Defensible engine.** Every keystroke, error, backspace, and second
   boundary is a pure, clock-injected state transition — unit-tested
   without a browser.
3. **Zero network at runtime.** Bundled word pool, synthesized nothing
   (no audio), history in localStorage. A typing test with no account and
   no tracking is the point.
4. **Lift-safe.** The `src/lab/` folder obeys the portfolio lab contract
   (see `portfolio/LABS.md`): default export, no props, no shell imports,
   only host theme tokens + default Tailwind palette + arbitrary values.

## Non-goals

- No accounts, no leaderboards, no server of any kind.
- No audio (the previous sound lab was cut from the portfolio; a typing
  test is better silent).
- No custom text import, quotes mode, or multi-language text — the
  deterministic word sampler is the whole feature.

## Theme

Terminal, deliberately off-palette from the portfolio's teal: **phosphor
green `#7ee787`** on the host's ink background, amber `#fbbf24` for the
timer, red `#f87171` for errors. Mono type for everything instrumented
(`font-mono` — JetBrains Mono in the local harness, system mono in the
host; the lab never depends on which one). Colors are expressed as
arbitrary values / default-palette classes so the folder lifts unchanged
— no lab-only `@theme` tokens.

## UX

```
┌────────────────────────────────────────────────────────────┐
│ >_ Typing Lab — tagline            12.4s   63 wpm   97% acc│
├────────────────────────────────────────────────────────────┤
│ [10s][15s][20s][30s]  ↻ new text        history (3)  enter ↻│
├────────────────────────────────────────────────────────────┤
│                                                            │
│      small found hand until side ask keep   ▏always why    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ SUSTAINED WPM                        ERRORS BY KEY         │
│ ▁▂▅▇▆▃▅▇ (canvas sparkline)        q w e r t y u i o p     │
│                                        a s d f g h j k l   │
│                                        z x c v b n m  ␣    │
└────────────────────────────────────────────────────────────┘
```

- **Type to start.** No start button — the first character starts the
  clock (like the best typing tests). `Enter`/`Esc` restart with a fresh
  text.
- **Caret semantics.** Untyped chars are dim; the current char is bright
  (what to type next); typed-correct is phosphor; typed-error is red with
  a red wash. Backspace retreats the caret and un-marks the display, but
  never un-counts the error.
- **Live readout** (10 Hz): remaining time, net WPM, accuracy — plus an
  `aria-live` sr-only mirror for screen readers.
- **End card:** net WPM, raw WPM, accuracy, consistency, chars, personal
  best, NEW BEST badge, retry, and a share link (seed + duration).
- **History drawer:** last 10 runs + best/average, all in localStorage,
  one tap to clear.
- **Mobile:** narrower word window, smaller stream, heat map collapses to
  "most mistyped" chips, hidden capture input lets the *virtual*
  keyboard drive the same input path as a physical one.

## Architecture

```
src/lab/
├── engine/
│   ├── rng.ts        mulberry32 (deterministic seeds) + randomSeed()
│   ├── words.ts      ~450-word pool; de-dup + length cap enforced structurally
│   ├── sample.ts     seeded text sampler (no adjacent repeats) + sizing
│   ├── typing.ts     the state machine: createTest / applyKey / tick
│   ├── stats.ts      wpm / raw / accuracy / consistency (pure derivations)
│   ├── history.ts    RunRecord + pure list ops (add/best/average, cap 50)
│   ├── storage.ts    thin localStorage adapter (all access try/catch)
│   └── urlState.ts   ?time=..&seed=.. parse/build; invalid fields dropped
├── ui/
│   ├── WordStream.tsx   sliding window, per-char styling, caret
│   ├── Sparkline.tsx    DPR-aware canvas, redraws only on new samples
│   ├── Heatmap.tsx      QWERTY error heat map + mobile error chips
│   ├── ResultsPanel.tsx end-of-test card
│   └── HistoryPanel.tsx local history drawer
├── index.tsx       root: clock, input, URL, history, debug seam
├── meta.ts         LabMeta (portfolio contract)
└── types.ts        LabMeta type, structurally identical to the portfolio's
```

### State machine (`typing.ts`)

- `createTest({timeMs, wordCount, seed, now}) → idle`
- `applyKey(state, key, now)` — one keystroke; the first char flips
  `idle → running` and starts the clock.
- `tick(state, now)` — clock pulse with no input; the UI calls it at 10 Hz
  so second-boundary samples and the end boundary are **wall-clock
  accurate even during pauses**.
- Both return new states (checked by test — the previous state is never
  mutated).

**Counting rules** (deliberate, and tested):

- only `a–z` and space count; punctuation, caps (folded), and pastes are
  dropped silently — they are not errors;
- a wrong character is one error and the caret advances (no "stuck until
  backspaced" mode);
- `wpm = correctChars / 5 / minutes`, `rawWpm` same with all counted
  keystrokes; `accuracy = correct / (correct + error)`;
- `consistency = 1 − σ(samples)/mean(samples)` over per-second WPM,
  clamped to [0, 1];
- per-second samples: WPM for each completed second. When several seconds
  are missed between pulses (tab switch), the whole delta is attributed to
  the first missed second — a burst-then-pause is exactly what
  consistency should flag. At steady 10 Hz one second crosses per tick, so
  samples are exact;
- the final partial second is recorded only if typing happened in it
  (a trailing 0 would penalize perfectly even typing that ends at a
  boundary).

### Input model

One hidden, **uncontrolled** `<input>` is the single source of characters:
physical and virtual keyboards both emit `input` events, so mobile and
desktop run identical code paths. Backspace arrives as an `input` event
with empty value. Multi-char events (paste) are rejected. `keydown` is
reserved for `Enter`/`Escape` (restart) and never inserts text. Modifier
combos pass through so `Cmd/Ctrl+W` and the like keep working.

### Shareable URLs

`?time=10|15|20|30&seed=N`. On load: invalid fields drop individually, a
missing seed is minted and written back (canonical URL). "Share this text"
copies the URL — same text for everyone.

### Debug seam

`window.__TYPELAB__ = { getState, typeText, advance, restart }` —
deterministic keyboard-free typing, used by the browser-verification pass
and available to anyone who opens devtools.

## Testing strategy

`node --test`, zero dependencies, all over pure engine modules:

- **rng** — determinism, range, seed sensitivity
- **words** — size, charset, length cap, uniqueness
- **sample** — determinism, pool membership, no adjacent repeats,
  stream/wordStarts alignment, sizing for fast typists
- **typing** — start-on-first-char, error counting + per-key marks,
  backspace semantics (display un-marks, counts don't), early end,
  expiry at exactly `startedAt + timeMs`, per-second sampling incl.
  missed seconds, immutability
- **stats** — WPM/accuracy math on constructed runs, empty-run safety,
  consistency = 1 for even typing, clamping
- **history** — prepend/cap, best, average
- **urlState** — defaults, valid/invalid fields, canonical round-trips

## GitHub Pages

Vite `base: '/typing-lab/'`; `.github/workflows/pages.yml` builds on push
to `main` and deploys via `actions/deploy-pages` →
`https://devdonner.github.io/typing-lab/`. The portfolio lift ignores all
of this: it copies only `src/lab/`.

## Risks / known limits

- Per-second WPM attribution over long pauses is approximate by design
  (documented above); it is exact in normal operation.
- The word pool is English-only by intent; no i18n.
- 200 WPM+ testers could in theory outrun the text at 10s (sampler adds
  +20 words of headroom over a 200 WPM estimate; the early-end path is
  handled and tested regardless).
