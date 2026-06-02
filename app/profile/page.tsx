'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ALL_LESSONS } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { LangSwitch } from '@/components/LangSwitch'
import type { Lang } from '@/lib/i18n'

type Profile = {
  name: string
  grade: number
  xp: number
  streak: number
  language: string
}

type LessonProgress = {
  lesson_id: string
  stars: number
  xp_earned: number
}

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const letter = name?.[0]?.toUpperCase() ?? '?'
  const colors = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
  const color = colors[letter.charCodeAt(0) % colors.length]
  const dim = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-9 h-9 text-base'
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ background: color }}>
      {letter}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language').eq('id', user.id).single(),
        supabase.from('lesson_progress').select('lesson_id, stars, xp_earned').eq('user_id', user.id),
      ])

      if (prof) { setProfile(prof); if (prof.language) saveLang(prof.language as 'ru' | 'kk' | 'en') }
      if (prog) setProgress(prog)
      setLoading(false)
    }
    init()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const changeLang = async (l: Lang) => {
    setProfile(p => (p ? { ...p, language: l } : p))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ language: l }).eq('id', user.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F4F0' }}>
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  )

  const totalStars = progress.reduce((s, p) => s + (p.stars ?? 0), 0)
  const totalXP = profile?.xp ?? 0
  const completedCount = progress.length
  const totalLessons = ALL_LESSONS.filter(l => l.grade.includes(profile?.grade ?? 2)).length

  const LANG_LABELS: Record<string, string> = { ru: '🇷🇺 Русский', kk: '🇰🇿 Қазақша', en: '🇬🇧 English' }

  return (
    <div className="min-h-screen flex flex-col bg-white pb-24">

      {/* Header */}
      <header className="px-4 pt-5 pb-4 border-b-2 border-gray-50">
        <h1 className="font-black text-gray-900 text-xl">Профиль</h1>
      </header>

      <main className="flex-1 px-4 flex flex-col gap-4 pt-4 pb-6 max-w-lg mx-auto w-full">

        {/* Profile card */}
        <div className="bg-white rounded-3xl px-5 py-5 shadow-sm flex items-center gap-4">
          <Avatar name={profile?.name ?? '?'} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-xl leading-tight truncate">{profile?.name}</p>
            <p className="text-gray-400 text-sm mt-0.5">{profile?.grade} {t('grade', lang)} · {LANG_LABELS[profile?.language ?? 'ru']}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col items-center gap-1">
            <span className="text-2xl">⭐</span>
            <span className="font-black text-gray-900 text-xl">{totalXP}</span>
            <span className="text-[11px] text-gray-400 font-semibold">XP</span>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col items-center gap-1">
            <span className="text-2xl">🔥</span>
            <span className="font-black text-gray-900 text-xl">{profile?.streak ?? 0}</span>
            <span className="text-[11px] text-gray-400 font-semibold">{t('days_streak', lang)}</span>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col items-center gap-1">
            <span className="text-2xl">✅</span>
            <span className="font-black text-gray-900 text-xl">{completedCount}/{totalLessons}</span>
            <span className="text-[11px] text-gray-400 font-semibold">{t('lessons_count', lang)}</span>
          </div>
        </div>

        {/* Stars row */}
        {totalStars > 0 && (
          <div className="bg-amber-400 rounded-3xl px-5 py-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="font-black text-gray-900 text-lg">{'⭐'.repeat(Math.min(totalStars, 5))}</p>
              <p className="text-gray-800 text-sm font-semibold mt-0.5">{t('stars_earned', lang)} {totalStars}</p>
            </div>
            <span className="text-4xl">🏆</span>
          </div>
        )}

        {/* Completed lessons */}
        {progress.length > 0 && (
          <div className="bg-white rounded-3xl px-5 py-4 shadow-sm">
            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">{t('completed_lessons', lang)}</p>
            <div className="flex flex-col gap-3">
              {progress.map(p => {
                const lesson = ALL_LESSONS.find(l => l.id === p.lesson_id)
                if (!lesson) return null
                return (
                  <button
                    key={p.lesson_id}
                    onClick={() => router.push(`/lesson/${p.lesson_id}`)}
                    className="flex items-center gap-3 active:opacity-70 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0">
                      {lesson.emoji ?? '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</p>
                      <p className="text-xs text-gray-400">+{p.xp_earned} XP</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`text-sm ${s <= p.stars ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Language */}
        <div className="bg-white rounded-3xl shadow-sm px-5 py-4 flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <span className="font-semibold text-gray-800 text-sm flex-1">{t('setup_language', lang)}</span>
          <LangSwitch className="!shadow-none !bg-gray-50" onChange={changeLang} />
        </div>

        {/* Actions */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <button
            onClick={() => router.push('/setup')}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100 active:bg-gray-50 transition-colors">
            <span className="text-xl">✏️</span>
            <span className="font-semibold text-gray-800 text-sm flex-1 text-left">{t('edit_profile', lang)}</span>
            <span className="text-gray-300">›</span>
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-5 py-4 active:bg-gray-50 transition-colors">
            <span className="text-xl">🚪</span>
            <span className="font-semibold text-red-500 text-sm flex-1 text-left">{t('sign_out', lang)}</span>
            <span className="text-gray-300">›</span>
          </button>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}
