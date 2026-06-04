'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { trainerById, type Problem } from '@/lib/trainers'
import { X, Flame, Square } from 'lucide-react'
import type { CSSProperties } from 'react'

function Expr({ text }: { text: string }) {
  const parts = text.split(/(\s*[+\-−×÷]\s*)/)
  return (
    <div className="text-5xl font-display font-black text-center leading-none tracking-tight py-3 select-none">
      {parts.map((p, i) => {
        const tk = p.trim()
        const isOp = /^[+\-−×÷]$/.test(tk)
        return <span key={i} className={isOp ? 'mx-1' : ''} style={isOp ? { color: 'var(--accent)' } : { color: 'var(--foreground)' }}>{p}</span>
      })}
    </div>
  )
}

export default function TrainerRunner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()
  const trainer = trainerById(id)

  const [problem, setProblem] = useState<Problem | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => { if (trainer) setProblem(trainer.gen()) }, [trainer])

  if (!trainer) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <p className="text-muted-foreground">404</p>
    </div>
  }

  const pick = (opt: string) => {
    if (picked !== null || !problem) return
    const isRight = opt === String(problem.answer)
    setPicked(opt)
    setTotal(t => t + 1)
    if (isRight) {
      setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
    } else {
      setStreak(0)
      playWrong()
    }
    setTimeout(() => { setPicked(null); setProblem(trainer.gen()) }, isRight ? 280 : 700)
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

  const restart = () => { setCorrect(0); setTotal(0); setStreak(0); setBest(0); setPicked(null); setEnded(false); setProblem(trainer.gen()) }

  // ── Ended summary ──
  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🎯'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t(trainer.titleKey, lang)}</h2>
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

  const answer = String(problem.answer)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">{t(trainer.titleKey, lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 14%, white)' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        {/* Expression card */}
        <div className="bg-card rounded-3xl px-5 py-6 shadow-[var(--shadow-md)]">
          <Expr text={problem.prompt} />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {problem.options.map(opt => {
            const isSel = picked === opt
            const isRight = opt === answer
            let style: CSSProperties = { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', ['--pop-shadow' as string]: 'var(--border)' }
            let anim = ''
            if (picked) {
              if (isSel && isRight) { style = { background: 'var(--success)', color: 'white', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'var(--brand-deep)' }; anim = 'animate-mk-pop' }
              else if (isSel) { style = { background: 'var(--destructive)', color: 'white', borderColor: 'var(--destructive)', ['--pop-shadow' as string]: 'oklch(0.45 0.2 25)' }; anim = 'animate-mk-shake' }
              else if (isRight) { style = { background: 'color-mix(in oklch, var(--success) 16%, white)', color: 'var(--success)', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'color-mix(in oklch, var(--success) 28%, white)' } }
            }
            return (
              <button key={opt} disabled={!!picked} onClick={() => { playTap(); pick(opt) }}
                className={`pop-btn rounded-[var(--radius)] py-6 text-2xl font-display font-black border-2 min-h-[72px] ${anim}`}
                style={style}>
                {opt}
              </button>
            )
          })}
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
