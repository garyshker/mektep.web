'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Dir = 'up' | 'down' | 'left' | 'right'
type Phase = 'idle' | 'playing' | 'dead'

const COLS = 15
const ROWS = 20
const FOOD_COUNT = 5
const INIT_SPEED = 280
const MIN_SPEED = 90

interface Pos { x: number; y: number }
interface Food { x: number; y: number; val: number }

function randPos(occupied: Set<string>): Pos {
  let x: number, y: number
  do { x = Math.floor(Math.random() * COLS); y = Math.floor(Math.random() * ROWS) }
  while (occupied.has(`${x},${y}`))
  return { x, y }
}

function spawnFood(snake: Pos[], existing: Food[], target: number): Food[] {
  const occ = new Set([...snake, ...existing].map(p => `${p.x},${p.y}`))
  const result: Food[] = [...existing]

  // Always guarantee at least one target food when there isn't one already
  const hasTarget = result.some(f => f.val === target)
  if (!hasTarget) {
    const pos = randPos(occ)
    occ.add(`${pos.x},${pos.y}`)
    result.push({ ...pos, val: target })
  }

  while (result.length < FOOD_COUNT) {
    const extras = [target + 1, target + 2, target + 3, target + 4, target + 5]
    const val = extras[Math.floor(Math.random() * extras.length)]
    const pos = randPos(occ)
    occ.add(`${pos.x},${pos.y}`)
    result.push({ ...pos, val })
  }
  return result
}

function initFood(snake: Pos[], target: number): Food[] {
  return spawnFood(snake, [], target)
}

export default function SnakePage() {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchRef = useRef<Pos | null>(null)
  const lang = useLang()

  const stateRef = useRef({
    snake: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }] as Pos[],
    dir: 'right' as Dir,
    nextDir: 'right' as Dir,
    food: [] as Food[],
    target: 1,
    score: 0,
    speed: INIT_SPEED,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [target, setTarget] = useState(1)
  const [cellSize, setCellSize] = useState(20)

  useEffect(() => {
    const size = Math.floor(Math.min(window.innerWidth - 32, 330) / COLS)
    setCellSize(size)
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cs = cellSize
    const { snake, food, target: tgt } = stateRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid dots
    ctx.fillStyle = '#2a2a4e'
    for (let x = 0; x < COLS; x++)
      for (let y = 0; y < ROWS; y++) {
        ctx.beginPath()
        ctx.arc(x * cs + cs / 2, y * cs + cs / 2, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

    // Food
    for (const f of food) {
      const isTarget = f.val === tgt
      ctx.fillStyle = isTarget ? '#f97316' : '#374151'
      const r = cs * 0.38
      const cx = f.x * cs + cs / 2
      const cy = f.y * cs + cs / 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = isTarget ? '#fff' : '#9ca3af'
      ctx.font = `bold ${Math.max(9, cs * 0.42)}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(f.val), cx, cy + 0.5)
    }

    // Snake body
    snake.forEach((seg, i) => {
      const t = 1 - i / (snake.length + 2)
      const g = Math.round(100 + t * 100)
      ctx.fillStyle = i === 0 ? '#22c55e' : `rgb(0,${g},30)`
      const pad = i === 0 ? 1 : 2
      const r = (cs / 2 - pad) * (i === 0 ? 1 : 0.85)
      ctx.beginPath()
      ctx.arc(seg.x * cs + cs / 2, seg.y * cs + cs / 2, r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Eyes on head
    const head = snake[0]
    const { dir } = stateRef.current
    const ex = dir === 'right' ? 0.3 : dir === 'left' ? -0.3 : 0
    const ey = dir === 'down' ? 0.3 : dir === 'up' ? -0.3 : 0
    const perp = (dir === 'up' || dir === 'down') ? 0.25 : 0
    const perpV = (dir === 'left' || dir === 'right') ? 0.25 : 0
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(
        head.x * cs + cs / 2 + (ex + perp * s) * cs * 0.6,
        head.y * cs + cs / 2 + (ey + perpV * s) * cs * 0.6,
        cs * 0.13, 0, Math.PI * 2
      )
      ctx.fill()
    }
  }, [cellSize])

  const tick = useCallback(() => {
    const s = stateRef.current
    s.dir = s.nextDir

    const head = s.snake[0]
    const dx = s.dir === 'right' ? 1 : s.dir === 'left' ? -1 : 0
    const dy = s.dir === 'down' ? 1 : s.dir === 'up' ? -1 : 0
    const nx = { x: head.x + dx, y: head.y + dy }

    // Wall or self collision
    if (nx.x < 0 || nx.x >= COLS || nx.y < 0 || nx.y >= ROWS ||
        s.snake.some(seg => seg.x === nx.x && seg.y === nx.y)) {
      playWrong()
      clearInterval(animRef.current!)
      setPhase('dead')
      // Save XP
      if (s.score > 0) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return
          supabase.from('profiles').select('xp').eq('id', user.id).single().then(({ data }) => {
            supabase.from('profiles').update({ xp: (data?.xp ?? 0) + s.score }).eq('id', user.id)
          })
        })
      }
      draw()
      return
    }

    s.snake = [nx, ...s.snake]

    const ateIdx = s.food.findIndex(f => f.x === nx.x && f.y === nx.y)
    if (ateIdx >= 0) {
      const ate = s.food[ateIdx]
      s.food.splice(ateIdx, 1)
      if (ate.val === s.target) {
        playCorrect()
        s.score += 10
        s.target++
        s.speed = Math.max(MIN_SPEED, s.speed - 12)
        setScore(s.score)
        setTarget(s.target)
        // Restart interval with new speed
        clearInterval(animRef.current!)
        animRef.current = setInterval(tick, s.speed)
      } else {
        playWrong()
        // Shrink 2 segments as penalty (min length 1)
        s.snake = s.snake.slice(0, Math.max(1, s.snake.length - 2))
      }
      s.food = spawnFood(s.snake, s.food, s.target)
    } else {
      s.snake.pop()
    }

    draw()
  }, [draw])

  const startGame = useCallback(() => {
    const initSnake: Pos[] = [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }]
    stateRef.current = {
      snake: initSnake,
      dir: 'right', nextDir: 'right',
      food: initFood(initSnake, 1),
      target: 1, score: 0, speed: INIT_SPEED,
    }
    setScore(0); setTarget(1)
    setPhase('playing')
    clearInterval(animRef.current!)
    animRef.current = setInterval(tick, INIT_SPEED)
    draw()
  }, [tick, draw])

  useEffect(() => {
    if (phase === 'playing') draw()
  }, [cellSize, phase, draw])

  // After cellSize settles, draw idle state
  useEffect(() => { draw() }, [cellSize, draw])

  useEffect(() => () => clearInterval(animRef.current!), [])

  // Direction input
  const changeDir = useCallback((d: Dir) => {
    const { dir } = stateRef.current
    const opposites: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
    if (d !== opposites[dir]) stateRef.current.nextDir = d
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
      if (map[e.key]) { e.preventDefault(); changeDir(map[e.key]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [changeDir])

  // Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    touchRef.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
    if (Math.abs(dx) > Math.abs(dy)) changeDir(dx > 0 ? 'right' : 'left')
    else changeDir(dy > 0 ? 'down' : 'up')
  }

  const w = cellSize * COLS
  const h = cellSize * ROWS

  return (
    <div className="min-h-screen flex flex-col items-center pb-6" style={{ background: '#0f0f1a' }}>
      {/* Header */}
      <header className="w-full max-w-sm px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">{t('game_snake_title', lang)}</h1>
          <p className="text-xs text-gray-400">{t('game_snake_desc', lang)}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-orange-500 rounded-xl px-3 py-1.5 text-center">
            <p className="text-[9px] font-black text-white uppercase">{t('game_score', lang)}</p>
            <p className="text-base font-black text-white leading-none">{score}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
            <p className="text-[9px] font-black text-gray-300 uppercase">{t('game_target', lang)}</p>
            <p className="text-base font-black text-orange-400 leading-none">{target}</p>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas
          ref={canvasRef}
          width={w}
          height={h}
          className="rounded-2xl"
          style={{ display: 'block', touchAction: 'none' }}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(15,15,26,0.88)' }}>
            <div className="text-5xl mb-3">🐍</div>
            <h2 className="text-2xl font-black text-white mb-2">{t('game_snake_title', lang)}</h2>
            <p className="text-gray-400 text-sm mb-1 text-center px-8">{t('game_snake_desc', lang)}</p>
            <p className="text-orange-400 text-sm mb-6 text-center font-semibold">{t('game_snake_penalty', lang)}</p>
            <button onClick={startGame}
              className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-lg active:scale-95">
              {t('game_go', lang)}
            </button>
          </div>
        )}

        {/* Dead overlay */}
        {phase === 'dead' && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
            style={{ background: 'rgba(15,15,26,0.9)' }}>
            <div className="text-5xl mb-3">💀</div>
            <h2 className="text-2xl font-black text-white mb-1">{t('game_over', lang)}</h2>
            <p className="text-gray-400 mb-1">{t('game_score', lang)}: <span className="text-white font-black text-xl">{score}</span></p>
            <p className="text-orange-400 font-semibold mb-6">+{score} XP</p>
            <button onClick={startGame}
              className="px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-lg active:scale-95">
              {t('game_again', lang)}
            </button>
          </div>
        )}
      </div>

      {/* D-pad */}
      <div className="mt-5 grid grid-cols-3 gap-2" style={{ width: 140 }}>
        <div />
        <DPadBtn label="▲" onClick={() => changeDir('up')} />
        <div />
        <DPadBtn label="◀" onClick={() => changeDir('left')} />
        <div />
        <DPadBtn label="▶" onClick={() => changeDir('right')} />
        <div />
        <DPadBtn label="▼" onClick={() => changeDir('down')} />
        <div />
      </div>
    </div>
  )
}

function DPadBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); onClick() }}
      className="w-11 h-11 rounded-xl bg-white/10 text-white font-black text-lg flex items-center justify-center active:bg-white/25 select-none"
      style={{ touchAction: 'none' }}>
      {label}
    </button>
  )
}
