'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ALL_LESSONS, SUBJECTS, subjectLabel, subjectDesc } from '@/lib/lessons'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { Flame, Zap, Play, ChevronRight, Check, Target, UserPlus } from 'lucide-react'
import { GAME_ICONS, SUBJECT_ICONS } from '@/components/GameIcons'
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

type Profile = { name: string; grade: number; xp: number; streak: number; language?: string; avatar_url?: string | null }

const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
function avatarColor(name: string) {
  const l = name?.[0]?.toUpperCase() ?? 'A'
  return AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]
}

type L3 = { kk: string; ru: string; en: string }
const ACTIVITIES: { icon: string; name: L3; sub: L3; color: string; border: string; path: string }[] = [
  { icon: '⚡', name: { kk: 'Жылдам ойын', ru: 'Быстрый счёт', en: 'Quick math' }, sub: { kk: '× ÷ жылдамдық', ru: '× ÷ на скорость', en: '× ÷ speed' }, color: '#FFF3E0', border: '#FFD59E', path: '/game/quick' },
  { icon: '⚔️', name: { kk: '1v1 Дуэль', ru: '1v1 Дуэль', en: '1v1 Duel' }, sub: { kk: 'Достарыңмен', ru: 'С друзьями', en: 'With friends' }, color: '#FFE8ED', border: '#FFC4CF', path: '/game/duel' },
  { icon: '🐍', name: { kk: 'Сандық жылан', ru: 'Змейка', en: 'Snake' }, sub: { kk: 'Сандарды жина', ru: 'Собери числа', en: 'Collect numbers' }, color: '#E8F5F0', border: '#A8DFCA', path: '/game/snake' },
  { icon: '🔢', name: { kk: '2048', ru: '2048', en: '2048' }, sub: { kk: 'Сандарды біріктір', ru: 'Объединяй числа', en: 'Merge numbers' }, color: '#FFF8E0', border: '#FFE08A', path: '/game/2048' },
  { icon: '🔴', name: { kk: 'Дойбы', ru: 'Шашки', en: 'Checkers' }, sub: { kk: 'Орыс дойбысы', ru: 'Русские шашки', en: 'Russian checkers' }, color: '#F3E9E2', border: '#D9B89E', path: '/game/checkers' },
  { icon: '🧩', name: { kk: 'Судоку', ru: 'Судоку', en: 'Sudoku' }, sub: { kk: 'Логикалық', ru: 'Логика', en: 'Logic' }, color: '#EDE7FB', border: '#C9B8F0', path: '/game/sudoku' },
  { icon: '🕐', name: { kk: 'Сағат', ru: 'Часы', en: 'Clock' }, sub: { kk: 'Уақытты тану', ru: 'Определяй время', en: 'Tell the time' }, color: '#E0F5F3', border: '#A8E0DA', path: '/game/clock' },
  { icon: '⭕', name: { kk: 'Айқыш-дөңгелек', ru: 'Крестики-нолики', en: 'Tic-Tac-Toe' }, sub: { kk: 'Үшеуін қатарға', ru: 'Три в ряд', en: 'Three in a row' }, color: '#E7F0FB', border: '#A9CBF0', path: '/game/tictactoe' },
  { icon: '🎯', name: { kk: 'Рефлекс', ru: 'Реакция', en: 'Reflex' }, sub: { kk: 'Ұшқыш сынағы', ru: 'Тест пилота', en: 'Pilot test' }, color: '#FDE7EF', border: '#F6B6CE', path: '/game/reflex' },
  { icon: '🎵', name: { kk: 'Саймон', ru: 'Саймон', en: 'Simon' }, sub: { kk: 'Түстерді қайтала', ru: 'Повтори цвета', en: 'Repeat colors' }, color: '#EDE7FB', border: '#C9B8F0', path: '/game/simon' },
  { icon: '🪨', name: { kk: 'Тоғыз құмалақ', ru: 'Тоғыз құмалақ', en: 'Togyz Kumalak' }, sub: { kk: 'Ұлттық ойын', ru: 'Нац. игра', en: 'National game' }, color: '#F5E9D8', border: '#D9B98A', path: '/game/togyz' },
  { icon: '🌍', name: { kk: 'Елдер', ru: 'Страны', en: 'Countries' }, sub: { kk: 'Бұрынғы КСРО елдері', ru: 'Постсоветские страны', en: 'Post-Soviet countries' }, color: '#E7F0FB', border: '#A9CBF0', path: '/game/countries' },
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

const DAILY_TASKS: { id: string; label: L3; sub: L3; xp: number }[] = [
  { id: 'lesson', label: { kk: 'Бір сабақты аяқта', ru: 'Пройди урок', en: 'Finish a lesson' }, sub: { kk: '≈ 8 мин', ru: '≈ 8 мин', en: '≈ 8 min' }, xp: 10 },
  { id: 'words',  label: { kk: '5 жаңа сөзді үйрен', ru: 'Выучи 5 слов', en: 'Learn 5 words' }, sub: { kk: 'Қазақ тілі', ru: 'Казахский', en: 'Kazakh' }, xp: 15 },
  { id: 'game',   label: { kk: 'Жылдам ойынды өт', ru: 'Сыграй в быстрый счёт', en: 'Play quick math' }, sub: { kk: '60 секунд', ru: '60 секунд', en: '60 seconds' }, xp: 20 },
  { id: 'duel',   label: { kk: 'Достарыңмен ойна', ru: 'Сыграй 1v1', en: 'Play 1v1' }, sub: { kk: '1v1 дуэль', ru: '1v1 дуэль', en: '1v1 duel' }, xp: 25 },
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
  const gamesRef = useRef<HTMLDivElement>(null)
  const [gameDot, setGameDot] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const weekStart = getWeekStart()
      const today = new Date()

      const [{ data: profileData }, { data: progress }, { data: weekProgress }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language, avatar_url').eq('id', user.id).single(),
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
  const isGuest = user?.is_anonymous ?? false
  const weekMonday = getWeekStart()
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i); return d.getDate() })

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-60 lg:pt-8" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between max-w-lg lg:max-w-2xl mx-auto">
        <p className="font-display font-black text-foreground text-lg leading-tight">{t('hello', lang)} {profile?.name}!</p>
        <div className="flex items-center gap-2">
          {/* Streak */}
          <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
            <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
            <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
          </div>
          {/* XP */}
          <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--xp) 18%, var(--card))' }}>
            <Zap size={16} fill="currentColor" style={{ color: 'var(--xp)' }} />
            <span className="font-black text-xs tabular" style={{ color: 'var(--xp)' }}>{xp}</span>
          </div>
          <button onClick={async () => {
              const order: ('kk' | 'ru' | 'en')[] = ['kk', 'ru', 'en']
              const next = order[(order.indexOf(lang) + 1) % 3]
              saveLang(next)
              const { data: { user } } = await supabase.auth.getUser()
              if (user) await supabase.from('profiles').update({ language: next }).eq('id', user.id)
            }} aria-label="Тіл / Язык"
            className="w-8 h-8 rounded-full flex items-center justify-center text-base bg-card shadow-[var(--shadow-sm)]">
            {lang === 'kk' ? '🇰🇿' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
          </button>
          {profile?.avatar_url ? (
            <button onClick={() => router.push('/profile')} aria-label="Профиль" className="shrink-0 rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt={profile.name}
                className="w-8 h-8 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 3px color-mix(in oklch, ${avatarColor(profile?.name ?? 'A')} 22%, transparent)` }} />
            </button>
          ) : (
            <button onClick={() => router.push('/profile')} aria-label="Профиль"
              className="w-8 h-8 rounded-full flex items-center justify-center font-display font-black text-white text-xs shrink-0"
              style={{ background: avatarColor(profile?.name ?? 'A'), boxShadow: `0 0 0 3px color-mix(in oklch, ${avatarColor(profile?.name ?? 'A')} 22%, transparent)` }}>
              {profile?.name?.[0]?.toUpperCase() ?? '?'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 flex flex-col gap-4">

        {/* ── Guest banner ── */}
        {isGuest && (
          <div className="rounded-[var(--radius-lg)] p-4 flex items-center gap-3 animate-mk-pop-in"
            style={{ background: 'color-mix(in oklch, var(--warning) 14%, var(--card))' }}>
            <p className="flex-1 text-xs font-semibold leading-snug text-foreground/80">
              {t('guest_banner', lang)}
            </p>
            <button onClick={() => router.push('/login')}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] text-white font-display font-black text-xs active:scale-95 transition-transform"
              style={{ background: 'var(--primary)' }}>
              <UserPlus size={14} /> {t('reg_heading', lang)}
            </button>
          </div>
        )}

        {/* ── Weekly streak ── */}
        <div className="bg-card rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-sm)] animate-mk-pop-in">
          <div className="flex items-center justify-between">
            {days.map((d, i) => {
              const done = weekDays[i]
              const isToday = i === ti
              const future = i > ti
              return (
                <div key={i} className={`flex flex-col items-center gap-1 ${future ? 'opacity-40' : ''}`}>
                  <span className="text-[10px] font-bold text-muted-foreground">{d}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isToday ? 'animate-pulse' : ''}`}
                    style={{
                      background: done ? 'var(--gradient-gold)' : 'var(--muted)',
                      boxShadow: isToday ? '0 0 0 3px color-mix(in oklch, var(--primary) 45%, transparent)' : 'none',
                    }}>
                    <Flame size={15} className={done ? 'text-white' : 'text-muted-foreground'} fill={done ? 'currentColor' : 'none'} />
                  </div>
                  <span className={`text-[9px] tabular ${isToday ? 'font-black' : 'text-muted-foreground/70'}`}
                    style={isToday ? { color: 'var(--primary)' } : undefined}>{weekDates[i]}</span>
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
                <span className="text-white/55 text-[10px] font-black tracking-widest uppercase">{t('day_lesson', lang)}</span>
                <span className="text-white/55 text-[10px] font-black tracking-widest uppercase">
                  {nextSubject ? subjectLabel(nextSubject, lang) : nextLesson.subjectId.toUpperCase()}
                </span>
              </div>

              <h2 className="text-white text-xl font-display font-black leading-tight mb-1">
                {nextLesson.titleByLang[lang] ?? nextLesson.titleByLang.ru}
              </h2>
              <p className="text-white/65 text-xs mb-4">{nextLesson.subtitle ?? t('hero_default', lang)}</p>

              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${lessonPct}%` }} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/65 text-xs font-bold tabular">{lessonProgress.done} / {lessonProgress.total} {t('lesson_unit', lang)}</span>
                <span className="text-white text-xs font-black tabular flex items-center gap-1">
                  <Zap size={13} fill="currentColor" style={{ color: 'var(--accent)' }} /> +{15 + nextLesson.questions.length * 5} XP
                </span>
              </div>

              <button onClick={() => router.push(`/lesson/${nextLesson.id}`)}
                className="w-full bg-white rounded-[var(--radius)] py-3.5 flex items-center justify-center gap-2 font-display font-black text-sm active:translate-y-[2px] transition-transform"
                style={{ color: 'var(--primary)', boxShadow: '0 4px 0 color-mix(in oklch, var(--primary) 18%, white)' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--primary)' }}>
                  <Play size={13} className="text-white ml-0.5" fill="currentColor" />
                </span>
                {t('continue_lesson', lang)}
              </button>
            </div>
          </div>
        )}

        {/* ── Daily quests ── */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden animate-mk-pop-in" style={{ animationDelay: '80ms' }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/50">
            <h3 className="text-foreground text-sm">{t('daily_title', lang)}</h3>
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
                    <p className={`text-sm font-bold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.label[lang]}</p>
                    <p className="text-xs text-muted-foreground">{task.sub[lang]}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 tabular flex items-center gap-0.5"
                    style={{ background: 'color-mix(in oklch, var(--xp) 18%, var(--card))', color: 'var(--xp)' }}>
                    <Zap size={10} fill="currentColor" /> +{task.xp}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Trainers CTA ── */}
        <button onClick={() => router.push('/train')}
          className="animate-mk-pop-in rounded-[var(--radius-lg)] p-4 flex items-center gap-4 text-left shadow-[var(--shadow-md)] active:translate-y-[-2px] transition-transform"
          style={{ background: 'var(--gradient-hero)', animationDelay: '100ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Target size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-white text-base leading-tight">{t('train_title', lang)}</p>
            <p className="text-white/70 text-xs">{t('train_subtitle', lang)}</p>
          </div>
          <ChevronRight size={20} className="text-white/80 shrink-0" />
        </button>

        {/* ── Games & activities ── */}
        <div className="animate-mk-pop-in" style={{ animationDelay: '120ms' }}>
          <p className="text-xs font-black text-muted-foreground tracking-widest uppercase mb-2">{t('games_title', lang)}</p>
          <div ref={gamesRef}
            onScroll={e => { const el = e.currentTarget; setGameDot(Math.round(el.scrollLeft / (el.scrollWidth / ACTIVITIES.length))) }}
            className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:snap-none" style={{ scrollbarWidth: 'none' }}>
            {ACTIVITIES.map(act => {
              const custom = GAME_ICONS[act.path]
              const accent = custom?.color ?? act.border
              return (
              <button key={act.path} onClick={() => router.push(act.path)}
                className="shrink-0 w-36 lg:w-auto snap-start rounded-[var(--radius)] p-3.5 flex flex-col gap-2 text-left border-2 active:translate-y-[-2px] transition-transform"
                style={{ background: `color-mix(in oklch, ${accent} 12%, var(--card))`, borderColor: `color-mix(in oklch, ${accent} 28%, var(--card))` }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in oklch, ${accent} 22%, transparent)`, color: accent }}>
                  {custom ? <custom.Comp size={26} /> : <span className="text-xl">{act.icon}</span>}
                </span>
                <div>
                  <p className="font-display font-black text-foreground text-xs leading-tight">{act.name[lang]}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{act.sub[lang]}</p>
                </div>
                <span className="text-[11px] font-black flex items-center gap-0.5 self-start" style={{ color: accent }}>
                  {t('play_label', lang)} <ChevronRight size={13} />
                </span>
              </button>
              )
            })}
          </div>
          {/* dots indicator (mobile only) */}
          <div className="flex justify-center gap-1.5 mt-2 lg:hidden">
            {ACTIVITIES.map((_, i) => (
              <span key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === gameDot ? 16 : 6, background: i === gameDot ? 'var(--primary)' : 'var(--border)' }} />
            ))}
          </div>
        </div>

        {/* ── Subjects ── */}
        <div className="animate-mk-pop-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-muted-foreground tracking-widest uppercase">{t('subjects_title', lang)}</p>
            <button onClick={() => router.push('/lessons')} className="text-xs font-black flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
              {t('see_all', lang)} <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subjectList.map(subj => (
              <button key={subj.id} onClick={() => router.push(`/lessons?subject=${subj.id}`)}
                className="bg-card rounded-[var(--radius)] p-3.5 flex flex-col gap-2 text-left shadow-[var(--shadow-sm)] active:translate-y-[-2px] transition-transform border border-transparent">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: subj.bg }}>
                  {SUBJECT_ICONS[subj.id]
                    ? (() => { const I = SUBJECT_ICONS[subj.id]; return <span style={{ color: I.color }}><I.Comp size={24} /></span> })()
                    : subj.emoji}
                </div>
                <div>
                  <p className="font-display font-black text-foreground text-sm">{subjectLabel(subj, lang)}</p>
                  <p className="text-muted-foreground text-[10px]">{subjectDesc(subj, lang)}</p>
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
