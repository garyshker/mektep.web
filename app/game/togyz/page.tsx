'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// ── Rules / state ────────────────────────────────────────────────────────────
// 18 holes: 0..8 = player 0 (bottom), 9..17 = player 1 (top). Sowing is the
// loop (i+1) % 18 (counter-clockwise). col = i % 9.
type State = {
  holes: number[]            // 18
  kazan: [number, number]
  tuz: [number | null, number | null]  // p0's tuzdyq idx (in row 1), p1's tuzdyq idx (in row 0)
}
type Player = 0 | 1

const initState = (): State => ({
  holes: Array(18).fill(9),
  kazan: [0, 0],
  tuz: [null, null],
})

const ownRow = (p: Player) => (p === 0 ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11, 12, 13, 14, 15, 16, 17])
const isOppRow = (p: Player, i: number) => (p === 0 ? i >= 9 : i < 9)
const clone = (s: State): State => ({ holes: s.holes.slice(), kazan: [...s.kazan], tuz: [...s.tuz] })

function legalHoles(s: State, p: Player): number[] {
  return ownRow(p).filter(i => s.holes[i] > 0 && s.tuz[1 - p] !== i)
}

// Apply a move; returns new state. Assumes hole is legal.
function applyMove(s: State, p: Player, hole: number): State {
  const ns = clone(s)
  const opp = (1 - p) as Player
  const n = ns.holes[hole]
  let last = -1
  let lastInHole = false

  const drop = (i: number): boolean => {
    if (ns.tuz[0] === i) { ns.kazan[0]++; return false }
    if (ns.tuz[1] === i) { ns.kazan[1]++; return false }
    ns.holes[i]++; return true
  }

  if (n === 1) {
    ns.holes[hole] = 0
    last = (hole + 1) % 18
    lastInHole = drop(last)
  } else {
    ns.holes[hole] = 1
    let rem = n - 1
    let idx = hole
    while (rem > 0) { idx = (idx + 1) % 18; lastInHole = drop(idx); last = idx; rem-- }
  }

  // Capture / tuzdyq only if the last pebble landed in a real opponent hole
  if (lastInHole && isOppRow(p, last)) {
    const cnt = ns.holes[last]
    const col = last % 9
    const canTuz =
      cnt === 3 &&
      ns.tuz[p] === null &&
      col !== 8 &&
      !(ns.tuz[opp] !== null && (ns.tuz[opp]! % 9) === col)
    if (canTuz) {
      ns.tuz[p] = last
      ns.kazan[p] += 3
      ns.holes[last] = 0
    } else if (cnt % 2 === 0 && cnt > 0) {
      ns.kazan[p] += cnt
      ns.holes[last] = 0
    }
  }
  return ns
}

// Replay a move as a list of board snapshots (one per sown stone) so the UI can
// animate the sowing. `spots[k]` is the hole that lights up at frame k.
// (applyMove stays the single-shot version used by the AI search.)
function buildFrames(s: State, p: Player, hole: number): { frames: State[]; spots: number[] } {
  const frames: State[] = [], spots: number[] = []
  const work = clone(s)
  const opp = (1 - p) as Player
  const n = work.holes[hole]
  const dropAt = (i: number): boolean => {
    if (work.tuz[0] === i) { work.kazan[0]++; return false }
    if (work.tuz[1] === i) { work.kazan[1]++; return false }
    work.holes[i]++; return true
  }
  const targets: number[] = []
  if (n === 1) { work.holes[hole] = 0; targets.push((hole + 1) % 18) }
  else { work.holes[hole] = 1; for (let k = 1; k <= n - 1; k++) targets.push((hole + k) % 18) }
  frames.push(clone(work)); spots.push(hole)          // pickup
  let last = -1, lastInHole = false
  for (const tgt of targets) { lastInHole = dropAt(tgt); last = tgt; frames.push(clone(work)); spots.push(tgt) }
  if (lastInHole && isOppRow(p, last)) {
    const cnt = work.holes[last], col = last % 9
    const canTuz = cnt === 3 && work.tuz[p] === null && col !== 8 && !(work.tuz[opp] !== null && (work.tuz[opp]! % 9) === col)
    if (canTuz) { work.tuz[p] = last; work.kazan[p] += 3; work.holes[last] = 0; frames.push(clone(work)); spots.push(last) }
    else if (cnt % 2 === 0 && cnt > 0) { work.kazan[p] += cnt; work.holes[last] = 0; frames.push(clone(work)); spots.push(last) }
  }
  return { frames, spots }
}

type Outcome = 0 | 1 | 'draw' | null
function winnerByKazan(k: [number, number]): Outcome {
  return k[0] > k[1] ? 0 : k[1] > k[0] ? 1 : 'draw'
}
// After a move, with `next` to move, resolve end-of-game (mutates a clone)
function resolveEnd(s: State, next: Player): { state: State; winner: Outcome } {
  const ns = clone(s)
  if (ns.kazan[0] > 81 || ns.kazan[1] > 81) return { state: ns, winner: winnerByKazan(ns.kazan) }
  if (legalHoles(ns, next).length === 0) {
    const other = (1 - next) as Player
    const rem = ns.holes.reduce((a, b) => a + b, 0)
    ns.kazan[other] += rem
    ns.holes = Array(18).fill(0)
    return { state: ns, winner: winnerByKazan(ns.kazan) }
  }
  return { state: ns, winner: null }
}

// ── AI (2-ply greedy) ─────────────────────────────────────────────────────────
function pickAi(s: State, p: Player): number | null {
  const moves = legalHoles(s, p)
  if (!moves.length) return null
  const opp = (1 - p) as Player
  let best = moves[0], bestScore = -Infinity
  for (const h of moves) {
    const ns = applyMove(s, p, h)
    const myGain = ns.kazan[p] - s.kazan[p]
    const madeTuz = s.tuz[p] === null && ns.tuz[p] !== null
    let oppBest = 0
    for (const oh of legalHoles(ns, opp)) {
      const ns2 = applyMove(ns, opp, oh)
      oppBest = Math.max(oppBest, ns2.kazan[opp] - ns.kazan[opp])
    }
    const score = myGain + (madeTuz ? 6 : 0) - oppBest * 0.6 + Math.random() * 0.3
    if (score > bestScore) { bestScore = score; best = h }
  }
  return best
}

// ── Presentational pieces (hoisted so they aren't re-created each render) ──────
function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3 py-0.5 opacity-50">
      <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #2a1708)' }} />
      <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
        <g stroke="#2a1708" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 5C24 11 24 25 18 31C12 25 12 11 18 5Z" fill="rgba(0,0,0,0.08)" />
          <circle cx="18" cy="18" r="2.4" fill="#2a1708" stroke="none" />
        </g>
      </svg>
      <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, #2a1708, transparent)' }} />
    </div>
  )
}

function Hole({ count, isLegal, isLast, active, tuzOwner, onClick }: {
  count: number; isLegal: boolean; isLast: boolean; active: boolean; tuzOwner: Player | null; onClick: () => void
}) {
  // Pearls keep a constant size (~3 per row); only shrink for unusually big piles.
  const pebbleW = count <= 12 ? 27 : count <= 20 ? 21 : 16   // % of the inner cluster width
  return (
    <button onClick={onClick}
      className="relative w-full aspect-[3/4] rounded-full flex items-center justify-center"
      style={{
        background: tuzOwner !== null
          ? (tuzOwner === 0 ? 'radial-gradient(ellipse at 50% 28%, #3f7a52, #163320)' : 'radial-gradient(ellipse at 50% 28%, #8a6420, #3a2a0c)')
          : 'radial-gradient(ellipse at 50% 28%, #4a2f1a, #201007)',
        boxShadow: active
          ? '0 0 0 3px rgba(255,238,196,0.95), 0 0 14px rgba(255,224,150,0.55), inset 0 5px 12px rgba(0,0,0,0.5)'
          : isLegal ? '0 0 0 3px #FCD34D, inset 0 5px 12px rgba(0,0,0,0.72)'
          : 'inset 0 5px 12px rgba(0,0,0,0.72)',
        outline: isLast && !active ? '2px solid rgba(255,240,200,0.65)' : 'none',
        transform: active ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.13s ease, box-shadow 0.13s ease',
        cursor: isLegal ? 'pointer' : 'default',
      }}>
      {/* the real kumalaqs as pearls — no number, count them yourself */}
      {count > 0 && (
        <div className="absolute inset-[14%] flex flex-wrap items-center justify-center content-center pointer-events-none"
          style={{ gap: '3px' }}>
          {Array.from({ length: count }).map((_, k) => (
            <span key={k} style={{
              width: `${pebbleW}%`, aspectRatio: '1', borderRadius: '50%',
              background: 'radial-gradient(circle at 36% 30%, #ffffff 0%, #f4eefb 28%, #ddd2ee 60%, #b8aad6 100%)',
              boxShadow: 'inset -1px -1.5px 2px rgba(108,86,140,0.4), inset 1px 1px 1.5px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.5)',
            }} />
          ))}
        </div>
      )}
      {tuzOwner !== null && (
        <span className="relative leading-none" style={{ fontSize: 'clamp(18px, 5vw, 28px)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.85))' }}>★</span>
      )}
    </button>
  )
}

function Kazan({ p, count, popping, mode, label }: {
  p: Player; count: number; popping: boolean; mode: 'ai' | 'local' | null; label: string
}) {
  return (
    <div className={`relative self-stretch flex flex-col items-center justify-center px-1 ${popping ? 'togyz-pop' : ''}`}
      style={{
        width: 'clamp(50px, 16vw, 72px)', borderRadius: '34% / 12%',
        background: 'radial-gradient(ellipse at 50% 22%, #4a2f1a, #1b0e05)',
        boxShadow: 'inset 0 5px 16px rgba(0,0,0,0.75)',
      }}>
      <span className="text-amber-50 font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(22px, 6vw, 32px)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{count}</span>
      <span className="text-amber-200/55 text-[10px] font-bold mt-1">{label}</span>
      <span className="text-sm">{mode === 'local' ? (p === 0 ? '1️⃣' : '2️⃣') : (p === 0 ? '⚪' : '🤖')}</span>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function TogyzPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [mode, setMode] = useState<'ai' | 'local' | null>(null)
  const [state, setState] = useState<State>(initState)
  const [turn, setTurn] = useState<Player>(0)
  const [winner, setWinner] = useState<Outcome>(null)
  const [lastMove, setLastMove] = useState<number | null>(null)
  const [activeHole, setActiveHole] = useState<number | null>(null)   // hole getting a stone right now
  const [kazanPop, setKazanPop] = useState<Player | null>(null)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const animatingRef = useRef(false)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }, [])

  const humanTurn = mode === 'local' || (mode === 'ai' && turn === 0)

  const commitMove = (p: Player, hole: number) => {
    if (animatingRef.current) return
    const base = stateRef.current
    const { frames, spots } = buildFrames(base, p, hole)
    const moved = frames[frames.length - 1]
    const next = (1 - p) as Player
    const { state: fin, winner: w } = resolveEnd(moved, next)
    const captured = moved.kazan[p] > base.kazan[p]

    setLastMove(hole)
    animatingRef.current = true
    playTap()                                          // pickup
    // Smooth but a touch fast: ~1s total, clamped per stone.
    const step = Math.max(55, Math.min(120, Math.round(950 / frames.length)))
    let i = 0
    const run = () => {
      setState(frames[i])
      setActiveHole(spots[i])
      i++
      if (i < frames.length) { animTimerRef.current = setTimeout(run, step); return }
      // settle after the final frame
      animTimerRef.current = setTimeout(() => {
        setActiveHole(null)
        setState(fin)
        animatingRef.current = false
        if (captured) {
          playCorrect(); setKazanPop(p)
          animTimerRef.current = setTimeout(() => setKazanPop(null), 450)
        }
        if (w !== null) setWinner(w)
        else setTurn(next)
      }, step)
    }
    run()
  }

  // AI move
  useEffect(() => {
    if (winner !== null || mode !== 'ai' || turn !== 1) return
    const id = setTimeout(() => {
      const h = pickAi(stateRef.current, 1)
      if (h === null) return
      commitMove(1, h)
    }, 650)
    return () => clearTimeout(id)
  }, [turn, winner, mode])

  // XP on win vs computer
  const savedRef = useRef(false)
  useEffect(() => {
    if (winner === 0 && mode === 'ai' && !savedRef.current) {
      savedRef.current = true
      playCorrect()
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + 40 }).eq('id', user.id)
      })()
    }
    if ((winner === 1 && mode === 'ai')) playWrong()
  }, [winner, mode])

  const onHole = (i: number) => {
    if (winner !== null || !humanTurn || animatingRef.current) return
    if (!legalHoles(state, turn).includes(i)) return
    commitMove(turn, i)
  }

  const reset = () => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    animatingRef.current = false; setActiveHole(null); setKazanPop(null)
    setState(initState()); setTurn(0); setWinner(null); setLastMove(null); savedRef.current = false
  }
  const startGame = (m: 'ai' | 'local') => { reset(); setMode(m) }

  // ── Mode menu ──
  if (mode === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#2A2017' }}>
        <button onClick={() => router.push('/')}
          className="absolute top-5 left-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">✕</button>
        <div className="text-6xl mb-3">🪨</div>
        <h1 className="text-2xl font-black text-white mb-1 text-center">{t('togyz_title', lang)}</h1>
        <p className="text-amber-200/70 text-sm mb-8">{t('togyz_subtitle', lang)}</p>
        <div className="w-full max-w-xs flex flex-col gap-3">
          <button onClick={() => startGame('ai')}
            className="w-full bg-white/10 hover:bg-white/15 rounded-2xl px-5 py-4 flex items-center gap-4 text-left active:scale-[0.98] transition-all">
            <span className="text-3xl">🤖</span>
            <div><p className="font-black text-white text-base">{t('checkers_vs_ai', lang)}</p>
              <p className="text-white/50 text-xs">{t('checkers_vs_ai_sub', lang)}</p></div>
          </button>
          <button onClick={() => startGame('local')}
            className="w-full bg-amber-400 hover:brightness-105 rounded-2xl px-5 py-4 flex items-center gap-4 text-left active:scale-[0.98] transition-all">
            <span className="text-3xl">👥</span>
            <div><p className="font-black text-gray-900 text-base">{t('checkers_vs_local', lang)}</p>
              <p className="text-gray-800/70 text-xs">{t('checkers_vs_local_sub', lang)}</p></div>
          </button>
        </div>
        <p className="w-full max-w-xs text-white/45 text-xs leading-relaxed mt-8 text-center">{t('togyz_rules', lang)}</p>
      </div>
    )
  }

  const legal = winner === null && humanTurn ? legalHoles(state, turn) : []
  const status =
    winner === 0 ? (mode === 'local' ? t('togyz_p1_win', lang) : t('togyz_you_win', lang)) :
    winner === 1 ? (mode === 'local' ? t('togyz_p2_win', lang) : t('togyz_you_lose', lang)) :
    winner === 'draw' ? t('togyz_draw', lang) :
    mode === 'local'
      ? (turn === 0 ? t('togyz_p1_turn', lang) : t('togyz_p2_turn', lang))
      : (turn === 0 ? t('togyz_your_turn', lang) : t('togyz_ai_turn', lang))

  // Horizontal board (best in landscape): opponent row on top, your row below,
  // kazans at the two ends. Counter-clockwise: your row left→right (0..8), then
  // up and across the opponent row right→left (9..17), back to the start.
  const topRow = [17, 16, 15, 14, 13, 12, 11, 10, 9]   // opponent
  const botRow = [0, 1, 2, 3, 4, 5, 6, 7, 8]           // you

  const holeProps = (i: number) => ({
    count: state.holes[i],
    isLegal: legal.includes(i),
    isLast: lastMove === i,
    tuzOwner: (state.tuz[0] === i ? 0 : state.tuz[1] === i ? 1 : null) as Player | null,
    active: activeHole === i,
    onClick: () => onHole(i),
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 py-3" style={{ background: '#2A2017' }}>
      {/* Header */}
      <div className="w-full max-w-3xl flex items-center gap-3 mb-2">
        <button onClick={() => { reset(); setMode(null) }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white leading-tight">{t('togyz_title', lang)}</h1>
          <p className="text-xs text-amber-200/60">{status}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-lg leading-none tabular-nums">{state.kazan[0]}:{state.kazan[1]}</p>
          <p className="text-amber-200/50 text-[9px] font-bold uppercase">{t('togyz_kazan', lang)}</p>
        </div>
      </div>

      {/* Rotate hint — portrait only (board + stones read best wide) */}
      <div className="portrait:flex landscape:hidden items-center gap-2 mb-2 px-4 py-2 rounded-full animate-pulse"
        style={{ background: 'rgba(252,211,77,0.14)', border: '1px solid rgba(252,211,77,0.35)' }}>
        <span className="text-base">🔄</span>
        <span className="text-amber-200 text-xs font-bold">{t('togyz_rotate', lang)}</span>
      </div>

      {/* Wooden board (horizontal) */}
      <div className="relative w-full max-w-3xl rounded-[26px] p-3 shadow-2xl"
        style={{ background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 7px), linear-gradient(150deg, #C8945A, #8E5E30)' }}>
        <div className="flex items-stretch gap-2">
          {/* opponent kazan (left) */}
          <Kazan p={1} count={state.kazan[1]} popping={kazanPop === 1} mode={mode} label={t('togyz_kazan', lang)} />

          {/* rows + ornament */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="grid grid-cols-9 gap-1.5">{topRow.map(i => <Hole key={i} {...holeProps(i)} />)}</div>
            <Ornament />
            <div className="grid grid-cols-9 gap-1.5">{botRow.map(i => <Hole key={i} {...holeProps(i)} />)}</div>
          </div>

          {/* your kazan (right) */}
          <Kazan p={0} count={state.kazan[0]} popping={kazanPop === 0} mode={mode} label={t('togyz_kazan', lang)} />
        </div>

        {/* Win overlay */}
        {winner !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[26px]"
            style={{ background: 'rgba(30,20,12,0.9)' }}>
            <div className="text-5xl">{winner === 'draw' ? '🤝' : winner === 0 ? '🏆' : (mode === 'ai' ? '🤖' : '🏆')}</div>
            <h2 className="text-2xl font-black text-white text-center px-6">{status}</h2>
            <p className="text-amber-300 font-bold">
              {state.kazan[0]} : {state.kazan[1]}{winner === 0 && mode === 'ai' ? '  ·  +40 XP' : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={() => router.push('/')}
                className="px-6 py-3 rounded-2xl bg-white/15 text-white font-bold active:scale-95">{t('game_home', lang)}</button>
              <button onClick={reset}
                className="px-6 py-3 rounded-2xl bg-amber-400 text-gray-900 font-black active:scale-95">{t('game_again', lang)}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
