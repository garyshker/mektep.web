'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LESSONS_BY_ID } from '@/lib/lessons'
import type { Question } from '@/lib/lessons'

type Feedback = 'right' | 'wrong' | null

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const lesson = LESSONS_BY_ID[id]

  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [shuffledOpts, setShuffledOpts] = useState<string[]>([])

  const q: Question | undefined = lesson?.questions[idx]
  const total = lesson?.questions.length ?? 0
  const progress = ((idx) / total) * 100

  useEffect(() => {
    if (q?.options) setShuffledOpts(shuffle(q.options))
  }, [idx])

  if (!lesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Урок не найден</p>
    </div>
  )

  const pick = (opt: string) => {
    if (feedback) return
    setSelected(opt)
    const isRight = opt === q!.answer
    setFeedback(isRight ? 'right' : 'wrong')
    if (isRight) setCorrect(c => c + 1)
  }

  const next = async () => {
    if (idx + 1 >= total) {
      // Save progress
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const stars = correct + (feedback === 'right' ? 1 : 0) >= total ? 3
          : correct + (feedback === 'right' ? 1 : 0) >= total - 2 ? 2 : 1
        const xp = 15 + (correct + (feedback === 'right' ? 1 : 0)) * 5
        await supabase.from('lesson_progress').upsert({
          user_id: user.id, lesson_id: lesson.id, subject_id: lesson.subjectId,
          stars, xp_earned: xp,
        })
        await supabase.from('profiles').update({ xp }).eq('id', user.id)
      }
      setDone(true)
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setFeedback(null)
  }

  if (done) {
    const finalCorrect = correct + (feedback === 'right' ? 1 : 0)
    const stars = finalCorrect >= total ? 3 : finalCorrect >= total - 2 ? 2 : 1
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Урок завершён!</h2>
        <p className="text-gray-500 mb-2">{finalCorrect} из {total} правильно</p>
        <p className="text-emerald-600 font-bold text-lg mb-8">+{15 + finalCorrect * 5} XP</p>
        <div className="flex gap-3">
          <button onClick={() => router.push('/lessons')}
            className="px-6 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">
            Все уроки
          </button>
          <button onClick={() => { setIdx(0); setCorrect(0); setFeedback(null); setSelected(null); setDone(false) }}
            className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold">
            Ещё раз
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/lessons')} className="text-gray-400 text-xl">←</button>
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm text-gray-400 font-medium">{idx + 1}/{total}</span>
      </header>

      {/* Question */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-lg mx-auto w-full">
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 text-center">
          <p className="text-3xl font-bold text-gray-800">{q?.prompt}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {shuffledOpts.map(opt => {
            const isSelected = selected === opt
            const isRight = opt === q?.answer
            let style = 'bg-white border-gray-200 text-gray-700'
            if (feedback && isSelected && isRight) style = 'bg-emerald-500 border-emerald-500 text-white'
            else if (feedback && isSelected && !isRight) style = 'bg-red-500 border-red-500 text-white'
            else if (feedback && isRight) style = 'bg-emerald-100 border-emerald-400 text-emerald-700'
            return (
              <button key={opt} onClick={() => pick(opt)}
                className={`rounded-2xl border-2 py-5 text-xl font-bold transition-all active:scale-95 ${style}`}>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`w-full mt-4 rounded-2xl p-4 flex items-center justify-between ${
            feedback === 'right' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div>
              <p className={`font-bold ${feedback === 'right' ? 'text-emerald-700' : 'text-red-600'}`}>
                {feedback === 'right' ? '✓ Правильно!' : '✗ Неверно'}
              </p>
              {feedback === 'wrong' && (
                <p className="text-sm text-gray-500">Правильный ответ: {q?.answer}</p>
              )}
            </div>
            <button onClick={next}
              className={`px-5 py-2 rounded-xl font-bold text-white ${
                feedback === 'right' ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
              Далее →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
