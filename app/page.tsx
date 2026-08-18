'use client'

// Home. Redesigned around ONE big action: today's lesson. Everything else is
// deliberately quieter — the old screen stacked six blocks of equal weight and
// painted two of them (hero + trainers) with the same gradient, so nothing read
// as "start here". Games and subjects moved to their own screens (/game,
// /lessons) instead of being crammed in at 10px type.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { ALL_LESSONS, SUBJECTS, subjectLabel } from '@/lib/lessons'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { completeQuest, fetchTodayQuests, QUEST_XP } from '@/lib/quests'
import { fetchWeekActivity } from '@/lib/streak'
import { Flame, Zap, Play, ChevronRight, Check, Target, UserPlus, Shield, Gamepad2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// Kazakh "qośqar-muyiz" style ornament for the hero corner
function HeroOrnament() {
  return (
    <svg className="absolute -top-3 -right-3 w-52 h-52 pointer-events-none" viewBox="0 0 100 100"
      fill="none" style={{ opacity: 0.13 }} aria-hidden>
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

type Profile = { name: string; grade: number; xp: number; streak: number; language?: string; avatar_url?: string | null; freeze_count?: number }

// Avatar tint comes from the shared category tokens — the old six hex codes
// belonged to no palette and clashed with the warm brand.
const AVATAR_TINTS = ['var(--cat-spark)', 'var(--cat-sea)', 'var(--cat-gold)', 'var(--cat-violet)', 'var(--cat-rose)', 'var(--cat-sky)']
function avatarTint(name: string) {
  const l = name?.[0]?.toUpperCase() ?? 'A'
  return AVATAR_TINTS[l.charCodeAt(0) % AVATAR_TINTS.length]
}

type L3 = { kk: string; ru: string; en: string }

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

const DAILY_TASKS: { id: string; label: L3; sub: L3; xp: number }[] = [
  { id: 'lesson', label: { kk: 'Бір сабақты аяқта', ru: 'Пройди урок', en: 'Finish a lesson' }, sub: { kk: '≈ 8 мин', ru: '≈ 8 мин', en: '≈ 8 min' }, xp: QUEST_XP.lesson },
  { id: 'words',  label: { kk: '5 жаңа сөзді үйрен', ru: 'Выучи 5 слов', en: 'Learn 5 words' }, sub: { kk: 'Қазақ тілі', ru: 'Казахский', en: 'Kazakh' }, xp: QUEST_XP.words },
  { id: 'game',   label: { kk: 'Жылдам ойынды өт', ru: 'Сыграй в быстрый счёт', en: 'Play quick math' }, sub: { kk: '60 секунд', ru: '60 секунд', en: '60 seconds' }, xp: QUEST_XP.game },
  { id: 'duel',   label: { kk: 'Достарыңмен ойна', ru: 'Сыграй 1v1', en: 'Play 1v1' }, sub: { kk: '1v1 дуэль', ru: '1v1 дуэль', en: '1v1 duel' }, xp: QUEST_XP.duel },
]

export default function HomePage() {
  const [user, setUser]                   = useState<User | null>(null)
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [nextLessonId, setNextLessonId]   = useState<string | null>(null)
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
        supabase.from('profiles').select('name, grade, xp, streak, language, avatar_url, freeze_count').eq('id', user.id).single(),
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
      setNextLessonId(next?.id ?? null)

      // Lesson progress counts
      const gradeTotal = ALL_LESSONS.filter(l => l.grade.includes(profileData.grade))
      const gradeDone  = gradeTotal.filter(l => done.has(l.id))
      setLessonProgress({ done: gradeDone.length, total: gradeTotal.length })

      // Week strip — ANY activity (lessons, trainers, games, daily quests) lights a day
      const completedDays = await fetchWeekActivity(supabase, weekStart)
      const todayBool = weekProgress?.some((p: { completed_at: string }) => isSameDay(new Date(p.completed_at), today)) ?? false
      setWeekDays(completedDays)

      // Daily quests — server-backed (see lib/quests.ts)
      const doneTasks = await fetchTodayQuests(supabase)
      // Bridge: a lesson finished today (lesson_progress) counts as the lesson quest.
      if (todayBool && !doneTasks.has('lesson')) { await completeQuest(supabase, 'lesson'); doneTasks.add('lesson') }
      setDailyDone(doneTasks)

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-9 h-9 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const nextLesson = ALL_LESSONS.find(l => l.id === nextLessonId)
  const nextSubject = nextLesson ? SUBJECTS.find(s => s.id === nextLesson.subjectId) : null
  const lessonPct = lessonProgress.total > 0
    ? Math.round((lessonProgress.done / lessonProgress.total) * 100)
    : 0

  const dailyDoneCount = DAILY_TASKS.filter(task => dailyDone.has(task.id)).length

  const days = WEEKDAYS[lang] ?? WEEKDAYS.kk
  const ti = todayIdx()
  const isGuest = user?.is_anonymous ?? false
  const weekMonday = getWeekStart()
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i); return d.getDate() })
  const tint = avatarTint(profile?.name ?? 'A')

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-60 lg:pt-8" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-4 flex items-center justify-between gap-3 max-w-lg lg:max-w-2xl mx-auto">
        <p className="font-display font-black text-foreground text-xl leading-tight truncate">
          {t('hello', lang)} {profile?.name}!
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {/* Streak */}
          <div className="flex items-center gap-1 rounded-full pl-2 pr-3 py-1.5" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
            <Flame size={18} fill="currentColor" style={{ color: 'var(--warning)' }} />
            <span className="font-black text-sm tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
          </div>
          {/* Streak freezes (shields) */}
          {(profile?.freeze_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 rounded-full pl-2 pr-3 py-1.5" style={{ background: 'color-mix(in oklch, var(--primary) 14%, var(--card))' }} title={t('streak_freeze', lang)}>
              <Shield size={16} fill="currentColor" style={{ color: 'var(--primary-ink)' }} />
              <span className="font-black text-sm tabular" style={{ color: 'var(--primary-ink)' }}>{profile?.freeze_count}</span>
            </div>
          )}
          {/* XP */}
          <div className="flex items-center gap-1 rounded-full pl-2 pr-3 py-1.5" style={{ background: 'color-mix(in oklch, var(--xp) 18%, var(--card))' }}>
            <Zap size={18} fill="currentColor" style={{ color: 'var(--xp)' }} />
            <span className="font-black text-sm tabular" style={{ color: 'var(--xp)' }}>{xp}</span>
          </div>
          <button onClick={async () => {
              const order: ('kk' | 'ru' | 'en')[] = ['kk', 'ru', 'en']
              const next = order[(order.indexOf(lang) + 1) % 3]
              saveLang(next)
              const { data: { user } } = await supabase.auth.getUser()
              if (user) await supabase.from('profiles').update({ language: next }).eq('id', user.id)
            }} aria-label="Тіл / Язык"
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg bg-card shadow-[var(--shadow-sm)]">
            {lang === 'kk' ? '🇰🇿' : lang === 'ru' ? '🇷🇺' : '🇬🇧'}
          </button>
          {profile?.avatar_url ? (
            <button onClick={() => router.push('/profile')} aria-label="Профиль" className="shrink-0 rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt={profile.name}
                className="w-11 h-11 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 3px color-mix(in oklch, ${tint} 26%, transparent)` }} />
            </button>
          ) : (
            <button onClick={() => router.push('/profile')} aria-label="Профиль"
              className="w-11 h-11 rounded-full flex items-center justify-center font-display font-black text-white text-sm shrink-0"
              style={{ background: tint, boxShadow: `0 0 0 3px color-mix(in oklch, ${tint} 26%, transparent)` }}>
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
            <p className="flex-1 text-sm font-semibold leading-snug text-foreground/80">
              {t('guest_banner', lang)}
            </p>
            <button onClick={() => router.push('/login')}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius)] text-white font-display font-black text-sm active:scale-95 transition-transform"
              style={{ background: 'var(--primary)' }}>
              <UserPlus size={16} /> {t('reg_heading', lang)}
            </button>
          </div>
        )}

        {/* ── THE one big thing: today's lesson ── */}
        {nextLesson ? (
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)] animate-mk-pop-in"
            style={{ background: 'var(--gradient-hero)' }}>
            <HeroOrnament />
            <div className="relative px-5 pt-5 pb-5">
              {/* Sentence case, not ALL CAPS: Cyrillic caps read slower, and a
                  6-year-old is still learning the lowercase shapes. */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/85 text-sm font-black">{t('home_today', lang)}</span>
                <span className="text-white/85 text-sm font-bold">
                  {nextSubject ? subjectLabel(nextSubject, lang) : nextLesson.subjectId}
                </span>
              </div>

              <h2 className="text-white text-3xl font-display font-black leading-[1.1] mb-1.5">
                {nextLesson.titleByLang[lang] ?? nextLesson.titleByLang.ru}
              </h2>
              <p className="text-white/90 text-sm mb-5">{nextLesson.subtitle ?? t('hero_default', lang)}</p>

              <div className="h-2 bg-white/25 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${lessonPct}%` }} />
              </div>
              <div className="flex items-center justify-between mb-5">
                {/* Named, so it can't be confused with the 0/4 daily-task count */}
                <span className="text-white/90 text-sm font-bold tabular">{t('home_course', lang)} {lessonProgress.done} / {lessonProgress.total}</span>
                <span className="text-white text-sm font-black tabular flex items-center gap-1">
                  <Zap size={15} fill="currentColor" style={{ color: 'var(--accent)' }} /> +{15 + nextLesson.questions.length * 5} XP
                </span>
              </div>

              <button onClick={() => router.push(`/lesson/${nextLesson.id}`)}
                className="w-full bg-white rounded-[var(--radius)] py-4 flex items-center justify-center gap-2.5 font-display font-black text-lg active:translate-y-[2px] transition-transform"
                style={{ color: 'var(--primary-ink)', boxShadow: '0 4px 0 color-mix(in oklch, var(--primary) 18%, white)' }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                  <Play size={15} className="text-white ml-0.5" fill="currentColor" />
                </span>
                {t('home_go', lang)}
              </button>
            </div>
          </div>
        ) : (
          /* Every lesson for this grade is done — send them to endless practice */
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)] animate-mk-pop-in"
            style={{ background: 'var(--gradient-hero)' }}>
            <HeroOrnament />
            <div className="relative px-5 pt-6 pb-5">
              <span className="text-white/60 text-xs font-black tracking-widest uppercase">{t('home_today', lang)}</span>
              <h2 className="text-white text-2xl font-display font-black leading-tight mt-2 mb-5">🎉 {t('home_all_done', lang)}</h2>
              <button onClick={() => router.push('/train')}
                className="w-full bg-white rounded-[var(--radius)] py-4 flex items-center justify-center gap-2.5 font-display font-black text-lg active:translate-y-[2px] transition-transform"
                style={{ color: 'var(--primary-ink)', boxShadow: '0 4px 0 color-mix(in oklch, var(--primary) 18%, white)' }}>
                <Target size={20} /> {t('train_title', lang)}
              </button>
            </div>
          </div>
        )}

        {/* ── Week strip ── */}
        <div className="bg-card rounded-[var(--radius-lg)] px-4 py-3.5 shadow-[var(--shadow-sm)] animate-mk-pop-in" style={{ animationDelay: '40ms' }}>
          <p className="text-sm font-black text-muted-foreground mb-2.5">{t('home_week', lang)}</p>
          {/* Three distinct states. A flame in every circle said nothing — it
              just repeated the counter in the header. Done = filled + tick,
              today = ring, future = empty. */}
          <div className="flex items-center justify-between">
            {days.map((d, i) => {
              const done = weekDays[i]
              const isToday = i === ti
              const future = i > ti
              return (
                <div key={i} className={`flex flex-col items-center gap-1.5 ${future ? 'opacity-45' : ''}`}>
                  <span className="text-xs font-bold text-muted-foreground">{d}</span>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: done ? 'var(--gradient-gold)' : 'var(--muted)',
                      boxShadow: isToday && !done ? '0 0 0 3px color-mix(in oklch, var(--primary) 55%, transparent)' : 'none',
                    }}>
                    {done
                      ? <Check size={20} className="text-white" strokeWidth={3.5} />
                      : isToday
                        ? <Flame size={19} style={{ color: 'var(--primary)' }} fill="currentColor" />
                        : <span className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />}
                  </div>
                  <span className={`text-sm tabular ${isToday ? 'font-black' : 'text-muted-foreground/80'}`}
                    style={isToday ? { color: 'var(--primary-ink)' } : undefined}>{weekDates[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Two ways to keep going. Tinted cards, not gradients: only the
             lesson hero above is allowed to shout. ── */}
        <div className="grid grid-cols-2 gap-3 animate-mk-pop-in" style={{ animationDelay: '80ms' }}>
          {[
            { path: '/train', cat: 'var(--cat-spark)', Icon: Target, title: t('train_title', lang), sub: t('train_subtitle', lang) },
            { path: '/game', cat: 'var(--cat-violet)', Icon: Gamepad2, title: t('nav_games', lang), sub: t('games_subtitle', lang) },
          ].map(tile => (
            <button key={tile.path} onClick={() => router.push(tile.path)}
              className="rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 text-left border-2 min-h-[136px] active:translate-y-[2px] transition-transform"
              style={{
                background: `color-mix(in oklch, ${tile.cat} 12%, var(--card))`,
                borderColor: `color-mix(in oklch, ${tile.cat} 28%, var(--card))`,
              }}>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${tile.cat} 20%, transparent)`, color: tile.cat }}>
                <tile.Icon size={30} />
              </span>
              <div className="flex-1">
                <p className="font-display font-black text-foreground text-lg leading-tight">{tile.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-snug">{tile.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Daily quests ── */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden animate-mk-pop-in" style={{ animationDelay: '120ms' }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/50">
            <h3 className="font-display font-black text-foreground text-base">{t('daily_title', lang)}</h3>
            <span className="text-sm font-black text-white px-3 py-1 rounded-full tabular" style={{ background: 'var(--primary)' }}>
              {dailyDoneCount}/4
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {DAILY_TASKS.map(task => {
              const done = dailyDone.has(task.id)
              return (
                <div key={task.id} className="px-4 py-3.5 flex items-center gap-3 min-h-[60px]">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                    style={done
                      ? { background: 'var(--gradient-success)' }
                      : { border: '2px solid var(--border)' }}>
                    {done && <Check size={16} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-bold leading-tight ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.label[lang]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.sub[lang]}</p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full shrink-0 tabular flex items-center gap-0.5"
                    style={{ background: 'color-mix(in oklch, var(--xp) 18%, var(--card))', color: 'var(--xp)' }}>
                    <Zap size={11} fill="currentColor" /> +{task.xp}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── All lessons, one line down. The grid of subject tiles lived here;
             /lessons is one tap away in the nav and does the job better. ── */}
        <button onClick={() => router.push('/lessons')}
          className="bg-card rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3 shadow-[var(--shadow-sm)] active:translate-y-[2px] transition-transform animate-mk-pop-in"
          style={{ animationDelay: '160ms' }}>
          <span className="font-display font-black text-foreground text-base flex-1 text-left">{t('subjects_title', lang)}</span>
          <span className="text-sm font-black flex items-center gap-0.5" style={{ color: 'var(--primary-ink)' }}>
            {t('see_all', lang)} <ChevronRight size={16} />
          </span>
        </button>

      </main>

      <BottomNav />
    </div>
  )
}
