'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t, type I18NKey } from '@/lib/i18n'
import { ClockFace } from '@/components/ClockFace'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { HintButton, HintOffer, HintScaffold, type HintStep } from '@/components/hints'
import { CLOCK_LADDER, genClockTask, diagnoseClock, fmtTime, type ClockTask, type ClockLevel } from '@/lib/clock'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

// Telling the time, taught as a ladder instead of the random 5-minute times the
// /game/clock arcade throws from the first second: whole hours → half → quarter
// → fives. Four right in a rung moves up, two wrong in a row moves back down,
// so a child who is lost lands on ground they can still read.
const LEVEL_LABEL: Record<ClockLevel, I18NKey> = {
  hour: 'clock_lvl_hour', half: 'clock_lvl_half', quarter: 'clock_lvl_quarter', five: 'clock_lvl_five',
}
const FB: Record<string, I18NKey> = {
  swapped_hands: 'clock_fb_swapped', hour_ahead: 'clock_fb_ahead', minute_as_number: 'clock_fb_number',
}
const UP = 4, DOWN = 2

export default function ClockTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [task, setTask] = useState<ClockTask | null>(null)
  const [lvl, setLvl] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  const offerNext = useRef(false)
  const inLevel = useRef(0)       // correct in a row at this rung
  const missed = useRef(0)        // wrong in a row
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = (level = lvl) => {
    setTask(genClockTask(CLOCK_LADDER[level])); setPicked(null); setStatus('idle')
    setHint(false); setOffer(offerNext.current); offerNext.current = false
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newProblem(0) }, [])

  const bankXp = async (amt: number) => {
    if (amt <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
    await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + amt }).eq('id', user.id)
    void touchStreak(supabase)
  }
  const rnd = useRound(bankXp)

  const finishProblem = (wasCorrect: boolean) => {
    setTotal(c => c + 1)
    void logTrainerAttempt(supabase, 'g2_clock', wasCorrect)
    // Move the rung BEFORE the next task is generated, so it takes effect now.
    let next = lvl
    if (wasCorrect) {
      inLevel.current += 1; missed.current = 0
      if (inLevel.current >= UP && lvl < CLOCK_LADDER.length - 1) { next = lvl + 1; inLevel.current = 0 }
    } else {
      missed.current += 1; inLevel.current = 0
      if (missed.current >= DOWN && lvl > 0) { next = lvl - 1; missed.current = 0 }
    }
    if (next !== lvl) setLvl(next)
    rnd.conclude(wasCorrect, () => newProblem(next))
  }

  const pick = (opt: string) => {
    if (status !== 'idle' || !task) return
    playTap(); setPicked(opt)
    if (opt === task.answer) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1100)
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); offerNext.current = true
    }
  }

  const stop = () => { rnd.bankPartial(); setEnded(true) }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    setLvl(0); inLevel.current = 0; missed.current = 0
    rnd.resetRound(); newProblem(0)
  }

  if (rnd.milestone) {
    return <RoundMilestone lang={lang} roundCorrect={rnd.roundCorrect} streak={streak}
      onContinue={() => rnd.continueRound(() => newProblem())} onFinish={() => { rnd.setMilestone(false); setEnded(true) }} />
  }

  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🕐'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_clock_title', lang)}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-1" style={{ color: 'var(--warning)' }}>🔥 {t('train_best', lang)}: {best}</p>
        <p className="font-black text-xl mb-10 tabular" style={{ color: 'var(--primary-ink)' }}>+{correct * 2} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/train')}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
            style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
            {t('game_home', lang)}
          </button>
          <button onClick={restart}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black"
            style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  if (!task) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const slip = status === 'wrong' && picked ? diagnoseClock(task.h, task.m, picked) : null

  // Two questions, both answered off the dial. Step 1 is the whole half-past
  // difficulty in one line: the hour is the number the short hand has PASSED,
  // not the nearer one. Step 2 turns the long hand into a count of fives.
  const hintSteps: HintStep[] = [
    { ask: t('hint_clk_short', lang), answer: task.h, lo: 1, hi: 12 },
    ...(task.m > 0 ? [{ ask: t('hint_clk_long', lang), answer: task.m / 5, lo: 0, hi: 11 }] : []),
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-11 h-11 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🕐 {t('train_clock_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        {/* Which rung the child is on — visible progress, not a hidden state */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-black px-3 py-1.5 rounded-full"
            style={{ background: 'color-mix(in oklch, var(--brand) 14%, var(--card))', color: 'var(--brand)' }}>
            {t(LEVEL_LABEL[CLOCK_LADDER[lvl]], lang)}
          </span>
        </div>

        <div className="bg-card rounded-3xl px-4 py-5 shadow-[var(--shadow-md)] flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-muted-foreground">{t('clock_q', lang)}</p>
          <ClockFace h={task.h} m={task.m} size={190} />

          {/* The legend the hints refer to */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--primary-ink)' }}>
              <span className="w-4 h-[5px] rounded-full" style={{ background: 'var(--primary)' }} /> {t('clock_hand_short', lang)}
            </span>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--brand)' }}>
              <span className="w-7 h-[3px] rounded-full" style={{ background: 'var(--brand)' }} /> {t('clock_hand_long', lang)}
            </span>
          </div>

          {status !== 'idle' && (
            <p className="text-3xl font-display font-black tabular-nums animate-mk-pop"
              style={{ color: status === 'right' ? 'var(--success)' : 'var(--foreground)' }}>
              {fmtTime(task.h, task.m)}
            </p>
          )}
          {slip && FB[slip] && (
            <p className="text-sm font-semibold text-center animate-mk-pop-in" style={{ color: 'var(--destructive)' }}>
              {t(FB[slip], lang)}
            </p>
          )}
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(task.m === 0 ? 'hint_clk_hour_rule' : 'hint_clk_rule', lang)}
            steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {task.options.map(opt => {
            const isAns = opt.value === task.answer
            const isPicked = picked === opt.value
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={opt.value} onClick={() => pick(opt.value)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-5 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {opt.value}
              </button>
            )
          })}
        </div>

        {status === 'wrong' && (
          <button onClick={() => finishProblem(false)}
            className="pop-btn w-full font-display text-white font-black text-xl rounded-[var(--radius)] py-4 flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('next', lang)} <ArrowRight size={20} />
          </button>
        )}

        {!hint && status === 'idle' && <HintButton lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
      </main>

      <div className="px-4 pb-8 pt-4 max-w-md mx-auto w-full">
        <button onClick={stop}
          className="w-full py-3.5 rounded-[var(--radius)] font-display font-black flex items-center justify-center gap-2 border-2"
          style={{ background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
          <Square size={15} fill="currentColor" /> {t('train_stop', lang)}
        </button>
      </div>
    </div>
  )
}
