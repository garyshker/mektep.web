'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ALL_LESSONS } from '@/lib/lessons'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { User } from '@supabase/supabase-js'

type Profile = { name: string; grade: number; xp: number; streak: number }

const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
function avatarColor(name: string) {
  const l = name?.[0]?.toUpperCase() ?? 'A'
  return AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]
}

const GAMES = [
  { label: 'Быстрый счёт', icon: '⚡', path: '/game/quick', bg: '#FFF7ED', border: '#FED7AA', accent: '#F97316' },
  { label: '1v1 Дуэль',   icon: '⚔️', path: '/game/duel',  bg: '#FFF1F2', border: '#FECDD3', accent: '#F43F5E' },
  { label: 'Змейка',       icon: '🐍', path: '/game/snake', bg: '#F0FDF4', border: '#BBF7D0', accent: '#22C55E' },
  { label: '2048',         icon: '🔢', path: '/game/2048',  bg: '#FFF7ED', border: '#FDE68A', accent: '#EAB308' },
]

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [nextLessonId, setNextLessonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [{ data: profile }, { data: progress }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language').eq('id', user.id).single(),
        supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id),
      ])

      if (!profile?.grade) { router.push('/setup'); return }
      if (profile.language) saveLang(profile.language as 'ru' | 'kk' | 'en')
      setProfile(profile)

      const done = new Set(progress?.map((p: { lesson_id: string }) => p.lesson_id) ?? [])
      const next = ALL_LESSONS.find(l => l.grade.includes(profile.grade) && !done.has(l.id))
      setNextLessonId(next?.id ?? ALL_LESSONS.find(l => l.grade.includes(profile.grade))?.id ?? null)

      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const xp = profile?.xp ?? 0
  const level = Math.floor(Math.sqrt(xp / 10)) + 1
  const xpFloor = (level - 1) ** 2 * 10
  const xpCeil  = level ** 2 * 10
  const lvlPct  = Math.round(((xp - xpFloor) / (xpCeil - xpFloor)) * 100)
  const nextLesson = ALL_LESSONS.find(l => l.id === nextLessonId)

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-xl font-black text-[#58CC02]">iМектеп</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-50 rounded-full px-3 py-1.5">
            <span className="text-base">🔥</span>
            <span className="font-black text-orange-500 text-sm">{profile?.streak ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 rounded-full px-3 py-1.5">
            <span className="text-base">⭐</span>
            <span className="font-black text-yellow-600 text-sm">{xp}</span>
          </div>
          <button onClick={() => router.push('/profile')}
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
            style={{ background: avatarColor(profile?.name ?? 'A') }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 flex flex-col gap-4 pt-2">

        {/* Hero card */}
        <div className="rounded-3xl overflow-hidden shadow-sm"
          style={{ background: 'linear-gradient(135deg, #58CC02 0%, #3D9900 100%)' }}>
          <div className="px-5 pt-5 pb-4">
            <p className="text-white/80 text-sm font-semibold">{t('hello', lang)}</p>
            <p className="text-white font-black text-2xl leading-tight">{profile?.name}! 👋</p>
            <p className="text-white/70 text-xs mt-1">{profile?.grade} {t('grade', lang)} · {t('level', lang)} {level}</p>

            {/* XP level bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${lvlPct}%` }} />
              </div>
              <span className="text-white/80 text-[10px] font-bold whitespace-nowrap">{xp} / {xpCeil} XP</span>
            </div>
          </div>
        </div>

        {/* Continue learning */}
        {nextLesson && (
          <div>
            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-2">{t('continue_learn', lang)}</p>
            <button
              onClick={() => router.push(`/lesson/${nextLesson.id}`)}
              className="w-full bg-white rounded-3xl border-2 border-gray-100 p-4 flex items-center gap-4 text-left shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                {nextLesson.emoji ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm">{nextLesson.titleByLang[lang] ?? nextLesson.titleByLang.ru}</p>
                {nextLesson.subtitle && (
                  <p className="text-gray-400 text-xs mt-0.5">{nextLesson.subtitle}</p>
                )}
              </div>
              <div
                className="shrink-0 px-4 py-2 rounded-xl font-black text-white text-sm border-b-[3px] active:border-b-0 transition-none"
                style={{ background: '#58CC02', borderColor: '#45A800' }}>
                {t('start', lang)}
              </div>
            </button>
          </div>
        )}

        {/* Streak reminder */}
        {(profile?.streak ?? 0) > 0 && (
          <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <p className="font-bold text-orange-700 text-sm">
              {profile!.streak} {t('streak_remind', lang)}
            </p>
          </div>
        )}

        {/* Games */}
        <div>
          <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-2">{t('games', lang)}</p>
          <div className="grid grid-cols-2 gap-3">
            {GAMES.map(g => (
              <button
                key={g.path}
                onClick={() => router.push(g.path)}
                className="rounded-2xl p-4 flex flex-col gap-1 text-left border-2 active:scale-[0.97] transition-all"
                style={{ background: g.bg, borderColor: g.border }}>
                <span className="text-2xl">{g.icon}</span>
                <span className="font-bold text-gray-800 text-sm">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Go to lessons CTA */}
        <button
          onClick={() => router.push('/lessons')}
          className="w-full py-4 rounded-2xl font-black text-white text-base border-b-[4px] active:border-b-0 active:translate-y-[3px] transition-none"
          style={{ background: '#58CC02', borderColor: '#45A800' }}>
          {t('all_lessons', lang)}
        </button>

      </main>

      <BottomNav />
    </div>
  )
}
