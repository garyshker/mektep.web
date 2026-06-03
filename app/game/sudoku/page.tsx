'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Level = 'easy' | 'medium' | 'hard' | 'expert'

const LEVELS: { id: Level; remove: number; xp: number }[] = [
  { id: 'easy',   remove: 42, xp: 20 },
  { id: 'medium', remove: 49, xp: 35 },
  { id: 'hard',   remove: 54, xp: 50 },
  { id: 'expert', remove: 58, xp: 70 },
]

// ── Generation ──────────────────────────────────────────────────────────────
function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
}

function canPlace(g: number[], pos: number, n: number): boolean {
  const r = Math.floor(pos / 9), c = pos % 9
  for (let i = 0; i < 9; i++) {
    if (g[r * 9 + i] === n) return false
    if (g[i * 9 + c] === n) return false
  }
  const br = 3 * Math.floor(r / 3), bc = 3 * Math.floor(c / 3)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[(br + i) * 9 + (bc + j)] === n) return false
  return true
}

function fillFull(g: number[], pos: number): boolean {
  if (pos === 81) return true
  if (g[pos] !== 0) return fillFull(g, pos + 1)
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(g, pos, n)) {
      g[pos] = n
      if (fillFull(g, pos + 1)) return true
      g[pos] = 0
    }
  }
  return false
}

function countSolutions(g: number[], limit: number): number {
  const pos = g.indexOf(0)
  if (pos === -1) return 1
  let count = 0
  for (let n = 1; n <= 9; n++) {
    if (canPlace(g, pos, n)) {
      g[pos] = n
      count += countSolutions(g, limit)
      g[pos] = 0
      if (count >= limit) return count
    }
  }
  return count
}

function generatePuzzle(removeTarget: number): { puzzle: number[]; solution: number[] } {
  const solution = new Array(81).fill(0)
  fillFull(solution, 0)
  const puzzle = solution.slice()
  let removed = 0
  for (const pos of shuffle([...Array(81).keys()])) {
    if (removed >= removeTarget) break
    if (puzzle[pos] === 0) continue
    const saved = puzzle[pos]
    puzzle[pos] = 0
    if (countSolutions(puzzle.slice(), 2) !== 1) puzzle[pos] = saved
    else removed++
  }
  return { puzzle, solution }
}

// Indices that clash with another equal value in row/col/box
function findConflicts(cells: number[]): Set<number> {
  const bad = new Set<number>()
  const scan = (idxs: number[]) => {
    const seen: Record<number, number[]> = {}
    for (const i of idxs) {
      const v = cells[i]
      if (v === 0) continue
      ;(seen[v] ||= []).push(i)
    }
    for (const v in seen) if (seen[v].length > 1) seen[v].forEach(i => bad.add(i))
  }
  for (let r = 0; r < 9; r++) scan(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) scan(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++)
    scan(Array.from({ length: 9 }, (_, k) => (br * 3 + Math.floor(k / 3)) * 9 + (bc * 3 + k % 3)))
  return bad
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// ── Component ────────────────────────────────────────────────────────────────
export default function SudokuPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [level, setLevel] = useState<Level | null>(null)
  const [generating, setGenerating] = useState(false)
  const [given, setGiven] = useState<boolean[]>([])
  const [cells, setCells] = useState<number[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [solved, setSolved] = useState(false)
  const savedRef = useRef(false)

  const start = (lv: Level) => {
    setLevel(lv)
    setGenerating(true)
    setSolved(false)
    setSeconds(0)
    setSel(null)
    savedRef.current = false
    // Defer heavy generation so the spinner can paint
    setTimeout(() => {
      const cfg = LEVELS.find(l => l.id === lv)!
      const { puzzle } = generatePuzzle(cfg.remove)
      setGiven(puzzle.map(v => v !== 0))
      setCells(puzzle.slice())
      setGenerating(false)
    }, 30)
  }

  // Timer
  useEffect(() => {
    if (!level || generating || solved) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [level, generating, solved])

  const conflicts = cells.length ? findConflicts(cells) : new Set<number>()

  // Win detection
  useEffect(() => {
    if (!level || generating || solved || cells.length !== 81) return
    if (cells.every(v => v !== 0) && conflicts.size === 0) {
      setSolved(true)
      playCorrect()
      if (!savedRef.current) {
        savedRef.current = true
        const xp = LEVELS.find(l => l.id === level)!.xp
        ;(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
          await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id)
        })()
      }
    }
  }, [cells])

  const setNumber = (n: number) => {
    if (sel === null || given[sel] || solved) return
    setCells(prev => { const nx = prev.slice(); nx[sel] = n; return nx })
    n === 0 ? playTap() : playTap()
  }

  // Keyboard input on desktop
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') setNumber(Number(e.key))
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') setNumber(0)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sel, given, solved])

  // ── Difficulty menu ──
  if (level === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#EDE8F8' }}>
        <button onClick={() => router.push('/')}
          className="absolute top-5 left-4 w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm">✕</button>
        <div className="text-6xl mb-3">🧩</div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">{t('sudoku_title', lang)}</h1>
        <p className="text-gray-400 text-sm mb-8">{t('sudoku_pick', lang)}</p>
        <div className="w-full max-w-xs flex flex-col gap-3">
          {LEVELS.map((l, i) => (
            <button key={l.id} onClick={() => start(l.id)}
              className="w-full bg-white rounded-2xl px-5 py-4 flex items-center gap-4 text-left shadow-sm active:scale-[0.98] transition-all border-2 border-transparent">
              <span className="text-2xl">{['🟢', '🟡', '🟠', '🔴'][i]}</span>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-base">{t(`sudoku_${l.id}` as 'sudoku_easy', lang)}</p>
                <p className="text-gray-400 text-xs">{81 - l.remove} {lang === 'kk' ? 'сан берілген' : lang === 'en' ? 'givens' : 'подсказок'}</p>
              </div>
              <span className="text-amber-500 font-black text-sm">+{l.xp} XP</span>
            </button>
          ))}
        </div>
        <p className="w-full max-w-xs text-gray-400 text-xs leading-relaxed mt-8 text-center">{t('sudoku_rules', lang)}</p>
      </div>
    )
  }

  const selVal = sel !== null ? cells[sel] : 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-5" style={{ background: '#EDE8F8' }}>
      {/* Header */}
      <div className="w-full max-w-md flex items-center gap-3 mb-3">
        <button onClick={() => setLevel(null)}
          className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-gray-900 leading-tight">{t('sudoku_title', lang)}</h1>
          <p className="text-xs text-gray-400">{t(`sudoku_${level}` as 'sudoku_easy', lang)}</p>
        </div>
        <div className="bg-white rounded-xl px-3 py-1.5 text-center shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase">{t('sudoku_time', lang)}</p>
          <p className="text-base font-black text-gray-900 leading-none tabular-nums">{mmss(seconds)}</p>
        </div>
      </div>

      {generating ? (
        <div className="w-full max-w-md aspect-square flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-[#7B5CBF] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{t('sudoku_generating', lang)}</p>
        </div>
      ) : (
        <div className="relative w-full max-w-md">
          {/* Grid */}
          <div className="grid grid-cols-9 bg-white rounded-xl overflow-hidden shadow-lg ring-2 ring-gray-800/70">
            {cells.map((v, i) => {
              const r = Math.floor(i / 9), c = i % 9
              const isSel = sel === i
              const isGiven = given[i]
              const related = sel !== null && (Math.floor(sel / 9) === r || sel % 9 === c ||
                (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(c / 3)))
              const sameNum = selVal !== 0 && v === selVal
              const bad = conflicts.has(i)
              let bg = '#ffffff'
              if (isSel) bg = '#C9B8F0'
              else if (sameNum) bg = '#E3D9F7'
              else if (related) bg = '#F3EFFB'
              return (
                <button
                  key={i}
                  onClick={() => { playTap(); setSel(i) }}
                  className="aspect-square flex items-center justify-center text-xl font-bold tabular-nums"
                  style={{
                    background: bg,
                    color: bad ? '#DC2626' : isGiven ? '#1f2937' : '#6D28D9',
                    borderTop: r % 3 === 0 ? '2px solid #374151' : '1px solid #e5e7eb',
                    borderLeft: c % 3 === 0 ? '2px solid #374151' : '1px solid #e5e7eb',
                    borderRight: c === 8 ? '2px solid #374151' : '',
                    borderBottom: r === 8 ? '2px solid #374151' : '',
                  }}
                >
                  {v !== 0 ? v : ''}
                </button>
              )
            })}
          </div>

          {/* Solved overlay */}
          {solved && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl"
              style={{ background: 'rgba(40,30,60,0.86)' }}>
              <div className="text-5xl">🏆</div>
              <h2 className="text-2xl font-black text-white">{t('sudoku_solved', lang)}</h2>
              <p className="text-amber-300 font-bold">+{LEVELS.find(l => l.id === level)!.xp} XP · {mmss(seconds)}</p>
              <div className="flex gap-3">
                <button onClick={() => router.push('/')}
                  className="px-6 py-3 rounded-2xl bg-white/15 text-white font-bold active:scale-95">{t('game_home', lang)}</button>
                <button onClick={() => start(level)}
                  className="px-6 py-3 rounded-2xl bg-amber-400 text-gray-900 font-black active:scale-95">{t('game_again', lang)}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Number pad */}
      {!generating && !solved && (
        <div className="w-full max-w-md mt-4 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const count = cells.filter(v => v === n).length
            const full = count >= 9
            return (
              <button key={n} onClick={() => setNumber(n)} disabled={full}
                className="aspect-square rounded-xl bg-white shadow-sm text-2xl font-black text-[#6D28D9] active:scale-95 transition-all disabled:opacity-30">
                {n}
              </button>
            )
          })}
          <button onClick={() => setNumber(0)}
            className="aspect-square rounded-xl bg-white shadow-sm flex items-center justify-center text-xl active:scale-95 transition-all">
            ⌫
          </button>
        </div>
      )}
    </div>
  )
}
