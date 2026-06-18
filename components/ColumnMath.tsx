'use client'

// ColumnMath — the first Сова-coached mini-game (task type #1: column addition
// with carry over ten). Code owns the truth: genAddition('add_2d_carry') builds
// the problem, diagnoseAddition classifies the slip, logAdditionAttempt feeds the
// SRS. Сова (the LLM) owns only the *voice* — a short Socratic hint on a wrong
// answer, never the number. Correct answers get instant static praise (no round-trip).

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t, type Lang } from '@/lib/i18n'
import { genAddition, diagnoseAddition } from '@/lib/skills'
import { logAdditionAttempt } from '@/lib/mastery'
import { askCoach } from '@/lib/tutor-client'
import { X, Flame, Square } from 'lucide-react'

// Instant, free praise for a clean column — no LLM round-trip (mirrors lib/tutor.ts).
const PRAISE: Record<Lang, string[]> = {
  ru: ['Чисто решено! 🌟', 'Десяток-гость на месте! 🦉', 'Вот это столбик! 🚀', 'Точно в цель! 🎯'],
  kk: ['Тап-таза! 🌟', 'Ондық орнында! 🦉', 'Міне, бағана! 🚀', 'Дөп тапты! 🎯'],
  en: ['Clean solve! 🌟', 'Carried ten landed! 🦉', 'Great column! 🚀', 'Bullseye! 🎯'],
}
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
const onlyDigit = (v: string) => v.replace(/\D/g, '').slice(-1)

export function ColumnMath() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [prob, setProb] = useState<{ a: number; b: number } | null>(null)
  const [ones, setOnes] = useState('')
  const [tens, setTens] = useState('')
  const [carry, setCarry] = useState('')
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [attempt, setAttempt] = useState(1)        // per-problem, drives Сова's escalation
  const [counted, setCounted] = useState(false)    // this problem already added to `total`?
  const [sova, setSova] = useState('')
  const [busy, setBusy] = useState(false)          // awaiting Сова

  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const onesRef = useRef<HTMLInputElement>(null)
  const carryRef = useRef<HTMLInputElement>(null)
  const tensRef = useRef<HTMLInputElement>(null)

  // Mount: build the first problem (client-only — Math.random would mismatch on SSR).
  // Re-runs only to refresh Сова's intro line if the language flips; never clobbers
  // a problem in progress.
  useEffect(() => {
    setProb(p => p ?? genAddition('add_2d_carry'))
    setSova(s => (s ? s : t('column_intro', lang)))
  }, [lang])

  const next = () => {
    setStatus('idle'); setOnes(''); setTens(''); setCarry('')
    setAttempt(1); setCounted(false); setSova(t('column_intro', lang))
    setProb(genAddition('add_2d_carry'))
    setTimeout(() => onesRef.current?.focus(), 60)
  }

  const check = async () => {
    if (status === 'right' || busy || !prob || !ones || !tens) return
    playTap()
    if (!counted) { setTotal(n => n + 1); setCounted(true) }
    const typed = Number(tens) * 10 + Number(ones)
    logAdditionAttempt(supabase, prob.a, prob.b, typed)   // fire-and-forget → SRS

    if (typed === prob.a + prob.b) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      setSova(pick(PRAISE[lang] ?? PRAISE.ru))
      playCorrect()
      setTimeout(next, 1000)
    } else {
      setStatus('wrong'); setStreak(0); playWrong()
      const tag = diagnoseAddition(prob.a, prob.b, typed) ?? undefined
      setBusy(true)
      const line = await askCoach({
        lang,
        task: { topic: 'column_addition_transition', question: `${prob.a} + ${prob.b}`, expected_answer: prob.a + prob.b },
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

  const stop = async () => {
    setEnded(true)
    const xp = correct * 2
    if (xp > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id)
      }
    }
  }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    next()
  }

  // ── Ended summary ──
  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🦉'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">🦉 {t('column_title', lang)}</h2>
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
  const clearWrong = () => { if (status === 'wrong') setStatus('idle') }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🦉 {t('column_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
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
            {/* carry row — small "guest ten" note above the tens column */}
            <div />
            <div className="flex justify-center">
              <input ref={carryRef} type="text" inputMode="numeric" value={carry}
                onChange={e => { const v = onlyDigit(e.target.value); setCarry(v); clearWrong(); if (v) tensRef.current?.focus() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label="carry"
                className="w-9 h-9 rounded-full border-2 border-dashed text-center text-lg font-display font-black tabular-nums focus:outline-none"
                style={{ borderColor: 'color-mix(in oklch, var(--warning) 55%, var(--card))', color: 'var(--warning)', background: 'transparent' }} />
            </div>
            <div />

            {/* first operand */}
            <div />
            <div className={digitCell}>{aT}</div>
            <div className={digitCell}>{aO}</div>

            {/* plus + second operand */}
            <div className="flex items-center justify-center text-3xl font-display font-black" style={{ color: 'var(--accent)' }}>+</div>
            <div className={digitCell}>{bT}</div>
            <div className={digitCell}>{bO}</div>

            {/* rule */}
            <div className="h-1 rounded-full my-2" style={{ gridColumn: '1 / -1', background: 'var(--foreground)' }} />

            {/* result inputs */}
            <div />
            <div className="flex justify-center">
              <input ref={tensRef} type="text" inputMode="numeric" value={tens}
                onChange={e => { setTens(onlyDigit(e.target.value)); clearWrong() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label="tens"
                className={`w-16 h-16 rounded-2xl border-2 text-center text-4xl font-display font-black tabular-nums focus:outline-none transition-colors ${inAnim}`}
                style={{ borderColor: inBorder, background: inBg, color: 'var(--foreground)' }} />
            </div>
            <div className="flex justify-center">
              <input ref={onesRef} type="text" inputMode="numeric" value={ones}
                onChange={e => { const v = onlyDigit(e.target.value); setOnes(v); clearWrong(); if (v) carryRef.current?.focus() }}
                onKeyDown={e => e.key === 'Enter' && check()}
                aria-label="ones" autoFocus
                className={`w-16 h-16 rounded-2xl border-2 text-center text-4xl font-display font-black tabular-nums focus:outline-none transition-colors ${inAnim}`}
                style={{ borderColor: inBorder, background: inBg, color: 'var(--foreground)' }} />
            </div>
          </div>
        </div>

        {/* Check + skip */}
        {status !== 'right' && (
          <div className="flex flex-col gap-3">
            <button onClick={check} disabled={!ones || !tens || busy}
              className="pop-btn w-full font-display text-white font-black text-2xl rounded-[var(--radius)] py-4 disabled:opacity-50"
              style={{ background: 'var(--gradient-success)', ['--pop-shadow' as string]: 'var(--brand-deep)' } as CSSProperties}>
              {t('column_check', lang)}
            </button>
            {attempt >= 3 && status === 'wrong' && (
              <button onClick={next}
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
