'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// ── Types ──────────────────────────────────────────────────────────────────
type Color = 'w' | 'b'
type Cell = { color: Color; king: boolean } | null
type Board = Cell[][]
type Pt = [number, number]
type Move = { from: Pt; to: Pt; captured: Pt[]; king: boolean }

const DIRS: Pt[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8
const key = (r: number, c: number) => `${r},${c}`
const isDark = (r: number, c: number) => (r + c) % 2 === 1

function initBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<Cell>(8).fill(null))
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (isDark(r, c)) b[r][c] = { color: 'b', king: false }
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if (isDark(r, c)) b[r][c] = { color: 'w', king: false }
  return b
}

const clone = (b: Board): Board => b.map(row => row.slice())
const promotes = (color: Color, r: number) => (color === 'w' && r === 0) || (color === 'b' && r === 7)

// ── Single-step captures from (r,c). `captured` = squares already taken this
//    chain (still physically on the board as blockers). ──────────────────────
function stepCaptures(b: Board, r: number, c: number, captured: Pt[]): Move[] {
  const piece = b[r][c]
  if (!piece) return []
  const enemy: Color = piece.color === 'w' ? 'b' : 'w'
  const isTaken = (rr: number, cc: number) => captured.some(([cr, cc2]) => cr === rr && cc2 === cc)
  const out: Move[] = []

  for (const [dr, dc] of DIRS) {
    if (!piece.king) {
      const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc
      if (!inB(lr, lc)) continue
      const mid = b[mr][mc]
      if (mid && mid.color === enemy && !isTaken(mr, mc) && b[lr][lc] === null) {
        out.push({ from: [r, c], to: [lr, lc], captured: [[mr, mc]], king: piece.king || promotes(piece.color, lr) })
      }
    } else {
      // flying king: skip empties, find first piece
      let i = 1
      while (inB(r + i * dr, c + i * dc) && b[r + i * dr][c + i * dc] === null) i++
      const tr = r + i * dr, tc = c + i * dc
      if (!inB(tr, tc)) continue
      const target = b[tr][tc]
      if (target && target.color === enemy && !isTaken(tr, tc)) {
        let j = i + 1
        while (inB(r + j * dr, c + j * dc) && b[r + j * dr][c + j * dc] === null) {
          out.push({ from: [r, c], to: [r + j * dr, c + j * dc], captured: [[tr, tc]], king: true })
          j++
        }
      }
    }
  }
  return out
}

// Full capture sequences for a single piece (recursive, mandatory continuation)
function captureSequences(b: Board, r0: number, c0: number): Move[] {
  const piece = b[r0][c0]
  if (!piece) return []
  const work = clone(b)
  const result: Move[] = []

  const rec = (r: number, c: number, king: boolean, taken: Pt[]) => {
    const cur = work[r][c]!
    const steps = stepCaptures(work, r, c, taken)
    if (steps.length === 0) {
      if (taken.length > 0) result.push({ from: [r0, c0], to: [r, c], captured: taken, king })
      return
    }
    for (const s of steps) {
      const [tr, tc] = s.to
      work[r][c] = null
      work[tr][tc] = { color: cur.color, king: s.king }
      rec(tr, tc, s.king, [...taken, ...s.captured])
      // undo
      work[tr][tc] = null
      work[r][c] = cur
    }
  }
  rec(r0, c0, piece.king, [])
  return result
}

function simpleMoves(b: Board, r: number, c: number): Move[] {
  const piece = b[r][c]
  if (!piece) return []
  const out: Move[] = []
  if (!piece.king) {
    const fwd: Pt[] = piece.color === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]
    for (const [dr, dc] of fwd) {
      const nr = r + dr, nc = c + dc
      if (inB(nr, nc) && b[nr][nc] === null)
        out.push({ from: [r, c], to: [nr, nc], captured: [], king: promotes(piece.color, nr) })
    }
  } else {
    for (const [dr, dc] of DIRS) {
      let i = 1
      while (inB(r + i * dr, c + i * dc) && b[r + i * dr][c + i * dc] === null) {
        out.push({ from: [r, c], to: [r + i * dr, c + i * dc], captured: [], king: true })
        i++
      }
    }
  }
  return out
}

function sideHasCapture(b: Board, color: Color): boolean {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (b[r][c]?.color === color && stepCaptures(b, r, c, []).length > 0) return true
  return false
}

// All legal moves for a side (captures are mandatory)
function legalMoves(b: Board, color: Color): Move[] {
  const caps: Move[] = []
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (b[r][c]?.color === color) caps.push(...captureSequences(b, r, c))
  if (caps.length) return caps
  const simple: Move[] = []
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (b[r][c]?.color === color) simple.push(...simpleMoves(b, r, c))
  return simple
}

function applyMove(b: Board, m: Move): Board {
  const nb = clone(b)
  const [fr, fc] = m.from, [tr, tc] = m.to
  const piece = nb[fr][fc]!
  nb[fr][fc] = null
  for (const [cr, cc] of m.captured) nb[cr][cc] = null
  nb[tr][tc] = { color: piece.color, king: m.king }
  return nb
}

// ── Simple AI for black ──────────────────────────────────────────────────────
function pickAiMove(b: Board): Move | null {
  const moves = legalMoves(b, 'b')
  if (!moves.length) return null
  const captures = moves.filter(m => m.captured.length > 0)
  if (captures.length) {
    const max = Math.max(...captures.map(m => m.captured.length))
    const best = captures.filter(m => m.captured.length === max)
    return best[Math.floor(Math.random() * best.length)]
  }
  // Prefer moves that don't hand the opponent a capture; else advance.
  const safe = moves.filter(m => !sideHasCapture(applyMove(b, m), 'w'))
  const pool = safe.length ? safe : moves
  // advance toward promotion (higher row) and lean to promotions
  const score = (m: Move) => (m.king ? 100 : 0) + m.to[0]
  const maxS = Math.max(...pool.map(score))
  const top = pool.filter(m => score(m) === maxS)
  return top[Math.floor(Math.random() * top.length)]
}

const countPieces = (b: Board, color: Color) =>
  b.flat().filter(p => p?.color === color).length

// ── Component ────────────────────────────────────────────────────────────────
export default function CheckersPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [board, setBoard] = useState<Board>(initBoard)
  const [turn, setTurn] = useState<Color>('w')
  const [sel, setSel] = useState<Pt | null>(null)
  const [dests, setDests] = useState<Move[]>([])
  const [chain, setChain] = useState<Pt[]>([])      // squares captured so far this turn (still shown, faded)
  const [winner, setWinner] = useState<Color | null>(null)
  const boardRef = useRef(board)
  boardRef.current = board

  const mustCapture = turn === 'w' && sideHasCapture(board, 'w') && chain.length === 0

  // End-of-turn / win detection happens when turn flips to a side with no moves
  useEffect(() => {
    if (winner) return
    if (legalMoves(board, turn).length === 0) {
      setWinner(turn === 'w' ? 'b' : 'w')
    }
  }, [turn, board, winner])

  // AI move
  useEffect(() => {
    if (winner || turn !== 'b') return
    const id = setTimeout(() => {
      const m = pickAiMove(boardRef.current)
      if (!m) { setWinner('w'); return }
      m.captured.length ? playTap() : playTap()
      setBoard(applyMove(boardRef.current, m))
      setTurn('w')
    }, 550)
    return () => clearTimeout(id)
  }, [turn, winner])

  // Award XP once on a human win
  const savedRef = useRef(false)
  useEffect(() => {
    if (winner === 'w' && !savedRef.current) {
      savedRef.current = true
      playCorrect()
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + 30 }).eq('id', user.id)
      })()
    }
    if (winner === 'b') playWrong()
  }, [winner])

  const selectPiece = (r: number, c: number) => {
    if (mustCapture) {
      const caps = stepCaptures(board, r, c, [])
      if (!caps.length) return
      setSel([r, c]); setDests(caps)
    } else {
      const mv = simpleMoves(board, r, c)
      if (!mv.length) return
      setSel([r, c]); setDests(mv)
    }
  }

  const onCellClick = (r: number, c: number) => {
    if (winner || turn !== 'w') return
    const piece = board[r][c]

    // selecting / re-selecting own piece (not during a forced chain)
    if (piece?.color === 'w' && chain.length === 0) { playTap(); selectPiece(r, c); return }

    // moving to a destination
    const move = dests.find(m => m.to[0] === r && m.to[1] === c)
    if (!sel || !move) return

    const isCapture = move.captured.length > 0
    playTap()

    if (isCapture) {
      // Move the piece but KEEP captured pieces on the board (as blockers) until
      // the whole chain ends — Russian rule: a piece can't be jumped twice.
      const piece = board[sel[0]][sel[1]]!
      const nb = clone(board)
      nb[sel[0]][sel[1]] = null
      nb[r][c] = { color: piece.color, king: move.king }
      const newChain = [...chain, ...move.captured]

      // Can the same piece keep capturing? (it may have just promoted → flying king)
      const more = stepCaptures(nb, r, c, newChain)
      if (more.length > 0) {
        setBoard(nb); setChain(newChain); setSel([r, c]); setDests(more)
        return
      }
      // Chain finished — now remove all captured pieces
      const final = clone(nb)
      for (const [cr, cc] of newChain) final[cr][cc] = null
      setBoard(final); setChain([]); setSel(null); setDests([])
      setTurn('b')
    } else {
      const nb = applyMove(board, move)
      setBoard(nb); setSel(null); setDests([])
      setTurn('b')
    }
  }

  const restart = () => {
    savedRef.current = false
    setBoard(initBoard()); setTurn('w'); setSel(null); setDests([]); setChain([]); setWinner(null)
  }

  const destSet = new Set(dests.map(m => key(m.to[0], m.to[1])))
  const chainSet = new Set(chain.map(([r, c]) => key(r, c)))

  const status =
    winner === 'w' ? t('checkers_you_win', lang) :
    winner === 'b' ? t('checkers_you_lose', lang) :
    turn === 'w' ? t('checkers_your_turn', lang) : t('checkers_ai_turn', lang)

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-5" style={{ background: '#2A2520' }}>
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-3">
        <button onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white leading-tight">{t('checkers_title', lang)}</h1>
          <p className="text-xs text-white/50">{status}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
            <p className="text-[9px] font-black text-white/50 uppercase">⚪</p>
            <p className="text-base font-black text-white leading-none">{countPieces(board, 'w')}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
            <p className="text-[9px] font-black text-white/50 uppercase">⚫</p>
            <p className="text-base font-black text-white leading-none">{countPieces(board, 'b')}</p>
          </div>
        </div>
      </div>

      {/* Reserve a constant line so the board never shifts when this toggles */}
      <p className="text-amber-300 text-xs font-bold mb-2 h-4 leading-4"
        style={{ visibility: mustCapture && !winner ? 'visible' : 'hidden' }}>
        {t('checkers_must_cap', lang)}
      </p>

      {/* Board */}
      <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl select-none">
        <div className="grid grid-cols-8 w-full h-full">
          {Array.from({ length: 64 }).map((_, idx) => {
            const r = Math.floor(idx / 8), c = idx % 8
            const dark = isDark(r, c)
            const piece = board[r][c]
            const isSel = sel && sel[0] === r && sel[1] === c
            const isDest = destSet.has(key(r, c))
            const faded = chainSet.has(key(r, c))
            return (
              <div
                key={idx}
                onClick={() => dark && onCellClick(r, c)}
                className="relative flex items-center justify-center"
                style={{ background: dark ? '#8A5A3B' : '#E8D2B0', cursor: dark ? 'pointer' : 'default' }}
              >
                {/* selection ring */}
                {isSel && <div className="absolute inset-1 rounded-lg ring-4 ring-amber-300/80" />}
                {/* move hint */}
                {isDest && !piece && (
                  <div className="absolute w-1/3 h-1/3 rounded-full bg-amber-300/70" />
                )}
                {isDest && piece && (
                  <div className="absolute inset-0.5 rounded-lg ring-4 ring-red-400/80" />
                )}
                {/* piece */}
                {piece && (
                  <div
                    className={`relative rounded-full flex items-center justify-center transition-opacity ${faded ? 'opacity-30' : ''}`}
                    style={{
                      width: '74%', height: '74%',
                      background: piece.color === 'w'
                        ? 'radial-gradient(circle at 35% 30%, #ffffff, #d9d4cc)'
                        : 'radial-gradient(circle at 35% 30%, #555, #1c1c1c)',
                      boxShadow: 'inset 0 -3px 5px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)',
                      border: piece.color === 'w' ? '2px solid #cdc7bd' : '2px solid #000',
                    }}
                  >
                    {piece.king && (
                      <span style={{ color: piece.color === 'w' ? '#C99A2E' : '#F5C84B', fontSize: '90%', lineHeight: 1 }}>★</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Win overlay */}
        {winner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(20,16,12,0.86)' }}>
            <div className="text-5xl">{winner === 'w' ? '🏆' : '🤖'}</div>
            <h2 className="text-2xl font-black text-white text-center px-6">
              {winner === 'w' ? t('checkers_you_win', lang) : t('checkers_you_lose', lang)}
            </h2>
            {winner === 'w' && <p className="text-amber-300 font-bold">+30 XP</p>}
            <div className="flex gap-3">
              <button onClick={() => router.push('/')}
                className="px-6 py-3 rounded-2xl bg-white/15 text-white font-bold active:scale-95">
                {t('game_home', lang)}
              </button>
              <button onClick={restart}
                className="px-6 py-3 rounded-2xl bg-amber-400 text-gray-900 font-black active:scale-95">
                {t('game_again', lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      <p className="w-full max-w-md text-white/45 text-xs leading-relaxed mt-4 text-center">
        {t('checkers_rules', lang)}
      </p>
    </div>
  )
}
