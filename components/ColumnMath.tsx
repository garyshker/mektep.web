'use client'

// ColumnMath — Сова-coached column arithmetic. One component, two operations:
//   • op="add" → addition with carry over ten   (genAddition 'add_2d_carry')
//   • op="sub" → subtraction with borrowing      (genSubtraction 'sub_2d_borrow')
//
// Code owns the truth: the generators build the problem, diagnose*() classifies
// the slip, log*Attempt feeds the SRS. Сова (the LLM) only voices a Socratic hint
// on a wrong answer — never the number. Correct answers get instant static praise.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t, type Lang, type I18NKey } from '@/lib/i18n'
import { genAddition, diagnoseAddition, genSubtraction, diagnoseSubtraction } from '@/lib/skills'
import { logAdditionAttempt, logSubtractionAttempt } from '@/lib/mastery'
import { askCoach } from '@/lib/tutor-client'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { X, Flame, Square } from 'lucide-react'

type Op = 'add' | 'sub'
type SB = ReturnType<typeof createClient>

interface OpCfg {
  gen: () => { a: number; b: number }
  answer: (a: number, b: number) => number
  diagnose: (a: number, b: number, typed: number) => string | null
  log: (sb: SB, a: number, b: number, answered: number) => void
  sign: string
  topic: string
  titleKey: I18NKey
  subtitleKey: I18NKey
  introKey: I18NKey
}

const CFG: Record<Op, OpCfg> = {
  add: {
    gen: () => genAddition('add_2d_carry'),
    answer: (a, b) => a + b,
    diagnose: diagnoseAddition,
    log: logAdditionAttempt,
    sign: '+',
    topic: 'column_addition_transition',
    titleKey: 'column_add_title',
    subtitleKey: 'column_subtitle',
    introKey: 'column_intro',
  },
  sub: {
    gen: () => genSubtraction('sub_2d_borrow'),
    answer: (a, b) => a - b,
    diagnose: diagnoseSubtraction,
    log: logSubtractionAttempt,
    sign: '−',
    topic: 'column_subtraction_borrow',
    titleKey: 'column_sub_title',
    subtitleKey: 'column_sub_subtitle',
    introKey: 'column_sub_intro',
  },
}

// Instant, free praise for a clean column — no LLM round-trip (mirrors lib/tutor.ts).
const PRAISE: Record<Lang, string[]> = {
  ru: ['Чисто решено! 🌟', 'Десяток на месте! 🦉', 'Вот это столбик! 🚀', 'Точно в цель! 🎯'],
  kk: ['Тап-таза! 🌟', 'Ондық орнында! 🦉', 'Міне, бағана! 🚀', 'Дөп тапты! 🎯'],
  en: ['Clean solve! 🌟', 'Ten landed right! 🦉', 'Great column! 🚀', 'Bullseye! 🎯'],
}
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(-n)

export function ColumnMath({ op = 'add' }: { op?: Op }) {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()
  const cfg = CFG[op]

  const [prob, setProb] = useState<{ a: number; b: number } | null>(null)
  const [ones, setOnes] = useState('')
  const [tens, setTens] = useState('')
  const [carry, setCarry] = useState('')   // add: carried 1 · sub: reduced tens (scratch)
  const [borrow, setBorrow] = useState('') // sub only: ones after borrowing, e.g. 13 (scratch)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [attempt, setAttempt] = useState(1)        // per-problem, drives Сова's escalation
  const [sova, setSova] = useState('')
  const [busy, setBusy] = useState(false)          // awaiting Сова

  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const onesRef = useRef<HTMLInputElement>(null)
  const tensRef = useRef<HTMLInputElement>(null)
  const carryRef = useRef<HTMLInputElement>(null)

  // Mount: build the first problem (client-only — Math.random would mismatch on SSR).
  // Re-runs only to refresh Сова's intro line if the language flips; never clobbers
  // a problem in progress.
  useEffect(() => {
    setProb(p => p ?? cfg.gen())
    setSova(s => (s ? s : t(cfg.introKey, lang)))
  }, [lang, cfg])

  // Save XP in chunks (per finished round) so quitting after a milestone never loses it.
  const bankXp = async (n: number) => {
    if (n <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
    await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + n }).eq('id', user.id)
  }
  const rnd = useRound(bankXp)

  const next = () => {
    setStatus('idle'); setOnes(''); setTens(''); setCarry(''); setBorrow('')
    setAttempt(1); setSova(t(cfg.introKey, lang))
    setProb(cfg.gen())
    setTimeout(() => onesRef.current?.focus(), 60)
  }

  // A problem just concluded (solved or skipped): count it, then advance or hit a milestone.
  const finishProblem = (wasCorrect: boolean) => { setTotal(n => n + 1); rnd.conclude(wasCorrect, next) }

  const check = async () => {
    if (status === 'right' || busy || !prob || !ones) return
    playTap()
    const typed = Number(tens) * 10 + Number(ones)
    const ans = cfg.answer(prob.a, prob.b)
    cfg.log(supabase, prob.a, prob.b, typed)   // fire-and-forget → SRS

    if (typed === ans) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      setSova(pick(PRAISE[lang] ?? PRAISE.ru))
      playCorrect()
      setTimeout(() => finishProblem(true), 1000)
    } else {
      setStatus('wrong'); setStreak(0); playWrong()
      const tag = cfg.diagnose(prob.a, prob.b, typed) ?? undefined
      setBusy(true)
      const line = await askCoach({
        lang,
        task: { topic: cfg.topic, question: `${prob.a} ${cfg.sign} ${prob.b}`, expected_answer: ans },
        student_input: typed,
        attempt_number: Math.min(attempt, 3),
        error_tag: tag,
        recent_context: sova,
      })
      setBusy(false)
      setSova(line || t('column_oops', lang))
      setAttempt(n => n + 1)
    }
  }

  const stop = () => { rnd.bankPartial(); setEnded(true) }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    rnd.resetRound()
    next()
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🦉'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">🦉 {t(cfg.titleKey, lang)}</h2>
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

  if (!prob) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const aT = Math.floor(prob.a / 10), aO = prob.a % 10
  const bT = Math.floor(prob.b / 10), bO = prob.b % 10

  const inBorder = status === 'right' ? 'var(--success)' : status === 'wrong' ? 'var(--destructive)' : 'var(--border)'
  const inBg = status === 'right' ? 'color-mix(in oklch, var(--success) 12%, var(--card))'
    : status === 'wrong' ? 'color-mix(in oklch, var(--destructive) 10%, var(--card))' : 'var(--card)'
  const inAnim = status === 'right' ? 'animate-mk-pop' : status === 'wrong' ? 'animate-mk-shake' : ''

  const digitCell = 'w-16 h-16 flex items-center justify-center text-4xl font-display font-black tabular-nums text-foreground'
  const resultBox = `w-16 h-16 rounded-2xl border-2 text-center text-4xl font-display font-black tabular-nums focus:outline-none transition-colors ${inAnim}`
  const scratchStyle: CSSProperties = {
    borderColor: 'color-mix(in oklch, var(--warning) 55%, var(--card))', color: 'var(--warning)', background: 'transparent',
  }
  const clearWrong = () => { if (status === 'wrong') setStatus('idle') }
  const canCheck = ones !== '' && (op === 'sub' || tens !== '')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-black text-foreground text-base leading-tight truncate">🦉 {t(cfg.titleKey, lang)}</h1>
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

        {/* Сова speech bubble */}
        <div className="flex items-start gap-2.5">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0 shadow-[var(--shadow-sm)]"
            style={{ background: 'color-mix(in oklch, var(--primary) 14%, var(--card))' }}>🦉</div>
          <div className="flex-1 rounded-2xl rounded-tl-sm px-4 py-3 text-sm font-semibold text-foreground shadow-[var(--shadow-sm)] min-h-[2.75rem] flex items-center"
            style={{ background: 'var(--card)' }}>
            {busy
              ? <span className="animate-pulse text-muted-foreground">{t('sova_thinking', lang)}</span>
              : <span key={sova} className="animate-mk-pop-in">{sova}</span>}
          </div>
        </div>

        {/* Column */}
        <div className="bg-card rounded-3xl px-5 py-7 shadow-[var(--shadow-md)] flex justify-center">
          <div className="inline-grid items-center gap-x-1" style={{ gridTemplateColumns: '2.25rem 4rem 4rem' }}>
            {/* scratch row — carry (add) / borrow notes (sub). Optional helper, not graded. */}
            <div />
            <div className="flex justify-center">
              <input ref={carryRef} type="text" inputMode="numeric" value={carry}
                onChange={e => { const v = digits(e.target.value, 1); setCarry(v); clearWrong(); if (v && op === 'add') tensRef.current?.focus() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label={op === 'add' ? 'carry' : 'reduced tens'}
                className="w-9 h-9 rounded-full border-2 border-dashed text-center text-lg font-display font-black tabular-nums focus:outline-none"
                style={scratchStyle} />
            </div>
            <div className="flex justify-center">
              {op === 'sub' && (
                <input type="text" inputMode="numeric" value={borrow}
                  onChange={e => { setBorrow(digits(e.target.value, 2)); clearWrong() }}
                  onKeyDown={e => e.key === 'Enter' && check()}
                  aria-label="borrowed ones"
                  className="w-12 h-9 rounded-2xl border-2 border-dashed text-center text-lg font-display font-black tabular-nums focus:outline-none"
                  style={scratchStyle} />
              )}
            </div>

            {/* first operand */}
            <div />
            <div className={digitCell}>{aT}</div>
            <div className={digitCell}>{aO}</div>

            {/* sign + second operand */}
            <div className="flex items-center justify-center text-3xl font-display font-black" style={{ color: 'var(--accent)' }}>{cfg.sign}</div>
            <div className={digitCell}>{bT}</div>
            <div className={digitCell}>{bO}</div>

            {/* rule */}
            <div className="h-1 rounded-full my-2" style={{ gridColumn: '1 / -1', background: 'var(--foreground)' }} />

            {/* result inputs */}
            <div />
            <div className="flex justify-center">
              <input ref={tensRef} type="text" inputMode="numeric" value={tens}
                onChange={e => { setTens(digits(e.target.value, 1)); clearWrong() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label="tens"
                className={resultBox}
                style={{ borderColor: inBorder, background: inBg, color: 'var(--foreground)' }} />
            </div>
            <div className="flex justify-center">
              <input ref={onesRef} type="text" inputMode="numeric" value={ones}
                onChange={e => { const v = digits(e.target.value, 1); setOnes(v); clearWrong(); if (v) (op === 'add' ? carryRef : tensRef).current?.focus() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label="ones" autoFocus
                className={resultBox}
                style={{ borderColor: inBorder, background: inBg, color: 'var(--foreground)' }} />
            </div>
          </div>
        </div>

        {/* Check + skip */}
        {status !== 'right' && (
          <div className="flex flex-col gap-3">
            <button onClick={check} disabled={!canCheck || busy}
              className="pop-btn w-full font-display text-white font-black text-2xl rounded-[var(--radius)] py-4 disabled:opacity-50"
              style={{ background: 'var(--gradient-success)', ['--pop-shadow' as string]: 'var(--brand-deep)' } as CSSProperties}>
              {t('column_check', lang)}
            </button>
            {attempt >= 3 && status === 'wrong' && (
              <button onClick={() => finishProblem(false)}
                className="mx-auto text-xs font-display font-black px-4 py-2 rounded-full active:scale-95 transition-transform"
                style={{ color: 'var(--muted-foreground)' }}>
                {t('column_skip', lang)} →
              </button>
            )}
          </div>
        )}
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
