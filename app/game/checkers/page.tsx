'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Puzzle, ChevronRight, X, Globe, Copy, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { createRoom, joinRoom, subscribeRoom, pushRoom, type RoomRow } from '@/lib/realtime/room'

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
type Level = 'easy' | 'medium' | 'hard'

// Board value from black's (AI) perspective
function evaluate(b: Board): number {
  let s = 0
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p) continue
    let v = p.king ? 60 : 34
    if (!p.king) v += (p.color === 'b' ? r : 7 - r) * 1.2   // advancement toward promotion
    s += p.color === 'b' ? v : -v
  }
  return s
}

function minimax(b: Board, color: Color, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(b, color)
  if (moves.length === 0) return color === 'b' ? -100000 + depth : 100000 - depth  // side to move has lost
  if (depth === 0) return evaluate(b)
  if (color === 'b') {
    let best = -Infinity
    for (const m of moves) { best = Math.max(best, minimax(applyMove(b, m), 'w', depth - 1, alpha, beta)); alpha = Math.max(alpha, best); if (alpha >= beta) break }
    return best
  }
  let best = Infinity
  for (const m of moves) { best = Math.min(best, minimax(applyMove(b, m), 'b', depth - 1, alpha, beta)); beta = Math.min(beta, best); if (alpha >= beta) break }
  return best
}

function pickAiMove(b: Board, level: Level): Move | null {
  const moves = legalMoves(b, 'b')
  if (!moves.length) return null

  // Easy — any legal move at random (captures are still forced by the rules)
  if (level === 'easy') return moves[Math.floor(Math.random() * moves.length)]

  // Hard — minimax with alpha-beta lookahead
  if (level === 'hard') {
    let best = moves[0], bestScore = -Infinity
    for (const m of [...moves].sort(() => Math.random() - 0.5)) {
      const s = minimax(applyMove(b, m), 'w', 5, -Infinity, Infinity)
      if (s > bestScore) { bestScore = s; best = m }
    }
    return best
  }

  // Medium — greedy: max capture, else safe + advance
  const captures = moves.filter(m => m.captured.length > 0)
  if (captures.length) {
    const max = Math.max(...captures.map(m => m.captured.length))
    const best = captures.filter(m => m.captured.length === max)
    return best[Math.floor(Math.random() * best.length)]
  }
  const safe = moves.filter(m => !sideHasCapture(applyMove(b, m), 'w'))
  const pool = safe.length ? safe : moves
  const score = (m: Move) => (m.king ? 100 : 0) + m.to[0]
  const maxS = Math.max(...pool.map(score))
  const top = pool.filter(m => score(m) === maxS)
  return top[Math.floor(Math.random() * top.length)]
}

const countPieces = (b: Board, color: Color) =>
  b.flat().filter(p => p?.color === color).length

// ── A single rendered checker disc (cream or black), used in the menu hero ────
function Disc({ white, size, king }: { white: boolean; size: number; king?: boolean }) {
  return (
    <div className="relative rounded-full" style={{
      width: size, height: size,
      background: white
        ? 'radial-gradient(circle at 38% 32%, #fcfcf8, #d2cdbe)'
        : 'radial-gradient(circle at 38% 32%, #6c6c6c, #141414)',
      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.4), 0 5px 10px rgba(0,0,0,0.35)',
      border: white ? '1px solid #b6b0a1' : '1px solid #000',
    }}>
      <div className="absolute rounded-full" style={{ inset: '13%', border: white ? '2px solid rgba(120,110,85,0.40)' : '2px solid rgba(255,255,255,0.20)' }} />
      <div className="absolute rounded-full" style={{ inset: '26%', border: white ? '1.5px solid rgba(120,110,85,0.28)' : '1.5px solid rgba(255,255,255,0.13)' }} />
      {king && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ color: white ? '#C99A2E' : '#F5C84B', fontSize: size * 0.46, lineHeight: 1 }}>★</span>
        </div>
      )}
    </div>
  )
}

// ── Difficulty indicator: 1–3 filled signal bars ─────────────────────────────
function SignalBars({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 rounded-full" style={{
          height: 8 + i * 5,
          background: i < filled ? color : 'color-mix(in oklch, var(--muted-foreground) 28%, transparent)',
        }} />
      ))}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CheckersPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [mode, setMode] = useState<'ai' | 'local' | 'puzzles' | 'online' | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [board, setBoard] = useState<Board>(initBoard)
  const [turn, setTurn] = useState<Color>('w')
  const [sel, setSel] = useState<Pt | null>(null)
  const [dests, setDests] = useState<Move[]>([])
  const [chain, setChain] = useState<Pt[]>([])      // squares captured so far this turn (still shown, faded)
  const [winner, setWinner] = useState<Color | null>(null)
  const boardRef = useRef(board)
  boardRef.current = board
  const levelRef = useRef(level)
  levelRef.current = level

  // ── Online 1v1 state ──
  type OnlinePhase = 'menu' | 'creating' | 'waiting' | 'joining' | 'playing'
  const [online, setOnline] = useState<{ code: string; color: Color; oppName: string | null; phase: OnlinePhase } | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [onlineErr, setOnlineErr] = useState('')
  const roomRef = useRef<{ code: string; color: Color } | null>(null)   // stable for callbacks
  const waitingRef = useRef(false)                                       // true while it's the opponent's move
  const myIdRef = useRef<string | null>(null)
  const myNameRef = useRef('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      myIdRef.current = user.id
      const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      myNameRef.current = data?.name || 'Player'
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Whose turn is controlled by a human right now
  const humanTurn = mode === 'local'
    || (mode === 'ai' && turn === 'w')
    || (mode === 'online' && online?.phase === 'playing' && turn === online.color)
  const mustCapture = humanTurn && sideHasCapture(board, turn) && chain.length === 0

  // End-of-turn / win detection happens when turn flips to a side with no moves
  useEffect(() => {
    if (winner || !mode) return
    if (legalMoves(board, turn).length === 0) {
      setWinner(turn === 'w' ? 'b' : 'w')
    }
  }, [turn, board, winner, mode])

  // AI move (only in single-player mode)
  useEffect(() => {
    if (winner || mode !== 'ai' || turn !== 'b') return
    const id = setTimeout(() => {
      const m = pickAiMove(boardRef.current, levelRef.current)
      if (!m) { setWinner('w'); return }
      m.captured.length ? playTap() : playTap()
      setBoard(applyMove(boardRef.current, m))
      setTurn('w')
    }, 550)
    return () => clearTimeout(id)
  }, [turn, winner])

  // Award XP once on a win vs computer
  const savedRef = useRef(false)
  useEffect(() => {
    if (!winner) return
    if (mode === 'ai' || mode === 'online') {
      const iWon = mode === 'ai' ? winner === 'w' : winner === online?.color
      if (iWon) {
        if (!savedRef.current) {
          savedRef.current = true
          ;(async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
            await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + 30 }).eq('id', user.id)
          })()
        }
        playCorrect()
      } else playWrong()
    } else {
      playCorrect()
    }
  }, [winner])

  // Push the resolved position to the opponent after my turn ends.
  const onlinePush = (fb: Board, next: Color) => {
    if (mode !== 'online' || !roomRef.current) return
    waitingRef.current = true
    pushRoom(supabase, roomRef.current.code, { state: fb, turn: next })
  }

  const createOnline = async () => {
    if (!myIdRef.current) return
    setOnlineErr(''); setOnline({ code: '', color: 'w', oppName: null, phase: 'creating' })
    const code = await createRoom(supabase, 'checkers', myIdRef.current, myNameRef.current, initBoard(), 'w')
    if (!code) { setOnlineErr(t('guest_unavailable', lang)); setOnline({ code: '', color: 'w', oppName: null, phase: 'menu' }); return }
    resetState()
    roomRef.current = { code, color: 'w' }   // host plays white, moves first
    waitingRef.current = false
    setOnline({ code, color: 'w', oppName: null, phase: 'waiting' })
  }

  const joinOnline = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4 || !myIdRef.current) return
    setOnlineErr(''); setOnline({ code, color: 'b', oppName: null, phase: 'joining' })
    const room = await joinRoom(supabase, code, myIdRef.current, myNameRef.current)
    if (!room) { setOnlineErr(t('checkers_join_fail', lang)); setOnline({ code: '', color: 'b', oppName: null, phase: 'menu' }); return }
    roomRef.current = { code, color: 'b' }   // guest plays black
    waitingRef.current = true                // host (white) moves first
    savedRef.current = false
    setBoard((room.state as Board) ?? initBoard())
    setTurn((room.turn as Color) || 'w'); setSel(null); setDests([]); setChain([])
    setWinner((room.winner as Color) ?? null)
    setOnline({ code, color: 'b', oppName: room.host_name, phase: 'playing' })
  }

  // Subscribe to room updates: opponent joining + their moves.
  useEffect(() => {
    if (mode !== 'online' || !online?.code) return
    const unsub = subscribeRoom(supabase, online.code, (room: RoomRow) => {
      const me = roomRef.current
      if (!me) return
      // Guest joined → host starts playing
      if (room.guest_id && online.phase === 'waiting') {
        setOnline(o => (o ? { ...o, oppName: room.guest_name, phase: 'playing' } : o))
      }
      if (room.winner) { setBoard(room.state as Board); setWinner(room.winner as Color); return }
      // Opponent handed the turn back to me — apply their position
      if (waitingRef.current && room.turn === me.color) {
        setBoard(room.state as Board)
        setTurn(room.turn as Color)
        setSel(null); setDests([]); setChain([])
        waitingRef.current = false
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, online?.code, online?.phase])

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
    if (winner || !humanTurn) return
    const piece = board[r][c]
    const next: Color = turn === 'w' ? 'b' : 'w'

    // selecting / re-selecting own piece (not during a forced chain)
    if (piece?.color === turn && chain.length === 0) { playTap(); selectPiece(r, c); return }

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
      setTurn(next)
      onlinePush(final, next)
    } else {
      const nb = applyMove(board, move)
      setBoard(nb); setSel(null); setDests([])
      setTurn(next)
      onlinePush(nb, next)
    }
  }

  const resetState = () => {
    savedRef.current = false
    setBoard(initBoard()); setTurn('w'); setSel(null); setDests([]); setChain([]); setWinner(null)
  }
  const startGame = (m: 'ai' | 'local', lv?: Level) => { resetState(); if (lv) setLevel(lv); setMode(m) }
  const restart = () => resetState()

  const destSet = new Set(dests.map(m => key(m.to[0], m.to[1])))
  const chainSet = new Set(chain.map(([r, c]) => key(r, c)))

  const winText = (w: Color) =>
    mode === 'online'
      ? (w === online?.color ? t('checkers_you_win_o', lang) : t('checkers_you_lose_o', lang))
      : mode === 'local'
        ? (w === 'w' ? t('checkers_white_win', lang) : t('checkers_black_win', lang))
        : (w === 'w' ? t('checkers_you_win', lang) : t('checkers_you_lose', lang))

  const status =
    winner ? winText(winner) :
    mode === 'online'
      ? (turn === online?.color ? t('checkers_your_turn', lang) : t('checkers_opp_turn', lang))
      : mode === 'local'
        ? (turn === 'w' ? t('checkers_white_turn', lang) : t('checkers_black_turn', lang))
        : (turn === 'w' ? t('checkers_your_turn', lang) : t('checkers_ai_turn', lang))

  // ── Mode-selection menu ──
  if (mode === null) {
    const diffs = [
      { lv: 'easy' as Level,   label: 'sudoku_easy' as const,   bars: 1, color: 'var(--brand)' },
      { lv: 'medium' as Level, label: 'sudoku_medium' as const, bars: 2, color: 'var(--accent)' },
      { lv: 'hard' as Level,   label: 'sudoku_hard' as const,   bars: 3, color: 'var(--destructive)' },
    ]
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
        <div className="w-full max-w-md flex items-center mb-2">
          <button onClick={() => router.push('/')} aria-label={t('game_home', lang)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center py-4">
          {/* Hero — cream king + black piece on the brand gradient */}
          <div className="relative mb-6 w-[160px] h-[116px] rounded-[28px] flex items-center justify-center shadow-[var(--shadow-md)]"
            style={{ background: 'var(--gradient-hero)' }}>
            <div className="absolute" style={{ transform: 'translateX(-26px) translateY(4px) rotate(-9deg)' }}>
              <Disc white={false} size={66} />
            </div>
            <div className="absolute" style={{ transform: 'translateX(26px) translateY(-2px) rotate(9deg)' }}>
              <Disc white size={66} king />
            </div>
          </div>

          <h1 className="text-3xl font-display font-black text-foreground text-center leading-tight">{t('checkers_title', lang)}</h1>
          <p className="text-muted-foreground text-center mt-1.5 mb-7">{t('checkers_pick_mode', lang)}</p>

          <div className="w-full flex flex-col gap-3">
            {/* vs computer — pick difficulty */}
            <p className="text-muted-foreground/70 text-[11px] font-display font-black tracking-widest uppercase px-1">
              {t('checkers_difficulty', lang)}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {diffs.map(d => (
                <button key={d.lv} onClick={() => startGame('ai', d.lv)}
                  className="bg-card border-2 border-border rounded-[var(--radius-lg)] py-4 flex flex-col items-center gap-2 shadow-[var(--shadow-sm)] active:scale-95 transition-transform">
                  <SignalBars filled={d.bars} color={d.color} />
                  <span className="font-display font-black text-foreground text-sm">{t(d.label, lang)}</span>
                </button>
              ))}
            </div>

            {/* local 2-player */}
            <button onClick={() => startGame('local')}
              className="w-full bg-card border-2 border-border rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.98] transition-transform">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in oklch, var(--accent) 18%, transparent)', color: 'var(--accent)' }}>
                <Users size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-black text-foreground text-[15px]">{t('checkers_vs_local', lang)}</p>
                <p className="text-muted-foreground text-xs truncate">{t('checkers_vs_local_sub', lang)}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground shrink-0" />
            </button>

            {/* online 1v1 */}
            <button onClick={() => { playTap(); setOnlineErr(''); setJoinCode(''); setMode('online'); setOnline({ code: '', color: 'w', oppName: null, phase: 'menu' }) }}
              className="w-full bg-card border-2 border-border rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.98] transition-transform">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in oklch, var(--success) 18%, transparent)', color: 'var(--success)' }}>
                <Globe size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-black text-foreground text-[15px]">{t('checkers_online', lang)}</p>
                <p className="text-muted-foreground text-xs truncate">{t('checkers_online_sub', lang)}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground shrink-0" />
            </button>

            {/* puzzles */}
            <button onClick={() => { playTap(); setMode('puzzles') }}
              className="w-full bg-card border-2 border-border rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.98] transition-transform">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in oklch, var(--primary) 16%, transparent)', color: 'var(--primary)' }}>
                <Puzzle size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-black text-foreground text-[15px]">{t('checkers_puzzles', lang)}</p>
                <p className="text-muted-foreground text-xs truncate">{t('checkers_puzzles_sub', lang)}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground shrink-0" />
            </button>
          </div>

          <p className="w-full text-muted-foreground/70 text-xs leading-relaxed mt-7 text-center">
            {t('checkers_rules', lang)}
          </p>
        </div>
      </div>
    )
  }

  // ── Puzzles (placeholder — checkers tactics coming soon) ──
  if (mode === 'puzzles') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
        <div className="w-full max-w-md flex items-center gap-3 mb-2">
          <button onClick={() => setMode(null)} aria-label={t('game_back', lang)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <X size={20} />
          </button>
          <h1 className="text-lg font-display font-black text-foreground">{t('checkers_puzzles', lang)}</h1>
        </div>

        <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-5 shadow-[var(--shadow-md)]"
            style={{ background: 'var(--gradient-hero)', color: 'white' }}>
            <Puzzle size={38} />
          </div>
          <h2 className="text-2xl font-display font-black text-foreground">{t('checkers_puzzles', lang)}</h2>
          <p className="text-muted-foreground mt-2 max-w-xs leading-relaxed">{t('checkers_puzzles_soon', lang)}</p>
          <button onClick={() => setMode(null)}
            className="mt-7 px-6 py-3 rounded-[var(--radius)] bg-card border-2 border-border font-display font-black text-foreground active:scale-95 transition-transform">
            {t('game_back', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── Online lobby (create / join / waiting) ──
  if (mode === 'online' && online && online.phase !== 'playing') {
    const leave = () => { roomRef.current = null; waitingRef.current = false; setOnline(null); setMode(null); resetState() }
    const busy = online.phase === 'creating' || online.phase === 'joining'
    return (
      <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
        <div className="w-full max-w-md flex items-center gap-3 mb-2">
          <button onClick={leave} aria-label={t('game_back', lang)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-display font-black text-foreground">{t('checkers_online', lang)}</h1>
        </div>

        <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-5">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center shadow-[var(--shadow-md)]"
            style={{ background: 'var(--gradient-hero)', color: 'white' }}>
            <Globe size={38} />
          </div>

          {online.phase === 'waiting' ? (
            <>
              <p className="text-muted-foreground text-sm">{t('checkers_share_code', lang)}</p>
              <button onClick={() => { navigator.clipboard?.writeText(online.code).catch(() => {}); playTap() }}
                className="flex items-center gap-3 bg-card border-2 border-border rounded-[var(--radius-lg)] px-6 py-4 shadow-[var(--shadow-sm)] active:scale-95 transition-transform">
                <span className="text-4xl font-display font-black tracking-[0.2em] text-foreground">{online.code}</span>
                <Copy size={20} className="text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-4 h-4 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">{t('checkers_waiting', lang)}</span>
              </div>
            </>
          ) : busy ? (
            <span className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <div className="w-full flex flex-col gap-3">
              <button onClick={createOnline}
                className="w-full py-4 rounded-[var(--radius-lg)] text-white font-display font-black text-base active:scale-[0.98] transition-transform shadow-[var(--shadow-sm)]"
                style={{ background: 'var(--gradient-hero)' }}>
                {t('checkers_create', lang)}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-bold">{t('checkers_join', lang)}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="flex gap-2">
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder={t('checkers_enter_code', lang)} maxLength={4}
                  className="flex-1 bg-card border-2 border-border rounded-[var(--radius)] px-4 py-3 text-center text-2xl font-display font-black tracking-[0.2em] text-foreground outline-none uppercase" />
                <button onClick={joinOnline} disabled={joinCode.trim().length < 4}
                  className="px-5 rounded-[var(--radius)] text-white font-display font-black active:scale-95 transition-transform disabled:opacity-40"
                  style={{ background: 'var(--primary)' }}>
                  {t('checkers_join', lang)}
                </button>
              </div>
              {onlineErr && <p className="text-sm text-center font-semibold" style={{ color: 'var(--destructive)' }}>{onlineErr}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-5" style={{ background: '#312E2B' }}>
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-3">
        <button onClick={() => { resetState(); setMode(null); setOnline(null) }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white leading-tight">{t('checkers_title', lang)}</h1>
          <p className="text-xs text-white/50">
            {status}
            {mode === 'ai' && <span className="text-white/35"> · {t(level === 'easy' ? 'sudoku_easy' : level === 'hard' ? 'sudoku_hard' : 'sudoku_medium', lang)}</span>}
          </p>
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
      <div className="relative w-full max-w-md rounded-xl overflow-hidden shadow-2xl select-none ring-4 ring-black/20">
        <div className="grid grid-cols-8 w-full">
          {Array.from({ length: 64 }).map((_, idx) => {
            const r = Math.floor(idx / 8), c = idx % 8
            const dark = isDark(r, c)
            const piece = board[r][c]
            const isSel = sel && sel[0] === r && sel[1] === c
            const isDest = destSet.has(key(r, c))
            const faded = chainSet.has(key(r, c))
            const white = piece?.color === 'w'
            return (
              <div
                key={idx}
                onClick={() => dark && onCellClick(r, c)}
                className="relative aspect-square flex items-center justify-center"
                style={{ background: dark ? '#769656' : '#EEEED2', cursor: dark ? 'pointer' : 'default' }}
              >
                {/* coordinates — rank on the left column, file on the bottom row */}
                {c === 0 && (
                  <span className="absolute top-[2px] left-[3px] text-[8px] sm:text-[9px] font-black leading-none pointer-events-none"
                    style={{ color: dark ? '#EEEED2' : '#769656' }}>{8 - r}</span>
                )}
                {r === 7 && (
                  <span className="absolute bottom-[2px] right-[3px] text-[8px] sm:text-[9px] font-black leading-none pointer-events-none"
                    style={{ color: dark ? '#EEEED2' : '#769656' }}>{String.fromCharCode(97 + c)}</span>
                )}
                {/* selection highlight */}
                {isSel && <div className="absolute inset-0" style={{ background: 'rgba(245,210,80,0.55)' }} />}
                {/* move hint */}
                {isDest && !piece && (
                  <div className="absolute w-1/3 h-1/3 rounded-full" style={{ background: 'rgba(30,30,30,0.28)' }} />
                )}
                {isDest && piece && (
                  <div className="absolute inset-0" style={{ background: 'rgba(220,60,50,0.45)' }} />
                )}
                {/* piece */}
                {piece && (
                  <div
                    className={`relative rounded-full transition-opacity ${faded ? 'opacity-30' : ''}`}
                    style={{
                      width: '78%', height: '78%',
                      background: white
                        ? 'radial-gradient(circle at 38% 32%, #fcfcf8, #d2cdbe)'
                        : 'radial-gradient(circle at 38% 32%, #6c6c6c, #141414)',
                      boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.4), 0 3px 5px rgba(0,0,0,0.45)',
                      border: white ? '1px solid #b6b0a1' : '1px solid #000',
                    }}
                  >
                    {/* concentric grooves — like a real checker */}
                    <div className="absolute rounded-full" style={{
                      inset: '13%',
                      border: white ? '2px solid rgba(120,110,85,0.40)' : '2px solid rgba(255,255,255,0.20)',
                    }} />
                    <div className="absolute rounded-full" style={{
                      inset: '26%',
                      border: white ? '1.5px solid rgba(120,110,85,0.28)' : '1.5px solid rgba(255,255,255,0.13)',
                    }} />
                    {piece.king && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span style={{ color: white ? '#C99A2E' : '#F5C84B', fontSize: '105%', lineHeight: 1 }}>★</span>
                      </div>
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
            <div className="text-5xl">
              {mode === 'online' ? (winner === online?.color ? '🏆' : '😔')
                : mode === 'local' ? (winner === 'w' ? '⚪' : '⚫')
                : (winner === 'w' ? '🏆' : '🤖')}
            </div>
            <h2 className="text-2xl font-black text-white text-center px-6">
              {winText(winner)}
            </h2>
            {((mode === 'ai' && winner === 'w') || (mode === 'online' && winner === online?.color)) && (
              <p className="text-amber-300 font-bold">+30 XP</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => router.push('/')}
                className="px-6 py-3 rounded-2xl bg-white/15 text-white font-bold active:scale-95">
                {t('game_home', lang)}
              </button>
              <button onClick={() => { if (mode === 'online') { roomRef.current = null; setOnline(null); setMode(null); resetState() } else restart() }}
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
