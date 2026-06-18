'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { genEquation, genEquationExample, type EqProblem } from '@/lib/trainers'
import { EquationSolver } from '@/components/EquationSolver'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { X, Flame, Square, ArrowRight, Lightbulb, ChevronUp } from 'lucide-react'
import type { CSSProperties } from 'react'

export default function EquationTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [problem, setProblem] = useState<EqProblem | null>(null)
  const [pk, setPk] = useState(0)               // resets the solver per problem
  const [example, setExample] = useState<EqProblem | null>(null) // "show how" worked example
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => { setProblem(genEquation()) }, [])

  const next = () => { setStatus('idle'); setInput(''); setExample(null); setPk(k => k + 1); setProblem(genEquation()) }

  // Save XP in chunks (per finished round) so quitting after a milestone never loses it.
  const bankXp = async (n: number) => {
    if (n <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
    await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + n }).eq('id', user.id)
  }
  const rnd = useRound(bankXp)

  // A problem just concluded (solved or skipped): count it, then advance or hit a milestone.
  const finishProblem = (wasCorrect: boolean) => { setTotal(n => n + 1); rnd.conclude(wasCorrect, next) }

  const toggleHow = () => {
    playTap()
    setExample(ex => (ex ? null : problem ? genEquationExample(problem) : null))
  }

  const check = () => {
    if (status !== 'idle' || !problem || !input.trim()) return
    playTap()
    if (input.trim() === String(problem.answer)) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 850)
    } else {
      setStatus('wrong'); setStreak(0); playWrong()
    }
  }

  const stop = () => { rnd.bankPartial(); setEnded(true) }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    rnd.resetRound()
    setStatus('idle'); setInput(''); setExample(null); setPk(k => k + 1); setProblem(genEquation())
  }

  // ── Round milestone (every ROUND problems) ──
  if (rnd.milestone) {
    return <RoundMilestone lang={lang} roundCorrect={rnd.roundCorrect} streak={streak}
      onContinue={() => rnd.continueRound(next)} onFinish={() => { rnd.setMilestone(false); setEnded(true) }} />
  }

  // ── Ended summary ──
  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🟰'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_eq', lang)}</h2>
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

  const opG = problem.op === '+' ? '+' : '−'
  const inputBorder = status === 'right' ? 'var(--success)' : status === 'wrong' ? 'var(--destructive)' : 'var(--border)'
  const inputBg = status === 'right' ? 'color-mix(in oklch, var(--success) 12%, var(--card))'
    : status === 'wrong' ? 'color-mix(in oklch, var(--destructive) 10%, var(--card))' : 'var(--card)'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🟰 {t('train_eq', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        {/* Round progress — a visible finish line of ROUND dots */}
        <RoundDots done={rnd.roundDone} />

        {/* Equation / solver */}
        <div className="bg-card rounded-3xl px-5 py-6 shadow-[var(--shadow-md)]">
          {status === 'wrong' ? (
            <EquationSolver key={pk} a={problem.a} op={problem.op} b={problem.b} xRight={problem.xRight} />
          ) : (
            <>
              <p className="text-4xl sm:text-5xl font-display font-black text-center tabular-nums leading-none py-2">
                {problem.xRight ? (
                  <>
                    {problem.a}
                    <span className="mx-1.5" style={{ color: 'var(--accent)' }}>−</span>
                    <span style={{ color: 'var(--primary)' }}>x</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--primary)' }}>x</span>
                    <span className="mx-1.5" style={{ color: 'var(--accent)' }}>{opG}</span>
                    {problem.a}
                  </>
                )}
                <span className="mx-1.5 text-muted-foreground">=</span>
                <span style={{ color: status === 'right' ? 'var(--success)' : 'var(--foreground)' }}>{problem.b}</span>
              </p>

              {/* "Show how" — reveals an animated worked example (different numbers) */}
              {status === 'idle' && (
                <button onClick={toggleHow}
                  className="mx-auto mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-display font-black text-xs active:scale-95 transition-transform"
                  style={{ background: 'color-mix(in oklch, var(--primary) 12%, var(--card))', color: 'var(--primary)' }}>
                  {example ? <ChevronUp size={15} /> : <Lightbulb size={15} />}
                  {example ? t('eq_hide', lang) : t('eq_show_how', lang)}
                </button>
              )}
            </>
          )}
        </div>

        {/* Expanding worked example */}
        {example && status !== 'wrong' && (
          <div className="animate-mk-pop-in">
            <p className="text-[11px] font-black text-muted-foreground tracking-widest uppercase mb-1.5 ml-1">{t('eq_example', lang)}</p>
            <EquationSolver key={`ex-${pk}-${example.a}-${example.b}`}
              a={example.a} op={example.op} b={example.b} xRight={example.xRight} autoPlay />
          </div>
        )}

        {/* Answer input */}
        <div className="flex flex-col gap-3">
          <input
            type="number" inputMode="numeric" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && check()}
            disabled={status !== 'idle'}
            placeholder="x = ?"
            className={`w-full border-2 rounded-[var(--radius)] text-center text-4xl font-display font-black py-5 focus:outline-none transition-colors ${status === 'right' ? 'animate-mk-pop' : status === 'wrong' ? 'animate-mk-shake' : ''}`}
            style={{ borderColor: inputBorder, background: inputBg, color: 'var(--foreground)' }}
          />

          {status === 'idle' && (
            <button onClick={check} disabled={!input.trim()}
              className="pop-btn w-full font-display text-white font-black text-2xl rounded-[var(--radius)] py-4 disabled:opacity-50"
              style={{ background: 'var(--gradient-success)', ['--pop-shadow' as string]: 'var(--brand-deep)' } as CSSProperties}>
              OK
            </button>
          )}

          {status === 'wrong' && (
            <>
              <p className="text-center font-semibold text-foreground">
                {t('correct_answer', lang)} <span className="font-black" style={{ color: 'var(--success)' }}>x = {problem.answer}</span>
              </p>
              <button onClick={() => finishProblem(false)}
                className="pop-btn w-full font-display text-white font-black text-xl rounded-[var(--radius)] py-4 flex items-center justify-center gap-2"
                style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
                {t('next', lang)} <ArrowRight size={20} />
              </button>
            </>
          )}
        </div>
      </main>

      {/* Stop */}
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
