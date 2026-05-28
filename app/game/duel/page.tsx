'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'

type Phase = 'lobby' | 'waiting' | 'countdown' | 'playing' | 'done'

interface Problem { expr: string; answer: number; options: string[] }
interface Duel {
  id: string
  host_id: string; host_name: string
  guest_id: string | null; guest_name: string | null
  grade: number; seed: number
  host_score: number; guest_score: number
}

function seededRng(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

function buildProblems(grade: number, seed: number, n = 40): Problem[] {
  const rng = seededRng(seed)
  return Array.from({ length: n }, () => {
    const ops = grade <= 2 ? ['+', '−'] : ['+', '−', '×']
    const op = ops[Math.floor(rng() * ops.length)]
    const max = grade === 1 ? 10 : grade === 2 ? 50 : 99
    let a: number, b: number, answer: number
    if (op === '×') {
      a = Math.floor(rng() * 9) + 2; b = Math.floor(rng() * 9) + 2; answer = a * b
    } else if (op === '−') {
      a = Math.floor(rng() * (max - 1)) + 2; b = Math.floor(rng() * (a - 1)) + 1; answer = a - b
    } else {
      a = Math.floor(rng() * (max - 1)) + 1; b = Math.floor(rng() * (max - a)) + 1; answer = a + b
    }
    const opts = new Set<number>([answer])
    for (const d of [1, -1, 2, -2, 3, -3, 5, -5, 7, -7, 10, -10]) {
      if (opts.size >= 4) break
      const c = answer + d
      if (c > 0) opts.add(c)
    }
    while (opts.size < 4) opts.add(answer + opts.size * 11)
    const shuffled = [...opts].sort(() => rng() - 0.5)
    return { expr: `${a} ${op} ${b}`, answer, options: shuffled.map(String) }
  })
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function DuelPage() {
  const router = useRouter()
  const supabase = createClient()

  const [phase, setPhase] = useState<Phase>('lobby')
  const [myId, setMyId] = useState('')
  const [myName, setMyName] = useState('')
  const [myGrade, setMyGrade] = useState(2)
  const [isHost, setIsHost] = useState(false)
  const [duel, setDuel] = useState<Duel | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [countdown, setCountdown] = useState(3)
  const [problems, setProblems] = useState<Problem[]>([])
  const [probIdx, setProbIdx] = useState(0)
  const [myScore, setMyScore] = useState(0)
  const [oppScore, setOppScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)

  // refs to avoid stale closures
  const phaseRef = useRef<Phase>('lobby')
  const isHostRef = useRef(false)
  const myScoreRef = useRef(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { isHostRef.current = isHost }, [isHost])
  useEffect(() => { myScoreRef.current = myScore }, [myScore])

  // Init user
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)
      const { data } = await supabase.from('profiles').select('name, grade').eq('id', user.id).single()
      setMyName(data?.name ?? 'Игрок')
      setMyGrade(data?.grade ?? 2)
    }
    init()
    return () => {
      channelRef.current?.unsubscribe()
      clearInterval(timerRef.current!)
    }
  }, [])

  // Subscribe to room changes via Realtime
  const subscribeRoom = (id: string) => {
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel(`duel-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'duels', filter: `id=eq.${id}`,
      }, ({ new: d }) => setDuel(d as Duel))
      .subscribe()
  }

  // Fallback poll while host waits for guest
  useEffect(() => {
    if (phase !== 'waiting' || !duel) return
    const t = setInterval(async () => {
      const { data } = await supabase.from('duels').select('*').eq('id', duel.id).single()
      if (data?.guest_id) setDuel(data)
    }, 2000)
    return () => clearInterval(t)
  }, [phase, duel?.id])

  // React to duel state changes
  useEffect(() => {
    if (!duel) return
    if (phaseRef.current === 'waiting' && duel.guest_id) {
      setProblems(buildProblems(duel.grade, duel.seed))
      setCountdown(3)
      setPhase('countdown')
    }
    if (phaseRef.current === 'playing') {
      setOppScore(isHostRef.current ? duel.guest_score : duel.host_score)
    }
  }, [duel])

  // Countdown tick
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { setPhase('playing'); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setPhase('done'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase])

  // Save XP on finish
  useEffect(() => {
    if (phase !== 'done' || myScore === 0 || !myId) return
    const save = async () => {
      const xp = myScore * 3
      const { data } = await supabase.from('profiles').select('xp').eq('id', myId).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', myId)
    }
    save()
  }, [phase])

  const createRoom = async () => {
    if (!myId) return
    const code = genCode()
    const seed = Math.floor(Math.random() * 999999) + 1
    const { data, error } = await supabase.from('duels').insert({
      id: code, host_id: myId, host_name: myName,
      grade: myGrade, seed, host_score: 0, guest_score: 0,
    }).select().single()
    if (error || !data) return
    setDuel(data)
    setIsHost(true)
    setPhase('waiting')
    subscribeRoom(code)
  }

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 4) { setJoinError('Введи 4 символа'); return }
    const { data, error } = await supabase.from('duels')
      .update({ guest_id: myId, guest_name: myName })
      .eq('id', code)
      .is('guest_id', null)
      .select().single()
    if (error || !data) { setJoinError('Комната не найдена или уже занята'); return }
    setDuel(data)
    setIsHost(false)
    subscribeRoom(code)
    setProblems(buildProblems(data.grade, data.seed))
    setCountdown(3)
    setPhase('countdown')
  }

  const pick = async (opt: string) => {
    if (picked !== null || phase !== 'playing' || !duel) return
    const prob = problems[probIdx]
    if (!prob) return
    const isRight = opt === String(prob.answer)
    setPicked(opt)
    if (isRight) { playCorrect() } else { playWrong() }

    if (isRight) {
      const newScore = myScoreRef.current + 1
      setMyScore(newScore)
      const field = isHostRef.current ? 'host_score' : 'guest_score'
      await supabase.from('duels').update({ [field]: newScore }).eq('id', duel.id)
    }
    setTimeout(() => { setPicked(null); setProbIdx(i => i + 1) }, isRight ? 220 : 380)
  }

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#F5F4F0' }}>
      <button onClick={() => router.push('/')}
        className="absolute top-5 left-4 w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold text-sm">✕</button>
      <div className="text-7xl mb-4">⚔️</div>
      <h1 className="text-3xl font-black text-gray-900 mb-2">1v1 Дуэль</h1>
      <p className="text-gray-400 text-sm mb-10 text-center">Сразись с другом — кто решит больше за 60 секунд</p>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={createRoom}
          className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-lg active:scale-95 transition-all">
          Создать игру
        </button>
        <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col gap-3">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Войти по коду</p>
          <input value={joinCode}
            onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError('') }}
            maxLength={4} placeholder="XXXX"
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-center text-3xl font-black tracking-widest text-gray-900 focus:border-gray-400 outline-none uppercase" />
          {joinError && <p className="text-red-500 text-xs font-semibold">{joinError}</p>}
          <button onClick={joinRoom}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-base active:scale-95 transition-all">
            Войти →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (phase === 'waiting') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#F5F4F0' }}>
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Жди соперника</h2>
      <p className="text-gray-400 text-sm mb-8">Поделись кодом с другом</p>
      <div className="bg-white rounded-3xl px-8 py-6 shadow-sm mb-8">
        <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Код комнаты</p>
        <p className="text-6xl font-black text-gray-900 tracking-widest">{duel?.id}</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  // ── Countdown ────────────────────────────────────────────────────────────
  if (phase === 'countdown') return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F5F4F0' }}>
      <p className="text-gray-500 text-lg mb-6 font-semibold">
        {countdown === 3 ? 'Соперник найден! Готовься...' : 'Поехали!'}
      </p>
      <div className="text-[9rem] font-black text-gray-900 leading-none tabular-nums">{countdown > 0 ? countdown : '🏁'}</div>
    </div>
  )

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const iWon = myScore > oppScore
    const tied = myScore === oppScore
    const oppName = isHost ? duel?.guest_name : duel?.host_name
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#F5F4F0' }}>
        <div className="text-7xl mb-4">{tied ? '🤝' : iWon ? '🏆' : '💪'}</div>
        <h2 className="text-3xl font-black text-gray-900 mb-1">
          {tied ? 'Ничья!' : iWon ? 'Ты победил!' : 'Соперник победил'}
        </h2>
        <p className="text-gray-400 mb-8">против {oppName ?? 'соперника'}</p>
        <div className="bg-white rounded-3xl px-6 py-5 shadow-sm w-full max-w-xs mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-500 font-semibold text-sm">Ты</span>
            <span className="font-black text-gray-900 text-2xl">{myScore}</span>
          </div>
          <div className="h-px bg-gray-100 mb-3" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-semibold text-sm">{oppName ?? 'Соперник'}</span>
            <span className="font-black text-gray-900 text-2xl">{oppScore}</span>
          </div>
        </div>
        {myScore > 0 && (
          <div className="bg-amber-400 rounded-2xl px-6 py-3 w-full max-w-xs mb-8">
            <p className="font-black text-gray-900 text-xl">+{myScore * 3} XP</p>
          </div>
        )}
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/')}
            className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold active:scale-95">
            На главную
          </button>
          <button onClick={() => { setPhase('lobby'); setMyScore(0); setOppScore(0); setProbIdx(0); setTimeLeft(60); setDuel(null); setJoinCode('') }}
            className="flex-1 py-3.5 rounded-2xl bg-gray-900 text-white font-bold active:scale-95">
            Ещё раз →
          </button>
        </div>
      </div>
    )
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  const prob = problems[probIdx]
  const correctAns = String(prob?.answer ?? '')
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f97316' : '#22c55e'
  const oppName = isHost ? duel?.guest_name : duel?.host_name

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F4F0' }}>
      {/* Score bar */}
      <header className="px-4 pt-5 pb-3">
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ты</p>
            <p className="text-3xl font-black text-emerald-500">{myScore}</p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-white transition-colors duration-500"
            style={{ backgroundColor: timerColor }}>
            {timeLeft}
          </div>
          <div className="flex-1 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{oppName ?? '...'}</p>
            <p className="text-3xl font-black text-red-400">{oppScore}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4">
        {/* Problem */}
        <div className="bg-white rounded-3xl px-5 py-6 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-4 text-center">РЕШИ ПРИМЕР</p>
          <div className="text-5xl font-black text-center leading-none tracking-tight py-2">
            {prob?.expr.split(/(\s*[+\-−×÷]\s*)/).map((p, i) => {
              const t = p.trim()
              const isOp = /^[+\-−×÷]$/.test(t)
              return <span key={i} className={isOp ? 'text-orange-500 mx-1' : 'text-gray-900'}>{t === '-' ? '−' : p}</span>
            })}
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {prob?.options.map(opt => {
            const isSel = picked === opt
            const isRight = opt === correctAns
            let cls = 'bg-white border-2 border-gray-200 text-gray-800 shadow-sm'
            if (isSel && isRight) cls = 'bg-emerald-400 border-emerald-400 text-white'
            else if (isSel && !isRight) cls = 'bg-red-400 border-red-400 text-white'
            else if (picked && isRight) cls = 'bg-emerald-100 border-emerald-400 text-emerald-800'
            return (
              <button key={opt} onClick={() => { playTap(); pick(opt) }}
                className={`${cls} rounded-2xl py-6 text-2xl font-black transition-all active:scale-95`}>
                {opt}
              </button>
            )
          })}
        </div>
      </main>

      {/* Timer bar */}
      <div className="h-1.5 mx-4 mb-6 mt-4 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: timerColor }} />
      </div>
    </div>
  )
}
