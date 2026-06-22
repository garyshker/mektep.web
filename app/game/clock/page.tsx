'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { touchStreak } from '@/lib/streak'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ClockFace } from '@/components/ClockFace'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const shuffle = <T,>(arr: T[]): T[] => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i);[a[i], a[j]] = [a[j], a[i]] } return a }
const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`

type Q = { h: number; m: number; answer: string; options: string[] }

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function genClock(): Q {
  const h = ri(1, 12)
  const m = MINUTES[ri(0, MINUTES.length - 1)]
  const answer = fmt(h, m)
  const cand = [
    fmt((h % 12) + 1, m),               // hour +1
    fmt(h === 1 ? 12 : h - 1, m),       // hour −1
    fmt(h, (m + 5) % 60),               // minute +5
    fmt(h, (m + 30) % 60),              // half-hour off
    fmt(h, m === 0 ? 55 : m - 5),       // minute −5
    fmt((h % 12) + 1, (m + 30) % 60),
  ]
  const set = new Set<string>([answer])
  for (const c of shuffle(cand)) { if (set.size >= 4) break; if (c !== answer) set.add(c) }
  while (set.size < 4) set.add(fmt(ri(1, 12), MINUTES[ri(0, MINUTES.length - 1)]))
  return { h, m, answer, options: shuffle([...set]) }
}

export default function ClockGame() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [cur, setCur] = useState<Q | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => { setCur(genClock()) }, [])

  const next = () => { setPicked(null); setCur(genClock()) }

  const pick = (opt: string) => {
    if (picked !== null || !cur) return
    playTap()
    setPicked(opt)
    setTotal(n => n + 1)
    if (opt === cur.answer) {
      setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(next, 650)
    } else {
      setStreak(0)
      playWrong()
    }
  }

  const stop = async () => {
    setEnded(true)
    const xp = correct * 2
    if (xp > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id); void touchStreak(supabase)
      }
    }
  }
  const restart = () => { setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false); next() }

  // ── Ended summary ──
  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🕐'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('clock_title', lang)}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-1" style={{ color: 'var(--warning)' }}>🔥 {t('train_best', lang)}: {best}</p>
        <p className="font-black text-xl mb-10 tabular" style={{ color: 'var(--primary)' }}>+{correct * 2} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/')}
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

  if (!cur) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const answered = picked !== null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/')} aria-label={t('game_home', lang)}
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🕐 {t('clock_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        {/* Clock */}
        <div className="bg-card rounded-3xl px-5 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-muted-foreground">{t('clock_q', lang)}</p>
          <ClockFace h={cur.h} m={cur.m} size={210} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {cur.options.map(opt => {
            const isSel = picked === opt
            const isRight = opt === cur.answer
            let style: CSSProperties = { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', ['--pop-shadow' as string]: 'var(--border)' }
            let anim = ''
            if (answered) {
              if (isSel && isRight) { style = { background: 'var(--success)', color: 'white', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'var(--brand-deep)' }; anim = 'animate-mk-pop' }
              else if (isSel) { style = { background: 'var(--destructive)', color: 'white', borderColor: 'var(--destructive)', ['--pop-shadow' as string]: 'oklch(0.45 0.2 25)' }; anim = 'animate-mk-shake' }
              else if (isRight) { style = { background: 'color-mix(in oklch, var(--success) 16%, var(--card))', color: 'var(--success)', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'color-mix(in oklch, var(--success) 28%, var(--card))' } }
            }
            return (
              <button key={opt} disabled={answered} onClick={() => pick(opt)}
                className={`pop-btn rounded-[var(--radius)] py-5 text-2xl font-display font-black border-2 min-h-[64px] tabular-nums ${anim}`}
                style={style}>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Continue after a wrong answer */}
        {answered && picked !== cur.answer && (
          <button onClick={next}
            className="pop-btn w-full font-display text-white font-black text-xl rounded-[var(--radius)] py-4 flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('next', lang)} <ArrowRight size={20} />
          </button>
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
