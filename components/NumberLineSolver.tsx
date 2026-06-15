'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// Animated number-line explainer for a ± b (within 100).
// Hops along the line by tens, then ones — the school "по разрядам" method.
export function NumberLineSolver({ a, op, b }: { a: number; op: '+' | '-'; b: number }) {
  const lang = useLang()
  const add = op === '+'
  const result = add ? a + b : a - b

  const tens = Math.floor(b / 10) * 10
  const ones = b % 10
  const hops = [tens, ones].filter(d => d > 0)
  // points along the line: [a, …mids…, result]
  const points: number[] = [a]
  let acc = a
  for (const d of hops) { acc = add ? acc + d : acc - d; points.push(acc) }

  const lo = Math.min(a, result), hi = Math.max(a, result)
  const span = Math.max(1, hi - lo)
  const pad = Math.max(2, Math.round(span * 0.28))
  const visLo = lo - pad, visHi = hi + pad
  const W = 320, padX = 28, baseY = 82, arcH = 42
  const X = (n: number) => padX + ((n - visLo) / (visHi - visLo)) * (W - 2 * padX)

  // When two adjacent points sit close together (e.g. a small "+1" final hop,
  // 56 → 57), their labels overlap. Drop the earlier label to a second row so
  // both stay readable.
  const labelLowered = points.map((p, i) =>
    i < points.length - 1 && X(points[i + 1]) - X(p) < 22)

  const [step, setStep] = useState(0) // 0 idle | 1..n reveal hops | n+1 result
  const n = hops.length
  const done = step === n + 1
  const playing = step >= 1 && step <= n
  const timers = useRef<number[]>([])
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const play = () => {
    clear()
    setStep(0)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setStep(1)
      for (let i = 2; i <= n; i++) timers.current.push(window.setTimeout(() => setStep(i), (i - 1) * 880))
      timers.current.push(window.setTimeout(() => setStep(n + 1), n * 880))
    }))
  }

  const opG = add ? '+' : '−'
  const cssPrimary = { color: 'var(--primary)' }

  return (
    <div className="rounded-2xl p-4 w-full max-w-full min-w-0 overflow-hidden" style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))' }}>
      {/* Equation header */}
      <p className="text-[26px] sm:text-3xl font-display font-black text-center tabular-nums leading-none mb-1">
        <span className="text-foreground">{a}</span>
        <span className="mx-1.5" style={{ color: 'var(--accent)' }}>{opG}</span>
        <span className="text-foreground">{b}</span>
        <span className="mx-1.5 text-muted-foreground">=</span>
        {done
          ? <span className="animate-mk-pop" style={{ color: 'var(--success)' }}>{result}</span>
          : <span className="text-muted-foreground">?</span>}
      </p>

      {/* Number line */}
      <svg viewBox="0 0 320 134" className="w-full select-none" aria-hidden>
        <line x1={X(visLo)} y1={baseY} x2={X(visHi)} y2={baseY} strokeWidth="2.5" strokeLinecap="round" style={{ stroke: 'var(--border)' }} />

        {/* Hops (arcs) */}
        {hops.map((d, i) => {
          const x0 = X(points[i]), x1 = X(points[i + 1]), midx = (x0 + x1) / 2
          const drawn = step >= i + 1
          return (
            <g key={i}>
              <path d={`M ${x0} ${baseY} Q ${midx} ${baseY - arcH} ${x1} ${baseY}`} fill="none" strokeWidth="3" strokeLinecap="round"
                pathLength={100}
                style={{ stroke: 'var(--primary)', strokeDasharray: 100, strokeDashoffset: drawn ? 0 : 100, transition: 'stroke-dashoffset .72s ease' }} />
              <text x={midx} y={baseY - arcH - 6} textAnchor="middle" fontSize="13" fontWeight="800"
                style={{ fill: 'var(--primary)', opacity: drawn ? 1 : 0, transition: 'opacity .3s ease .3s' }}>
                {opG}{d}
              </text>
            </g>
          )
        })}

        {/* Points + labels */}
        {points.map((p, i) => {
          const reached = i === 0 || step >= i
          const isResult = i === points.length - 1
          const dotColor = isResult && done ? 'var(--success)' : i === 0 ? 'var(--foreground)' : 'var(--primary)'
          return (
            <g key={i} style={{ opacity: reached ? 1 : 0, transition: 'opacity .3s ease' }}>
              <circle cx={X(p)} cy={baseY} r={isResult ? 6 : 4.5} style={{ fill: dotColor }} />
              <text x={X(p)} y={baseY + (labelLowered[i] ? 38 : 22)} textAnchor="middle" fontSize="14" fontWeight="900"
                style={{ fill: isResult && done ? 'var(--success)' : 'var(--foreground)' }}>{p}</text>
            </g>
          )
        })}
      </svg>

      {/* Hint + control */}
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs text-muted-foreground flex-1 leading-snug">
          {step === 0 ? t('eq_hint_intro', lang) : !done ? t('nl_hint', lang) : t('nl_done', lang)}
        </p>
        <button onClick={play} disabled={playing}
          className="shrink-0 px-3.5 py-1.5 rounded-[var(--radius)] font-display font-black text-xs text-white active:scale-95 transition-transform disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          {step === 0 ? t('eq_play', lang) : t('eq_replay', lang)}
        </button>
      </div>
    </div>
  )
}
