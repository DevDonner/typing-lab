import type { ReactNode } from 'react'
import type { SampledText } from '../engine/sample.ts'

/**
 * The word stream — the heart of the lab.
 *
 * Renders a sliding window of `visible` words centered so the current word
 * sits ~a third of the way in. Characters are styled by their relation to
 * the caret (`pos`): typed-correct, typed-error, or untyped. The caret is a
 * pulsing bar rendered inline (before the character at `pos`, or after the
 * last word at end-of-stream).
 *
 * Terminal palette, expressed with host-safe utilities only:
 * default palette + host tokens + arbitrary hex (no lab-only theme tokens).
 */

export interface WordStreamProps {
  text: SampledText
  pos: number
  errors: number[]
  /** Words visible in the window (the parent picks this for the viewport). */
  visible: number
}

const CARET = (
  <span
    aria-hidden
    className="mx-px inline-block h-[1.05em] w-[3px] translate-y-[0.14em] animate-pulse rounded-[1px] bg-[#7ee787]"
  />
)

export function WordStream({ text, pos, errors, visible }: WordStreamProps) {
  const { words, wordStarts } = text
  const errorSet = new Set(errors)

  // Current word = last word whose start index is <= pos.
  let current = 0
  for (let i = 0; i < wordStarts.length; i++) {
    if (wordStarts[i] <= pos) current = i
    else break
  }
  const start = Math.max(0, Math.min(current - 2, words.length - visible))
  const end = Math.min(start + visible, words.length)

  const atPos = (g: number) =>
    pos === g ? <span key={`c${g}`}>{CARET}</span> : null

  const nodes: ReactNode[] = []
  for (let i = start; i < end; i++) {
    if (i > start) {
      // The space between word i-1 and word i sits at this index.
      const spaceIdx = wordStarts[i - 1] + words[i - 1].length
      nodes.push(
        <span key={`s${spaceIdx}`} className="whitespace-pre">
          {atPos(spaceIdx)}{' '}
        </span>,
      )
    }
    const wStart = wordStarts[i]
    const chars = []
    for (let k = 0; k < words[i].length; k++) {
      const g = wStart + k
      const ch = text.stream[g]
      let cls: string
      if (g < pos) cls = errorSet.has(g) ? 'text-[#f87171] bg-[#f87171]/10' : 'text-[#7ee787]'
      else if (g === pos) cls = 'text-slate-100'
      else cls = 'text-[#3d4b60]'
      chars.push(
        <span key={g} className={cls}>
          {atPos(g)}
          {ch}
        </span>,
      )
    }
    nodes.push(
      <span key={`w${i}`} className="mr-[0.6ch] inline-block whitespace-pre font-mono">
        {chars}
      </span>,
    )
  }
  // End-of-stream caret (only reachable when the text is exhausted).
  if (pos >= text.stream.length) nodes.push(<span key="end">{CARET}</span>)

  return <div className="text-lg leading-relaxed tracking-tight sm:text-2xl md:text-[28px]">{nodes}</div>
}
