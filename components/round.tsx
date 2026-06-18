'use client'

// Shared "round of N" layer for the endless trainers. Kids tire of an infinite
// drill — this gives a visible finish line (RoundDots), a win + natural stopping
// point every N problems (RoundMilestone), and banks XP per finished round so
// quitting after a milestone never loses progress.

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { t, type Lang } from '@/lib/i18n'

export const ROUND = 10

export function useRound(bankXp: (n: number) => void, round: number = ROUND) {
  const [roundDone, setRoundDone] = useState(0)      // problems finished this round (0..round)
  const [roundCorrect, setRoundCorrect] = useState(0)
  const [milestone, setMilestone] = useState(false)

  // Call when a problem concludes (solved or skipped). Advances via next(), or
  // surfaces the milestone every `round` problems — banking that round's XP now.
  const conclude = (wasCorrect: boolean, next: () => void) => {
    const done = roundDone + 1
    const rc = roundCorrect + (wasCorrect ? 1 : 0)
    setRoundDone(done)
    if (wasCorrect) setRoundCorrect(rc)
    if (done >= round) { bankXp(rc * 2); setMilestone(true) }
    else next()
  }
  const continueRound = (next: () => void) => { setMilestone(false); setRoundDone(0); setRoundCorrect(0); next() }
  const resetRound = () => { setRoundDone(0); setRoundCorrect(0); setMilestone(false) }
  // Stop mid-round → bank the unfinished round (completed rounds were banked at their milestones).
  const bankPartial = () => bankXp(roundCorrect * 2)

  return { round, roundDone, roundCorrect, milestone, setMilestone, conclude, continueRound, resetRound, bankPartial }
}

export function RoundDots({ done, round = ROUND }: { done: number; round?: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: round }).map((_, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{ background: i < done ? 'var(--success)' : 'color-mix(in oklch, var(--foreground) 14%, var(--card))' }} />
      ))}
    </div>
  )
}

export function RoundMilestone({ lang, roundCorrect, round = ROUND, streak, onContinue, onFinish }: {
  lang: Lang; roundCorrect: number; round?: number; streak: number; onContinue: () => void; onFinish: () => void
}) {
  const pct = Math.round((roundCorrect / round) * 100)
  const medal = roundCorrect >= round - 1 ? '🏆' : roundCorrect >= Math.ceil(round * 0.7) ? '🎉' : '💪'
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
      <div className="text-6xl mb-4 animate-mk-pop-in">{medal}</div>
      <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('round_done_title', lang)}</h2>
      <p className="text-muted-foreground mb-1 tabular">{roundCorrect} / {round} · {pct}%</p>
      <p className="font-black tabular mb-1" style={{ color: 'var(--warning)' }}>🔥 {streak}</p>
      <p className="font-black text-xl mb-10 tabular" style={{ color: 'var(--primary)' }}>+{roundCorrect * 2} XP</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={onFinish}
          className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
          style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
          {t('round_enough', lang)}
        </button>
        <button onClick={onContinue}
          className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black"
          style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
          {t('round_continue', lang)}
        </button>
      </div>
    </div>
  )
}
