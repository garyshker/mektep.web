'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Enemy = { x: number; y: number; vx: number; vy: number; s: number }
type Status = 'idle' | 'playing' | 'over'

// ── Arena palette (self-contained dark "screen", looks the same in both themes) ─
const BG = '#0B1220'
const WALL_COLOR = '#EF4444'
const ENEMY_COLOR = '#FBBF24'
const PLAYER_COLOR = '#FFFFFF'
const PLAYER_GLOW = '#3B82F6'

const P = 18          // player square size
const WALL = 7        // wall band thickness
const ENEMY_COUNT = 4 // fixed — like the classic "Escapa!" / "Hold On"
const MAX_V = 8.5     // speed cap (px / frame) to keep collisions fair
const TOUCH_OFFSET = 100 // lift the square this far above the finger when dragging on the arena

export default function ReflexGame() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const timeElRef = useRef<HTMLSpanElement | null>(null)
  const padRef = useRef<HTMLDivElement | null>(null)
  const padDotRef = useRef<HTMLDivElement | null>(null)
  const padDownRef = useRef(false)
  const fingerRef = useRef({ x: 0, y: 0, touch: false })  // raw touch point on the arena (for the tether)

  const [status, setStatus] = useState<Status>('idle')
  const [best, setBest] = useState(0)
  const [finalTime, setFinalTime] = useState(0)
  const [xpAward, setXpAward] = useState(0)
  const [coarse, setCoarse] = useState(false)   // touch device → show the trackpad

  // mutable game state (refs — no re-render in the loop)
  const sizeRef = useRef(340)
  const playerRef = useRef({ x: 160, y: 160 })   // top-left
  const pointerRef = useRef({ x: 170, y: 170 })  // target centre
  const enemiesRef = useRef<Enemy[]>([])
  const startRef = useRef(0)
  const lastRampRef = useRef(0)
  const rafRef = useRef(0)
  const statusRef = useRef<Status>('idle')
  const bestRef = useRef(0)
  statusRef.current = status

  useEffect(() => {
    const b = Number(localStorage.getItem('reflex-best') || 0)
    if (b) { setBest(b); bestRef.current = b }
    const touch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      !!window.matchMedia?.('(pointer: coarse)')?.matches
    )
    setCoarse(touch)
  }, [])

  // ── helpers ──────────────────────────────────────────────────────────────
  const spawnEnemy = () => {
    const S = sizeRef.current
    const s = 16 + Math.random() * 8
    let x = 0, y = 0
    do {
      x = WALL + Math.random() * (S - 2 * WALL - s)
      y = WALL + Math.random() * (S - 2 * WALL - s)
    } while (Math.hypot(x + s / 2 - S / 2, y + s / 2 - S / 2) < S * 0.24)
    const speed = 1.5 + Math.random() * 0.9
    const ang = Math.random() * Math.PI * 2
    enemiesRef.current.push({ x, y, s, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed })
  }

  const reset = () => {
    const S = sizeRef.current
    playerRef.current = { x: S / 2 - P / 2, y: S / 2 - P / 2 }
    pointerRef.current = { x: S / 2, y: S / 2 }
    enemiesRef.current = []
    for (let i = 0; i < ENEMY_COUNT; i++) spawnEnemy()
    startRef.current = performance.now()
    lastRampRef.current = performance.now()
  }

  const draw = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const S = sizeRef.current
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, S, S)
    // danger wall frame
    ctx.lineWidth = WALL
    ctx.strokeStyle = WALL_COLOR
    ctx.strokeRect(WALL / 2, WALL / 2, S - WALL, S - WALL)
    // touch tether — link the finger to the (offset) square so the mapping is clear
    const f = fingerRef.current
    if (statusRef.current === 'playing' && f.touch) {
      const pc = playerRef.current
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 5])
      ctx.beginPath(); ctx.moveTo(pc.x + P / 2, pc.y + P / 2); ctx.lineTo(f.x, f.y); ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath(); ctx.arc(f.x, f.y, 12, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.stroke()
      ctx.restore()
    }
    // enemies
    ctx.fillStyle = ENEMY_COLOR
    for (const e of enemiesRef.current) ctx.fillRect(e.x, e.y, e.s, e.s)
    // player
    const p = playerRef.current
    ctx.save()
    ctx.shadowColor = PLAYER_GLOW
    ctx.shadowBlur = 14
    ctx.fillStyle = PLAYER_COLOR
    ctx.fillRect(p.x, p.y, P, P)
    ctx.restore()
  }

  const endGame = () => {
    if (statusRef.current === 'over') return
    statusRef.current = 'over'
    cancelAnimationFrame(rafRef.current)
    playWrong()
    const tsec = (performance.now() - startRef.current) / 1000
    setFinalTime(tsec)
    if (tsec > bestRef.current) {
      bestRef.current = tsec
      setBest(tsec)
      localStorage.setItem('reflex-best', String(tsec))
    }
    const xp = Math.min(Math.round(tsec * 2), 30)
    setXpAward(xp)
    if (xp > 0) {
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id)
      })()
    }
    setStatus('over')
    draw()
  }

  const step = () => {
    const S = sizeRef.current
    const p = playerRef.current
    p.x = pointerRef.current.x - P / 2
    p.y = pointerRef.current.y - P / 2
    // wall hit — player rect must stay inside the safe band
    if (p.x < WALL || p.y < WALL || p.x + P > S - WALL || p.y + P > S - WALL) { endGame(); return }

    // Fixed 4 squares that simply speed up every second (no new ones spawn)
    const now = performance.now()
    if (now - lastRampRef.current > 1000) {
      lastRampRef.current = now
      for (const e of enemiesRef.current) {
        e.vx = Math.max(-MAX_V, Math.min(MAX_V, e.vx * 1.06))
        e.vy = Math.max(-MAX_V, Math.min(MAX_V, e.vy * 1.06))
      }
    }

    for (const e of enemiesRef.current) {
      e.x += e.vx; e.y += e.vy
      if (e.x < WALL) { e.x = WALL; e.vx = Math.abs(e.vx) }
      if (e.x + e.s > S - WALL) { e.x = S - WALL - e.s; e.vx = -Math.abs(e.vx) }
      if (e.y < WALL) { e.y = WALL; e.vy = Math.abs(e.vy) }
      if (e.y + e.s > S - WALL) { e.y = S - WALL - e.s; e.vy = -Math.abs(e.vy) }
      if (p.x < e.x + e.s && p.x + P > e.x && p.y < e.y + e.s && p.y + P > e.y) { endGame(); return }
    }
  }

  const loop = () => {
    if (statusRef.current !== 'playing') return
    step()
    if (statusRef.current !== 'playing') return
    const tsec = (performance.now() - startRef.current) / 1000
    if (timeElRef.current) timeElRef.current.textContent = tsec.toFixed(1)
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }

  const start = () => {
    reset()
    statusRef.current = 'playing'
    setStatus('playing')
    playTap()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  // ── canvas sizing + DPR ────────────────────────────────────────────────────
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const parent = c.parentElement
    const measure = () => {
      const avail = parent ? parent.clientWidth : 340
      const s = Math.max(260, Math.min(avail, 380))
      sizeRef.current = s
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(s * dpr); c.height = Math.round(s * dpr)
      c.style.width = s + 'px'; c.style.height = s + 'px'
      const ctx = c.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (statusRef.current === 'idle') reset()
      draw()
    }
    measure()
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── controls ───────────────────────────────────────────────────────────────
  // Desktop: mouse moves directly over the arena. Touch: a trackpad below the
  // arena (finger never covers the play field). Both feed the same pointerRef.
  // Desktop mouse over the arena (no offset)
  const mapArena = (clientX: number, clientY: number) => {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    fingerRef.current.touch = false
    pointerRef.current = { x: clientX - r.left, y: clientY - r.top }
  }

  // Finger dragging directly on the arena — square sits above the finger
  const mapArenaTouch = (clientX: number, clientY: number) => {
    const c = canvasRef.current; if (!c) return
    const r = c.getBoundingClientRect()
    const fx = clientX - r.left, fy = clientY - r.top
    fingerRef.current = { x: fx, y: fy, touch: true }
    pointerRef.current = { x: fx, y: fy - TOUCH_OFFSET }
  }

  // Trackpad below the arena (absolute, uniform mapping)
  const mapPad = (clientX: number, clientY: number) => {
    const pad = padRef.current; if (!pad) return
    const r = pad.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const ny = Math.max(0, Math.min(1, (clientY - r.top) / r.height))
    fingerRef.current.touch = false
    pointerRef.current = { x: nx * sizeRef.current, y: ny * sizeRef.current }
    if (padDotRef.current) padDotRef.current.style.transform = `translate(${nx * r.width}px, ${ny * r.height}px)`
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (statusRef.current !== 'playing' || e.pointerType === 'touch') return
      mapArena(e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onArenaDown = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing' || e.pointerType !== 'touch') return
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
    mapArenaTouch(e.clientX, e.clientY)
  }
  const onArenaMove = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing' || e.pointerType !== 'touch') return
    mapArenaTouch(e.clientX, e.clientY)
  }

  const onPadDown = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return
    padDownRef.current = true
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
    mapPad(e.clientX, e.clientY)
  }
  const onPadMove = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing' || !padDownRef.current) return
    mapPad(e.clientX, e.clientY)
  }
  const onPadUp = () => { padDownRef.current = false }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/')} aria-label={t('game_home', lang)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform shrink-0">
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-display font-black text-foreground leading-tight">{t('reflex_title', lang)}</h1>
          <p className="text-xs text-muted-foreground truncate">{t('reflex_sub', lang)}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="bg-card border-2 border-border rounded-[var(--radius)] px-3 py-1 text-center shadow-[var(--shadow-sm)] min-w-[64px]">
            <p className="text-[9px] font-black tracking-wider uppercase text-muted-foreground">{t('reflex_time', lang)}</p>
            <p className="text-base font-display font-black text-foreground leading-none tabular">
              <span ref={timeElRef}>0.0</span>
            </p>
          </div>
          <div className="bg-card border-2 border-border rounded-[var(--radius)] px-3 py-1 text-center shadow-[var(--shadow-sm)] min-w-[64px]">
            <p className="text-[9px] font-black tracking-wider uppercase" style={{ color: 'var(--accent)' }}>{t('reflex_best', lang)}</p>
            <p className="text-base font-display font-black text-foreground leading-none tabular">{best.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="relative w-full max-w-md flex justify-center">
        <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)]">
          <canvas ref={canvasRef} onPointerDown={onArenaDown} onPointerMove={onArenaMove}
            style={{ touchAction: 'none', display: 'block' }} />

          {/* Idle overlay */}
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center leading-normal"
              style={{ background: 'rgba(11,18,32,0.72)', backdropFilter: 'blur(2px)' }}>
              <button onClick={start}
                className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'var(--primary)' }}>
                <Play size={28} className="text-white ml-1" fill="currentColor" />
              </button>
              <p className="text-white/85 text-sm font-semibold max-w-[240px] leading-snug">{t('reflex_start_hint', lang)}</p>
            </div>
          )}

          {/* Game over overlay */}
          {status === 'over' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center leading-normal"
              style={{ background: 'rgba(11,18,32,0.82)', backdropFilter: 'blur(2px)' }}>
              <div className="text-5xl">💥</div>
              <h2 className="text-2xl font-display font-black text-white">{t('reflex_over', lang)}</h2>
              <p className="text-white text-lg font-display font-black tabular">
                {finalTime.toFixed(1)} <span className="text-white/60 text-sm">{t('reflex_sec', lang)}</span>
              </p>
              {xpAward > 0 && <p className="font-display font-black" style={{ color: 'var(--xp)' }}>+{xpAward} XP</p>}
              <div className="flex gap-3 mt-1">
                <button onClick={() => router.push('/')}
                  className="px-5 py-2.5 rounded-[var(--radius)] bg-white/15 text-white font-display font-black active:scale-95 transition-transform">
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
      </div>

      {/* Trackpad (touch devices) — drag here so your finger is off the arena */}
      {coarse && (
        <div ref={padRef}
          onPointerDown={onPadDown} onPointerMove={onPadMove} onPointerUp={onPadUp} onPointerCancel={onPadUp}
          className="relative mt-4 rounded-[var(--radius-lg)] overflow-hidden select-none flex items-center justify-center shadow-[var(--shadow-sm)]"
          style={{
            touchAction: 'none', width: 'min(84vw, 240px)', height: 'min(84vw, 240px)',
            background: 'color-mix(in oklch, var(--primary) 7%, var(--card))',
            border: '2px dashed color-mix(in oklch, var(--primary) 45%, var(--border))',
          }}>
          <span className="text-xs font-display font-black uppercase tracking-wider pointer-events-none px-6 text-center" style={{ color: 'color-mix(in oklch, var(--primary) 70%, var(--muted-foreground))' }}>
            {t('reflex_pad_hint', lang)}
          </span>
          <div ref={padDotRef}
            className="absolute top-0 left-0 w-7 h-7 -ml-3.5 -mt-3.5 rounded-full pointer-events-none"
            style={{ background: 'color-mix(in oklch, var(--primary) 35%, transparent)', border: '2px solid var(--primary)' }} />
        </div>
      )}

      <p className="w-full max-w-md text-muted-foreground/70 text-xs leading-relaxed mt-5 text-center">
        {t('reflex_hint', lang)}
      </p>
    </div>
  )
}
