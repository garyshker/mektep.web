'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LESSONS_BY_ID } from '@/lib/lessons'
import type { Question } from '@/lib/lessons'
import type { ByLang } from '@/lib/lessons/types'

type Feedback = 'right' | 'wrong' | null

function ru(val: string | ByLang | undefined): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return val.ru
}

function ClockFace({ h, m }: { h: number; m: number }) {
  const cx = 60, cy = 60
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const hourAngle = ((h % 12) + m / 60) * 30
  const minAngle = m * 6
  const hLen = 28, mLen = 42

  return (
    <svg width="140" height="140" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={55} fill="white" stroke="#e5e7eb" strokeWidth="3" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
        const a = (n * 30 - 90) * (Math.PI / 180)
        return (
          <text key={n} x={cx + 42 * Math.cos(a)} y={cy + 42 * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#374151">{n}</text>
        )
      })}
      <line x1={cx} y1={cy}
        x2={cx + hLen * Math.cos(toRad(hourAngle))}
        y2={cy + hLen * Math.sin(toRad(hourAngle))}
        stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      <line x1={cx} y1={cy}
        x2={cx + mLen * Math.cos(toRad(minAngle))}
        y2={cy + mLen * Math.sin(toRad(minAngle))}
        stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="#1f2937" />
    </svg>
  )
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const lesson = LESSONS_BY_ID[id]

  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)

  const [selected, setSelected] = useState<string | null>(null)
  const [typeInput, setTypeInput] = useState('')
  const [tapSelected, setTapSelected] = useState<Set<number>>(new Set())
  const [matchMap, setMatchMap] = useState<Record<string, number | null>>({})

  const q: Question | undefined = lesson?.questions[idx]
  const total = lesson?.questions.length ?? 0
  const progress = (idx / total) * 100

  useEffect(() => {
    if (!q) return
    setSelected(null)
    setTypeInput('')
    setTapSelected(new Set())
    setMatchMap(Object.fromEntries((q.items ?? []).map(it => [it.text, null])))
  }, [idx])

  if (!lesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Урок не найден</p>
    </div>
  )

  const prompt = ru(q?.promptByLang) || q?.prompt || ''

  const correctStr = (): string => {
    if (!q) return ''
    if (q.kind === 'type') return String(q.answer)
    if (q.options && typeof q.answer === 'number') return q.options[q.answer]
    return String(q.answer ?? '')
  }

  const submitMC = (opt: string) => {
    if (feedback) return
    setSelected(opt)
    const isRight = opt === correctStr()
    setFeedback(isRight ? 'right' : 'wrong')
    if (isRight) setCorrectCount(c => c + 1)
  }

  const submitType = () => {
    if (feedback) return
    const isRight = typeInput.trim() === String(q?.answer)
    setFeedback(isRight ? 'right' : 'wrong')
    if (isRight) setCorrectCount(c => c + 1)
  }

  const submitTap = () => {
    if (feedback) return
    const expected = q?.correctIdxs ?? []
    const isRight = expected.length === tapSelected.size && expected.every(i => tapSelected.has(i))
    setFeedback(isRight ? 'right' : 'wrong')
    if (isRight) setCorrectCount(c => c + 1)
  }

  const submitMatch = () => {
    if (feedback) return
    const allRight = (q?.items ?? []).every(it => matchMap[it.text] === it.group)
    setFeedback(allRight ? 'right' : 'wrong')
    if (allRight) setCorrectCount(c => c + 1)
  }

  const next = async () => {
    if (idx + 1 >= total) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const final = correctCount + (feedback === 'right' ? 1 : 0)
        const stars = final >= total ? 3 : final >= total - 2 ? 2 : 1
        const xp = 15 + final * 5
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
    setFeedback(null)
  }

  if (done) {
    const final = correctCount + (feedback === 'right' ? 1 : 0)
    const stars = final >= total ? 3 : final >= total - 2 ? 2 : 1
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Урок завершён!</h2>
        <p className="text-gray-500 mb-2">{final} из {total} правильно</p>
        <p className="text-emerald-600 font-bold text-lg mb-8">+{15 + final * 5} XP</p>
        <div className="flex gap-3">
          <button onClick={() => router.push('/lessons')}
            className="px-6 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">
            Все уроки
          </button>
          <button onClick={() => { setIdx(0); setCorrectCount(0); setFeedback(null); setSelected(null); setDone(false) }}
            className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold">
            Ещё раз
          </button>
        </div>
      </div>
    )
  }

  const renderOptions = (opts: string[]) => {
    const correct = correctStr()
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {opts.map((opt, i) => {
          const isSel = selected === opt
          const isRight = opt === correct
          let style = 'bg-white border-gray-200 text-gray-700'
          if (feedback && isSel && isRight) style = 'bg-emerald-500 border-emerald-500 text-white'
          else if (feedback && isSel && !isRight) style = 'bg-red-500 border-red-500 text-white'
          else if (feedback && isRight) style = 'bg-emerald-100 border-emerald-400 text-emerald-700'
          return (
            <button key={i} onClick={() => submitMC(opt)}
              className={`rounded-2xl border-2 py-4 text-lg font-bold transition-all active:scale-95 ${style}`}>
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  const renderBody = () => {
    if (!q) return null

    if (q.kind === 'mc') {
      return renderOptions(q.options ?? [])
    }

    if (q.kind === 'word') {
      return (
        <>
          <div className="w-full bg-blue-50 rounded-2xl border border-blue-100 p-4 mb-4 text-center">
            {q.image && <div className="text-3xl mb-2">{q.image}</div>}
            <p className="text-gray-700 text-base leading-relaxed">{ru(q.storyByLang)}</p>
          </div>
          {renderOptions(q.options ?? [])}
        </>
      )
    }

    if (q.kind === 'clock') {
      return (
        <>
          <div className="flex justify-center mb-4">
            <ClockFace h={q.clockH!} m={q.clockM!} />
          </div>
          {renderOptions(q.options ?? [])}
        </>
      )
    }

    if (q.kind === 'type') {
      return (
        <div className="w-full flex flex-col gap-3">
          <input
            type="number"
            value={typeInput}
            onChange={e => setTypeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !feedback && submitType()}
            disabled={!!feedback}
            placeholder="Ответ..."
            className={`w-full text-center text-3xl font-bold border-2 rounded-2xl py-4 focus:outline-none ${
              feedback === 'right' ? 'border-emerald-500 bg-emerald-50' :
              feedback === 'wrong' ? 'border-red-400 bg-red-50' :
              'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {!feedback && (
            <button onClick={submitType}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold text-lg">
              Проверить
            </button>
          )}
        </div>
      )
    }

    if (q.kind === 'tap') {
      const words = q.words ?? []
      return (
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {words.map((word, i) => {
              const isSel = tapSelected.has(i)
              const shouldBe = q.correctIdxs?.includes(i)
              let cls = 'px-4 py-2 rounded-xl border-2 text-base font-semibold transition-all active:scale-95 '
              if (feedback) {
                if (shouldBe && isSel) cls += 'bg-emerald-500 border-emerald-500 text-white'
                else if (shouldBe && !isSel) cls += 'bg-emerald-100 border-emerald-400 text-emerald-700'
                else if (!shouldBe && isSel) cls += 'bg-red-500 border-red-500 text-white'
                else cls += 'bg-white border-gray-200 text-gray-500'
              } else {
                cls += isSel ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-700'
              }
              return (
                <button key={i} disabled={!!feedback}
                  onClick={() => setTapSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i); else next.add(i)
                    return next
                  })}
                  className={cls}>{word}</button>
              )
            })}
          </div>
          {!feedback && (
            <button onClick={submitTap}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold text-lg">
              Проверить
            </button>
          )}
        </div>
      )
    }

    if (q.kind === 'match') {
      const groups = q.groupsByLang?.ru ?? []
      const items = q.items ?? []
      const allAssigned = items.every(it => matchMap[it.text] !== null && matchMap[it.text] !== undefined)
      return (
        <div className="w-full flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="min-w-[90px] text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-center">
                {item.text}
              </span>
              <div className="flex gap-2 flex-1">
                {groups.map((g, gi) => {
                  const isAssigned = matchMap[item.text] === gi
                  let cls = 'flex-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition-all text-center '
                  if (feedback) {
                    const isCorrect = item.group === gi
                    if (isAssigned && isCorrect) cls += 'bg-emerald-500 border-emerald-500 text-white'
                    else if (isAssigned && !isCorrect) cls += 'bg-red-500 border-red-500 text-white'
                    else if (!isAssigned && isCorrect) cls += 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    else cls += 'bg-white border-gray-200 text-gray-500'
                  } else {
                    cls += isAssigned ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-700'
                  }
                  return (
                    <button key={gi} disabled={!!feedback}
                      onClick={() => setMatchMap(prev => ({ ...prev, [item.text]: gi }))}
                      className={cls}>{g}</button>
                  )
                })}
              </div>
            </div>
          ))}
          {!feedback && allAssigned && (
            <button onClick={submitMatch}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold text-lg mt-2">
              Проверить
            </button>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/lessons')} className="text-gray-400 text-xl">←</button>
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm text-gray-400 font-medium">{idx + 1}/{total}</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-lg mx-auto w-full">
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6 text-center">
          {q?.image && q.kind !== 'word' && <div className="text-4xl mb-3">{q.image}</div>}
          {prompt && (
            <p className={`font-bold text-gray-800 ${q?.big ? 'text-4xl' : 'text-xl'}`}>{prompt}</p>
          )}
        </div>

        {renderBody()}

        {feedback && (
          <div className={`w-full mt-4 rounded-2xl p-4 flex items-center justify-between gap-3 ${
            feedback === 'right' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex-1 min-w-0">
              <p className={`font-bold ${feedback === 'right' ? 'text-emerald-700' : 'text-red-600'}`}>
                {feedback === 'right' ? '✓ Правильно!' : '✗ Неверно'}
              </p>
              {feedback === 'wrong' && q?.kind !== 'tap' && q?.kind !== 'match' && (
                <p className="text-sm text-gray-500">Правильный ответ: {correctStr()}</p>
              )}
              {ru(q?.explainByLang) && (
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{ru(q.explainByLang)}</p>
              )}
            </div>
            <button onClick={next}
              className={`shrink-0 px-5 py-2 rounded-xl font-bold text-white ${
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
