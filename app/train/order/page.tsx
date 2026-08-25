'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { HintButton, HintOffer, HintScaffold, type HintStep } from '@/components/hints'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

// Grade-3: order of operations. The expression is built from TOKENS so the part
// that must be evaluated first can be highlighted, then collapsed into its
// value. Two guided phases: (1) solve the highlighted part — brackets first,
// else × ÷ before + −; (2) finish the simplified expression.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type Tok = { s: string; hot?: boolean }
type P = {
  toks: Tok[]          // full expression, `hot` marks what goes first
  step1: number        // value of the highlighted part
  rest: (v: number) => Tok[]   // simplified expression once step1 is known
  answer: number
  why: 'brackets' | 'muldiv'
}

function gen(): P {
  const kind = ri(0, 3)
  if (kind === 0) {                    // (a + b) × c
    const a = ri(2, 9), b = ri(2, 9), c = ri(2, 5)
    const s1 = a + b
    return {
      toks: [{ s: '(', hot: true }, { s: String(a), hot: true }, { s: '+', hot: true }, { s: String(b), hot: true }, { s: ')', hot: true }, { s: '×' }, { s: String(c) }],
      step1: s1, rest: v => [{ s: String(v), hot: true }, { s: '×' }, { s: String(c) }],
      answer: s1 * c, why: 'brackets',
    }
  }
  if (kind === 1) {                    // a + b × c
    const a = ri(3, 20), b = ri(2, 6), c = ri(2, 6)
    const s1 = b * c
    return {
      toks: [{ s: String(a) }, { s: '+' }, { s: String(b), hot: true }, { s: '×', hot: true }, { s: String(c), hot: true }],
      step1: s1, rest: v => [{ s: String(a) }, { s: '+' }, { s: String(v), hot: true }],
      answer: a + s1, why: 'muldiv',
    }
  }
  if (kind === 2) {                    // a − b × c  (keep result >= 0)
    const b = ri(2, 5), c = ri(2, 5)
    const s1 = b * c
    const a = s1 + ri(1, 20)
    return {
      toks: [{ s: String(a) }, { s: '−' }, { s: String(b), hot: true }, { s: '×', hot: true }, { s: String(c), hot: true }],
      step1: s1, rest: v => [{ s: String(a) }, { s: '−' }, { s: String(v), hot: true }],
      answer: a - s1, why: 'muldiv',
    }
  }
  // (a − b) × c
  const b = ri(2, 8), a = b + ri(2, 9), c = ri(2, 5)
  const s1 = a - b
  return {
    toks: [{ s: '(', hot: true }, { s: String(a), hot: true }, { s: '−', hot: true }, { s: String(b), hot: true }, { s: ')', hot: true }, { s: '×' }, { s: String(c) }],
    step1: s1, rest: v => [{ s: String(v), hot: true }, { s: '×' }, { s: String(c) }],
    answer: s1 * c, why: 'brackets',
  }
}

function buildOptions(answer: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-4, 4)
    if (d >= 0 && d !== answer) s.add(d)
  }
  while (s.size < 4) s.add(answer + s.size + 1)
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

function Expr({ toks, dim }: { toks: Tok[]; dim: boolean }) {
  return (
    <p className="text-3xl font-display font-black tabular-nums leading-none flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
      {toks.map((tk, i) => (
        <span key={i}
          className={tk.hot ? 'px-1.5 py-1 rounded-lg' : ''}
          style={tk.hot
            ? { background: 'color-mix(in oklch, var(--primary) 16%, var(--card))', color: 'var(--primary)' }
            : { color: dim ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
          {tk.s}
        </span>
      ))}
    </p>
  )
}

export default function OrderTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [phase, setPhase] = useState<1 | 2>(1)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // A miss leaves the worked step on screen, so the offer belongs on the NEXT one.
  const offerNext = useRef(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setPhase(1); setOptions(buildOptions(g.step1)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g3_order', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    const target = phase === 1 ? p.step1 : p.answer
    if (opt === target) {
      setStatus('right'); playCorrect()
      if (phase === 1) {
        setTimeout(() => {
          setPhase(2); setStatus('idle'); setPicked(null); setOptions(buildOptions(p.answer))
          setHint(false); setOffer(false)   // the expression changed — start clean
        }, 1000)
      } else {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
        setTimeout(() => finishProblem(true), 1200)
      }
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🧮'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_order_title', lang)}</h2>
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

  const done = phase === 2 && status === 'right'

  // The chain reads the operands straight off the tokens that are on screen —
  // the highlighted part in phase 1, the simplified line in phase 2 — so the
  // child never has to hold the expression in their head.
  const stepToks = phase === 1 ? p.toks.filter(tk => tk.hot) : p.rest(p.step1)
  const nums = stepToks.filter(tk => /^\d+$/.test(tk.s)).map(tk => Number(tk.s))
  const stepExpr = stepToks.map(tk => tk.s).join(' ')
  const hintSteps: HintStep[] = [
    ...(nums.length >= 2 ? [
      { ask: t('hint_ord_first', lang), answer: nums[0], lo: 0, hi: 30 },
      { ask: t('hint_ord_second', lang), answer: nums[1], lo: 0, hi: 30 },
    ] : []),
    { ask: t('hint_ord_result', lang), expr: stepExpr, answer: phase === 1 ? p.step1 : p.answer, lo: 0, hi: 99 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🧮 {t('train_order_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-muted-foreground text-center">
            {phase === 1 ? t(p.why === 'brackets' ? 'order_why_brackets' : 'order_why_muldiv', lang) : t('order_finish', lang)}
          </p>

          {/* original expression — dimmed once step 1 is done */}
          <Expr toks={p.toks} dim={phase === 2} />

          {/* the simplified expression appears after step 1 */}
          {phase === 2 && (
            <div className="flex flex-col items-center gap-1 animate-mk-drop">
              <span className="text-muted-foreground text-xl leading-none">↓</span>
              <Expr toks={p.rest(p.step1)} dim={false} />
            </div>
          )}

          <p className="text-2xl font-display font-black tabular-nums mt-1">
            <span className="text-muted-foreground">= </span>
            <span className={done ? 'animate-mk-pop' : ''}
              style={{ color: done ? 'var(--success)' : 'var(--muted-foreground)' }}>{done ? p.answer : '?'}</span>
          </p>
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(phase === 1 ? (p.why === 'brackets' ? 'hint_ord_br_rule' : 'hint_ord_md_rule') : 'hint_ord_fin_rule', lang)}
            steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const target = phase === 1 ? p.step1 : p.answer
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
