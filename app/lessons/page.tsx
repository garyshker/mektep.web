'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ALL_LESSONS, SUBJECTS } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lesson } from '@/lib/lessons'

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
      {/* Blob */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ backgroundColor: blob, transform: 'translate(35%, -35%)' }} />

      {/* Done checkmark */}
      {done && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#58CC02] flex items-center justify-center z-10">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <div className="text-3xl mb-1 relative z-10">{lesson.emoji ?? '📚'}</div>

      <div className="flex-1 relative z-10 min-w-0">
        <div className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</div>
        {lesson.subtitle && <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{lesson.subtitle}</div>}
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

function LessonsContent() {
  const [grade, setGrade] = useState(2)
  const [activeSubject, setActiveSubject] = useState('math')
  const [starsMap, setStarsMap] = useState<Record<string, number>>({})
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const lang = useLang()

  useEffect(() => {
    const subjectParam = params.get('subject')
    if (subjectParam) setActiveSubject(subjectParam)

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      if (profile?.grade) setGrade(profile.grade)
      const { data: progress } = await supabase.from('lesson_progress').select('lesson_id, stars').eq('user_id', user.id)
      if (progress) {
        const map: Record<string, number> = {}
        progress.forEach((p: { lesson_id: string; stars: number }) => { map[p.lesson_id] = p.stars })
        setStarsMap(map)
      }
    }
    init()
  }, [])

  const subject = SUBJECTS.find(s => s.id === activeSubject)
  const unlocked = ALL_LESSONS.filter(l => l.subjectId === activeSubject && l.grade.includes(grade))
  const locked   = ALL_LESSONS.filter(l => l.subjectId === activeSubject && !l.grade.includes(grade)).slice(0, 6)

  const completedCount = unlocked.filter(l => (starsMap[l.id] ?? 0) > 0).length
  const pct = unlocked.length > 0 ? Math.round((completedCount / unlocked.length) * 100) : 0

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* Header */}
      <header className="bg-white px-4 pt-5 pb-3 sticky top-0 z-10 border-b-2 border-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-black text-gray-900 text-xl">{t('lessons', lang)}</h1>
          <span className="text-sm font-bold text-gray-400">{grade} {t('grade', lang)}</span>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => setActiveSubject(s.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2"
              style={activeSubject === s.id
                ? { background: s.color, color: 'white', borderColor: s.color }
                : { background: 'white', color: '#6b7280', borderColor: '#f3f4f6' }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-5">

        {/* Progress bar */}
        {unlocked.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: '#58CC02' }} />
            </div>
            <span className="text-xs font-black text-gray-500 shrink-0">{completedCount}/{unlocked.length}</span>
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
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs font-black text-gray-300 tracking-widest uppercase">{t('next_section', lang)}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {locked.map(lesson => (
                <LessonCard key={lesson.id} lesson={lesson} stars={0} lang={lang} onClick={() => {}} locked />
              ))}
            </div>
          </>
        )}

      </main>

      <BottomNav />
    </div>
  )
}

export default function LessonsPage() {
  return <Suspense><LessonsContent /></Suspense>
}
