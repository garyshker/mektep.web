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

// Grade-3 foundation: numbers to 1000. A 3-digit number as base-ten blocks —
// hundred-flats (10×10), ten-rods, unit-cubes — read by place. Key distractors
// are digit swaps between places (342 vs 324) — the place-value misconception
// as numbers grow past 100.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

function gen() {
  const h = ri(1, 9), te = ri(0, 9), o = ri(0, 9)
  return { h, te, o, n: h * 100 + te * 10 + o }
}

function buildOptions(n: number, h: number, te: number, o: number): number[] {
  const s = new Set<number>([n])
  const swaps = [h * 100 + o * 10 + te, te * 100 + h * 10 + o, o * 100 + te * 10 + h]
  for (const d of swaps) { if (s.size >= 4) break; if (d >= 100 && d <= 999 && d !== n) s.add(d) }
  let guard = 0
  while (s.size < 4 && guard++ < 40) {
    const d = n + [100, -100, 10, -10, 1, -1][ri(0, 5)]
    if (d >= 100 && d <= 999 && d !== n) s.add(d)
  }
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

const SHADOW = '0 1px 2px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.35)'
const gridBg = (line: string) =>
  `repeating-linear-gradient(${line} 0 1px, transparent 1px 4.6px), repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 4.6px)`

function Hundred() {
  return <span style={{ width: 46, height: 46, borderRadius: 6, flexShrink: 0,
    background: 'linear-gradient(160deg,#f6c163,#e5a63c)', backgroundImage: gridBg('rgba(120,80,20,.32)'),
    border: '2px solid #a9702a', boxShadow: SHADOW }} />
}
function TenRod() {
  return <span style={{ width: 13, height: 46, borderRadius: 4, flexShrink: 0,
    background: 'linear-gradient(160deg,#6ec3af,#4da491)',
    backgroundImage: 'repeating-linear-gradient(rgba(20,80,65,.38) 0 1px, transparent 1px 4.6px)',
    border: '2px solid #2f7a68', boxShadow: SHADOW }} />
}
function Unit() {
  return <span style={{ width: 13, height: 13, borderRadius: 3, flexShrink: 0,
    background: 'linear-gradient(160deg,#8aa8de,#6d8fd4)', border: '2px solid #3f5da0', boxShadow: SHADOW }} />
}

// One place value = its own tinted band: label on its own line (Kazakh place
// names are long, so a fixed side column collided with the blocks), then the
// blocks below with room to wrap. The digit is revealed only after answering.
function Band({ label, color, digit, reveal, children }: {
  label: string; color: string; digit: number; reveal: boolean; children: React.ReactNode
}) {
  return (
    <div className="w-full rounded-2xl px-3 py-2.5 flex flex-col gap-2"
      style={{ background: `color-mix(in oklch, ${color} 9%, var(--card))`, border: `1.5px solid color-mix(in oklch, ${color} 22%, var(--card))` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black tracking-widest uppercase leading-none" style={{ color }}>{label}</span>
        <span className="font-display font-black text-lg tabular leading-none"
          style={{ color, opacity: reveal ? 1 : 0, transition: 'opacity .3s ease' }}>{digit}</span>
      </div>
      <div className="flex flex-wrap items-end gap-[5px] min-h-[46px]">{children}</div>
    </div>
  )
}

export default function HundredsTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<{ h: number; te: number; o: number; n: number } | null>(null)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    const g = gen()
    setP(g); setOptions(buildOptions(g.n, g.h, g.te, g.o)); setPicked(null); setStatus('idle')
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g3_hundreds', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    if (opt === p.n) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '💯'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_hundreds_title', lang)}</h2>
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">💯 {t('train_hundreds_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-4 py-5 shadow-[var(--shadow-md)] flex flex-col items-stretch gap-3">
          <p className="text-sm font-bold text-muted-foreground text-center">{t('tens_q', lang)}</p>
          <div className="flex flex-col gap-2.5">
            <Band label={t('hundreds_label', lang)} color="#a9702a" digit={p.h} reveal={status !== 'idle'}>
              {Array.from({ length: p.h }).map((_, i) => <Hundred key={i} />)}
            </Band>
            <Band label={t('tens_label', lang)} color="#2f7a68" digit={p.te} reveal={status !== 'idle'}>
              {Array.from({ length: p.te }).map((_, i) => <TenRod key={i} />)}
            </Band>
            <Band label={t('ones_label', lang)} color="#3f5da0" digit={p.o} reveal={status !== 'idle'}>
              {Array.from({ length: p.o }).map((_, i) => <Unit key={i} />)}
            </Band>
          </div>
          {status !== 'idle' && (
            <p className="text-4xl font-display font-black tabular-nums animate-mk-pop text-center mt-1"
              style={{ color: status === 'right' ? 'var(--success)' : 'var(--foreground)' }}>{p.n}</p>
          )}
        </div>

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
