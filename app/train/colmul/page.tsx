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

// Grade-4: column multiplication (2-digit × 1-digit), TAUGHT step by step.
// Phase 1 — multiply the ones (see the carry). Phase 2 — multiply the tens and
// add the carry. Then the product assembles. The child performs the method,
// not just the final answer.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type P = { a: number; b: number; tDig: number; oDig: number; p1: number; carry: number; tensRes: number; product: number }
function gen(): P {
  const a = ri(13, 79), b = ri(2, 9)
  const tDig = Math.floor(a / 10), oDig = a % 10
  const p1 = oDig * b
  const carry = Math.floor(p1 / 10)
  const tensRes = tDig * b + carry
  return { a, b, tDig, oDig, p1, carry, tensRes, product: a * b }
}

function buildOptions(answer: number, lo: number, hi: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-4, 4)
    if (d >= lo && d <= hi && d !== answer) s.add(d)
  }
  while (s.size < 4) s.add(answer + s.size + 1)
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export default function ColMulTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [phase, setPhase] = useState<1 | 2>(1)
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
    setP(g); setPhase(1); setOptions(buildOptions(g.p1, 2, 81)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g4_colmul', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    const target = phase === 1 ? p.p1 : p.tensRes
    if (opt === target) {
      setStatus('right'); playCorrect()
      if (phase === 1) {
        setTimeout(() => { setPhase(2); setStatus('idle'); setPicked(null); setOptions(buildOptions(p.tensRes, 2, 90)) }, 1100)
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '✖️'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_colmul_title', lang)}</h2>
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

  const done1 = phase === 2 || (phase === 1 && status === 'right')
  const done2 = phase === 2 && status === 'right'
  const onesDigit = p.p1 % 10
  const prodH = Math.floor(p.product / 100), prodT = Math.floor(p.product / 10) % 10

  const cell = (content: React.ReactNode, opts?: { active?: boolean; muted?: boolean; color?: string }) => (
    <div className="w-10 h-12 flex items-center justify-center text-3xl font-display font-black tabular-nums rounded-lg"
      style={{ background: opts?.active ? 'color-mix(in oklch, var(--primary) 14%, var(--card))' : 'transparent',
        color: opts?.color ?? (opts?.muted ? 'var(--muted-foreground)' : 'var(--foreground)') }}>
      {content}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">✖️ {t('train_colmul_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        {/* The column */}
        <div className="bg-card rounded-3xl px-4 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-2">
          {/* carry over the tens column, shown after phase 1 if any */}
          <div className="grid grid-cols-3 gap-1">
            {cell(done1 && p.carry > 0 ? <span className="text-lg" style={{ color: 'var(--accent-deep)' }}>{p.carry}</span> : '', {})}
            {cell('')}
            {cell('')}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {cell('')}
            {cell(p.tDig, { active: phase === 2 && status === 'idle' })}
            {cell(p.oDig, { active: phase === 1 && status === 'idle' })}
          </div>
          <div className="grid grid-cols-3 gap-1 items-center">
            {cell(<span style={{ color: 'var(--accent-deep)' }}>×</span>)}
            {cell('')}
            {cell(p.b, { active: status === 'idle' })}
          </div>
          <div className="w-full max-w-[132px] h-[3px] rounded-full my-0.5" style={{ background: 'var(--foreground)' }} />
          <div className="grid grid-cols-3 gap-1">
            {cell(done2 && prodH > 0 ? prodH : '', { color: 'var(--success)' })}
            {cell(done2 ? prodT : '', { color: 'var(--success)' })}
            {cell(done1 ? onesDigit : '', { color: done2 ? 'var(--success)' : 'var(--primary)' })}
          </div>
        </div>

        {/* Prompt for the current step */}
        <p className="text-sm font-bold text-muted-foreground text-center">
          {phase === 1 ? t('colmul_ones_q', lang) : t('colmul_tens_q', lang)}:
          <span className="ml-2 font-display font-black text-foreground text-lg">
            {phase === 1
              ? `${p.oDig} × ${p.b} = ?`
              : `${p.tDig} × ${p.b}${p.carry > 0 ? ` + ${p.carry}` : ''} = ?`}
          </span>
        </p>
        {phase === 2 && p.carry > 0 && (
          <p className="text-xs text-center text-muted-foreground -mt-2">{t('colmul_addcarry', lang)}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const target = phase === 1 ? p.p1 : p.tensRes
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
