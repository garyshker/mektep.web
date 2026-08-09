'use client'

// Shared hint scaffold. The researched core (Razzaq & Heffernan): a hint that
// ASKS beats a hint that TELLS — so a hint here is a short chain of
// sub-questions the child answers, ending with the principle in plain words.
// Each trainer supplies the steps as data; the interaction is identical
// everywhere. See /train/extmul for the fuller 3-tier version with a worked
// isomorphic example.

import { useState } from 'react'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { t, type Lang } from '@/lib/i18n'
import { HelpCircle, Lightbulb, Check } from 'lucide-react'
import type { CSSProperties } from 'react'

export type HintStep = {
  ask: string          // the sub-question, in the child's language
  expr?: string        // optional expression shown big under it
  answer: number
  lo: number; hi: number   // plausible range for the generated options
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

function optionsFor(s: HintStep): number[] {
  const set = new Set<number>([s.answer])
  let guard = 0
  while (set.size < 4 && guard++ < 60) {
    const d = s.answer + (Math.floor(Math.random() * 5) - 2)
    if (d >= s.lo && d <= s.hi) set.add(d)
  }
  let pad = s.lo
  while (set.size < 4 && pad <= s.hi) { set.add(pad); pad++ }
  return shuffle([...set])
}

/** The "I don't understand" button — always available, BEFORE any guessing,
 *  so hints are never a prize for answering wrong. */
export function HintButton({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="self-center flex items-center gap-1.5 text-sm font-bold py-2 px-4 rounded-full"
      style={{ color: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 8%, transparent)' }}>
      <HelpCircle size={16} /> {t('hint_help', lang)}
    </button>
  )
}

/** Offered after repeated errors rather than forced — help avoidance is the
 *  worse failure mode, so we ask instead of interrupting. */
export function HintOffer({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="w-full py-3 rounded-[var(--radius)] border-2 border-dashed font-display font-black text-sm flex items-center justify-center gap-2 animate-mk-pop-in"
      style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 6%, var(--card))' }}>
      <Lightbulb size={16} /> {t('hint_offer', lang)}
    </button>
  )
}

export function HintScaffold({ steps, principle, lang, onClose }: {
  steps: HintStep[]; principle: string; lang: Lang; onClose: () => void
}) {
  const [i, setI] = useState(0)
  const [opts, setOpts] = useState<number[]>(() => optionsFor(steps[0]))
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  const step = steps[i]

  const pick = (v: number) => {
    playTap()
    if (v === step.answer) {
      playCorrect(); setMsg('')
      if (i + 1 < steps.length) { setI(i + 1); setOpts(optionsFor(steps[i + 1])) }
      else setDone(true)
    } else {
      playWrong(); setMsg(t('hint_retry', lang))
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 animate-mk-pop-in"
      style={{ background: 'color-mix(in oklch, var(--primary) 8%, var(--card))', border: '2px solid color-mix(in oklch, var(--primary) 30%, var(--card))' }}>
      {!done ? (
        <>
          {/* progress through the chain, so the child sees it is finite */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, k) => (
              <span key={k} className="h-1.5 flex-1 rounded-full"
                style={{ background: k < i ? 'var(--success)' : k === i ? 'var(--primary)' : 'var(--muted)' }} />
            ))}
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{step.ask}</p>
          {step.expr && (
            <p className="text-2xl font-display font-black tabular-nums text-center">{step.expr}</p>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {opts.map(v => (
              <button key={v} onClick={() => pick(v)}
                className="pop-btn py-3.5 rounded-[var(--radius)] border-2 font-display font-black text-2xl tabular"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {v}
              </button>
            ))}
          </div>
          {msg && <p className="text-xs font-bold text-center" style={{ color: 'var(--destructive)' }}>{msg}</p>}
        </>
      ) : (
        <>
          <p className="text-sm font-bold flex items-start gap-2" style={{ color: 'var(--success)' }}>
            <Check size={18} strokeWidth={3} className="shrink-0 mt-0.5" /> {principle}
          </p>
          <button onClick={() => { playTap(); onClose() }}
            className="pop-btn w-full py-3 rounded-[var(--radius)] text-white font-display font-black"
            style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('hint_got_it', lang)}
          </button>
        </>
      )}
    </div>
  )
}
