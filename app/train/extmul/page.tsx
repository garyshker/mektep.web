'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { PartitionArray } from '@/components/PartitionArray'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight, HelpCircle, Lightbulb } from 'lucide-react'
import type { CSSProperties } from 'react'

// Grade-3: внетабличное умножение (2-digit × 1-digit) by partitioning —
// 24 × 3 = (20 × 3) + (4 × 3). Built on the research:
//  • array-to-grid base-ten model, the cut makes the distributive law visible
//    (NCETM Spine 2.14); every picture step carries its equation line beside it
//  • hints ASK rather than TELL — scaffolding beats long explanations
//    (Razzaq & Heffernan, ASSISTments)
//  • the bottom-out hint works a DIFFERENT but isomorphic example, so racing to
//    it never hands over this answer (anti-gaming)
//  • wrong options each map to one documented misconception, and the feedback
//    names that specific slip in <= 12 words
//  • the worked example is segmented with a Next button (Mayer: segmenting)
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type Tag = 'tens_only' | 'ones_only' | 'appended' | 'carry' | 'digitsum'
type Opt = { v: number; tag?: Tag }
type P = { t: number; u: number; a: number; b: number; answer: number; opts: Opt[] }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function make(t: number, u: number, b: number): P {
  const a = t * 10 + u, answer = a * b
  const cands: Opt[] = [
    { v: (t * 10) * b, tag: 'tens_only' },                 // multiplied the tens, forgot the ones
    { v: u * b, tag: 'ones_only' },                        // multiplied the ones only
    { v: (t * b) * 10 + u, tag: 'appended' },              // 23·4 = 83 — appended the ones digit
    { v: (t * 10) * b + (u * b) % 10, tag: 'carry' },      // dropped the regrouped ten
    { v: (t + u) * b, tag: 'digitsum' },                   // partitioned the digits, not the value
  ]
  const seen = new Set<number>([answer])
  const wrong: Opt[] = []
  for (const c of shuffle(cands)) {
    if (wrong.length >= 3) break
    if (c.v > 0 && !seen.has(c.v)) { seen.add(c.v); wrong.push(c) }
  }
  let pad = answer + 1
  while (wrong.length < 3) { if (!seen.has(pad)) { seen.add(pad); wrong.push({ v: pad }) } pad++ }
  return { t, u, a, b, answer, opts: shuffle([{ v: answer }, ...wrong]) }
}

const gen = (): P => make(ri(1, 4), ri(2, 8), ri(3, 6))

// an isomorphic example for the bottom-out hint — same shape, different numbers
function isomorph(p: P): P {
  let e = make(ri(1, 4), ri(2, 8), p.b)
  let guard = 0
  while (e.a === p.a && guard++ < 10) e = make(ri(1, 4), ri(2, 8), p.b)
  return e
}

function smallOpts(answer: number, spread: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 40) {
    const d = answer + ri(-spread, spread)
    if (d > 0 && d !== answer) s.add(d)
  }
  let pad = answer + 1
  while (s.size < 4) { s.add(pad); pad++ }
  return shuffle([...s])
}

export default function ExtMulTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [attempts, setAttempts] = useState(0)
  const [note, setNote] = useState('')            // misconception-specific feedback
  const [offerHint, setOfferHint] = useState(false)

  // hint state — 0 none · 1 sub-questions · 2 partial worked step · 3 worked example
  const [hint, setHint] = useState<0 | 1 | 2 | 3>(0)
  const [sub, setSub] = useState<0 | 1>(0)        // which sub-question in level 1
  const [subOpts, setSubOpts] = useState<number[]>([])
  const [subMsg, setSubMsg] = useState('')
  const [ex, setEx] = useState<P | null>(null)    // the isomorphic worked example
  const [wStep, setWStep] = useState(0)           // segmented steps of the example
  const [selfQ, setSelfQ] = useState(false)

  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setPicked(null); setStatus('idle'); setAttempts(0); setNote(''); setOfferHint(false)
    setHint(0); setSub(0); setSubMsg(''); setEx(null); setWStep(0); setSelfQ(false)
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

  const finishProblem = (firstTry: boolean) => {
    setTotal(c => c + 1)
    void logTrainerAttempt(supabase, 'g3_extmul', firstTry)
    rnd.conclude(firstTry, newProblem)
  }

  const pick = (o: Opt) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(o.v)
    if (o.v === p.answer) {
      const firstTry = attempts === 0 && hint === 0
      setStatus('right')
      if (firstTry) {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      }
      playCorrect()
      setTimeout(() => finishProblem(firstTry), 1500)
      return
    }
    // wrong — name the specific slip, let them try again
    playWrong(); setStreak(0)
    const n = attempts + 1
    setAttempts(n)
    setNote(o.tag ? t(`extmul_fb_${o.tag}` as never, lang) : t('extmul_fb_generic', lang))
    if (n === 1) { setTimeout(() => { setPicked(null) }, 900) }          // retry, no hint yet
    else if (n === 2) { setOfferHint(true); setTimeout(() => setPicked(null), 900) }
    else { openHint(1) }                                                 // stop the guessing
  }

  const openHint = (lvl: 1 | 2 | 3) => {
    if (!p) return
    playTap(); setOfferHint(false); setPicked(null); setNote('')
    setHint(lvl)
    if (lvl === 1) { setSub(0); setSubMsg(''); setSubOpts(smallOpts(p.t * 10 * p.b, 12)) }
    if (lvl === 3) { setEx(isomorph(p)); setWStep(0); setSelfQ(false) }
  }

  const answerSub = (v: number) => {
    if (!p) return
    playTap()
    const target = sub === 0 ? p.t * 10 * p.b : p.u * p.b
    if (v === target) {
      playCorrect()
      if (sub === 0) { setSub(1); setSubMsg(''); setSubOpts(smallOpts(p.u * p.b, 6)) }
      else { setSubMsg(t('extmul_sub_now_add', lang)); setHint(2) }      // both parts known → add them
    } else {
      playWrong(); setSubMsg(t('extmul_sub_retry', lang))
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '✳️'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_extmul_title', lang)}</h2>
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

  const solved = status === 'right'
  const tensPart = p.t * 10 * p.b, onesPart = p.u * p.b

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">✳️ {t('train_extmul_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-3 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        {/* ── The problem ── */}
        <div className="bg-card rounded-3xl px-4 py-5 shadow-[var(--shadow-md)] flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-muted-foreground">{t('extmul_q', lang)}</p>
          <PartitionArray tens={p.t} ones={p.u} rows={p.b}
            split={hint >= 2 || solved}
            tensLabel={`${p.t * 10} × ${p.b} = ${tensPart}`}
            onesLabel={`${p.u} × ${p.b} = ${onesPart}`} />
          <p className="text-3xl font-display font-black tabular-nums leading-none">
            {p.a} <span style={{ color: 'var(--accent-deep)' }}>×</span> {p.b}
            <span className="mx-1.5 text-muted-foreground">=</span>
            <span className={solved ? 'animate-mk-pop' : ''} style={{ color: solved ? 'var(--success)' : 'var(--muted-foreground)' }}>
              {solved ? p.answer : '?'}
            </span>
          </p>
          {(hint >= 2 || solved) && (
            <p className="text-sm font-display font-black tabular-nums animate-mk-pop-in" style={{ color: 'var(--primary)' }}>
              {tensPart} + {onesPart} {solved ? `= ${p.answer}` : '= ?'}
            </p>
          )}
          {solved && <p className="text-xs font-semibold text-muted-foreground animate-mk-pop-in">{t('extmul_principle', lang)}</p>}
        </div>

        {/* ── Misconception feedback + hint offer ── */}
        {note && !solved && (
          <p className="text-sm font-bold text-center animate-mk-pop-in" style={{ color: 'var(--destructive)' }}>{note}</p>
        )}
        {offerHint && hint === 0 && (
          <button onClick={() => openHint(1)}
            className="w-full py-3 rounded-[var(--radius)] border-2 border-dashed font-display font-black text-sm flex items-center justify-center gap-2 animate-mk-pop-in"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 6%, var(--card))' }}>
            <Lightbulb size={16} /> {t('extmul_hint_offer', lang)}
          </button>
        )}

        {/* ── Hint level 1: sub-questions the child must answer ── */}
        {hint === 1 && (
          <div className="rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 animate-mk-pop-in"
            style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))', border: '2px solid color-mix(in oklch, var(--primary) 30%, var(--card))' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {sub === 0 ? t('extmul_hint_split', lang) : t('extmul_hint_now_ones', lang)}
            </p>
            <p className="text-2xl font-display font-black tabular-nums text-center">
              {sub === 0 ? `${p.t * 10} × ${p.b} = ?` : `${p.u} × ${p.b} = ?`}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {subOpts.map(v => (
                <button key={v} onClick={() => answerSub(v)}
                  className="py-3 rounded-[var(--radius)] border-2 font-display font-black text-xl tabular"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  {v}
                </button>
              ))}
            </div>
            {subMsg && <p className="text-xs font-bold text-center" style={{ color: 'var(--destructive)' }}>{subMsg}</p>}
            <button onClick={() => openHint(3)} className="text-xs font-bold self-center underline" style={{ color: 'var(--muted-foreground)' }}>
              {t('extmul_show_example', lang)}
            </button>
          </div>
        )}

        {/* ── Hint level 2: both parts known, add them ── */}
        {hint === 2 && !solved && (
          <div className="rounded-[var(--radius-lg)] p-3 flex items-center justify-between gap-3 animate-mk-pop-in"
            style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))', border: '2px solid color-mix(in oklch, var(--primary) 30%, var(--card))' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{subMsg || t('extmul_sub_now_add', lang)}</p>
            <button onClick={() => openHint(3)} className="text-xs font-bold underline shrink-0" style={{ color: 'var(--muted-foreground)' }}>
              {t('extmul_show_example', lang)}
            </button>
          </div>
        )}

        {/* ── Hint level 3: a fully worked ISOMORPHIC example (different numbers) ── */}
        {hint === 3 && ex && (
          <div className="rounded-[var(--radius-lg)] p-4 flex flex-col items-center gap-3 animate-mk-pop-in"
            style={{ background: 'color-mix(in oklch, var(--accent) 10%, var(--card))', border: '2px solid color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--accent-deep)' }}>
              {t('extmul_example_label', lang)}
            </p>

            {!selfQ ? (
              <>
                <PartitionArray tens={ex.t} ones={ex.u} rows={ex.b}
                  split={wStep >= 1}
                  highlight={wStep === 2 ? 'tens' : wStep === 3 ? 'ones' : 'none'}
                  tensLabel={wStep >= 2 ? `${ex.t * 10} × ${ex.b} = ${ex.t * 10 * ex.b}` : ' '}
                  onesLabel={wStep >= 3 ? `${ex.u} × ${ex.b} = ${ex.u * ex.b}` : ' '} />

                {/* the equation line for THIS step, beside the blocks */}
                <p className="text-lg font-display font-black tabular-nums text-center min-h-[28px]">
                  {wStep === 0 && `${ex.a} × ${ex.b} = ?`}
                  {wStep === 1 && `${ex.a} = ${ex.t * 10} + ${ex.u}`}
                  {wStep === 2 && <span style={{ color: '#2f7a68' }}>{ex.t * 10} × {ex.b} = {ex.t * 10 * ex.b}</span>}
                  {wStep === 3 && <span style={{ color: '#a9702a' }}>{ex.u} × {ex.b} = {ex.u * ex.b}</span>}
                  {wStep >= 4 && <span style={{ color: 'var(--success)' }}>{ex.t * 10 * ex.b} + {ex.u * ex.b} = {ex.answer}</span>}
                </p>
                <p className="text-xs font-semibold text-center text-muted-foreground min-h-[16px]">
                  {wStep === 0 && t('extmul_step0', lang)}
                  {wStep === 1 && t('extmul_step1', lang)}
                  {wStep === 2 && t('extmul_step2', lang)}
                  {wStep === 3 && t('extmul_step3', lang)}
                  {wStep >= 4 && t('extmul_principle', lang)}
                </p>

                {wStep < 4 ? (
                  <button onClick={() => { playTap(); setWStep(s => s + 1) }}
                    className="pop-btn px-6 py-2.5 rounded-[var(--radius)] text-white font-display font-black text-sm flex items-center gap-2"
                    style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
                    {t('next', lang)} <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={() => { playTap(); setSelfQ(true) }}
                    className="pop-btn px-6 py-2.5 rounded-[var(--radius)] text-white font-display font-black text-sm"
                    style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
                    {t('next', lang)}
                  </button>
                )}
              </>
            ) : (
              /* self-explanation — one question, then back to their own problem */
              <div className="w-full flex flex-col gap-2">
                <p className="text-sm font-bold text-center" style={{ color: 'var(--accent-deep)' }}>{t('extmul_why_q', lang)}</p>
                {([['a', true], ['b', false], ['c', false]] as const).map(([k, ok]) => (
                  <button key={k} onClick={() => { playTap(); if (ok) { playCorrect(); setHint(2); setSubMsg(t('extmul_your_turn', lang)) } else playWrong() }}
                    className="w-full py-2.5 px-3 rounded-[var(--radius)] border-2 text-sm font-semibold text-left"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    {t(`extmul_why_${k}` as never, lang)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Answer options ── */}
        <div className="grid grid-cols-2 gap-3">
          {p.opts.map(o => {
            const isAns = o.v === p.answer
            const isPicked = picked === o.v
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (isPicked && status === 'right') { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
            else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            else if (solved && isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
            return (
              <button key={o.v} onClick={() => pick(o)} disabled={status === 'right'}
                className={`pop-btn rounded-[var(--radius)] py-4 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {o.v}
              </button>
            )
          })}
        </div>

        {/* "I don't understand" — available BEFORE guessing, so hints aren't a prize for wrong answers */}
        {hint === 0 && !solved && (
          <button onClick={() => openHint(1)}
            className="self-center flex items-center gap-1.5 text-sm font-bold py-2 px-4 rounded-full"
            style={{ color: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 8%, transparent)' }}>
            <HelpCircle size={16} /> {t('extmul_dont_get_it', lang)}
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
