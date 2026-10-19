import { useEffect, useRef } from 'react'

/**
 * Sustained-WPM sparkline — per-second samples drawn on a canvas.
 * Redraws only when a new sample lands; DPR-aware; no dependencies.
 */

export interface SparklineProps {
  samples: number[]
  /** Test length in seconds (x-axis extent). */
  seconds: number
  /** Baseline scale: the y-axis always shows at least this WPM. */
  floor?: number
}

export function Sparkline({ samples, seconds, floor = 60 }: SparklineProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth
    const h = cv.clientHeight
    if (w === 0 || h === 0) return
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const max = Math.max(floor, ...samples, 1)
    const x = (i: number) => (seconds <= 1 ? 0 : (i / (seconds - 1)) * (w - 2) + 1)
    const y = (v: number) => h - 2 - (v / max) * (h - 8)

    // baseline
    ctx.strokeStyle = 'rgba(147,161,181,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y(0) + 0.5)
    ctx.lineTo(w, y(0) + 0.5)
    ctx.stroke()

    if (samples.length >= 2) {
      // area
      ctx.beginPath()
      ctx.moveTo(x(0), y(samples[0]))
      for (let i = 1; i < samples.length; i++) ctx.lineTo(x(i), y(samples[i]))
      ctx.lineTo(x(samples.length - 1), h)
      ctx.lineTo(x(0), h)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(126,231,135,0.28)')
      grad.addColorStop(1, 'rgba(126,231,135,0.02)')
      ctx.fillStyle = grad
      ctx.fill()
      // line
      ctx.beginPath()
      ctx.moveTo(x(0), y(samples[0]))
      for (let i = 1; i < samples.length; i++) ctx.lineTo(x(i), y(samples[i]))
      ctx.strokeStyle = '#7ee787'
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.stroke()
      // latest point
      const li = samples.length - 1
      ctx.beginPath()
      ctx.arc(x(li), y(samples[li]), 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#b6f2c0'
      ctx.fill()
    }
  }, [samples, seconds, floor])

  return <canvas ref={ref} className="h-12 w-full" aria-hidden />
}
