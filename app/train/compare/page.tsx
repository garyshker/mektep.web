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

// Grade-1, step 2: compare two quantities — taller tower = bigger — pick < = >.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))
type Sign = '<' | '=' | '>'
const signOf = (a: number, b: number): Sign => (a < b ? '<' : a > b ? '>' : '=')

function Tower({ n, tone }: { n: number; tone: 'a' | 'b' }) {
  const bg = tone === 'a'
    ? 'linear-gradient(180deg,#f3bd79,#cf8a34)'
    : 'linear-gradient(180deg,#86c8b6,#3f8e7c)'
  return (
    <div className="flex flex-col-reverse items-center gap-[3px]" style={{ minHeight: 10 * 16 + 9 * 3 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="animate-mk-pop-in"
          style={{ width: 26, height: 16, borderRadius: 4, background: bg, boxShadow: '0 1px 1.5px rgba(0,0,0,0.25)' }} />
      ))}
    </div>
  )
}

export default function CompareTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [pair, setPair] = useState<{ a: number; b: number } | null>(null)
  const [picked, setPicked] = useState<Sign | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const a = ri(1, 10)
    let b = ri(1, 10)
    if (Math.random() < 0.25) b = a            // ensure "equal" shows up
    setPair({ a, b }); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g1_compare', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (s: Sign) => {
    if (status !== 'idle' || !pair) return
    playTap(); setPicked(s)
    if (s === signOf(pair.a, pair.b)) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(v => { const ns = v + 1; setBest(b => Math.max(b, ns)); return ns })
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '⚖️'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_compare_title', lang)}</h2>
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

  if (!pair) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const shownSign = status === 'idle' ? '?' : signOf(pair.a, pair.b)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">⚖️ {t('train_compare_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-5 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-4">
          <p className="text-sm font-bold text-muted-foreground">{t('compare_q', lang)}</p>
          <div className="flex items-end justify-center gap-6 w-full">
            <div className="flex flex-col items-center gap-2">
              <Tower n={pair.a} tone="a" />
              <span className="text-3xl font-display font-black tabular" style={{ color: '#cf8a34' }}>{pair.a}</span>
            </div>
            <span className="text-5xl font-display font-black self-center pb-8 tabular-nums"
              style={{ color: status === 'right' ? 'var(--success)' : status === 'wrong' ? 'var(--destructive)' : 'var(--muted-foreground)' }}>
              {shownSign}
            </span>
            <div className="flex flex-col items-center gap-2">
              <Tower n={pair.b} tone="b" />
              <span className="text-3xl font-display font-black tabular" style={{ color: '#3f8e7c' }}>{pair.b}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['<', '=', '>'] as Sign[]).map(s => {
            const isAns = s === signOf(pair.a, pair.b)
            const isPicked = picked === s
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={s} onClick={() => pick(s)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-6 border-2 font-display font-black text-4xl ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {s}
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
