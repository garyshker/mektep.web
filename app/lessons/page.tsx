'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ALL_LESSONS, SUBJECTS } from '@/lib/lessons'
import type { Lesson } from '@/lib/lessons'

const BLOB_COLORS = [
  '#D1FAE5', '#FCE7F3', '#FEF3C7', '#EDE9FE',
  '#DBEAFE', '#FEE2E2', '#CCFBF1', '#FEF9C3',
  '#F3E8FF', '#DCFCE7', '#FFE4E6', '#E0F2FE',
  '#FFF7ED',
]

function lessonColor(id: string): string {
  const n = parseInt(id.replace(/\D/g, '') || '0')
  return BLOB_COLORS[n % BLOB_COLORS.length]
}

function LessonCard({
  lesson, stars, onClick, locked,
}: {
  lesson: Lesson
  stars: number
  onClick: () => void
  locked?: boolean
}) {
  const blob = lessonColor(lesson.id)
  const mins = Math.max(3, Math.ceil(lesson.questions.length * 0.6))
  const subtitle = lesson.subtitle || ''

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={`relative overflow-hidden bg-white rounded-3xl p-4 text-left flex flex-col h-44 border border-gray-100 transition-all
        ${locked ? 'opacity-60 cursor-default shadow-none' : 'shadow-sm hover:shadow-md active:scale-[0.97]'}`}
    >
      {/* Blob decoration */}
      <div
        className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
        style={{ backgroundColor: blob, transform: 'translate(35%, -35%)' }}
      />

      {/* Emoji icon */}
      <div className="text-3xl mb-1 relative z-10">{lesson.emoji ?? '📚'}</div>

      {/* Text */}
      <div className="flex-1 relative z-10 min-w-0">
        <div className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
          {lesson.titleByLang.ru}
        </div>
        {subtitle && (
          <div className="text-gray-400 text-xs mt-0.5 line-clamp-1">{subtitle}</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between relative z-10 mt-2">
        <span className="text-xs text-gray-400">
          {mins} мин · {lesson.questions.length} зад.
        </span>
        {locked ? (
          <span className="text-gray-400 text-sm">🔒</span>
        ) : (
          <div className="flex gap-1 items-center">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className="w-2 h-2 rounded-full transition-colors"
                style={{ backgroundColor: s <= stars ? (blob === '#D1FAE5' ? '#22c55e' : blob.replace('F', 'A').replace('E', '8')) : '#e5e7eb' }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

function LessonsContent() {
  const [grade, setGrade] = useState<number>(2)
  const [activeSubject, setActiveSubject] = useState('math')
  const [starsMap, setStarsMap] = useState<Record<string, number>>({})
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const subjectParam = params.get('subject')
    if (subjectParam) setActiveSubject(subjectParam)

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('grade').eq('id', user.id).single()
      if (profile?.grade) setGrade(profile.grade)

      const { data: progress } = await supabase
        .from('lesson_progress').select('lesson_id, stars').eq('user_id', user.id)
      if (progress) {
        const map: Record<string, number> = {}
        progress.forEach((p: { lesson_id: string; stars: number }) => {
          map[p.lesson_id] = p.stars
        })
        setStarsMap(map)
      }
    }
    init()
  }, [])

  const subject = SUBJECTS.find(s => s.id === activeSubject)
  const unlocked = ALL_LESSONS.filter(
    l => l.subjectId === activeSubject && l.grade.includes(grade)
  )
  const locked = ALL_LESSONS.filter(
    l => l.subjectId === activeSubject && !l.grade.includes(grade)
  ).slice(0, 6)

  return (
    <div className="min-h-screen" style={{ background: '#F8F7F4' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
        <h1 className="font-bold text-gray-800">Уроки · {grade} класс</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-5">
        {/* Subject tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
              style={
                activeSubject === s.id
                  ? { background: s.color, color: 'white' }
                  : { background: 'white', color: '#4b5563', border: '1px solid #e5e7eb' }
              }
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Lessons grid */}
        {unlocked.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🚧</div>
            <p className="font-medium">Уроки для {grade} класса скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {unlocked.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                stars={starsMap[lesson.id] ?? 0}
                onClick={() => router.push(`/lesson/${lesson.id}`)}
              />
            ))}
          </div>
        )}

        {/* Locked section */}
        {locked.length > 0 && (
          <>
            <h2 className="font-bold text-gray-800 text-lg">Дальше тебя ждёт</h2>
            <div className="grid grid-cols-2 gap-3">
              {locked.map(lesson => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  stars={0}
                  onClick={() => {}}
                  locked
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function LessonsPage() {
  return <Suspense><LessonsContent /></Suspense>
}
