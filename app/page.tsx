'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ALL_LESSONS, SUBJECTS } from '@/lib/lessons'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { Flame, Zap, Play, ChevronRight, Check } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// Kazakh "qośqar-muyiz" style ornament for the hero corner
function HeroOrnament() {
  return (
    <svg className="absolute -top-2 -right-2 w-44 h-44 pointer-events-none" viewBox="0 0 100 100"
      fill="none" style={{ opacity: 0.12 }} aria-hidden>
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <path d="M66 18c16 4 16 26 0 31c-11 3-13-9-4-12" />
        <path d="M84 34c16 4 16 26 0 31c-11 3-13-9-4-12" />
        <path d="M50 14q12-6 22 3" />
        <circle cx="80" cy="82" r="3.5" />
        <circle cx="58" cy="40" r="2" />
      </g>
    </svg>
  )
}

const WEEKDAYS: Record<string, string[]> = {
  kk: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
}
const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

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
  { icon: '🔴', name: 'Дойбы',          sub: 'Орыс дойбысы',            color: '#F3E9E2', border: '#D9B89E', path: '/game/checkers' },
  { icon: '🧩', name: 'Судоку',         sub: 'Логикалық басқатырғыш',   color: '#EDE7FB', border: '#C9B8F0', path: '/game/sudoku' },
  { icon: '🪨', name: 'Тоғыз құмалақ',  sub: 'Ұлттық ойын',             color: '#F5E9D8', border: '#D9B98A', path: '/game/togyz' },
  { icon: '🌍', name: 'Елдер',          sub: 'ТМД елдері',              color: '#E7F0FB', border: '#A9CBF0', path: '/game/countries' },
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
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

  const days = WEEKDAYS[lang] ?? WEEKDAYS.kk
  const ti = todayIdx()

  return (
    <div className="min-h-screen pb-24 lg:pb-10 lg:pl-60 lg:pt-8" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between max-w-lg lg:max-w-2xl mx-auto">
        <p className="font-display font-black text-foreground text-lg leading-tight">{t('hello', lang)} {profile?.name}!</p>
        <div className="flex items-center gap-2">
          {/* Streak */}
          <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 14%, white)' }}>
            <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
            <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
          </div>
          {/* XP */}
          <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--xp) 16%, white)' }}>
            <Zap size={16} fill="currentColor" style={{ color: 'var(--xp)' }} />
            <span className="font-black text-xs tabular" style={{ color: 'var(--xp)' }}>{xp}</span>
          </div>
          <button onClick={() => router.push('/setup')} aria-label="Тіл / Язык"
            className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-white shadow-sm">
            🇰🇿
          </button>
          <button onClick={() => router.push('/profile')} aria-label="Профиль"
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow-sm"
            style={{ background: avatarColor(profile?.name ?? 'A') }}>
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 flex flex-col gap-4">

        {/* ── Weekly streak ── */}
        <div className="bg-card rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-sm)] animate-mk-pop-in">
          <div className="flex items-center justify-between">
            {days.map((d, i) => {
              const done = weekDays[i]
              const isToday = i === ti
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">{d}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: done ? 'var(--gradient-gold)' : 'var(--muted)',
                      boxShadow: isToday ? '0 0 0 3px color-mix(in oklch, var(--primary) 35%, transparent)' : 'none',
                    }}>
                    <Flame size={15} className={done ? 'text-white' : 'text-muted-foreground'} fill={done ? 'currentColor' : 'none'} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Daily lesson hero (Kazakh blue + ornament) ── */}
        {nextLesson && (
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)] animate-mk-pop-in"
            style={{ background: 'var(--gradient-hero)', animationDelay: '40ms' }}>
            <HeroOrnament />
            <div className="relative px-5 pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/55 text-[10px] font-black tracking-widest uppercase">КҮН САБАҒЫ</span>
                <span className="text-white/55 text-[10px] font-black tracking-widest uppercase">
                  {nextSubject?.labelKk ?? nextLesson.subjectId.toUpperCase()}
                </span>
              </div>

              <h2 className="text-white text-xl leading-tight mb-1">
                {nextLesson.titleByLang[lang] ?? nextLesson.titleByLang.ru}
              </h2>
              <p className="text-white/65 text-xs mb-4">{nextLesson.subtitle ?? 'Бүгінгі сабаққа уақыт бөл'}</p>

              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${lessonPct}%` }} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/65 text-xs font-bold tabular">{lessonProgress.done} / {lessonProgress.total} сабақ</span>
                <span className="text-white text-xs font-black tabular flex items-center gap-1">
                  <Zap size={13} fill="currentColor" style={{ color: 'var(--accent)' }} /> +{xp} XP
                </span>
              </div>

              <button onClick={() => router.push(`/lesson/${nextLesson.id}`)}
                className="w-full bg-white rounded-[var(--radius)] py-3.5 flex items-center justify-center gap-2 font-display font-black text-sm active:translate-y-[2px] transition-transform"
                style={{ color: 'var(--primary)', boxShadow: '0 4px 0 color-mix(in oklch, var(--primary) 18%, white)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}>
                  <Play size={13} className="text-white ml-0.5" fill="currentColor" />
                </span>
                Сабақты жалғастыру
              </button>
            </div>
          </div>
        )}

        {/* ── Daily quests ── */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden animate-mk-pop-in" style={{ animationDelay: '80ms' }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/50">
            <h3 className="text-foreground text-sm">Бүгінгі тапсырмалар</h3>
            <span className="text-xs font-black text-white px-2.5 py-0.5 rounded-full tabular" style={{ background: 'var(--primary)' }}>
              {dailyDoneCount}/4
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {DAILY_TASKS.map(task => {
              const done = dailyDone.has(task.id)
              return (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3 min-h-[56px]">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                    style={done
                      ? { background: 'var(--gradient-success)' }
                      : { border: '2px solid var(--border)' }}>
                    {done && <Check size={14} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.label}</p>
                    <p className="text-xs text-muted-foreground">{task.sub}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 tabular flex items-center gap-0.5"
                    style={{ background: 'color-mix(in oklch, var(--xp) 16%, white)', color: 'var(--xp)' }}>
                    <Zap size={10} fill="currentColor" /> +{task.xp}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Games & activities ── */}
        <div className="animate-mk-pop-in" style={{ animationDelay: '120ms' }}>
          <p className="text-xs font-black text-muted-foreground tracking-widest uppercase mb-2">Ойындар мен тапсырмалар</p>
          <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
            {ACTIVITIES.map(act => (
              <button key={act.path} onClick={() => router.push(act.path)}
                className="shrink-0 w-36 lg:w-auto rounded-[var(--radius)] p-3.5 flex flex-col gap-2 text-left border active:translate-y-[-2px] transition-transform"
                style={{ background: act.color, borderColor: act.border }}>
                <span className="text-2xl">{act.icon}</span>
                <div>
                  <p className="font-display font-black text-foreground text-xs leading-tight">{act.name}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{act.sub}</p>
                </div>
                <span className="text-[11px] font-black flex items-center gap-0.5 self-start" style={{ color: 'var(--primary)' }}>
                  Ойна <ChevronRight size={13} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Subjects ── */}
        <div className="animate-mk-pop-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-muted-foreground tracking-widest uppercase">Барлық пәндер</p>
            <button onClick={() => router.push('/lessons')} className="text-xs font-black flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
              Барлығын көру <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjectList.map(subj => (
              <button key={subj.id} onClick={() => router.push(`/lessons?subject=${subj.id}`)}
                className="bg-card rounded-[var(--radius)] p-3.5 flex flex-col gap-2 text-left shadow-[var(--shadow-sm)] active:translate-y-[-2px] transition-transform border border-transparent">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: subj.bg }}>
                  {subj.emoji}
                </div>
                <div>
                  <p className="font-display font-black text-foreground text-sm">{subj.labelKk}</p>
                  <p className="text-muted-foreground text-[10px]">{subj.descKk}</p>
                </div>
                <div className="flex items-center justify-end">
                  <ChevronRight size={15} style={{ color: 'var(--primary)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>

      </main>

      <BottomNav />
    </div>
  )
}
