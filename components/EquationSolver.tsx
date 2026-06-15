'use client'

import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// Animated solver for x ± a = b and a − x = b.
// • x + a = b / x − a = b : the ±a term flies over the = sign and flips its sign.
// • a − x = b            : x and the result swap → x = a − b.
// The full worked solution stays on screen (equation → rearrangement → result),
// instead of collapsing to just the answer.
export function EquationSolver({ a, op, b, xRight = false, autoPlay = false }: { a: number; op: '+' | '-'; b: number; xRight?: boolean; autoPlay?: boolean }) {
  const lang = useLang()
  const subX = op === '-' && xRight // a − x = b
  const opG = op === '+' ? '+' : '−'
  const flipG = op === '+' ? '−' : '+'
  const answer = subX ? a - b : op === '+' ? b - a : b + a

  const [stage, setStage] = useState(0) // 0 idle | 1 working | 2 rearranged | 3 result
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

    // a − x = b : no transposition flight, just a staged reveal of x = a − b.
    if (subX) {
      timers.current.push(window.setTimeout(() => setStage(2), 650))
      timers.current.push(window.setTimeout(() => setStage(3), 1550))
      return
    }

    // two frames so the (hidden) destination slot is laid out before we measure
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const cont = containerRef.current, src = srcRef.current, dst = dstRef.current, fly = flyRef.current
      if (!cont || !src || !dst || !fly) { setStage(3); return }
      const cb = cont.getBoundingClientRect(), sb = src.getBoundingClientRect(), db = dst.getBoundingClientRect()
      fly.style.left = `${sb.left - cb.left}px`
      fly.style.top = `${sb.top - cb.top}px`
      fly.style.opacity = '1'
      fly.textContent = `${opG} ${a}`
      const dx = db.left - sb.left, dy = db.top - sb.top
      const arc = Math.max(56, Math.abs(dx) * 0.2) + 16
      const anim = fly.animate([
        { transform: 'translate(0px, 0px)' },
        { transform: `translate(${dx / 2}px, ${dy - arc}px)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px)` },
      ], { duration: 820, easing: 'cubic-bezier(.4,.02,.25,1)' })
      // flip the sign at the apex
      timers.current.push(window.setTimeout(() => { if (flyRef.current) flyRef.current.textContent = `${flipG} ${a}` }, 420))
      anim.onfinish = () => {
        if (flyRef.current) flyRef.current.style.opacity = '0'
        setStage(2)
        timers.current.push(window.setTimeout(() => setStage(3), 950))
      }
    }))
  }

  // Auto-play the worked steps once when used as a "show how" example.
  useEffect(() => {
    if (!autoPlay) return
    const id = requestAnimationFrame(() => play())
    return () => { cancelAnimationFrame(id); clearTimers() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const big = 'text-[32px] sm:text-4xl font-display font-black tabular-nums leading-none'
  const playing = stage >= 1 && stage < 3
  const hintKey = stage === 0 ? 'eq_hint_intro' : stage < 3 ? (subX ? 'eq_hint_swap' : 'eq_hint_move') : 'eq_hint_done'

  return (
    <div className="rounded-2xl p-4 w-full max-w-full min-w-0 overflow-x-hidden" style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))' }}>
      <div ref={containerRef} className="relative flex flex-col items-center justify-center gap-3 py-2 min-h-[156px]">

        {/* Row 1 — the equation */}
        <div className={`flex items-center gap-2 ${big}`}>
          {subX ? (
            <>
              <span className="text-foreground">{a}</span>
              <span className="text-muted-foreground">−</span>
              <span className="inline-flex items-center rounded-lg px-1.5 transition-colors duration-300"
                style={{ background: stage >= 1 ? 'color-mix(in oklch, var(--accent) 32%, transparent)' : 'transparent', color: 'var(--primary)' }}>
                x
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground">{b}</span>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--primary)' }}>x</span>
              <span ref={srcRef} className="inline-flex items-center rounded-lg px-1.5 transition-colors duration-300"
                style={{ background: stage >= 1 ? 'color-mix(in oklch, var(--accent) 32%, transparent)' : 'transparent', color: 'var(--foreground)' }}>
                {opG}&thinsp;{a}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="text-foreground">{b}</span>
            </>
          )}
        </div>

        {/* Row 2 — the rearrangement (stays visible) */}
        {stage >= 1 && (
          <div className={`flex items-center gap-2 ${big}`}
            style={subX ? { opacity: stage >= 2 ? 1 : 0, transition: 'opacity .3s ease' } : undefined}>
            <span style={{ color: 'var(--primary)' }}>x</span>
            <span className="text-muted-foreground">=</span>
            {subX ? (
              <>
                <span className="text-foreground">{a}</span>
                <span className="text-muted-foreground">−</span>
                <span className="text-foreground">{b}</span>
              </>
            ) : (
              <>
                <span className="text-foreground">{b}</span>
                <span ref={dstRef} className="inline-flex items-center rounded-lg px-1.5 transition-opacity duration-200"
                  style={{ opacity: stage >= 2 ? 1 : 0, color: 'var(--foreground)' }}>
                  {flipG}&thinsp;{a}
                </span>
              </>
            )}
          </div>
        )}

        {/* Row 3 — the result (added below, not replacing row 2) */}
        {stage >= 3 && (
          <div className={`flex items-center gap-2 ${big}`}>
            <span style={{ color: 'var(--primary)' }}>x</span>
            <span className="text-muted-foreground">=</span>
            <span className="animate-mk-pop" style={{ color: 'var(--success)' }}>{answer}</span>
          </div>
        )}

        {/* Flying term (transposition forms only) */}
        {!subX && (
          <div ref={flyRef} className={`absolute top-0 left-0 inline-flex items-center rounded-lg px-1.5 pointer-events-none ${big}`}
            style={{ opacity: 0, background: 'color-mix(in oklch, var(--accent) 36%, transparent)', color: 'var(--foreground)' }} />
        )}
      </div>

      {/* Hint + control */}
      <div className="flex items-center justify-between gap-3 mt-1">
        <p className="text-xs text-muted-foreground flex-1 leading-snug">{t(hintKey, lang)}</p>
        <button onClick={play} disabled={playing}
          className="shrink-0 px-3.5 py-1.5 rounded-[var(--radius)] font-display font-black text-xs text-white active:scale-95 transition-transform disabled:opacity-50"
          style={{ background: 'var(--primary)' }}>
          {stage === 0 ? t('eq_play', lang) : t('eq_replay', lang)}
        </button>
      </div>
    </div>
  )
}
