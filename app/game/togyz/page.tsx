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

  // Vertical board (mobile-friendly): two columns of 9 + kazans in the middle.
  // Counter-clockwise loop: your column bottom→top (0..8), across the top to the
  // opponent column top→bottom (9..17), and back across the bottom.
  const leftCol = [9, 10, 11, 12, 13, 14, 15, 16, 17]   // opponent, top→bottom
  const rightCol = [8, 7, 6, 5, 4, 3, 2, 1, 0]          // you, 0 at the bottom

  const Pebble = ({ d }: { d: number }) => (
    <span style={{
      width: d, height: d, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #F4EAD2, #B8975E)',
      boxShadow: '0 1px 1px rgba(0,0,0,0.5)',
    }} />
  )

  const Hole = ({ i }: { i: number }) => {
    const isLegal = legal.includes(i)
    const isLast = lastMove === i
    const tuzOwner = state.tuz[0] === i ? 0 : state.tuz[1] === i ? 1 : null
    const cnt = state.holes[i]
    return (
      <button onClick={() => onHole(i)}
        className="relative w-full flex flex-wrap items-center justify-center content-center overflow-hidden transition-all"
        style={{
          aspectRatio: '1.7 / 1', borderRadius: '50%', gap: 2, padding: 4,
          background: tuzOwner !== null
            ? (tuzOwner === 0 ? 'radial-gradient(ellipse at 50% 30%, #3f7a52, #163320)' : 'radial-gradient(ellipse at 50% 30%, #8a6420, #3a2a0c)')
            : 'radial-gradient(ellipse at 50% 30%, #4a2f1a, #23130a)',
          boxShadow: isLegal ? '0 0 0 3px #FCD34D, inset 0 4px 9px rgba(0,0,0,0.65)' : 'inset 0 4px 9px rgba(0,0,0,0.65)',
          outline: isLast ? '2px solid rgba(255,240,200,0.6)' : 'none',
          cursor: isLegal ? 'pointer' : 'default',
        }}>
        {Array.from({ length: Math.min(cnt, 9) }).map((_, k) => <Pebble key={k} d={6} />)}
        {cnt > 0 && (
          <span className="absolute bottom-0 right-1 px-1 rounded-full bg-black/55 text-amber-50 font-black tabular-nums leading-tight"
            style={{ fontSize: 11 }}>{cnt}</span>
        )}
        {tuzOwner !== null && <span className="absolute top-0 left-1 text-xs text-amber-200">★</span>}
      </button>
    )
  }

  const Kazan = ({ p }: { p: Player }) => (
    <div className="relative w-full flex flex-col items-center justify-center px-1"
      style={{
        flex: 1, minHeight: 96, borderRadius: '44% / 26%',
        background: 'radial-gradient(ellipse at 50% 24%, #4a2f1a, #1b0e05)',
        boxShadow: 'inset 0 5px 16px rgba(0,0,0,0.72)',
      }}>
      <div className="flex flex-wrap items-center justify-center pt-2" style={{ gap: 2, maxWidth: '92%' }}>
        {Array.from({ length: Math.min(state.kazan[p], 28) }).map((_, k) => <Pebble key={k} d={5} />)}
      </div>
      <span className="text-amber-50 font-black tabular-nums leading-none mt-0.5" style={{ fontSize: 22 }}>{state.kazan[p]}</span>
      <span className="text-amber-200/55 text-[10px] font-bold">
        {t('togyz_kazan', lang)} {mode === 'local' ? (p === 0 ? '1' : '2') : (p === 0 ? '⚪' : '🤖')}
      </span>
    </div>
  )

  const Ornament = () => (
    <div className="flex items-center justify-center py-0.5">
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
        <g stroke="#2a1708" strokeWidth="2" opacity="0.5" strokeLinecap="round">
          <path d="M18 5C24 11 24 25 18 31C12 25 12 11 18 5Z" fill="rgba(0,0,0,0.06)" />
          <path d="M5 18C9 15 9 21 5 18Z" />
          <path d="M31 18C27 15 27 21 31 18Z" />
          <circle cx="18" cy="18" r="2.3" fill="#2a1708" stroke="none" />
        </g>
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-4" style={{ background: '#2A2017' }}>
      {/* Header */}
      <div className="w-full max-w-[340px] flex items-center gap-3 mb-3">
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

      {/* Wooden board */}
      <div className="relative w-full max-w-[340px] rounded-[28px] p-3 shadow-2xl"
        style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 7px), linear-gradient(150deg, #C8945A, #8E5E30)' }}>
        <div className="grid gap-2 items-stretch" style={{ gridTemplateColumns: '1fr 1.15fr 1fr' }}>
          {/* opponent column */}
          <div className="flex flex-col gap-2">
            {leftCol.map(i => <Hole key={i} i={i} />)}
          </div>
          {/* center: kazans + ornament */}
          <div className="flex flex-col gap-2">
            <Kazan p={1} />
            <Ornament />
            <Kazan p={0} />
          </div>
          {/* your column (0 at bottom) */}
          <div className="flex flex-col gap-2">
            {rightCol.map(i => <Hole key={i} i={i} />)}
          </div>
        </div>

        {/* Win overlay */}
        {winner !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[28px]"
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

      <p className="w-full max-w-[340px] text-white/40 text-xs leading-relaxed mt-3 text-center">{t('togyz_rules', lang)}</p>
    </div>
  )
}
