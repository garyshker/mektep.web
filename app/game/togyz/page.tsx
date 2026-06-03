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
  let n = ns.holes[hole]
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
  const stateRef = useRef(state)
  stateRef.current = state

  const humanTurn = mode === 'local' || (mode === 'ai' && turn === 0)

  const commitMove = (p: Player, hole: number) => {
    const moved = applyMove(stateRef.current, p, hole)
    const next = (1 - p) as Player
    const { state: fin, winner: w } = resolveEnd(moved, next)
    setState(fin)
    setLastMove(hole)
    if (w !== null) { setWinner(w); return }
    setTurn(next)
  }

  // AI move
  useEffect(() => {
    if (winner !== null || mode !== 'ai' || turn !== 1) return
    const id = setTimeout(() => {
      const h = pickAi(stateRef.current, 1)
      if (h === null) return
      playTap()
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
    if (winner !== null || !humanTurn) return
    if (!legalHoles(state, turn).includes(i)) return
    playTap()
    commitMove(turn, i)
  }

  const reset = () => { setState(initState()); setTurn(0); setWinner(null); setLastMove(null); savedRef.current = false }
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

  // top row rendered right→left (17..9) for authentic counter-clockwise flow
  const topRow = [17, 16, 15, 14, 13, 12, 11, 10, 9]
  const bottomRow = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  const Hole = ({ i, owner }: { i: number; owner: Player }) => {
    const isLegal = legal.includes(i)
    const isLast = lastMove === i
    const isTuz0 = state.tuz[0] === i
    const isTuz1 = state.tuz[1] === i
    const tuzOwner = isTuz0 ? 0 : isTuz1 ? 1 : null
    return (
      <button onClick={() => onHole(i)}
        className="relative aspect-square rounded-full flex items-center justify-center transition-all"
        style={{
          background: tuzOwner !== null
            ? (tuzOwner === 0 ? 'radial-gradient(circle at 40% 35%, #34D399, #065F46)' : 'radial-gradient(circle at 40% 35%, #FBBF24, #92400E)')
            : 'radial-gradient(circle at 40% 35%, #6B4423, #3D2614)',
          boxShadow: isLegal ? '0 0 0 3px #FCD34D, inset 0 -3px 6px rgba(0,0,0,0.4)' : 'inset 0 -3px 6px rgba(0,0,0,0.45)',
          cursor: isLegal ? 'pointer' : 'default',
          outline: isLast ? '2px solid rgba(255,255,255,0.55)' : 'none',
        }}>
        <span className="font-black tabular-nums text-white" style={{ fontSize: 'clamp(12px, 4vw, 20px)' }}>
          {state.holes[i]}
        </span>
        {tuzOwner !== null && <span className="absolute -top-1 -right-0.5 text-[10px]">★</span>}
      </button>
    )
  }

  const KazanBox = ({ p }: { p: Player }) => (
    <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-2">
      <span className="text-amber-200/80 text-xs font-bold">
        {t('togyz_kazan', lang)} {mode === 'local' ? (p === 0 ? '1' : '2') : (p === 0 ? '⚪' : '🤖')}
      </span>
      <span className="text-white font-black text-2xl tabular-nums">{state.kazan[p]}</span>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-5" style={{ background: '#2A2017' }}>
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-3">
        <button onClick={() => { reset(); setMode(null) }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white leading-tight">{t('togyz_title', lang)}</h1>
          <p className="text-xs text-amber-200/60">{status}</p>
        </div>
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {/* Opponent (player 1) kazan */}
        <KazanBox p={1} />

        {/* Board */}
        <div className="relative rounded-2xl p-3 shadow-2xl" style={{ background: '#C8945A' }}>
          {/* top row (player 1) */}
          <div className="grid grid-cols-9 gap-1.5 mb-2">
            {topRow.map(i => <Hole key={i} i={i} owner={1} />)}
          </div>
          {/* bottom row (player 0) */}
          <div className="grid grid-cols-9 gap-1.5">
            {bottomRow.map(i => <Hole key={i} i={i} owner={0} />)}
          </div>

          {/* Win overlay */}
          {winner !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
              style={{ background: 'rgba(30,20,12,0.88)' }}>
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

        {/* Your (player 0) kazan */}
        <KazanBox p={0} />
      </div>

      <p className="w-full max-w-md text-white/40 text-xs leading-relaxed mt-4 text-center">{t('togyz_rules', lang)}</p>
    </div>
  )
}
