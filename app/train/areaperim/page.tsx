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

// Grade-3: area vs perimeter on a grid. A rectangle w×h is drawn as real cells.
// Area mode fills the inside (count the cells); perimeter mode traces the
// border and marks each unit step. Asking for one or the other on the SAME
// picture is what separates the two ideas kids usually conflate.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

type Mode = 'area' | 'perim'
type P = { w: number; h: number; mode: Mode; answer: number }

function gen(prev?: Mode): P {
  const w = ri(2, 8), h = ri(2, 6)
  // alternate the two questions so the contrast keeps landing
  const mode: Mode = prev === 'area' ? 'perim' : prev === 'perim' ? 'area' : (Math.random() < 0.5 ? 'area' : 'perim')
  return { w, h, mode, answer: mode === 'area' ? w * h : 2 * (w + h) }
}

function buildOptions(answer: number, w: number, h: number, mode: Mode): number[] {
  const s = new Set<number>([answer])
  // the classic confusion: the OTHER measure of the same rectangle
  const other = mode === 'area' ? 2 * (w + h) : w * h
  if (other !== answer && other > 0) s.add(other)
  s.add(w + h)                       // half-perimeter slip
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-3, 3)
    if (d > 0 && d !== answer) s.add(d)
  }
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

function Grid({ w, h, mode, solved }: { w: number; h: number; mode: Mode; solved: boolean }) {
  const CELL = Math.min(30, Math.floor(260 / Math.max(w, h)))
  const area = mode === 'area'
  return (
    <div className="relative" style={{ padding: 7 }}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${w}, ${CELL}px)`, gap: 0 }}>
        {Array.from({ length: w * h }).map((_, i) => (
          <div key={i} style={{
            width: CELL, height: CELL,
            border: '1px solid color-mix(in oklch, var(--accent-deep) 45%, transparent)',
            background: area ? 'color-mix(in oklch, var(--accent) 42%, var(--card))' : 'var(--card)',
          }} />
        ))}
      </div>
      {/* perimeter: thick traced border + a tick per unit step */}
      {!area && (
        <div className="absolute pointer-events-none" style={{ left: 7, top: 7, width: w * CELL, height: h * CELL,
          border: '4px solid var(--primary)', borderRadius: 3,
          boxShadow: solved ? '0 0 18px color-mix(in oklch, var(--primary) 55%, transparent)' : 'none' }}>
          {Array.from({ length: w }).map((_, i) => (
            <span key={`t${i}`} style={{ position: 'absolute', top: -8, left: i * CELL + CELL / 2 - 2, width: 4, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          ))}
          {Array.from({ length: w }).map((_, i) => (
            <span key={`b${i}`} style={{ position: 'absolute', bottom: -8, left: i * CELL + CELL / 2 - 2, width: 4, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          ))}
          {Array.from({ length: h }).map((_, i) => (
            <span key={`l${i}`} style={{ position: 'absolute', left: -8, top: i * CELL + CELL / 2 - 2, width: 4, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          ))}
          {Array.from({ length: h }).map((_, i) => (
            <span key={`r${i}`} style={{ position: 'absolute', right: -8, top: i * CELL + CELL / 2 - 2, width: 4, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AreaPerimTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // A miss reveals the measure, so the offer belongs on the NEXT rectangle.
  const offerNext = useRef(false)

  const newProblem = () => {
    setP(prev => {
      const g = gen(prev?.mode)
      setOptions(buildOptions(g.answer, g.w, g.h, g.mode)); setPicked(null); setStatus('idle')
      setHint(false); setOffer(offerNext.current); offerNext.current = false
      return g
    })
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g3_areaperim', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    if (opt === p.answer) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1300)
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '📐'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_areaperim_title', lang)}</h2>
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
  const unit = p.mode === 'area' ? t('ap_unit_area', lang) : t('ap_unit_len', lang)

  // Same rectangle, two different questions — so the chain differs too. Area
  // counts rows of cells; perimeter walks the four sides. Keeping them apart is
  // the entire point of the trainer.
  const hintSteps: HintStep[] = p.mode === 'area'
    ? [
        { ask: t('hint_ap_row', lang), answer: p.w, lo: 2, hi: 8 },
        { ask: t('hint_ap_rows', lang), answer: p.h, lo: 2, hi: 6 },
        { ask: t('hint_ap_cells', lang), expr: `${p.w} × ${p.h}`, answer: p.w * p.h, lo: 4, hi: 48 },
      ]
    : [
        { ask: t('hint_ap_top', lang), answer: p.w, lo: 2, hi: 8 },
        { ask: t('hint_ap_side', lang), answer: p.h, lo: 2, hi: 6 },
        { ask: t('hint_ap_around', lang), expr: `${p.w} + ${p.h} + ${p.w} + ${p.h}`, answer: 2 * (p.w + p.h), lo: 8, hi: 28 },
      ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">📐 {t('train_areaperim_title', lang)}</h1>
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
          <p className="text-sm font-bold text-center"
            style={{ color: p.mode === 'area' ? 'var(--accent-deep)' : 'var(--primary)' }}>
            {t(p.mode === 'area' ? 'ap_area_q' : 'ap_perim_q', lang)}
          </p>
          <Grid w={p.w} h={p.h} mode={p.mode} solved={solved} />
          <p className="text-sm font-semibold text-muted-foreground tabular-nums">
            {p.w} × {p.h} {t('ap_cells', lang)}
          </p>
          {solved && (
            <p className="font-display font-black text-xl animate-mk-pop-in tabular-nums text-center"
              style={{ color: 'var(--success)' }}>
              {p.mode === 'area'
                ? `S = ${p.w} × ${p.h} = ${p.answer} ${unit}`
                : `P = (${p.w} + ${p.h}) × 2 = ${p.answer} ${unit}`}
            </p>
          )}
        </div>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(p.mode === 'area' ? 'hint_ap_area_rule' : 'hint_ap_perim_rule', lang)}
            steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === p.answer
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
