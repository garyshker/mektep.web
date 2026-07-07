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

// Grade-3: fractions (доли) — a whole split into d EQUAL parts, n shaded.
// The child names the fraction. The point is that the bottom number is how
// many equal parts the whole is cut into, the top is how many are taken.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
const DENOMS = [2, 3, 4, 5, 6, 8]
type Frac = { num: number; den: number }
const eq = (a: Frac, b: Frac) => a.num === b.num && a.den === b.den

function gen(): { num: number; den: number } {
  const den = DENOMS[ri(0, DENOMS.length - 1)]
  const num = ri(1, den - 1)
  return { num, den }
}

function buildOptions(num: number, den: number): Frac[] {
  const out: Frac[] = [{ num, den }]
  const add = (f: Frac) => { if (f.num >= 1 && f.num <= f.den && f.den >= 2 && f.den <= 10 && !out.some(o => eq(o, f))) out.push(f) }
  add({ num, den: DENOMS[(DENOMS.indexOf(den) + 1) % DENOMS.length] })   // wrong whole (den)
  add({ num: den - num, den })                                           // the other part (complement)
  add({ num: num + 1 <= den ? num + 1 : num - 1, den })                  // wrong count (num)
  add({ num: 1, den })
  add({ num, den: den + 1 })
  while (out.length < 4) add({ num: ri(1, 7), den: DENOMS[ri(0, DENOMS.length - 1)] })
  const arr = out.slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

function FractionBar({ num, den }: { num: number; den: number }) {
  return (
    <div className="flex w-full max-w-[280px] h-16 rounded-xl overflow-hidden shadow-[var(--shadow-sm)]"
      style={{ border: '2.5px solid var(--accent-deep)' }}>
      {Array.from({ length: den }).map((_, i) => (
        <div key={i} className="flex-1 h-full"
          style={{ background: i < num ? 'var(--gradient-gold)' : 'var(--card)', borderLeft: i > 0 ? '2px solid var(--accent-deep)' : 'none' }} />
      ))}
    </div>
  )
}

function FracGlyph({ num, den, color }: { num: number; den: number; color?: string }) {
  return (
    <span className="inline-flex flex-col items-center leading-none font-display font-black tabular-nums" style={{ color }}>
      <span>{num}</span>
      <span className="my-1 rounded-full" style={{ width: 22, height: 3, background: color ?? 'currentColor' }} />
      <span>{den}</span>
    </span>
  )
}

export default function FractionsTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<{ num: number; den: number } | null>(null)
  const [options, setOptions] = useState<Frac[]>([])
  const [picked, setPicked] = useState<Frac | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setOptions(buildOptions(g.num, g.den)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g3_fractions', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: Frac) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    if (eq(opt, p)) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1000)
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🍕'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_fractions_title', lang)}</h2>
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🍕 {t('train_fractions_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-5 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-7 shadow-[var(--shadow-md)] flex flex-col items-center gap-4">
          <p className="text-sm font-bold text-muted-foreground">{t('fractions_q', lang)}</p>
          <FractionBar num={p.num} den={p.den} />
          {status !== 'idle' && (
            <span className="animate-mk-pop text-2xl"><FracGlyph num={p.num} den={p.den} color="var(--success)" /></span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => {
            const isAns = eq(opt, p)
            const isPicked = picked ? eq(picked, opt) : false
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={i} onClick={() => pick(opt)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-5 border-2 flex items-center justify-center text-2xl ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                <FracGlyph num={opt.num} den={opt.den} color={col} />
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
