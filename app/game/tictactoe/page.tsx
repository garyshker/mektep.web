'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, X as XIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { touchStreak } from '@/lib/streak'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

// ── Types & logic ────────────────────────────────────────────────────────────
type Mark = 'X' | 'O'
type Cell = Mark | null
type Board = Cell[]

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
]

// Returns the winning line (3 indices) or null
function winningLine(b: Board): number[] | null {
  for (const ln of LINES) {
    const [a, c, d] = ln
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return ln
  }
  return null
}

const isFull = (b: Board) => b.every(Boolean)

// ── Minimax (AI plays O, human plays X) ──────────────────────────────────────
function minimax(b: Board, turn: Mark): number {
  const line = winningLine(b)
  if (line) return b[line[0]] === 'O' ? 1 : -1
  if (isFull(b)) return 0
  const scores: number[] = []
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = turn
    scores.push(minimax(b, turn === 'O' ? 'X' : 'O'))
    b[i] = null
  }
  // O maximises, X minimises
  return turn === 'O' ? Math.max(...scores) : Math.min(...scores)
}

function bestMove(b: Board): number {
  let best = -Infinity, move = -1
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = 'O'
    const s = minimax(b, 'X')
    b[i] = null
    if (s > best) { best = s; move = i }
  }
  return move
}

const emptyCells = (b: Board) => b.map((v, i) => (v ? -1 : i)).filter(i => i >= 0)
const randomMove = (b: Board) => { const e = emptyCells(b); return e[Math.floor(Math.random() * e.length)] }

type Level = 'easy' | 'medium' | 'hard'
function aiMove(b: Board, level: Level): number {
  if (level === 'easy') return randomMove(b)
  if (level === 'hard') return bestMove(b)
  // medium — optimal half the time, otherwise random
  return Math.random() < 0.5 ? bestMove(b) : randomMove(b)
}

// ── Marks (drawn, themed) ────────────────────────────────────────────────────
function XMark({ dim }: { dim?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full animate-mk-pop-in" aria-hidden
      style={{ opacity: dim ? 0.85 : 1 }}>
      <line x1="26" y1="26" x2="74" y2="74" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round" />
      <line x1="74" y1="26" x2="26" y2="74" stroke="var(--primary)" strokeWidth="13" strokeLinecap="round" />
    </svg>
  )
}
function OMark({ dim }: { dim?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full animate-mk-pop-in" aria-hidden
      style={{ opacity: dim ? 0.85 : 1 }}>
      <circle cx="50" cy="50" r="27" fill="none" stroke="var(--accent)" strokeWidth="13" />
    </svg>
  )
}

// Difficulty indicator: 1–3 filled signal bars
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
export default function TicTacToePage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [mode, setMode] = useState<'ai' | 'local' | null>(null)
  const [level, setLevel] = useState<Level>('medium')
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [turn, setTurn] = useState<Mark>('X')
  const [winner, setWinner] = useState<Mark | 'draw' | null>(null)
  const [line, setLine] = useState<number[] | null>(null)
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 })
  const boardRef = useRef(board)
  useEffect(() => { boardRef.current = board }, [board])
  const levelRef = useRef(level)
  useEffect(() => { levelRef.current = level }, [level])

  const humanTurn = mode === 'local' || (mode === 'ai' && turn === 'X')

  const finish = (b: Board) => {
    const ln = winningLine(b)
    if (ln) {
      const w = b[ln[0]] as Mark
      setLine(ln); setWinner(w)
      setScore(s => ({ ...s, [w]: s[w] + 1 }))
      if (mode === 'ai') (w === 'X' ? playCorrect() : playWrong())
      else playCorrect()
      return true
    }
    if (isFull(b)) {
      setWinner('draw'); setScore(s => ({ ...s, draw: s.draw + 1 }))
      playTap()
      return true
    }
    return false
  }

  const place = (i: number) => {
    if (winner || board[i] || !humanTurn) return
    const nb = board.slice()
    nb[i] = turn
    playTap()
    setBoard(nb)
    if (finish(nb)) return
    setTurn(turn === 'X' ? 'O' : 'X')
  }

  // AI move (vs computer, AI is O)
  useEffect(() => {
    if (winner || mode !== 'ai' || turn !== 'O') return
    const id = setTimeout(() => {
      const b = boardRef.current
      const i = aiMove(b, levelRef.current)
      if (i == null || i < 0) return
      const nb = b.slice()
      nb[i] = 'O'
      playTap()
      setBoard(nb)
      if (finish(nb)) return
      setTurn('X')
    }, 480)
    return () => clearTimeout(id)
  }, [turn, winner, mode])

  // Award XP once per win vs computer
  const savedRef = useRef(false)
  useEffect(() => {
    if (winner === 'X' && mode === 'ai' && !savedRef.current) {
      savedRef.current = true
      ;(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + 15 }).eq('id', user.id); void touchStreak(supabase)
      })()
    }
  }, [winner])

  const newRound = () => {
    savedRef.current = false
    setBoard(Array(9).fill(null)); setTurn('X'); setWinner(null); setLine(null)
  }
  const start = (m: 'ai' | 'local', lv?: Level) => {
    if (lv) setLevel(lv)
    setScore({ X: 0, O: 0, draw: 0 })
    setBoard(Array(9).fill(null)); setTurn('X'); setWinner(null); setLine(null)
    savedRef.current = false
    setMode(m)
  }

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
          <button onClick={() => router.push('/game')} aria-label={t('game_home', lang)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
            <XIcon size={20} />
          </button>
        </div>

        <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center py-4">
          {/* Hero — X & O on the brand gradient */}
          <div className="relative mb-6 w-[160px] h-[116px] rounded-[28px] flex items-center justify-center gap-3 shadow-[var(--shadow-md)]"
            style={{ background: 'var(--gradient-hero)' }}>
            <div className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center p-2.5 rotate-[-8deg] shadow-md">
              <XMark />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center p-2.5 rotate-[8deg] shadow-md">
              <OMark />
            </div>
          </div>

          <h1 className="text-3xl font-display font-black text-foreground text-center leading-tight">{t('ttt_title', lang)}</h1>
          <p className="text-muted-foreground text-center mt-1.5 mb-7">{t('checkers_pick_mode', lang)}</p>

          <div className="w-full flex flex-col gap-3">
            <p className="text-muted-foreground/70 text-[11px] font-display font-black tracking-widest uppercase px-1">
              {t('checkers_difficulty', lang)}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {diffs.map(d => (
                <button key={d.lv} onClick={() => start('ai', d.lv)}
                  className="bg-card border-2 border-border rounded-[var(--radius-lg)] py-4 flex flex-col items-center gap-2 shadow-[var(--shadow-sm)] active:scale-95 transition-transform">
                  <SignalBars filled={d.bars} color={d.color} />
                  <span className="font-display font-black text-foreground text-sm">{t(d.label, lang)}</span>
                </button>
              ))}
            </div>

            <button onClick={() => start('local')}
              className="w-full bg-card border-2 border-border rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.98] transition-transform">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'color-mix(in oklch, var(--accent) 18%, transparent)', color: 'var(--accent)' }}>
                <Users size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-black text-foreground text-[15px]">{t('checkers_vs_local', lang)}</p>
                <p className="text-muted-foreground text-xs truncate">{t('checkers_vs_local_sub', lang)}</p>
              </div>
            </button>
          </div>

          <p className="w-full text-muted-foreground/70 text-xs leading-relaxed mt-7 text-center">
            {t('ttt_rules', lang)}
          </p>
        </div>
      </div>
    )
  }

  // ── Game status ──
  const statusText =
    winner === 'draw' ? t('ttt_draw', lang) :
    winner === 'X' ? (mode === 'local' ? t('ttt_x_win', lang) : t('checkers_you_win', lang)) :
    winner === 'O' ? (mode === 'local' ? t('ttt_o_win', lang) : t('checkers_you_lose', lang)) :
    mode === 'local'
      ? (turn === 'X' ? t('ttt_x_turn', lang) : t('ttt_o_turn', lang))
      : (turn === 'X' ? t('checkers_your_turn', lang) : t('checkers_ai_turn', lang))

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-4">
        <button onClick={() => setMode(null)} aria-label={t('game_back', lang)}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform shrink-0">
          <XIcon size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-display font-black text-foreground leading-tight">{t('ttt_title', lang)}</h1>
          <p className="text-xs text-muted-foreground truncate">
            {statusText}
            {mode === 'ai' && <span className="opacity-60"> · {t(level === 'easy' ? 'sudoku_easy' : level === 'hard' ? 'sudoku_hard' : 'sudoku_medium', lang)}</span>}
          </p>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-card border-2 border-border rounded-[var(--radius)] py-2 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black tracking-wider uppercase" style={{ color: 'var(--primary)' }}>
            {mode === 'local' ? 'X' : t('checkers_your_turn', lang).split(' ')[0]}
          </p>
          <p className="text-2xl font-display font-black text-foreground leading-none mt-0.5">{score.X}</p>
        </div>
        <div className="bg-card border-2 border-border rounded-[var(--radius)] py-2 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black tracking-wider uppercase text-muted-foreground">{t('ttt_draw', lang)}</p>
          <p className="text-2xl font-display font-black text-foreground leading-none mt-0.5">{score.draw}</p>
        </div>
        <div className="bg-card border-2 border-border rounded-[var(--radius)] py-2 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[10px] font-black tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
            {mode === 'local' ? 'O' : '🤖'}
          </p>
          <p className="text-2xl font-display font-black text-foreground leading-none mt-0.5">{score.O}</p>
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full max-w-md">
        <div className="grid grid-cols-3 grid-rows-3 gap-2.5 aspect-square">
          {board.map((cell, i) => {
            const win = line?.includes(i)
            const clickable = !winner && !cell && humanTurn
            return (
              <button key={i} onClick={() => place(i)} disabled={!clickable}
                className="w-full h-full rounded-[var(--radius-lg)] border-2 flex items-center justify-center p-[18%] transition-colors shadow-[var(--shadow-sm)]"
                style={{
                  background: win
                    ? (cell === 'X' ? 'color-mix(in oklch, var(--primary) 16%, var(--card))' : 'color-mix(in oklch, var(--accent) 18%, var(--card))')
                    : 'var(--card)',
                  borderColor: win
                    ? (cell === 'X' ? 'var(--primary)' : 'var(--accent)')
                    : 'var(--border)',
                  cursor: clickable ? 'pointer' : 'default',
                }}>
                {cell === 'X' && <XMark dim={!!winner && !win} />}
                {cell === 'O' && <OMark dim={!!winner && !win} />}
              </button>
            )
          })}
        </div>

        {/* Win overlay */}
        {winner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)]"
            style={{ background: 'color-mix(in oklch, var(--background) 80%, transparent)', backdropFilter: 'blur(2px)' }}>
            <div className="text-5xl">{winner === 'draw' ? '🤝' : winner === 'X' && mode === 'ai' ? '🏆' : winner === 'O' && mode === 'ai' ? '🤖' : '🎉'}</div>
            <h2 className="text-2xl font-display font-black text-foreground text-center px-6">{statusText}</h2>
            {winner === 'X' && mode === 'ai' && <p className="font-display font-black" style={{ color: 'var(--xp)' }}>+15 XP</p>}
            <div className="flex gap-3">
              <button onClick={() => router.push('/game')}
                className="px-5 py-3 rounded-[var(--radius)] bg-card border-2 border-border font-display font-black text-foreground active:scale-95 transition-transform">
                {t('game_home', lang)}
              </button>
              <button onClick={newRound}
                className="px-6 py-3 rounded-[var(--radius)] font-display font-black text-white active:scale-95 transition-transform"
                style={{ background: 'var(--primary)' }}>
                {t('game_again', lang)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      <p className="w-full max-w-md text-muted-foreground/70 text-xs leading-relaxed mt-5 text-center">
        {t('ttt_rules', lang)}
      </p>
    </div>
  )
}
