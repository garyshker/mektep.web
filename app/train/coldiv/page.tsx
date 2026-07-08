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

// Grade-4: long division (деление уголком), 2-digit ÷ 1-digit, exact, TAUGHT
// step by step with the classic corner diagram that fills in and animates.
// Phase 1 — divide the tens (write quotient digit, subtract). Phase 2 — bring
// the ones down (animated «снос») and divide again.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type P = { D: number; b: number; Dt: number; Do: number; qt: number; r1: number; W: number; qo: number; q: number }
function gen(): P {
  for (let tries = 0; tries < 300; tries++) {
    const b = ri(2, 7)
    const Dt = ri(b, 9)                 // tens digit >= divisor → 2-digit quotient
    const qt = Math.floor(Dt / b)
    const r1 = Dt - qt * b
    const Do = ri(0, 9)
    const W = r1 * 10 + Do
    if (W === 0 || W % b !== 0) continue
    const qo = W / b
    if (qo < 1 || qo > 9) continue
    return { D: Dt * 10 + Do, b, Dt, Do, qt, r1, W, qo, q: qt * 10 + qo }
  }
  return { D: 84, b: 6, Dt: 8, Do: 4, qt: 1, r1: 2, W: 24, qo: 4, q: 14 }
}

function buildOptions(answer: number, lo: number, hi: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= lo && d <= hi && d !== answer) s.add(d)
  }
  while (s.size < 4) s.add(answer + s.size + 1)
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

// One digit cell in the working column (3-column grid: gutter · tens · ones).
function Cell({ children, color }: { children?: React.ReactNode; color?: string }) {
  return <span className="w-8 h-9 flex items-center justify-center text-2xl font-display font-black tabular-nums" style={{ color: color ?? 'var(--foreground)' }}>{children}</span>
}
function Bar() {
  return <span className="w-8 flex items-center justify-center"><span className="block w-[22px] h-[2.5px] rounded-full" style={{ background: 'var(--foreground)' }} /></span>
}

export default function ColDivTrainer() {
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
    setP(g); setPhase(1); setOptions(buildOptions(g.qt, 0, 9)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g4_coldiv', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    const target = phase === 1 ? p.qt : p.qo
    if (opt === target) {
      setStatus('right'); playCorrect()
      if (phase === 1) {
        setTimeout(() => { setPhase(2); setStatus('idle'); setPicked(null); setOptions(buildOptions(p.qo, 1, 9)) }, 1300)
      } else {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
        setTimeout(() => finishProblem(true), 1400)
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '➗'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_coldiv_title', lang)}</h2>
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

  const show1 = phase === 2 || (phase === 1 && status === 'right')   // tens step done
  const show2 = phase === 2 && status === 'right'                    // ones step done
  const qob = p.qo * p.b                                             // = W (exact)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">➗ {t('train_coldiv_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        {/* The corner (уголок) */}
        <div className="bg-card rounded-3xl px-4 py-6 shadow-[var(--shadow-md)] flex justify-center">
          <div className="flex items-start gap-1">
            {/* left working column */}
            <div className="flex flex-col items-center">
              <div className="grid grid-cols-3"><Cell /><Cell color="var(--accent-deep)">{p.Dt}</Cell><Cell color="var(--accent-deep)">{p.Do}</Cell></div>
              <div className="grid grid-cols-3" style={{ opacity: show1 ? 1 : 0 }}>
                <Cell color="var(--muted-foreground)">−</Cell><Cell>{p.qt * p.b}</Cell><Cell />
              </div>
              <div className="grid grid-cols-3" style={{ opacity: show1 ? 1 : 0 }}><Cell /><Bar /><Cell /></div>
              <div className="grid grid-cols-3" style={{ opacity: show1 ? 1 : 0 }}>
                <Cell /><Cell>{p.r1}</Cell>
                <span className={`w-8 h-9 flex items-center justify-center text-2xl font-display font-black tabular-nums ${show1 ? 'animate-mk-drop' : ''}`} style={{ color: 'var(--accent-deep)' }}>{show1 ? p.Do : ''}</span>
              </div>
              <div className="grid grid-cols-3" style={{ opacity: show2 ? 1 : 0 }}>
                <Cell color="var(--muted-foreground)">−</Cell><Cell>{Math.floor(qob / 10) || ''}</Cell><Cell>{qob % 10}</Cell>
              </div>
              <div className="grid grid-cols-3" style={{ opacity: show2 ? 1 : 0 }}><Cell /><Bar /><Bar /></div>
              <div className="grid grid-cols-3" style={{ opacity: show2 ? 1 : 0 }}><Cell /><Cell /><Cell color="var(--success)">0</Cell></div>
            </div>
            {/* corner bar + divisor + quotient */}
            <div className="flex flex-col items-start pl-2.5 self-stretch" style={{ borderLeft: '3px solid var(--foreground)' }}>
              <span className="h-9 flex items-center text-2xl font-display font-black tabular-nums">{p.b}</span>
              <span className="block w-11 h-[2.5px] rounded-full my-0.5" style={{ background: 'var(--foreground)' }} />
              <span className="h-9 flex items-center text-2xl font-display font-black tabular-nums">
                <span className={show1 ? 'animate-mk-pop-in' : ''} style={{ color: show1 ? 'var(--success)' : 'var(--muted-foreground)' }}>{show1 ? p.qt : '·'}</span>
                <span className={show2 ? 'animate-mk-pop-in' : ''} style={{ color: 'var(--success)' }}>{show2 ? p.qo : ''}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Prompt for the current step */}
        <p className="text-sm font-bold text-muted-foreground text-center">
          {phase === 1 ? t('coldiv_step1', lang) : t('coldiv_step2', lang)}:
          <span className="ml-2 font-display font-black text-foreground text-lg">
            {phase === 1 ? `${p.Dt} ÷ ${p.b} = ?` : `${p.W} ÷ ${p.b} = ?`}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const target = phase === 1 ? p.qt : p.qo
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
