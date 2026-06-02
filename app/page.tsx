'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ALL_LESSONS, SUBJECTS } from '@/lib/lessons'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { User } from '@supabase/supabase-js'

type Profile = { name: string; grade: number; xp: number; streak: number; language?: string }

const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
function avatarColor(name: string) {
  const l = name?.[0]?.toUpperCase() ?? 'A'
  return AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]
}

const ACTIVITIES = [
  { icon: '⚡', name: 'Жылдам ойын',   sub: '× ÷ жылдамдық',          color: '#FFF3E0', border: '#FFD59E', path: '/game/quick' },
  { icon: '⚔️', name: '1v1 Дуэль',     sub: 'Достарыңмен',             color: '#FFE8ED', border: '#FFC4CF', path: '/game/duel'  },
  { icon: '🐍', name: 'Сандық жылан',  sub: 'Сандарды жина',           color: '#E8F5F0', border: '#A8DFCA', path: '/game/snake' },
  { icon: '🔢', name: '2048',           sub: 'Бірдей сандарды біріктір', color: '#FFF8E0', border: '#FFE08A', path: '/game/2048'  },
]

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function todayKey() {
  const d = new Date()
  return `daily_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAILY_TASKS = [
  { id: 'lesson',  label: 'Бір сабақты аяқта',   sub: '≈ 8 мин',      xp: 10  },
  { id: 'words',   label: '5 жаңа сөзді үйрен',  sub: 'Қазақ тілі',   xp: 15  },
  { id: 'game',    label: 'Жылдам ойынды өт',    sub: '60 секунд',    xp: 20  },
  { id: 'duel',    label: 'Достарыңмен ойна',    sub: '1v1 дуэль',    xp: 25  },
]

export default function HomePage() {
  const [user, setUser]                   = useState<User | null>(null)
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [nextLessonId, setNextLessonId]   = useState<string | null>(null)
  const [completedToday, setCompletedToday] = useState(false)
  const [weekDays, setWeekDays]           = useState<boolean[]>(Array(7).fill(false))
  const [lessonProgress, setLessonProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [dailyDone, setDailyDone]         = useState<Set<string>>(new Set())
  const [loading, setLoading]             = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const weekStart = getWeekStart()
      const today = new Date()

      const [{ data: profileData }, { data: progress }, { data: weekProgress }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language').eq('id', user.id).single(),
        supabase.from('lesson_progress').select('lesson_id, stars').eq('user_id', user.id),
        supabase.from('lesson_progress').select('completed_at').eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString()),
      ])

      if (!profileData?.grade) { router.push('/setup'); return }
      if (profileData.language) saveLang(profileData.language as 'ru' | 'kk' | 'en')
      setProfile(profileData)

      // Next lesson to do
      const done = new Set(progress?.map((p: { lesson_id: string }) => p.lesson_id) ?? [])
      const next = ALL_LESSONS.find(l => l.grade.includes(profileData.grade) && !done.has(l.id))
      setNextLessonId(next?.id ?? ALL_LESSONS.find(l => l.grade.includes(profileData.grade))?.id ?? null)

      // Lesson progress counts
      const gradeTotal = ALL_LESSONS.filter(l => l.grade.includes(profileData.grade))
      const gradeDone  = gradeTotal.filter(l => done.has(l.id))
      setLessonProgress({ done: gradeDone.length, total: gradeTotal.length })

      // Week progress — one bubble per day Mon..Sun
      const completedDays = Array(7).fill(false)
      const todayBool = weekProgress?.some((p: { completed_at: string }) => isSameDay(new Date(p.completed_at), today)) ?? false
      weekProgress?.forEach((p: { completed_at: string }) => {
        const d = new Date(p.completed_at)
        const dayIndex = (d.getDay() === 0 ? 6 : d.getDay() - 1) // Mon=0 ... Sun=6
        const weekDay = new Date(weekStart)
        weekDay.setDate(weekStart.getDate() + dayIndex)
        if (d >= weekStart) completedDays[dayIndex] = true
      })
      setWeekDays(completedDays)
      setCompletedToday(todayBool)

      // Daily tasks state from localStorage
      const key = todayKey()
      let stored: Record<string, boolean> = {}
      try { stored = JSON.parse(localStorage.getItem(key) ?? '{}') } catch { stored = {} }
      if (todayBool) stored['lesson'] = true
      const doneTasks = new Set(Object.keys(stored).filter(k => stored[k]))
      setDailyDone(doneTasks)

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EDE8F8' }}>
      <div className="w-8 h-8 border-4 border-[#7B5CBF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const nextLesson = ALL_LESSONS.find(l => l.id === nextLessonId)
  const nextSubject = nextLesson ? SUBJECTS.find(s => s.id === nextLesson.subjectId) : null
  const lessonPct = lessonProgress.total > 0
    ? Math.round((lessonProgress.done / lessonProgress.total) * 100)
    : 0

  const dailyDoneCount = DAILY_TASKS.filter(t => dailyDone.has(t.id)).length
  const weekDoneCount  = weekDays.filter(Boolean).length

  // Top 2 subjects for the subjects section
  const subjectList = SUBJECTS.filter(s => s.id !== 'russian')

  return (
    <div className="min-h-screen pb-24 lg:pb-10 lg:pl-60 lg:pt-8" style={{ background: '#EDE8F8' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between max-w-lg lg:max-w-2xl mx-auto">
        {/* Left: label + greeting */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#2A5E35]/10 rounded-full px-3 py-1.5">
            <span className="text-[#2A5E35] text-sm font-black">✦</span>
          </div>
          <p className="font-black text-[#1A1A2E] text-base leading-tight">{t('hello', lang)} {profile?.name}!</p>
        </div>
        {/* Right: streak, flag, avatar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: '#FF6B35' }}>
            <span className="text-sm">🔥</span>
            <span className="font-black text-white text-xs">{streak}</span>
          </div>
          <button onClick={() => router.push('/setup')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-white shadow-sm">
            🇰🇿
          </button>
          <button onClick={() => router.push('/profile')}
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow-sm"
            style={{ background: avatarColor(profile?.name ?? 'A') }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 flex flex-col gap-4">

        {/* ── Week progress ── */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
          <span className="text-xs font-black text-[#1A1A2E]/60">Апта барысы {weekDoneCount}/7</span>
          <div className="flex gap-1.5">
            {weekDays.map((done, i) => (
              <div key={i}
                className="w-6 h-2.5 rounded-full transition-all"
                style={{ background: done ? '#22C55E' : '#E5E7EB' }} />
            ))}
          </div>
        </div>

        {/* ── Daily lesson hero card ── */}
        {nextLesson && (
          <div className="rounded-3xl overflow-hidden shadow-md"
            style={{ background: 'linear-gradient(160deg, #2A5E35 0%, #1B3D22 100%)' }}>
            <div className="px-5 pt-5 pb-5">
              {/* Top labels */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/50 text-[10px] font-black tracking-widest uppercase">КҮН САБАҒЫ</span>
                <span className="text-white/50 text-[10px] font-black tracking-widest uppercase">
                  ЖАЛҒАСТЫР · {nextSubject?.labelKk ?? nextLesson.subjectId.toUpperCase()}
                </span>
              </div>

              {/* Title */}
              <p className="text-white font-black text-xl leading-tight mb-1">
                {nextLesson.titleByLang[lang] ?? nextLesson.titleByLang.ru}
              </p>
              <p className="text-white/60 text-xs mb-4">
                {nextLesson.subtitle ?? 'Бүгінгі сабаққа уақыт бөл'}
              </p>

              {/* Progress bar */}
              <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white/70 rounded-full"
                  style={{ width: `${lessonPct}%` }} />
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-xs font-bold">
                  {lessonProgress.done}-сабақ / {lessonProgress.total}
                </span>
                <span className="text-[#F5A623] text-xs font-black">+{xp} XP</span>
              </div>

              {/* CTA button */}
              <button
                onClick={() => router.push(`/lesson/${nextLesson.id}`)}
                className="w-full bg-white rounded-2xl py-3 flex items-center justify-center gap-2 font-black text-[#1B3D22] text-sm active:scale-[0.98] transition-all shadow-sm">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  style={{ background: '#7B5CBF', color: 'white' }}>▶</span>
                Сабақты жалғастыру
              </button>
            </div>
          </div>
        )}

        {/* ── Daily tasks ── */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
            <span className="font-black text-[#1A1A2E] text-sm">Бүгінгі тапсырмалар</span>
            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: '#7B5CBF' }}>
              {dailyDoneCount}/4
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {DAILY_TASKS.map(task => {
              const done = dailyDone.has(task.id)
              return (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                  {/* Checkbox */}
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{ background: done ? '#22C55E' : 'transparent', border: done ? 'none' : '2px solid #E5E7EB' }}>
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-[#1A1A2E]'}`}>{task.label}</p>
                    <p className="text-xs text-[#6B7280]">{task.sub}</p>
                  </div>
                  {/* XP badge */}
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: '#FFF3E8', color: '#FF6B35' }}>
                    +{task.xp} XP
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Activities horizontal scroll ── */}
        <div>
          <p className="text-xs font-black text-[#1A1A2E]/50 tracking-widest uppercase mb-2">Ойындар мен тапсырмалар</p>
          <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
            {ACTIVITIES.map(act => (
              <button key={act.path}
                onClick={() => router.push(act.path)}
                className="shrink-0 w-36 lg:w-auto rounded-2xl p-3.5 flex flex-col gap-2 text-left border active:scale-[0.97] transition-all"
                style={{ background: act.color, borderColor: act.border }}>
                <span className="text-2xl">{act.icon}</span>
                <div>
                  <p className="font-black text-[#1A1A2E] text-xs leading-tight">{act.name}</p>
                  <p className="text-[#6B7280] text-[10px] mt-0.5">{act.sub}</p>
                </div>
                <span className="text-[10px] font-black rounded-full px-2.5 py-0.5 self-start"
                  style={{ background: '#7B5CBF', color: 'white' }}>
                  Ойна →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Subjects section ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-[#1A1A2E]/50 tracking-widest uppercase">Барлық пәндер</p>
            <button onClick={() => router.push('/lessons')}
              className="text-xs font-black text-[#7B5CBF]">
              Барлығын көру →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjectList.map(subj => {
              const subjectLessons = ALL_LESSONS.filter(l => l.subjectId === subj.id && l.grade.includes(profile?.grade ?? 2))
              const subjectDone = subjectLessons.filter(l => {
                // We don't have starsMap here, use next lesson logic
                return false
              }).length
              const subjectPct = 0 // simplified — full data is in lessons page
              return (
                <button key={subj.id}
                  onClick={() => router.push(`/lessons?subject=${subj.id}`)}
                  className="bg-white rounded-2xl p-3.5 flex flex-col gap-2 text-left shadow-sm active:scale-[0.97] transition-all border-2 border-transparent">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: subj.bg }}>
                    {subj.emoji}
                  </div>
                  {/* Name + desc */}
                  <div>
                    <p className="font-black text-[#1A1A2E] text-sm">{subj.labelKk}</p>
                    <p className="text-[#6B7280] text-[10px]">{subj.descKk}</p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${subjectPct}%`, background: subj.color }} />
                  </div>
                  {/* Arrow */}
                  <div className="flex items-center justify-end">
                    <span className="text-[10px] font-black text-[#7B5CBF]">→</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </main>

      <BottomNav />
    </div>
  )
}
