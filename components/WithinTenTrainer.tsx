'use client'

// Grade-1 steps 4–5: addition / subtraction within 10, on the ten-frame.
// Addition shows both parts (amber a + teal b) — the child counts the total.
// Subtraction shows a counters with b crossed out — the child counts what's left.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { TenFrame } from '@/components/TenFrame'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { HintButton, HintOffer, HintScaffold, type HintStep } from '@/components/hints'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

type P = { a: number; b: number; answer: number }
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function gen(op: '+' | '−'): P {
  if (op === '+') {
    const a = ri(1, 9), b = ri(1, 10 - a)
    return { a, b, answer: a + b }
  }
  const a = ri(2, 10), b = ri(1, a - 1)
  return { a, b, answer: a - b }
}

function buildOptions(answer: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= 0 && d <= 10) s.add(d)
  }
  const arr = [...s]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export function WithinTenTrainer({ op }: { op: '+' | '−' }) {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()
  const titleKey = op === '+' ? 'train_add10_title' as const : 'train_sub10_title' as const
  const qKey = op === '+' ? 'within10_total_q' as const : 'within10_left_q' as const

  const [problem, setProblem] = useState<P | null>(null)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const p = gen(op)
    setProblem(p); setOptions(buildOptions(p.answer)); setPicked(null); setStatus('idle')
    setHint(false); setOffer(false)
  }
  // op is fixed per route
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { newProblem() }, [])

  const bankXp = async (amt: number) => {
    if (amt <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
    await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + amt }).eq('id', user.id)
    void touchStreak(supabase)
  }
  const rnd = useRound(bankXp)

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, op === '+' ? 'g1_add10' : 'g1_sub10', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !problem) return
    playTap(); setPicked(opt)
    if (opt === problem.answer) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1000)
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); setOffer(true)
    }
  }

  const stop = () => { rnd.bankPartial(); setEnded(true) }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    rnd.resetRound(); newProblem()
  }

  if (rnd.milestone) {
    return <RoundMilestone lang={lang} roundCorrect={rnd.roundCorrect} streak={streak}
      onContinue={() => rnd.continueRound(newProblem)} onFinish={() => { rnd.setMilestone(false); setEnded(true) }} />
  }

  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : op === '+' ? '➕' : '➖'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t(titleKey, lang)}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-1" style={{ color: 'var(--warning)' }}>🔥 {t('train_best', lang)}: {best}</p>
        <p className="font-black text-xl mb-10 tabular" style={{ color: 'var(--primary)' }}>+{correct * 2} XP</p>
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

  if (!problem) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">{op === '+' ? '➕' : '➖'} {t(titleKey, lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-4">
          <p className="text-sm font-bold text-muted-foreground">{t(qKey, lang)}</p>
          {op === '+' ? (
            <TenFrame n={problem.a + problem.b} split={problem.a} />
          ) : (
            <TenFrame n={problem.a} removed={problem.b} />
          )}
          <p className="text-4xl font-display font-black tabular-nums leading-none">
            {problem.a}
            <span className="mx-2" style={{ color: 'var(--accent-deep)' }}>{op}</span>
            {problem.b}
            <span className="mx-2 text-muted-foreground">=</span>
            <span className={status === 'right' ? 'animate-mk-pop' : ''}
              style={{ color: status === 'right' ? 'var(--success)' : status === 'wrong' ? 'var(--destructive)' : 'var(--muted-foreground)' }}>
              {status === 'idle' ? '?' : problem.answer}
            </span>
          </p>
        </div>

        {offer && !hint && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(op === '+' ? 'hint_w10_add_rule' : 'hint_sub_rule', lang)}
            steps={(op === '+'
              ? [
                { ask: t('hint_w10_first', lang), answer: problem.a, lo: 1, hi: 10 },
                { ask: t('hint_w10_second', lang), answer: problem.b, lo: 1, hi: 10 },
                { ask: t('hint_w10_all', lang), answer: problem.answer, lo: 1, hi: 10 },
              ]
              : [
                { ask: t('hint_sub_had', lang), answer: problem.a, lo: 1, hi: 10 },
                { ask: t('hint_sub_gone', lang), answer: problem.b, lo: 1, hi: 10 },
                { ask: t('hint_sub_left', lang), answer: problem.answer, lo: 0, hi: 10 },
              ]) as HintStep[]} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === problem.answer
            const isPicked = picked === opt
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-5 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {opt}
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
