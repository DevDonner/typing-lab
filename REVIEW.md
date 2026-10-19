# REVIEW — typing-lab (2026-10-18)

Independent pass over the finished build: gate verification, breakpoint audit,
refine cycles. Findings below with severity and disposition — every P1 was
closed and re-verified before the final push.

## Gate results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 toolchain | ✅ | `npm run build` (tsc strict + vite) clean — 243 kB raw / 77 kB gzip (harness incl. fonts) |
| G2 correctness | ✅ | 40/40 `node --test` across 7 suites: rng determinism/range; word-pool invariants (size ≥ 400, charset, cap, uniqueness); sampler (determinism, pool membership, no adjacent repeats, stream/wordStarts alignment); state machine (start-on-first-char, error counts + per-key marks, backspace display-vs-count semantics, early end, expiry at exactly `startedAt + timeMs`, per-second sampling incl. missed seconds, immutability); stats math; history cap/best/average; URL round-trips |
| G3 runtime | ✅ | Real Edge: full test lifecycle — start-on-type, live readout, per-second sparkline, heat map, 30 s expiry, results card, history record in `localStorage`, Enter-restart. Zero console errors. Debug-seam readback matched hand-computed counts exactly (23 keys → 20 correct / 3 errors, cascade after an off-by-one typo reproduced key-by-key) |
| G4 responsive | ✅ | Captured 1440 / 768 / 375 (mobile emulation, dpr 2): `screenshots/`. At 375: options wrap, 9-word window, heat map → "most mistyped" chips, stream fits with no page overflow |
| G5 keyboard | ✅ | `Enter` restart verified with a **trusted** CDP key event (`isTrusted: true`, delivered to the capture input, `defaultPrevented: true`, fresh seed written to URL). `Esc` shares the same handler path. Character/backspace flow verified through the `input`-event path (the one real keyboards use) |
| G6 a11y | ✅ | sr-only `aria-live="polite"` region announces ready → running (seconds left + wpm) → complete (wpm + accuracy); time pills `aria-pressed`; results `role="dialog"`; history open/close buttons labeled; capture input `aria-hidden` + `tabIndex=-1` |
| G7 URL state | ✅ | Load canonicalization (seed minted + written back), invalid fields drop individually (`?time=99&seed=abc` → 30 s, no seed), share-link round-trip tested; live verification: seed preserved across restarts, `time` change updates URL |
| G8 portability | ✅ | Lift check: `src/lab/` copied verbatim into `portfolio/src/labs/typing-lab/` → portfolio `tsc --noEmit && vite build` green, lab auto-discovered, code-split to its own 23 kB chunk; portfolio reverted to clean. All in-lab imports are relative-within-lab or `react`; colors are host tokens + default palette + arbitrary values only |
| G9 hygiene | ✅ | No TODO/FIXME/HACK; strict tsc with `noUnusedLocals/Parameters` clean; JSDoc on the public API; zero runtime network (bundled word pool, no audio, localStorage only) |

## Findings

### F1 — P1 — Standalone harness collapsed to content height — **fixed**
The lab fills its container with `h-full` (correct for the portfolio shell),
but the harness page gave `#root` no height, so the lab rendered at the top
with a dead area below the footer. Fix: harness-only CSS
(`html, body, #root { height: 100% }`) in `src/index.css` — never lifted.
Re-verified at all three viewports.

### F2 — P1 — Per-second WPM samples off by one second on missed seconds — **fixed**
When several second boundaries were crossed between pulses (a user pausing),
the whole delta was attributed to the *current* second instead of the first
missed one, so a burst-then-pause read as a late burst and skewed
consistency. Discovered by the "long pauses" test expecting `[12, 0, 0]` and
getting `[0, 0, 12]`. Fix: attribute the delta to the first missed second
(exact in steady 10 Hz operation, where one second crosses per tick);
documented in DESIGN.md; regression test in place.

### F3 — P2 — Trailing zero sample penalized perfectly even typing — **fixed**
The end-of-test closeout pushed a final partial-second sample unconditionally;
a test that ends at a boundary with no typing in the last fragment gained a
spurious `0`, dragging consistency below 1 for perfectly even typing. Fix:
close out only when `delta > 0`. Test: even typing → samples `[60, 60, 60]`,
consistency exactly 1.

### F4 — P2 — Debug seam `getState()` stale until re-render — **fixed**
`typeText`/`advance` called `setTest` but the ref was only refreshed on
render, so a synchronous readback right after a batch of keys returned the
pre-batch state (looked like "typing did nothing"). Fix: update
`testRef.current` inside the seam before `setTest`.

### F5 — P2 — Word pool violated its own layout cap — **fixed**
Several pool entries were 12–15 chars (`theoretically`, `optimistically`, …)
while `MAX_WORD_LEN` is 11. Fix: the cap is now enforced structurally in
`words.ts` (filter at module load), with the test asserting the invariant.

### F6 — P2 — `keydown` listener missed non-bubbling document dispatches — **fixed**
Restart keys were listened for on `window`; events dispatched at the document
node without bubbling (as the browser harness does) never arrived. Fix: listen
on `document`, match key names case-insensitively. Re-verified with a trusted
CDP `Enter`.

## Refine cycles

**Cycle 1 — engine edge cases (3 findings: F2, F3, F5 — all fixed, re-tested):**
- Missed-second sampling (tab-switch scenario), even-typing consistency,
  pool invariants.

**Cycle 2 — browser lifecycle (2 findings: F4, F6 — all fixed, re-verified):**
- Full run: idle → type → pause (samples flatten) → expiry → results →
  history drawer → share copy → Enter restart. New-seed URL each restart.
- 375 mobile run: virtual-keyboard-equivalent path, error chips, no overflow.

**Stop rule:** two consecutive cycles with zero new P0/P1 — met (cycle 3 was a
final screenshot + lift pass with no changes).

## Notes (no action needed)

- **N1** — The `browserKey` harness requires capitalized key names
  (`'Enter'`, not `'enter'`); the app matches case-insensitively anyway.
- **N2** — Per-second attribution over multi-second pauses is approximate by
  design (delta → first missed second); exact in normal 10 Hz operation.
  Documented in DESIGN.md.
- **N3** — Fonts differ by host (JetBrains Mono in the harness, system mono in
  the portfolio). The lab uses the `font-mono` utility only, so this is the
  intended lift behavior, not a defect.

## Verdict

All nine gates green. Six findings across the build (two P1, four P2) — all
closed and re-verified in-browser before the final push. Lift verified against
the portfolio and reverted. Ready for the portfolio.
