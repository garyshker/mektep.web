'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

// Grade-3 signature concept: division with a remainder. n items are dealt into
// full groups of b; whatever can't fill a group stays aside. Two guided phases:
// (1) how many FULL groups → the quotient; (2) how many are LEFT OVER → the
// remainder. Seeing the leftovers is what makes "remainder < divisor" obvious.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type P = { n: number; b: number; q: number; r: number }
function gen(): P {
  const b = ri(3, 6)
  const q = ri(2, 5)
  const r = ri(1, b - 1)            // always a real remainder
  return { n: q * b + r, b, q, r }
}

function buildOptions(answer: number, lo: number, hi: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= lo && d <= hi && d !== answer) s.add(d)
  }
  let extra = lo
  while (s.size < 4 && extra <= hi) { s.add(extra); extra++ }
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

function Dot({ tone }: { tone: 'full' | 'left' }) {
  const bg = tone === 'full'
    ? 'radial-gradient(circle at 34% 30%, #ffd591, #f0a23a 55%, #c9772a)'
    : 'radial-gradient(circle at 34% 30%, #ffb3bd, #ff5d73 55%, #c93a4e)'
  return <span className="w-5 h-5 rounded-full" style={{ background: bg, boxShadow: 'inset -1px -1px 1.5px rgba(90,40,20,.35), 0 1px 1.5px rgba(0,0,0,.25)' }} />
}

export default function RemainderTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [phase, setPhase] = useState<'q' | 'r'>('q')
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setPhase('q'); setOptions(buildOptions(g.q, 1, 8)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g3_remainder', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    const target = phase === 'q' ? p.q : p.r
    if (opt === target) {
      setStatus('right'); playCorrect()
      if (phase === 'q') {
        setTimeout(() => { setPhase('r'); setStatus('idle'); setPicked(null); setOptions(buildOptions(p.r, 0, p.b - 1)) }, 1000)
      } else {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
        setTimeout(() => finishProblem(true), 1300)
      }
    } else {
      setStatus('wrong'); setStreak(0); playWrong()
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🧺'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_remainder_title', lang)}</h2>
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

  if (!p) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const showR = phase === 'r'          // leftovers revealed once the quotient is found
  const done = phase === 'r' && status === 'right'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🧺 {t('train_remainder_title', lang)}</h1>
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
          <p className="text-sm font-bold text-muted-foreground text-center">
            {p.n} {t('rem_deal_into', lang)} {p.b} — {phase === 'q' ? t('rem_groups_q', lang) : t('rem_left_q', lang)}
          </p>

          {/* full groups */}
          <div className="flex flex-wrap items-start justify-center gap-2.5">
            {Array.from({ length: p.q }).map((_, g) => (
              <div key={g} className="rounded-2xl p-2 animate-mk-pop-in"
                style={{ background: 'color-mix(in oklch, var(--muted) 55%, var(--card))', border: '2px solid var(--border)' }}>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${p.b <= 3 ? p.b : 3}, minmax(0,1fr))` }}>
                  {Array.from({ length: p.b }).map((_, i) => <Dot key={i} tone="full" />)}
                </div>
              </div>
            ))}
            {/* leftovers — outside the groups, they can't fill one */}
            {showR && (
              <div className="rounded-2xl p-2 animate-mk-drop"
                style={{ background: 'color-mix(in oklch, var(--destructive) 8%, var(--card))', border: '2px dashed var(--destructive)' }}>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${p.r <= 3 ? p.r : 3}, minmax(0,1fr))` }}>
                  {Array.from({ length: p.r }).map((_, i) => <Dot key={i} tone="left" />)}
                </div>
              </div>
            )}
          </div>

          <p className="text-2xl font-display font-black tabular-nums leading-none text-center">
            {p.n} <span style={{ color: 'var(--accent-deep)' }}>÷</span> {p.b}
            <span className="mx-1.5 text-muted-foreground">=</span>
            <span style={{ color: phase === 'r' ? 'var(--success)' : 'var(--muted-foreground)' }}>{phase === 'r' ? p.q : '?'}</span>
            {done && (
              <span className="animate-mk-pop-in" style={{ color: 'var(--destructive)' }}> {t('rem_rest', lang)} {p.r}</span>
            )}
          </p>
          {done && (
            <p className="text-xs font-semibold text-muted-foreground animate-mk-pop-in">
              {p.q} × {p.b} + {p.r} = {p.n} · {t('rem_rule', lang)} {p.b}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const target = phase === 'q' ? p.q : p.r
            const isAns = opt === target
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
