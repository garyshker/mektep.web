'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Flame, Target, Zap, CheckCircle2, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { CSSProperties } from 'react'

// Ease-out count-up animation (no Date/performance needed — uses rAF timestamp)
function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0, start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const p = Math.min(1, (now - start) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function LessonComplete({
  stars, correct, total, xp, streak, streakUp, onLessons, onAgain,
}: {
  stars: number; correct: number; total: number; xp: number
  streak: number; streakUp: boolean
  onLessons: () => void; onAgain: () => void
}) {
  const lang = useLang()
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  const cAcc = useCountUp(pct)
  const cCorrect = useCountUp(correct)
  const cXp = useCountUp(xp)

  // Confetti on mount (respect reduced motion)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setTimeout(() => {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.35 }, scalar: 0.9 })
    }, 150)
    return () => clearTimeout(id)
  }, [])

  const Stat = ({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) => (
    <div className="flex-1 bg-card rounded-2xl px-2 py-3 flex flex-col items-center gap-1 shadow-[var(--shadow-sm)]">
      <span style={{ color }}>{icon}</span>
      <span className="font-display font-black text-foreground text-lg tabular leading-none">{value}</span>
      <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>

      {/* Stars with pulsing glow */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: 'var(--shadow-glow)' }} />
        <div className="relative text-6xl animate-mk-pop-in">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
      </div>

      <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('lesson_done', lang)}</h2>
      <p className="text-muted-foreground text-sm mb-6">{t('complete_sub', lang)}</p>

      {/* Stat cards */}
      <div className="flex gap-3 w-full max-w-xs mb-4">
        <Stat icon={<Target size={20} />} value={`${cAcc}%`} label={t('game_accuracy', lang)} color="var(--primary)" />
        <Stat icon={<CheckCircle2 size={20} />} value={`${cCorrect}/${total}`} label={t('game_correct', lang)} color="var(--success)" />
        <Stat icon={<Zap size={20} />} value={`+${cXp}`} label="XP" color="var(--xp)" />
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2 rounded-full px-4 py-2 mb-10"
        style={{ background: 'color-mix(in oklch, var(--warning) 14%, white)' }}>
        <Flame size={18} fill="currentColor" style={{ color: 'var(--warning)' }} />
        {streakUp ? (
          <span className="font-black text-sm tabular" style={{ color: 'var(--warning)' }}>
            {streak - 1} <span className="opacity-50">→</span> {streak} · {t('streak_days', lang)}
          </span>
        ) : (
          <span className="font-black text-sm tabular" style={{ color: 'var(--warning)' }}>
            {streak} · {t('streak_days', lang)}
          </span>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={onLessons}
          className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
          style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
          {t('lessons', lang)}
        </button>
        <button onClick={onAgain}
          className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black flex items-center justify-center gap-1.5"
          style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
          {t('again', lang)} <ArrowRight size={17} />
        </button>
      </div>
    </div>
  )
}
