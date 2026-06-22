'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { touchStreak } from '@/lib/streak'
import { playCorrect, playWrong } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Board = (number | null)[][]
type Dir = 'left' | 'right' | 'up' | 'down'

const COLORS: Record<number, [string, string]> = {
  2:    ['#EEE4DA', '#776E65'],
  4:    ['#EDE0C8', '#776E65'],
  8:    ['#F2B179', '#F9F6F2'],
  16:   ['#F59563', '#F9F6F2'],
  32:   ['#F67C5F', '#F9F6F2'],
  64:   ['#F65E3B', '#F9F6F2'],
  128:  ['#EDCF72', '#F9F6F2'],
  256:  ['#EDCC61', '#F9F6F2'],
  512:  ['#EDC850', '#F9F6F2'],
  1024: ['#EDC53F', '#F9F6F2'],
  2048: ['#EDC22E', '#F9F6F2'],
}

function emptyBoard(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(null))
}

function addTile(b: Board): Board {
  const empty: [number, number][] = []
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!b[r][c]) empty.push([r, c])
  if (!empty.length) return b
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const nb = b.map(row => [...row])
  nb[r][c] = Math.random() < 0.9 ? 2 : 4
  return nb
}

function slideLeft(row: (number | null)[]): { row: (number | null)[]; gained: number } {
  const nums = row.filter(Boolean) as number[]
  let gained = 0
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2; gained += nums[i]; nums.splice(i + 1, 1)
    }
  }
  while (nums.length < 4) nums.push(0)
  return { row: nums.map(n => n || null), gained }
}

function transpose(b: Board): Board {
  return Array(4).fill(null).map((_, r) => Array(4).fill(null).map((_, c) => b[c][r]))
}

function applyDir(board: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let work = board.map(r => [...r])
  if (dir === 'right') work = work.map(r => [...r].reverse())
  else if (dir === 'up') work = transpose(work)
  else if (dir === 'down') work = transpose(work).map(r => [...r].reverse())

  let gained = 0
  work = work.map(row => { const s = slideLeft(row); gained += s.gained; return s.row })

  if (dir === 'right') work = work.map(r => [...r].reverse())
  else if (dir === 'up') work = transpose(work)
  else if (dir === 'down') work = work.map(r => [...r].reverse()), work = transpose(work)

  const moved = work.some((row, r) => row.some((cell, c) => cell !== board[r][c]))
  return { board: work, gained, moved }
}

function hasWon(b: Board) { return b.some(r => r.some(c => c === 2048)) }
function isOver(b: Board) {
  for (const dir of ['left', 'right', 'up', 'down'] as Dir[]) {
    if (applyDir(b, dir).moved) return false
  }
  return true
}

export default function Game2048Page() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [board, setBoard] = useState<Board>(() => addTile(addTile(emptyBoard())))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [won, setWon] = useState(false)
  const [over, setOver] = useState(false)
  const touchRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('2048-best')
    if (saved) setBest(Number(saved))
  }, [])

  const move = useCallback((dir: Dir) => {
    if (won || over) return
    setBoard(prev => {
      const { board: nb, gained, moved } = applyDir(prev, dir)
      if (!moved) return prev
      if (gained > 0) playCorrect()
      const final = addTile(nb)
      setScore(s => {
        const ns = s + gained
        setBest(b => { const nb = Math.max(b, ns); localStorage.setItem('2048-best', String(nb)); return nb })
        return ns
      })
      if (hasWon(final)) setWon(true)
      else if (isOver(final)) { setOver(true); playWrong() }
      return final
    })
  }, [won, over])

  // Arrow keys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
      if (map[e.key]) { e.preventDefault(); move(map[e.key]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [move])

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
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
    else move(dy > 0 ? 'down' : 'up')
  }

  const restart = () => {
    setBoard(addTile(addTile(emptyBoard())))
    setScore(0); setWon(false); setOver(false)
  }

  // Save XP when won
  useEffect(() => {
    if (!won) return
    const save = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + 50 }).eq('id', user.id); void touchStreak(supabase)
    }
    save()
  }, [won])

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: '#FAF8F0' }}>
      {/* Header */}
      <header className="w-full max-w-sm px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">2048</h1>
        </div>
        <div className="flex gap-2">
          <div className="bg-amber-400 rounded-xl px-3 py-1.5 text-center min-w-[60px]">
            <p className="text-[9px] font-black text-amber-900 uppercase tracking-wider">{t('game_score', lang)}</p>
            <p className="text-base font-black text-amber-900 leading-none">{score}</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-1.5 text-center shadow-sm min-w-[60px]">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{t('reflex_best', lang)}</p>
            <p className="text-base font-black text-gray-700 leading-none">{best}</p>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <p className="text-xs text-gray-400 mb-3">{t('g2048_swipe', lang)}</p>

      {/* Board */}
      <div
        className="relative rounded-2xl p-2 select-none"
        style={{ background: '#BBADA0', touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', width: 'min(340px, calc(100vw - 32px))' }}>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const [bg, fg] = cell ? (COLORS[cell] ?? ['#3C3A32', '#F9F6F2']) : ['#CDC1B4', '#CDC1B4']
              const fs = cell && cell >= 1000 ? '1.1rem' : cell && cell >= 100 ? '1.4rem' : '1.8rem'
              return (
                <div key={`${r}-${c}`}
                  className="flex items-center justify-center rounded-xl font-black transition-all"
                  style={{
                    background: bg, color: fg, fontSize: fs,
                    aspectRatio: '1',
                    width: '100%',
                  }}>
                  {cell ?? ''}
                </div>
              )
            })
          )}
        </div>

        {/* Overlay */}
        {(won || over) && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(238,228,218,0.88)' }}>
            <p className="text-4xl font-black text-gray-900">{won ? '🎉 2048!' : `😔 ${t('game_over', lang)}`}</p>
            <p className="text-gray-600 font-semibold">{won ? `+50 XP` : `${t('game_score', lang)}: ${score}`}</p>
            <button onClick={restart}
              className="px-8 py-3 rounded-2xl bg-gray-900 text-white font-black text-lg active:scale-95">
              {t('game_again', lang)}
            </button>
          </div>
        )}
      </div>

      {/* New game button */}
      <button onClick={restart}
        className="mt-4 px-6 py-2.5 rounded-2xl bg-white shadow-sm text-gray-700 font-bold text-sm active:scale-95">
        {t('g2048_new', lang)}
      </button>

      {/* Hint */}
      <div className="mt-4 mx-4 bg-white rounded-2xl px-4 py-3 shadow-sm max-w-sm w-full">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          {t('g2048_help', lang)}
        </p>
      </div>
    </div>
  )
}
