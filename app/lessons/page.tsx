'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ALL_LESSONS, SUBJECTS, UPCOMING_SUBJECTS } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lesson } from '@/lib/lessons'

// ── helpers ──────────────────────────────────────────────────────────────────

const BLOB_COLORS = [
  '#D1FAE5', '#FCE7F3', '#FEF3C7', '#EDE9FE',
  '#DBEAFE', '#FEE2E2', '#CCFBF1', '#FEF9C3',
  '#F3E8FF', '#DCFCE7', '#FFE4E6', '#E0F2FE', '#FFF7ED',
]
function lessonColor(id: string) {
  return BLOB_COLORS[parseInt(id.replace(/\D/g, '') || '0') % BLOB_COLORS.length]
}

function StarDots({ stars, color }: { stars: number; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(s => (
        <div key={s} className="w-2 h-2 rounded-full"
          style={{ background: s <= stars ? color : '#e5e7eb' }} />
      ))}
    </div>
  )
}

function LessonCard({ lesson, stars, onClick, locked, lang }: {
  lesson: Lesson; stars: number; onClick: () => void; locked?: boolean; lang: 'ru' | 'kk' | 'en'
}) {
  const blob = lessonColor(lesson.id)
  const mins = Math.max(3, Math.ceil(lesson.questions.length * 0.6))
  const done = stars > 0

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={`relative overflow-hidden bg-white rounded-3xl p-4 text-left flex flex-col h-44 border-2 transition-all
        ${locked ? 'opacity-50 cursor-default border-gray-100' : done ? 'border-[#58CC02]/30 shadow-sm active:scale-[0.97]' : 'border-gray-100 shadow-sm active:scale-[0.97]'}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ backgroundColor: blob, transform: 'translate(35%, -35%)' }} />

      {done && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#58CC02] flex items-center justify-center z-10">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <div className="text-3xl mb-1 relative z-10">{lesson.emoji ?? '📚'}</div>

      <div className="flex-1 relative z-10 min-w-0">
        <div className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
          {lesson.titleByLang[lang] ?? lesson.titleByLang.ru}
        </div>
        {lesson.subtitle && (
          <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{lesson.subtitle}</div>
        )}
      </div>

      <div className="flex items-center justify-between relative z-10 mt-2">
        <span className="text-xs text-gray-400">{mins} {t('min', lang)} · {lesson.questions.length} {t('tasks', lang)}</span>
        {locked
          ? <span className="text-gray-400 text-sm">🔒</span>
          : <StarDots stars={stars} color={done ? '#58CC02' : '#d1d5db'} />
        }
      </div>
    </button>
  )
}

// ── countdown timer for upcoming subjects ─────────────────────────────────────

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    function calc() {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('ЖАҚЫНДА'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${d}к ${h}с ${m}м`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

// ── subject grid view ─────────────────────────────────────────────────────────

function SubjectGrid({ grade, starsMap, lang, router }: {
  grade: number
  starsMap: Record<string, number>
  lang: 'ru' | 'kk' | 'en'
  router: ReturnType<typeof useRouter>
}) {
  // Upcoming countdown: 5 days from now (hardcoded relative)
  const target = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  const countdown = useCountdown(target)

  return (
    <div className="flex flex-col gap-5">

      {/* Active subjects */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          {SUBJECTS.filter(s => s.id !== 'russian').map(subj => {
            const lessons = ALL_LESSONS.filter(l => l.subjectId === subj.id && l.grade.includes(grade))
            const done    = lessons.filter(l => (starsMap[l.id] ?? 0) > 0).length
            const pct     = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0
            const nextL   = lessons.find(l => (starsMap[l.id] ?? 0) === 0)

            return (
              <button key={subj.id}
                onClick={() => router.push(`/lessons?subject=${subj.id}`)}
                className="bg-white rounded-3xl p-4 text-left flex flex-col gap-3 shadow-sm active:scale-[0.97] transition-all border-2 border-transparent">
                {/* Icon */}
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: subj.bg }}>
                  {subj.emoji}
                </div>
                {/* Name + desc */}
                <div>
                  <p className="font-black text-[#1A1A2E] text-sm">{subj.labelKk}</p>
                  <p className="text-[#6B7280] text-[10px] mt-0.5">{subj.descKk}</p>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: subj.color }} />
                </div>
                {/* Next lesson row */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#6B7280] font-semibold truncate max-w-[80%]">
                    {nextL
                      ? `Келесі: ${nextL.titleByLang[lang] ?? nextL.titleByLang.ru}`
                      : `${pct}% аяқталды`}
                  </span>
                  <span className="text-xs font-black text-[#7B5CBF]">→</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Coming soon subjects */}
      <div>
        <p className="text-xs font-black text-[#1A1A2E]/50 tracking-widest uppercase mb-2">Жақында</p>
        <div className="grid grid-cols-2 gap-3">
          {UPCOMING_SUBJECTS.map(subj => (
            <div key={subj.id}
              className="bg-white rounded-3xl p-4 flex flex-col gap-3 border-2 border-dashed border-gray-200 opacity-75">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-gray-100">
                  {subj.emoji}
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ background: subj.color }}>
                  ЖАҚЫНДА
                </span>
              </div>
              <div>
                <p className="font-black text-[#1A1A2E] text-sm">{subj.labelKk}</p>
                <p className="text-[#6B7280] text-[10px] mt-0.5">{subj.descKk}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#6B7280]">{countdown}</span>
                <button className="text-[10px] font-black rounded-full px-2.5 py-1"
                  style={{ background: '#EDE8F8', color: '#7B5CBF' }}
                  onClick={e => e.stopPropagation()}>
                  Хабарласам
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── lesson list view ──────────────────────────────────────────────────────────

function LessonList({ subjectId, grade, starsMap, lang, router }: {
  subjectId: string
  grade: number
  starsMap: Record<string, number>
  lang: 'ru' | 'kk' | 'en'
  router: ReturnType<typeof useRouter>
}) {
  const subj     = SUBJECTS.find(s => s.id === subjectId)
  const unlocked = ALL_LESSONS.filter(l => l.subjectId === subjectId && l.grade.includes(grade))
  const locked   = ALL_LESSONS.filter(l => l.subjectId === subjectId && !l.grade.includes(grade)).slice(0, 6)
  const completed = unlocked.filter(l => (starsMap[l.id] ?? 0) > 0).length
  const pct = unlocked.length > 0 ? Math.round((completed / unlocked.length) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Subject header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/lessons')}
          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm font-black text-[#1A1A2E] text-lg">
          ←
        </button>
        {subj && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: subj.bg }}>
              {subj.emoji}
            </div>
            <div>
              <p className="font-black text-[#1A1A2E] text-base">{subj.labelKk}</p>
              <p className="text-[#6B7280] text-[10px]">{subj.descKk}</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {unlocked.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: subj?.color ?? '#22C55E' }} />
          </div>
          <span className="text-xs font-black text-[#1A1A2E]/60 shrink-0">{completed}/{unlocked.length}</span>
        </div>
      )}

      {/* Lesson grid */}
      {unlocked.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🚧</div>
          <p className="font-semibold">{t('coming_soon_tmpl', lang).replace('[N]', String(grade))}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {unlocked.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson}
              stars={starsMap[lesson.id] ?? 0}
              lang={lang}
              onClick={() => router.push(`/lesson/${lesson.id}`)} />
          ))}
        </div>
      )}

      {/* Locked section */}
      {locked.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-black text-gray-400 tracking-widest uppercase">{t('next_section', lang)}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {locked.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} stars={0} lang={lang} onClick={() => {}} locked />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

function LessonsContent() {
  const [grade, setGrade]       = useState(2)
  const [starsMap, setStarsMap] = useState<Record<string, number>>({})
  const [loaded, setLoaded]     = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const lang = useLang()

  const subjectParam = params.get('subject')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('grade, language').eq('id', user.id).single()
      if (profile?.grade) setGrade(profile.grade)
      if (profile?.language) saveLang(profile.language as 'ru' | 'kk' | 'en')
      const { data: progress } = await supabase.from('lesson_progress').select('lesson_id, stars').eq('user_id', user.id)
      if (progress) {
        const map: Record<string, number> = {}
        progress.forEach((p: { lesson_id: string; stars: number }) => { map[p.lesson_id] = p.stars })
        setStarsMap(map)
      }
      setLoaded(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EDE8F8' }}>
      <div className="w-8 h-8 border-4 border-[#7B5CBF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pb-24" style={{ background: '#EDE8F8' }}>

      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-10" style={{ background: '#EDE8F8' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-black text-[#1A1A2E] text-xl">
            {subjectParam
              ? (SUBJECTS.find(s => s.id === subjectParam)?.labelKk ?? t('lessons', lang))
              : 'Барлық пәндер'}
          </h1>
          <span className="text-sm font-bold text-[#1A1A2E]/40">{grade} {t('grade', lang)}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-2">
        {subjectParam ? (
          <LessonList
            subjectId={subjectParam}
            grade={grade}
            starsMap={starsMap}
            lang={lang}
            router={router}
          />
        ) : (
          <SubjectGrid
            grade={grade}
            starsMap={starsMap}
            lang={lang}
            router={router}
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default function LessonsPage() {
  return <Suspense><LessonsContent /></Suspense>
}
