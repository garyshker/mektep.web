'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { CountingSticks } from '@/components/CountingSticks'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { HintButton, HintOffer, HintScaffold, type HintStep } from '@/components/hints'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

// Grade-2 foundation: place value to 100. A 2-digit number shown as base-ten
// blocks — tens (bundles, amber) beside ones (loose, teal). The child reads
// the number. The key distractor is the swapped-digit number (34 vs 43) —
// the real place-value misconception.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function gen() {
  const tens = ri(1, 9)
  const ones = ri(0, 9)
  return { tens, ones, n: tens * 10 + ones }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// Options sit right next to the answer (34 · 35 · 36 · 33) so the child must
// count the blocks exactly; most rounds also include a one-rod-off option.
function buildOptions(n: number, lo: number, hi: number): number[] {
  const s = new Set<number>([n])
  const ones = shuffle([n + 1, n - 1, n + 2, n - 2, n + 3, n - 3])
  const rod = shuffle([n + 10, n - 10])
  const pool = Math.random() < 0.6 ? [...ones.slice(0, 2), rod[0]] : ones.slice(0, 3)
  for (const d of [...pool, ...ones, ...rod]) {
    if (s.size >= 4) break
    if (d >= lo && d <= hi && !s.has(d)) s.add(d)
  }
  let pad = n + 4
  while (s.size < 4 && pad <= hi) { if (!s.has(pad)) s.add(pad); pad++ }
  return shuffle([...s])
}

export default function TensTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<{ tens: number; ones: number; n: number } | null>(null)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // A miss already prints the number, so the offer belongs on the NEXT problem.
  const offerNext = useRef(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setOptions(buildOptions(g.n, 10, 99)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g2_tens', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    if (opt === p.n) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1000)
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); offerNext.current = true
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
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_tens_title', lang)}</h2>
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

  // Read the picture the way place value is built: bundles, then loose sticks,
  // then the number they spell together.
  const hintSteps: HintStep[] = [
    { ask: t('hint_tens_bundles', lang), answer: p.tens, lo: 1, hi: 9 },
    { ask: t('hint_tens_loose', lang), answer: p.ones, lo: 0, hi: 9 },
    { ask: t('hint_tens_all', lang), expr: `${p.tens * 10} + ${p.ones}`, answer: p.n, lo: 10, hi: 99 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🔟 {t('train_tens_title', lang)}</h1>
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
          <p className="text-sm font-bold text-muted-foreground">{t('tens_q', lang)}</p>
          <div className="flex items-start justify-center gap-5 w-full min-h-[92px]">
            <div className="flex flex-col items-center gap-2">
              <CountingSticks n={p.tens * 10} tone="a" />
              <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#cf8a34' }}>{t('tens_label', lang)}</span>
            </div>
            <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
            <div className="flex flex-col items-center gap-2">
              <CountingSticks n={p.ones} tone="b" />
              <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: '#3f8e7c' }}>{t('ones_label', lang)}</span>
            </div>
          </div>
          {status !== 'idle' && (
            <p className="text-4xl font-display font-black tabular-nums animate-mk-pop"
              style={{ color: status === 'right' ? 'var(--success)' : 'var(--foreground)' }}>{p.n}</p>
          )}
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t('hint_tens_rule', lang)} steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === p.n
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
