'use client'

import { useRef, useState } from 'react'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// Animated "move across the = sign" solver for x ± a = b.
// The ±a term flies over the equals sign to the other side and flips its sign.
export function EquationSolver({ a, op, b }: { a: number; op: '+' | '-'; b: number }) {
  const lang = useLang()
  const opG = op === '+' ? '+' : '−'
  const flipG = op === '+' ? '−' : '+'
  const answer = op === '+' ? b - a : b + a

  const [stage, setStage] = useState(0) // 0 idle | 1 moving | 2 landed | 3 result
  const containerRef = useRef<HTMLDivElement | null>(null)
  const srcRef = useRef<HTMLSpanElement | null>(null)
  const dstRef = useRef<HTMLSpanElement | null>(null)
  const flyRef = useRef<HTMLDivElement | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const play = () => {
    clearTimers()
    if (flyRef.current) flyRef.current.style.opacity = '0'
    setStage(1)
    // two frames so the (hidden) destination slot is laid out before we measure
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const cont = containerRef.current, src = srcRef.current, dst = dstRef.current, fly = flyRef.current
      if (!cont || !src || !dst || !fly) { setStage(3); return }
      const cb = cont.getBoundingClientRect(), sb = src.getBoundingClientRect(), db = dst.getBoundingClientRect()
      fly.style.left = `${sb.left - cb.left}px`
      fly.style.top = `${sb.top - cb.top}px`
      fly.style.opacity = '1'
      fly.textContent = `${opG} ${a}`
      const dx = db.left - sb.left, dy = db.top - sb.top
      const arc = Math.max(56, Math.abs(dx) * 0.2) + 16
      const anim = fly.animate([
        { transform: 'translate(0px, 0px)' },
        { transform: `translate(${dx / 2}px, ${dy - arc}px)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px)` },
      ], { duration: 820, easing: 'cubic-bezier(.4,.02,.25,1)' })
      // flip the sign at the apex
      timers.current.push(window.setTimeout(() => { if (flyRef.current) flyRef.current.textContent = `${flipG} ${a}` }, 420))
      anim.onfinish = () => {
        if (flyRef.current) flyRef.current.style.opacity = '0'
        setStage(2)
        timers.current.push(window.setTimeout(() => setStage(3), 950))
      }
    }))
  }

  const big = 'text-[32px] sm:text-4xl font-display font-black tabular-nums leading-none'
  const playing = stage === 1 || stage === 2

  return (
    <div className="rounded-2xl p-4 w-full max-w-full min-w-0 overflow-x-hidden" style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))' }}>
      <div ref={containerRef} className="relative flex flex-col items-center justify-center gap-3 py-2 min-h-[124px]">

        {/* Row 1 — the equation */}
        <div className={`flex items-center gap-2 ${big}`}>
          <span style={{ color: 'var(--primary)' }}>x</span>
          <span ref={srcRef} className="inline-flex items-center rounded-lg px-1.5 transition-colors duration-300"
            style={{ background: stage >= 1 ? 'color-mix(in oklch, var(--accent) 32%, transparent)' : 'transparent', color: 'var(--foreground)' }}>
            {opG}&thinsp;{a}
          </span>
          <span className="text-muted-foreground">=</span>
          <span className="text-foreground">{b}</span>
        </div>

        {/* Row 2 — the worked solution */}
        {stage >= 1 && (
          <div className={`flex items-center gap-2 ${big}`}>
            <span style={{ color: 'var(--primary)' }}>x</span>
            <span className="text-muted-foreground">=</span>
            {stage < 3 ? (
              <>
                <span className="text-foreground">{b}</span>
                <span ref={dstRef} className="inline-flex items-center rounded-lg px-1.5 transition-opacity duration-200"
                  style={{ opacity: stage >= 2 ? 1 : 0, color: 'var(--foreground)' }}>
                  {flipG}&thinsp;{a}
                </span>
              </>
            ) : (
              <span className="animate-mk-pop" style={{ color: 'var(--success)' }}>{answer}</span>
            )}
          </div>
        )}

        {/* Flying term */}
        <div ref={flyRef} className={`absolute top-0 left-0 inline-flex items-center rounded-lg px-1.5 pointer-events-none ${big}`}
          style={{ opacity: 0, background: 'color-mix(in oklch, var(--accent) 36%, transparent)', color: 'var(--foreground)' }} />
      </div>

      {/* Hint + control */}
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs text-muted-foreground flex-1 leading-snug">
          {stage === 0 ? t('eq_hint_intro', lang) : stage < 3 ? t('eq_hint_move', lang) : t('eq_hint_done', lang)}
        </p>
        <button onClick={play} disabled={playing}
          className="shrink-0 px-3.5 py-1.5 rounded-[var(--radius)] font-display font-black text-xs text-white active:scale-95 transition-transform disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          {stage === 0 ? t('eq_play', lang) : t('eq_replay', lang)}
        </button>
      </div>
    </div>
  )
}
