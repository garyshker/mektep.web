'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { touchStreak } from '@/lib/streak'
import { playWrong, playNote } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Phase = 'idle' | 'showing' | 'input' | 'over'

// pads, row-major: 0 TL (green), 1 TR (red), 2 BL (yellow), 3 BR (blue)
const PADS = [
  { on: 'var(--brand)',       freq: 329.63, corner: 'rounded-tl-[64px]' },
  { on: 'var(--destructive)', freq: 261.63, corner: 'rounded-tr-[64px]' },
  { on: 'var(--xp)',          freq: 392.00, corner: 'rounded-bl-[64px]' },
  { on: 'var(--primary)',     freq: 523.25, corner: 'rounded-br-[64px]' },
]

// module helper so the purity rule doesn't flag Math.random() inside a render-scoped handler
const randPad = () => Math.floor(Math.random() * 4)

export default function SimonGame() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState<number | null>(null)
  const [round, setRound] = useState(0)
  const [best, setBest] = useState(0)
  const [finalRound, setFinalRound] = useState(0)
  const [xpAward, setXpAward] = useState(0)

  const seqRef = useRef<number[]>([])
  const inputIdxRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const bestRef = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(() => { phaseRef.current = phase }, [phase])

  const clearTimers = () => { timers.current.forEach(id => clearTimeout(id)); timers.current = [] }
  const after = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }

  useEffect(() => {
    const b = Number(localStorage.getItem('simon-best') || 0)
    if (b) { setBest(b); bestRef.current = b }
    return () => clearTimers()
  }, [])

  const flash = (pad: number, ms: number) => {
    setActive(pad)
    playNote(PADS[pad].freq, Math.min(ms, 340) / 1000)
    after(ms, () => setActive(null))
  }

  // flashes get a touch quicker as the sequence grows
  const speedFor = (len: number) => {
    const on = Math.max(240, 520 - len * 24)
    return { on, gap: Math.max(90, Math.round(on * 0.35)) }
  }

  const playSequence = () => {
    setPhase('showing'); phaseRef.current = 'showing'
    inputIdxRef.current = 0
    const seq = seqRef.current
    const { on, gap } = speedFor(seq.length)
    let i = 0
    const tick = () => {
      if (i >= seq.length) { setPhase('input'); phaseRef.current = 'input'; return }
      flash(seq[i], on)
      after(on + gap, () => { i++; tick() })
    }
    after(620, tick)
  }

  const nextRound = () => {
    seqRef.current = [...seqRef.current, randPad()]
    setRound(seqRef.current.length)
    playSequence()
  }

  const start = () => {
    clearTimers()
    seqRef.current = []
    inputIdxRef.current = 0
    setXpAward(0); setFinalRound(0)
    nextRound()
  }

  const gameOver = () => {
    clearTimers()
    setActive(null)
    phaseRef.current = 'over'; setPhase('over')
    playWrong()
    const passed = Math.max(0, seqRef.current.length - 1)
    setFinalRound(passed)
    if (passed > bestRef.current) {
      bestRef.current = passed
      setBest(passed)
      localStorage.setItem('simon-best', String(passed))
    }
    const xp = Math.min(passed * 3, 30)
    setXpAward(xp)
    if (xp > 0) {
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id); void touchStreak(supabase)
      })()
    }
  }

  const onPad = (pad: number) => {
    if (phaseRef.current !== 'input') return
    flash(pad, 200)
    if (pad !== seqRef.current[inputIdxRef.current]) { gameOver(); return }
    inputIdxRef.current++
    if (inputIdxRef.current >= seqRef.current.length) {
      // round cleared — short pause, then extend & replay
      phaseRef.current = 'showing'; setPhase('showing')
      after(760, nextRound)
    }
  }

  const centerLabel =
    phase === 'showing' ? t('simon_watch', lang) :
    phase === 'input' ? t('simon_repeat', lang) : ''

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/')} aria-label={t('game_home', lang)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform shrink-0">
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-display font-black text-foreground leading-tight">{t('simon_title', lang)}</h1>
          <p className="text-xs text-muted-foreground truncate">{t('simon_sub', lang)}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="bg-card border-2 border-border rounded-[var(--radius)] px-3 py-1 text-center shadow-[var(--shadow-sm)] min-w-[64px]">
            <p className="text-[9px] font-black tracking-wider uppercase text-muted-foreground">{t('simon_round', lang)}</p>
            <p className="text-base font-display font-black text-foreground leading-none tabular">{round}</p>
          </div>
          <div className="bg-card border-2 border-border rounded-[var(--radius)] px-3 py-1 text-center shadow-[var(--shadow-sm)] min-w-[64px]">
            <p className="text-[9px] font-black tracking-wider uppercase" style={{ color: 'var(--accent)' }}>{t('reflex_best', lang)}</p>
            <p className="text-base font-display font-black text-foreground leading-none tabular">{best}</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full max-w-sm">
        <div className="grid grid-cols-2 grid-rows-2 gap-3 aspect-square">
          {PADS.map((pad, i) => {
            const lit = active === i
            return (
              <button key={i} onPointerDown={() => onPad(i)} disabled={phase !== 'input'}
                className={`w-full h-full rounded-2xl ${pad.corner} transition-all duration-150`}
                style={{
                  background: lit ? pad.on : `color-mix(in oklch, ${pad.on} 32%, var(--card))`,
                  boxShadow: lit ? `0 0 30px 3px color-mix(in oklch, ${pad.on} 55%, transparent)` : 'var(--shadow-sm)',
                  transform: lit ? 'scale(0.97)' : 'scale(1)',
                  cursor: phase === 'input' ? 'pointer' : 'default',
                }} />
            )
          })}
        </div>

        {/* Center hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-card border-4 border-background flex flex-col items-center justify-center shadow-[var(--shadow-md)] pointer-events-none">
          <span className="text-3xl font-display font-black text-foreground leading-none tabular">{round || '–'}</span>
          {centerLabel && <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-0.5">{centerLabel}</span>}
        </div>

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center rounded-[var(--radius-lg)]"
            style={{ background: 'color-mix(in oklch, var(--background) 78%, transparent)', backdropFilter: 'blur(2px)' }}>
            <button onClick={start}
              className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: 'var(--primary)' }}>
              <Play size={28} className="text-white ml-1" fill="currentColor" />
            </button>
            <p className="text-foreground/80 text-sm font-semibold max-w-[240px] leading-snug">{t('simon_start_hint', lang)}</p>
          </div>
        )}

        {/* Game over overlay */}
        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center rounded-[var(--radius-lg)]"
            style={{ background: 'color-mix(in oklch, var(--background) 86%, transparent)', backdropFilter: 'blur(2px)' }}>
            <h2 className="text-2xl font-display font-black text-foreground">{t('simon_over', lang)}</h2>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-black">{t('simon_passed', lang)}</p>
            <p className="text-foreground text-4xl font-display font-black tabular leading-none">{finalRound}</p>
            {xpAward > 0 && <p className="font-display font-black mt-1" style={{ color: 'var(--xp)' }}>+{xpAward} XP</p>}
            <div className="flex gap-3 mt-3">
              <button onClick={() => router.push('/')}
                className="px-5 py-2.5 rounded-[var(--radius)] bg-card border-2 border-border font-display font-black text-foreground active:scale-95 transition-transform">
                {t('game_home', lang)}
              </button>
              <button onClick={start}
                className="px-6 py-2.5 rounded-[var(--radius)] font-display font-black text-white active:scale-95 transition-transform"
                style={{ background: 'var(--primary)' }}>
                {t('game_again', lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="w-full max-w-sm text-muted-foreground/70 text-xs leading-relaxed mt-5 text-center">
        {t('simon_start_hint', lang)}
      </p>
    </div>
  )
}
