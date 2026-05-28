'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type Profile = {
  name: string
  grade: number
  xp: number
  streak: number
}

const SUBJECTS = [
  { id: 'math',    emoji: '🔢', label: 'Математика', color: '#22C55E', bg: '#F0FDF4' },
  { id: 'kazakh',  emoji: '🇰🇿', label: 'Қазақша',   color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'russian', emoji: '📖', label: 'Русский',    color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'world',   emoji: '🌍', label: 'Дүниетану', color: '#8B5CF6', bg: '#F5F3FF' },
]

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, grade, xp, streak')
        .eq('id', user.id)
        .single()

      if (!profile?.grade) { router.push('/setup'); return }
      setProfile(profile)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xl font-bold text-emerald-600">iМектеп</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">🔥 {profile?.streak ?? 0}</span>
          <span className="text-sm font-semibold text-amber-500">⭐ {profile?.xp ?? 0} XP</span>
          <button onClick={() => router.push('/profile')}
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm"
            style={{ background: (() => {
              const colors = ['#22C55E','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#EC4899']
              const l = profile?.name?.[0]?.toUpperCase() ?? 'A'
              return colors[l.charCodeAt(0) % colors.length]
            })() }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4">
        {/* Greeting */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-xl shrink-0"
            style={{ background: (() => {
              const colors = ['#22C55E','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#EC4899']
              const l = profile?.name?.[0]?.toUpperCase() ?? 'A'
              return colors[l.charCodeAt(0) % colors.length]
            })() }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-gray-500 text-sm">Привет,</p>
            <p className="font-bold text-gray-800">{profile?.name} · {profile?.grade} класс</p>
          </div>
        </div>

        {/* Quick actions */}
        <button
          onClick={() => router.push('/lessons')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-95"
        >
          <span className="text-3xl">📚</span>
          <div className="text-left">
            <p className="font-bold text-base">Уроки</p>
            <p className="text-xs opacity-80">{profile?.grade} класс · продолжить обучение</p>
          </div>
        </button>

        {/* Subjects */}
        <div>
          <h2 className="font-bold text-gray-700 mb-2">Предметы</h2>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                onClick={() => router.push(`/lessons?subject=${s.id}`)}
                className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-all active:scale-95 hover:shadow-sm"
                style={{ background: s.bg, borderColor: s.color + '30' }}
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="font-semibold text-gray-700 text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Games */}
        <div>
          <h2 className="font-bold text-gray-700 mb-2">Игры</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push('/game/quick')}
              className="bg-amber-400 text-white rounded-2xl p-4 flex flex-col gap-1 items-start transition-all active:scale-95">
              <span className="text-2xl">⚡</span>
              <span className="font-bold text-sm">Быстрый счёт</span>
              <span className="text-xs opacity-80">60 секунд</span>
            </button>
            <button onClick={() => router.push('/game/duel')}
              className="rounded-2xl border border-red-100 bg-red-50 p-4 flex flex-col gap-1 text-left transition-all active:scale-95">
              <span className="text-2xl">⚔️</span>
              <span className="font-bold text-gray-700 text-sm">1v1 Дуэль</span>
              <span className="text-xs text-red-400">Сразись с другом</span>
            </button>
            <button onClick={() => router.push('/game/snake')}
              className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 flex flex-col gap-1 text-left transition-all active:scale-95">
              <span className="text-2xl">🐍</span>
              <span className="font-bold text-gray-700 text-sm">Числовая змейка</span>
              <span className="text-xs text-emerald-500">Ешь по порядку</span>
            </button>
            <button onClick={() => router.push('/game/2048')}
              className="rounded-2xl border border-orange-100 bg-orange-50 p-4 flex flex-col gap-1 text-left transition-all active:scale-95">
              <span className="text-2xl">🔢</span>
              <span className="font-bold text-gray-700 text-sm">2048</span>
              <span className="text-xs text-orange-400">Свайп и думай</span>
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        <button onClick={() => router.push('/leaderboard')}
          className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-purple-50 p-4 transition-all active:scale-95">
          <span className="text-2xl">🏆</span>
          <div className="text-left">
            <p className="font-bold text-gray-700 text-sm">Лидерборд</p>
            <p className="text-xs text-purple-400">Топ игроков по XP</p>
          </div>
        </button>
      </main>
    </div>
  )
}
