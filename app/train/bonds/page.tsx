'use client'

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

// Grade-1, step 3: number bonds (состав числа) — the "домик числа" every
// KZ/RU school uses. Roof holds the whole; the child finds the missing part.
// The ten-frame below SHOWS why: amber part + teal part = whole.
type Bond = { whole: number; part: number; answer: number }
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function genBond(): Bond {
  const whole = ri(3, 10)
  const part = ri(1, whole - 1)
  return { whole, part, answer: whole - part }
}

function buildOptions(answer: number, whole: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= 0 && d < whole) s.add(d)
  }
  // whole itself is a classic wrong answer ("5 = 2 + 5") — offer it sometimes
  if (s.size < 4) s.add(whole)
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

// The classic "number house": roof = whole, two rooms = the parts.
function NumberHouse({ whole, part, answer, revealed }: { whole: number; part: number; answer: number; revealed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <svg width="168" height="62" viewBox="0 0 168 62" aria-hidden>
        <polygon points="84,3 10,59 158,59"
          style={{ fill: 'color-mix(in oklch, var(--accent) 75%, var(--card))', stroke: 'var(--accent-deep)', strokeWidth: 2.5 }}
          strokeLinejoin="round" />
        <text x="84" y="50" textAnchor="middle" fontSize="26" fontWeight="900"
          style={{ fill: 'var(--foreground)' }}>{whole}</text>
      </svg>
      <div className="flex" style={{ marginTop: -2 }}>
        <div className="w-[74px] h-[58px] flex items-center justify-center text-3xl font-display font-black tabular"
          style={{ background: 'var(--card)', border: '2.5px solid var(--accent-deep)', borderRight: 'none', borderRadius: '0 0 0 12px', color: '#cf8a34' }}>
          {part}
        </div>
        <div className={`w-[74px] h-[58px] flex items-center justify-center text-3xl font-display font-black tabular ${revealed ? 'animate-mk-pop' : ''}`}
          style={{ background: revealed ? 'color-mix(in oklch, var(--success) 14%, var(--card))' : 'var(--card)',
            border: '2.5px solid var(--accent-deep)', borderRadius: '0 0 12px 0',
            color: revealed ? 'var(--success)' : 'var(--muted-foreground)' }}>
          {revealed ? answer : '?'}
        </div>
      </div>
    </div>
  )
}

export default function BondsTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [bond, setBond] = useState<Bond | null>(null)
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
    const b = genBond()
    setBond(b); setOptions(buildOptions(b.answer, b.whole)); setPicked(null); setStatus('idle')
    setHint(false); setOffer(false)
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g1_bonds', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !bond) return
    playTap(); setPicked(opt)
    if (opt === bond.answer) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1300)   // a beat longer: watch the frame fill
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🏠'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_bonds_title', lang)}</h2>
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

  if (!bond) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const revealed = status !== 'idle'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🏠 {t('train_bonds_title', lang)}</h1>
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
          <p className="text-sm font-bold text-muted-foreground">{t('bonds_q', lang)}</p>
          <NumberHouse whole={bond.whole} part={bond.part} answer={bond.answer} revealed={revealed && status === 'right'} />
          {/* why it works: amber part + teal part = whole */}
          <TenFrame n={bond.whole} split={bond.part} pending={!revealed || status === 'wrong'} />
          {status === 'wrong' && (
            <p className="font-semibold text-foreground">
              {bond.whole} = {bond.part} + <span className="font-black" style={{ color: 'var(--success)' }}>{bond.answer}</span>
            </p>
          )}
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)} principle={t('hint_bonds_rule', lang)}
            steps={[
              { ask: t('hint_bonds_whole', lang), answer: bond.whole, lo: 2, hi: 10 },
              { ask: t('hint_bonds_have', lang), answer: bond.part, lo: 1, hi: 9 },
              { ask: t('hint_bonds_need', lang), answer: bond.answer, lo: 0, hi: 9 },
            ] as HintStep[]} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === bond.answer
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
