'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LESSONS_BY_ID } from '@/lib/lessons'
import type { Question } from '@/lib/lessons'
import type { ByLang } from '@/lib/lessons/types'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { speak } from '@/lib/speak'

type Feedback = 'right' | 'wrong' | null

function byLang(val: string | ByLang | undefined, lang: string): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return (val as unknown as Record<string, string>)[lang] ?? val.ru ?? ''
}

// Strip trailing "= ?" from pure math expressions
function fmtExpr(s: string): string {
  return s.replace(/\s*=\s*\?\s*$/, '').trim()
}

function BigMath({ text }: { text: string }) {
  const clean = fmtExpr(text)
  const parts = clean.split(/(\s*[+\-−×÷]\s*)/)
  return (
    <div className="text-5xl font-black text-center leading-none tracking-tight py-3 select-none">
      {parts.map((p, i) => {
        const t = p.trim()
        const isOp = /^[+\-−×÷]$/.test(t)
        return (
          <span key={i} className={isOp ? 'text-orange-500 mx-1' : 'text-gray-900'}>
            {t === '-' ? '−' : p}
          </span>
        )
      })}
    </div>
  )
}

function ClockFace({ h, m }: { h: number; m: number }) {
  const cx = 60, cy = 60
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const hourAngle = ((h % 12) + m / 60) * 30
  const minAngle = m * 6
  return (
    <svg width="140" height="140" viewBox="0 0 120 120" className="mx-auto">
      <circle cx={cx} cy={cy} r={55} fill="white" stroke="#e5e7eb" strokeWidth="3" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
        const a = (n * 30 - 90) * (Math.PI / 180)
        return (
          <text key={n} x={cx + 42 * Math.cos(a)} y={cy + 42 * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#374151">{n}</text>
        )
      })}
      <line x1={cx} y1={cy}
        x2={cx + 28 * Math.cos(toRad(hourAngle))} y2={cy + 28 * Math.sin(toRad(hourAngle))}
        stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      <line x1={cx} y1={cy}
        x2={cx + 42 * Math.cos(toRad(minAngle))} y2={cy + 42 * Math.sin(toRad(minAngle))}
        stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="#1f2937" />
    </svg>
  )
}

const LABEL_KEYS: Record<string, 'label_mc' | 'label_type' | 'label_tap' | 'label_word' | 'label_match' | 'label_clock'> = {
  mc: 'label_mc', type: 'label_type', tap: 'label_tap',
  word: 'label_word', match: 'label_match', clock: 'label_clock',
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

  // per-type state
  const [selected, setSelected] = useState<string | null>(null)
  const [typeInput, setTypeInput] = useState('')
  const [tapSel, setTapSel] = useState<Set<number>>(new Set())
  const [matchMap, setMatchMap] = useState<Record<string, number | null>>({})
  const lang = useLang()

  const q: Question | undefined = lesson?.questions[idx]
  const total = lesson?.questions.length ?? 0

  useEffect(() => {
    if (!q) return
    setSelected(null)
    setTypeInput('')
    setTapSel(new Set())
    setMatchMap(Object.fromEntries((q.items ?? []).map(it => [it.text, null])))
  }, [idx])

  if (!lesson) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
      <p className="text-gray-400">{t('not_found', lang)}</p>
    </div>
  )

  const prompt = byLang(q?.promptByLang, lang) || q?.prompt || ''

  const correctStr = (): string => {
    if (!q) return ''
    if (q.kind === 'type') return String(q.answer)
    if (q.options && typeof q.answer === 'number') return q.options[q.answer]
    return String(q.answer ?? '')
  }

  const markResult = (isRight: boolean) => {
    setFeedback(isRight ? 'right' : 'wrong')
    if (isRight) { setCorrectCount(c => c + 1); playCorrect() } else playWrong()
  }

  const retry = () => {
    setFeedback(null)
    setTypeInput('')
    setSelected(null)
    setTapSel(new Set())
    setMatchMap(Object.fromEntries((q?.items ?? []).map(it => [it.text, null])))
  }

  const next = async () => {
    if (idx + 1 >= total) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const final = correctCount
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
    const final = correctCount
    const stars = final >= total ? 3 : final >= total - 2 ? 2 : 1
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">{t('lesson_done', lang)}</h2>
        <p className="text-gray-500 mb-2">{t('score_tmpl', lang).replace('[N]', String(final)).replace('[T]', String(total))}</p>
        <p className="text-emerald-600 font-bold text-xl mb-10">+{15 + final * 5} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/lessons')}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold">
            {t('lessons', lang)}
          </button>
          <button onClick={() => { setIdx(0); setCorrectCount(0); setFeedback(null); setSelected(null); setDone(false) }}
            className="flex-1 py-3 rounded-2xl bg-gray-900 text-white font-bold">
            {t('again', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ─── Option buttons (mc / word / clock) ────────────────────────────
  const renderOptions = (opts: string[]) => {
    const correct = correctStr()
    return (
      <div className="grid grid-cols-2 gap-3">
        {opts.map((opt, i) => {
          const isSel = selected === opt
          const isRight = opt === correct
          let cls = 'bg-white border-2 border-gray-200 text-gray-800'
          if (feedback && isSel && isRight) cls = 'bg-emerald-500 border-emerald-500 text-white'
          else if (feedback && isSel && !isRight) cls = 'bg-red-400 border-red-400 text-white'
          else if (feedback && isRight) cls = 'bg-emerald-100 border-emerald-400 text-emerald-800'
          return (
            <button key={i} onClick={() => {
              if (feedback) return
              playTap()
              setSelected(opt)
              markResult(opt === correct)
            }}
              className={`${cls} rounded-2xl py-5 text-xl font-bold shadow-sm transition-all active:scale-95`}>
              {opt}
            </button>
          )
        })}
      </div>
    )
  }

  // ─── Interaction area per question kind ────────────────────────────
  const renderInteraction = () => {
    if (!q) return null

    if (q.kind === 'mc') return renderOptions(q.options ?? [])
    if (q.kind === 'word') return renderOptions(q.options ?? [])
    if (q.kind === 'clock') return renderOptions(q.options ?? [])

    if (q.kind === 'type') {
      return (
        <div className="flex flex-col gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={typeInput}
            onChange={e => setTypeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !feedback && markResult(typeInput.trim() === String(q.answer))}
            disabled={!!feedback}
            placeholder="?"
            className={`w-full bg-white shadow-sm border-2 rounded-2xl text-center text-4xl font-black py-5 focus:outline-none transition-colors
              ${feedback === 'right' ? 'border-emerald-400 bg-emerald-50' :
                feedback === 'wrong' ? 'border-red-300 bg-red-50' :
                'border-gray-100 focus:border-emerald-400'}`}
          />
          {!feedback && (
            <button
              onClick={() => { playTap(); markResult(typeInput.trim() === String(q.answer)) }}
              className="w-full bg-emerald-400 text-white font-black text-2xl rounded-2xl py-4 shadow-sm active:scale-95 transition-all">
              OK
            </button>
          )}
        </div>
      )
    }

    if (q.kind === 'tap') {
      const words = q.words ?? []
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {words.map((word, i) => {
              const isSel = tapSel.has(i)
              const shouldBe = q.correctIdxs?.includes(i)
              let cls = 'px-4 py-2 rounded-xl border-2 text-base font-semibold transition-all active:scale-95 '
              if (feedback) {
                if (shouldBe && isSel) cls += 'bg-emerald-500 border-emerald-500 text-white'
                else if (shouldBe && !isSel) cls += 'bg-emerald-100 border-emerald-400 text-emerald-800'
                else if (!shouldBe && isSel) cls += 'bg-red-400 border-red-400 text-white'
                else cls += 'bg-white border-gray-200 text-gray-500'
              } else {
                cls += isSel ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'
              }
              return (
                <button key={i} disabled={!!feedback}
                  onClick={() => setTapSel(prev => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i); else next.add(i)
                    return next
                  })}
                  className={cls}>{word}</button>
              )
            })}
          </div>
          {!feedback && (
            <button
              onClick={() => {
                const expected = q.correctIdxs ?? []
                markResult(expected.length === tapSel.size && expected.every(i => tapSel.has(i)))
              }}
              className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg">
              {t('check', lang)}
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
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="min-w-[90px] text-sm font-bold text-gray-900 bg-white shadow-sm border border-gray-100 px-3 py-2.5 rounded-xl text-center">
                {item.text}
              </span>
              <div className="flex gap-2 flex-1">
                {groups.map((g, gi) => {
                  const isAssigned = matchMap[item.text] === gi
                  let cls = 'flex-1 py-2.5 px-1 rounded-xl border-2 text-xs font-semibold transition-all text-center '
                  if (feedback) {
                    if (isAssigned && item.group === gi) cls += 'bg-emerald-500 border-emerald-500 text-white'
                    else if (isAssigned && item.group !== gi) cls += 'bg-red-400 border-red-400 text-white'
                    else if (!isAssigned && item.group === gi) cls += 'bg-emerald-100 border-emerald-400 text-emerald-800'
                    else cls += 'bg-white border-gray-200 text-gray-600'
                  } else {
                    cls += isAssigned ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'
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
            <button
              onClick={() => markResult(items.every(it => matchMap[it.text] === it.group))}
              className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg mt-1">
              {t('check', lang)}
            </button>
          )}
        </div>
      )
    }

    return null
  }

  // ─── Explanation steps for feedback ────────────────────────────────
  const steps = byLang(q?.explainByLang, lang)?.split('\n').filter(Boolean) ?? []

  const feedbackHeight = feedback ? (steps.length > 0 ? 320 : 160) : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F4F0' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 bg-transparent lg:max-w-2xl lg:mx-auto lg:w-full">
        {/* Progress row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/lessons')}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
            ✕
          </button>
          <div className="flex-1 flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  i < idx ? 'bg-emerald-500' : i === idx ? 'bg-emerald-400' : 'bg-gray-300'
                }`} />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-500 shrink-0">{idx + 1}/{total}</span>
        </div>

        {/* Lesson identity row */}
        <div className="flex items-center gap-3 mt-4">
          <div className="w-11 h-11 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl shrink-0">
            {lesson.emoji ?? '📚'}
          </div>
          <div>
            <div className="font-black text-gray-900 text-sm leading-tight">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</div>
            {lesson.subtitle && <div className="text-gray-400 text-xs mt-0.5">{lesson.subtitle}</div>}
          </div>
        </div>
      </header>

      {/* ── Question card ── */}
      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 lg:max-w-2xl lg:mx-auto lg:w-full" style={{ paddingBottom: feedbackHeight + 24 }}>
        <div className="bg-white rounded-3xl px-5 py-5 shadow-sm">
          {/* Label */}
          <p className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase mb-4">
            {t(LABEL_KEYS[q?.kind ?? 'mc'], lang)}
          </p>

          {/* Content */}
          {q?.kind === 'type' && (
            <BigMath text={prompt} />
          )}

          {(q?.kind === 'mc' || q?.kind === 'word') && (
            <>
              {q.image && q.kind !== 'word' && <div className="text-4xl text-center mb-3">{q.image}</div>}
              {q.kind === 'word' && (
                <div className="bg-blue-50 rounded-2xl p-4 mb-0">
                  {q.image && <div className="text-3xl mb-2 text-center">{q.image}</div>}
                  <p className="text-gray-700 text-base leading-relaxed text-center">{byLang(q.storyByLang, lang)}</p>
                </div>
              )}
              {q.kind === 'mc' && (
                q?.big
                  ? (
                    <div className="flex flex-col items-center gap-2">
                      <BigMath text={prompt} />
                      {lesson.subjectId === 'kazakh' && (
                        <button
                          onClick={() => speak(prompt, 'kk-KZ')}
                          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg active:scale-90 transition-all"
                          aria-label="Произнести">
                          🔊
                        </button>
                      )}
                    </div>
                  )
                  : <p className="text-xl font-bold text-gray-800 text-center leading-snug">{prompt}</p>
              )}
            </>
          )}

          {q?.kind === 'clock' && (
            <ClockFace h={q.clockH!} m={q.clockM!} />
          )}

          {(q?.kind === 'tap' || q?.kind === 'match') && (
            <>
              {q.image && <div className="text-4xl text-center mb-3">{q.image}</div>}
              <p className="text-base font-bold text-gray-800 text-center leading-snug">{prompt}</p>
            </>
          )}
        </div>

        {/* ── Interaction area ── */}
        {renderInteraction()}
      </main>

      {/* ── Feedback panel (fixed bottom) ── */}
      {feedback && (
        <div className={`fixed bottom-0 left-0 right-0 px-4 pt-5 pb-10 rounded-t-3xl z-50 ${feedback === 'right' ? 'bg-emerald-400' : 'bg-amber-400'}`}>
         <div className="lg:max-w-2xl lg:mx-auto">

          {/* Title */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✦</span>
            <span className="font-black text-gray-900 text-lg leading-tight">
              {feedback === 'right' ? t('correct_fb', lang) : t('wrong_fb', lang)}
            </span>
          </div>

          {/* Wrong: explanation steps */}
          {feedback === 'wrong' && steps.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">✦</span>
                <span className="text-sm font-semibold text-gray-800 opacity-80">{t('step_by_step', lang)}</span>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/30 rounded-2xl px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-900 font-semibold text-sm">{step}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 bg-white/60 rounded-2xl px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {steps.length + 1}
                  </span>
                  <span className="text-gray-900 font-black text-sm">{t('answer_label', lang)} {correctStr()}</span>
                </div>
              </div>
            </>
          )}

          {/* Wrong: no steps, just show answer */}
          {feedback === 'wrong' && steps.length === 0 && (
            <p className="text-gray-900 font-semibold text-sm mb-4">
              {t('correct_answer', lang)} <span className="font-black">{correctStr()}</span>
            </p>
          )}

          {/* Right: show explain if available */}
          {feedback === 'right' && byLang(q?.explainByLang, lang) && (
            <p className="text-gray-900/80 text-sm mb-4 whitespace-pre-line leading-relaxed">
              {byLang(q.explainByLang, lang)}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {feedback === 'wrong' && q?.kind === 'type' && (
              <button onClick={retry}
                className="flex-1 py-3.5 rounded-2xl bg-amber-200 text-gray-900 font-bold text-base active:scale-95 transition-all">
                {t('retry', lang)}
              </button>
            )}
            <button onClick={next}
              className="flex-1 py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-base active:scale-95 transition-all flex items-center justify-center gap-2">
              {t('next', lang)} <span className="text-lg">→</span>
            </button>
          </div>
         </div>
        </div>
      )}
    </div>
  )
}
