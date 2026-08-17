'use client'

import { useEffect, useRef, useState } from 'react'
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

// Grade-1 step 7: crossing ten, TAUGHT as the make-ten technique (дополни до 10).
// Two guided phases per problem, e.g. 8 + 5:
//   1) "How many to make 10?" — frame A shows 8, its 2 empty cells are the hint.
//      On answer, 2 teal counters move over: frame A fills to 10, frame B drops to 3.
//   2) "How many in total?" — the picture now reads itself: a full ten and 3 ones = 13.
type P = { a: number; b: number; k: number; total: number }
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function gen(): P {
  const a = ri(6, 9)                 // make ten on the larger addend
  const b = ri(11 - a, 9)            // guarantees a + b > 10
  return { a, b, k: 10 - a, total: a + b }
}

function buildOptions(answer: number, lo: number, hi: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= lo && d <= hi) s.add(d)
  }
  const arr = [...s]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export default function Cross10Trainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [problem, setProblem] = useState<P | null>(null)
  const [phase, setPhase] = useState<'p1' | 'p2'>('p1')
  const [regrouped, setRegrouped] = useState(false)   // the two counters have moved over
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // An error reveals the fact right on the frames, so offering help *then* only
  // repeats it. Carry the offer to the next problem instead — help lands before
  // the next guess, which is the point.
  const offerNext = useRef(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const p = gen()
    setProblem(p); setPhase('p1'); setRegrouped(false)
    setOptions(buildOptions(p.k, 1, 6)); setPicked(null); setStatus('idle')
    setHint(false); setOffer(offerNext.current); offerNext.current = false
  }
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g1_cross10', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !problem) return
    playTap(); setPicked(opt)
    const answer = phase === 'p1' ? problem.k : problem.total
    if (opt === answer) {
      setStatus('right'); playCorrect()
      if (phase === 'p1') {
        setRegrouped(true)   // teal counters fly over, frame fills to 10
        setTimeout(() => {
          setPhase('p2'); setStatus('idle'); setPicked(null)
          setOptions(buildOptions(problem.total, 10, 20))
          setHint(false); setOffer(false)   // the question changed — start clean
        }, 950)
      } else {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
        setTimeout(() => finishProblem(true), 1100)
      }
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); offerNext.current = true
      if (phase === 'p1') setRegrouped(true)   // show WHY: the frame fills, the fact appears
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🔟'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_cross10_title', lang)}</h2>
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

  const { a, b, k } = problem
  const rest = b - k
  const answer = phase === 'p1' ? k : problem.total

  // The chain asks what the frames already show, one small step at a time:
  // phase 1 walks to "how many cells are empty", phase 2 to "a ten and the rest".
  const hintSteps: HintStep[] = phase === 'p1'
    ? [
        { ask: t('hint_c10_have', lang), answer: a, lo: 4, hi: 10 },
        { ask: t('hint_c10_empty', lang), answer: k, lo: 1, hi: 6 },
      ]
    : [
        { ask: t('hint_c10_ten', lang), answer: 10, lo: 8, hi: 12 },
        { ask: t('hint_c10_left', lang), answer: rest, lo: 1, hi: 9 },
        { ask: t('hint_c10_sum', lang), expr: `10 + ${rest}`, answer: problem.total, lo: 11, hi: 18 },
      ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🔟 {t('train_cross10_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-5 shadow-[var(--shadow-md)] flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-muted-foreground">
            {phase === 'p1' ? t('cross10_make_q', lang) : t('within10_total_q', lang)}
          </p>

          {/* Frame A: fills to a full ten; Frame B: what's left of b */}
          <TenFrame n={regrouped ? 10 : a} split={regrouped ? a : undefined} />
          <span className="text-2xl font-display font-black leading-none" style={{ color: 'var(--accent-deep)' }}>+</span>
          <TenFrame n={regrouped ? rest : b} split={0} />

          {/* Equation: the problem, plus the regrouped form once the move happened */}
          <p className="text-3xl font-display font-black tabular-nums leading-none mt-1">
            {a}
            <span className="mx-1.5" style={{ color: 'var(--accent-deep)' }}>+</span>
            {b}
            <span className="mx-1.5 text-muted-foreground">=</span>
            <span className={phase === 'p2' && status === 'right' ? 'animate-mk-pop' : ''}
              style={{ color: phase === 'p2' && status === 'right' ? 'var(--success)' : 'var(--muted-foreground)' }}>
              {phase === 'p2' && status !== 'idle' ? problem.total : '?'}
            </span>
          </p>
          {regrouped && (
            <p className="font-display font-black text-lg animate-mk-pop-in tabular-nums" style={{ color: 'var(--primary)' }}>
              = 10 + {rest}
            </p>
          )}
          {status === 'wrong' && phase === 'p1' && (
            <p className="font-semibold text-foreground">
              {a} + <span className="font-black" style={{ color: 'var(--success)' }}>{k}</span> = 10
            </p>
          )}
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(phase === 'p1' ? 'hint_c10_make_rule' : 'hint_c10_total_rule', lang)}
            steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === answer
            const isPicked = picked === opt
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-4 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
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
