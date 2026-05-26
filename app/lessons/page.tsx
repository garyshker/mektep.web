'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ALL_LESSONS, SUBJECTS } from '@/lib/lessons'
import { Suspense } from 'react'

function LessonsContent() {
  const [grade, setGrade] = useState<number>(1)
  const [activeSubject, setActiveSubject] = useState('math')
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
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
        .from('lesson_progress').select('lesson_id').eq('user_id', user.id)
      if (progress) setCompletedLessons(progress.map(p => p.lesson_id))
    }
    init()
  }, [])

  const filtered = ALL_LESSONS.filter(
    l => l.subjectId === activeSubject && l.grade.includes(grade)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="font-bold text-gray-800">Уроки · {grade} класс</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Subject tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeSubject === s.id
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
              style={activeSubject === s.id ? { background: s.color } : {}}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Lessons list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🚧</div>
            <p>Уроки для {grade} класса скоро появятся</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((lesson, i) => {
              const done = completedLessons.includes(lesson.id)
              return (
                <button
                  key={lesson.id}
                  onClick={() => router.push(`/lesson/${lesson.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 text-left hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gray-50 shrink-0">
                    {lesson.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800">{lesson.titleByLang.ru}</div>
                    <div className="text-sm text-gray-400">{lesson.questions.length} вопросов</div>
                  </div>
                  <div className="shrink-0">
                    {done
                      ? <span className="text-2xl">⭐</span>
                      : <span className="text-sm text-emerald-500 font-semibold bg-emerald-50 px-3 py-1 rounded-full">Старт</span>
                    }
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default function LessonsPage() {
  return <Suspense><LessonsContent /></Suspense>
}
