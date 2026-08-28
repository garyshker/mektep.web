'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong } from '@/lib/sounds'
import { completeQuest } from '@/lib/quests'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type Phase = 'idle' | 'playing' | 'done'

interface Problem {
  expr: string
  answer: number
  options: string[]
}

function generateProblem(grade: number): Problem {
  const ops = grade <= 2 ? ['+', '−'] : ['+', '−', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  const max = grade === 1 ? 10 : grade === 2 ? 50 : 99

  let a: number, b: number, answer: number

  if (op === '×') {
    a = Math.floor(Math.random() * 9) + 2
    b = Math.floor(Math.random() * 9) + 2
    answer = a * b
  } else if (op === '−') {
    a = Math.floor(Math.random() * (max - 1)) + 2
    b = Math.floor(Math.random() * (a - 1)) + 1
    answer = a - b
  } else {
    a = Math.floor(Math.random() * (max - 1)) + 1
    b = Math.floor(Math.random() * (max - a)) + 1
    answer = a + b
  }

  // Generate 3 wrong answers close to the correct one
  const opts = new Set<number>([answer])
  const deltas = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 7, -7, 10, -10]
  for (const d of deltas) {
    if (opts.size >= 4) break
    const cand = answer + d
    if (cand > 0 && cand !== answer) opts.add(cand)
  }
  while (opts.size < 4) opts.add(answer + opts.size * 11)

  const shuffled = [...opts].sort(() => Math.random() - 0.5)
  return { expr: `${a} ${op} ${b}`, answer, options: shuffled.map(String) }
}

export default function QuickGamePage() {
  const router = useRouter()
  const supabase = createClient()

  const [phase, setPhase] = useState<Phase>('idle')
  const [grade, setGrade] = useState(2)
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      const g = profile?.grade ?? 2
      setGrade(g)
      setProblem(generateProblem(g))
    }
    init()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setPhase('done')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase])

  // Save XP when done
  useEffect(() => {
    if (phase !== 'done' || score === 0) return
    const save = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const xp = score * 5
      const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id)
      completeQuest(supabase, 'game')
    }
    save()
  }, [phase])

  const start = () => {
    setScore(0)
    setTotal(0)
    setTimeLeft(60)
    setProblem(generateProblem(grade))
    setPicked(null)
    setPhase('playing')
  }

  const pick = (opt: string) => {
    if (picked !== null || phase !== 'playing' || !problem) return
    const isRight = opt === String(problem.answer)
    setPicked(opt)
    if (isRight) { setScore(s => s + 1); playCorrect() } else playWrong()
    setTotal(t => t + 1)
    setTimeout(() => {
      setPicked(null)
      setProblem(generateProblem(grade))
    }, isRight ? 220 : 380)
  }

  // ── Timer color
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : '#22c55e'

  // ── Render: idle ────────────────────────────────────────────────────
  if (phase === 'idle' || !problem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#F5F4F0' }}>
        <button onClick={() => router.push('/game')}
          className="absolute top-5 left-4 w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold text-sm">
          ✕
        </button>

        <div className="text-7xl mb-5">⚡</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">{lang === 'kk' ? 'Жылдам санау' : lang === 'en' ? 'Quick Math' : 'Быстрый счёт'}</h1>
        <p className="text-gray-500 text-base text-center mb-2">
          {t('game_quick_desc', lang)}
        </p>
        <p className="text-gray-400 text-sm mb-10">
          {grade} {t('grade', lang)} · 60 {t('game_seconds', lang)}
        </p>

        <div className="bg-white rounded-3xl px-6 py-5 shadow-sm w-full max-w-xs mb-8 text-center">
          <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">{t('game_how_to_play', lang)}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{t('game_quick_rules', lang)}</p>
        </div>

        <button onClick={start}
          className="w-full max-w-xs py-4 rounded-2xl bg-gray-900 text-white font-black text-xl active:scale-95 transition-all">
          {t('game_go', lang)}
        </button>
      </div>
    )
  }

  // ── Render: done ───────────────────────────────────────────────────
  if (phase === 'done') {
    const xp = score * 5
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const medal = score >= 15 ? '🥇' : score >= 8 ? '🥈' : score >= 3 ? '🥉' : '🎯'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#F5F4F0' }}>
        <div className="text-7xl mb-4">{medal}</div>
        <h2 className="text-3xl font-black text-gray-900 mb-1">{t('game_time_up', lang)}</h2>
        <p className="text-gray-500 mb-6">
          {score} / {total} · {pct}%
        </p>

        <div className="bg-white rounded-3xl px-6 py-5 shadow-sm w-full max-w-xs mb-2">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 text-sm font-semibold">{t('game_correct', lang)}</span>
            <span className="font-black text-gray-900 text-lg">{score}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 text-sm font-semibold">{t('game_total', lang)}</span>
            <span className="font-black text-gray-900 text-lg">{total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-semibold">{t('game_accuracy', lang)}</span>
            <span className="font-black text-gray-900 text-lg">{pct}%</span>
          </div>
        </div>

        {xp > 0 && (
          <div className="bg-amber-400 rounded-2xl px-6 py-3 w-full max-w-xs mb-8">
            <p className="font-black text-gray-900 text-xl">+{xp} XP</p>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/game')}
            className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold active:scale-95">
            {t('game_home', lang)}
          </button>
          <button onClick={start}
            className="flex-1 py-3.5 rounded-2xl bg-gray-900 text-white font-bold active:scale-95">
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: playing ────────────────────────────────────────────────
  const correctAns = String(problem.answer)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F4F0' }}>

      {/* Stats bar */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between lg:max-w-2xl lg:mx-auto lg:w-full">
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('game_score', lang)}</span>
          <span className="text-3xl font-black text-gray-900">{score}</span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{t('game_time', lang)}</span>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl text-white transition-colors duration-500"
            style={{ backgroundColor: timerColor }}>
            {timeLeft}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('game_solved', lang)}</span>
          <span className="text-3xl font-black text-gray-900">{total}</span>
        </div>
      </header>

      {/* Expression card */}
      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 lg:max-w-2xl lg:mx-auto lg:w-full">
        <div className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase mb-4 text-center">
            {t('game_choose_answer', lang)}
          </p>
          <div className="text-5xl font-black text-center leading-none tracking-tight py-2">
            {problem.expr.split(/(\s*[+\-−×÷]\s*)/).map((p, i) => {
              const t = p.trim()
              const isOp = /^[+\-−×÷]$/.test(t)
              return (
                <span key={i} className={isOp ? 'text-orange-500 mx-1' : 'text-gray-900'}>
                  {t === '-' ? '−' : p}
                </span>
              )
            })}
          </div>
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3">
          {problem.options.map((opt) => {
            const isSelected = picked === opt
            const isCorrect = opt === correctAns
            let cls = 'bg-white border-2 border-gray-200 text-gray-800 shadow-sm'
            if (isSelected && isCorrect) cls = 'bg-emerald-400 border-emerald-400 text-white'
            else if (isSelected && !isCorrect) cls = 'bg-red-400 border-red-400 text-white'
            else if (picked !== null && isCorrect) cls = 'bg-emerald-100 border-emerald-400 text-emerald-800'
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                className={`${cls} rounded-2xl py-6 text-2xl font-black transition-all active:scale-95`}>
                {opt}
              </button>
            )
          })}
        </div>
      </main>

      {/* Bottom timer bar */}
      <div className="h-1.5 mx-4 mb-6 mt-4 bg-gray-200 rounded-full overflow-hidden lg:max-w-2xl lg:mx-auto lg:w-full">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: timerColor }}
        />
      </div>
    </div>
  )
}
