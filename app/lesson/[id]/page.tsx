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
import { Check, X, ArrowRight, Volume2 } from 'lucide-react'
import { LessonComplete } from '@/components/LessonComplete'
import type { CSSProperties } from 'react'

type Feedback = 'right' | 'wrong' | null

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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
          <span key={i} className={isOp ? 'text-orange-500 mx-1' : 'text-foreground'}>
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
  const [completion, setCompletion] = useState<{ earnedXp: number; streak: number; streakUp: boolean }>({ earnedXp: 0, streak: 0, streakUp: false })

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{t('not_found', lang)}</p>
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
      const final = correctCount
      const earned = 15 + final * 5
      const stars = final >= total ? 3 : final >= total - 2 ? 2 : 1
      let newStreak = 0, streakUp = false
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Keep the best stars on replays
        const { data: existing } = await supabase.from('lesson_progress')
          .select('stars').eq('user_id', user.id).eq('lesson_id', lesson.id).maybeSingle()
        const bestStars = Math.max(existing?.stars ?? 0, stars)
        await supabase.from('lesson_progress').upsert({
          user_id: user.id, lesson_id: lesson.id, subject_id: lesson.subjectId,
          stars: bestStars, xp_earned: earned,
        })
        // XP accumulates; streak bumps once per day
        const { data: prof } = await supabase.from('profiles')
          .select('xp, streak, last_active').eq('id', user.id).single()
        const today = new Date(), yest = new Date(); yest.setDate(today.getDate() - 1)
        const tStr = ymd(today), yStr = ymd(yest)
        newStreak = prof?.streak ?? 0
        if (prof?.last_active !== tStr) {
          newStreak = prof?.last_active === yStr ? newStreak + 1 : 1
          streakUp = true
        }
        await supabase.from('profiles')
          .update({ xp: (prof?.xp ?? 0) + earned, streak: newStreak, last_active: tStr })
          .eq('id', user.id)
      }
      setCompletion({ earnedXp: earned, streak: newStreak, streakUp })
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
      <LessonComplete
        stars={stars}
        correct={final}
        total={total}
        xp={completion.earnedXp}
        streak={completion.streak}
        streakUp={completion.streakUp}
        onLessons={() => router.push('/lessons')}
        onAgain={() => { setIdx(0); setCorrectCount(0); setFeedback(null); setSelected(null); setDone(false) }}
      />
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
          let style: CSSProperties = { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', ['--pop-shadow' as string]: 'var(--border)' }
          let anim = ''
          if (feedback && isSel && isRight) {
            style = { background: 'var(--success)', color: 'white', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'var(--brand-deep)' }
            anim = 'animate-mk-pop'
          } else if (feedback && isSel && !isRight) {
            style = { background: 'var(--destructive)', color: 'white', borderColor: 'var(--destructive)', ['--pop-shadow' as string]: 'oklch(0.45 0.2 25)' }
            anim = 'animate-mk-shake'
          } else if (feedback && isRight) {
            style = { background: 'color-mix(in oklch, var(--success) 16%, white)', color: 'var(--success)', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'color-mix(in oklch, var(--success) 28%, white)' }
          }
          return (
            <button key={i} disabled={!!feedback}
              onClick={() => { if (feedback) return; playTap(); setSelected(opt); markResult(opt === correct) }}
              className={`pop-btn rounded-[var(--radius)] py-5 text-xl font-display font-extrabold border-2 min-h-[64px] ${anim}`}
              style={style}>
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
            className={`w-full bg-card border-2 rounded-[var(--radius)] text-center text-4xl font-display font-black py-5 focus:outline-none transition-colors ${feedback ? 'animate-mk-' + (feedback === 'right' ? 'pop' : 'shake') : ''}`}
            style={{
              borderColor: feedback === 'right' ? 'var(--success)' : feedback === 'wrong' ? 'var(--destructive)' : 'var(--border)',
              background: feedback === 'right' ? 'color-mix(in oklch, var(--success) 10%, white)' : feedback === 'wrong' ? 'color-mix(in oklch, var(--destructive) 8%, white)' : 'var(--card)',
            }}
          />
          {!feedback && (
            <button
              onClick={() => { playTap(); markResult(typeInput.trim() === String(q.answer)) }}
              className="pop-btn w-full font-display text-white font-black text-2xl rounded-[var(--radius)] py-4"
              style={{ background: 'var(--gradient-success)', ['--pop-shadow' as string]: 'var(--brand-deep)' } as CSSProperties}>
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
              className="pop-btn w-full py-4 rounded-[var(--radius)] text-white font-display font-black text-lg"
              style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
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
              className="pop-btn w-full py-4 rounded-[var(--radius)] text-white font-display font-black text-lg mt-1"
              style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-5 pb-3 bg-transparent lg:max-w-2xl lg:mx-auto lg:w-full">
        {/* Progress row */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/lessons')} aria-label={t('lessons', lang)}
            className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
            <X size={18} />
          </button>
          <div className="flex-1 flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i === idx ? 'animate-pulse' : ''}`}
                style={{ background: i < idx ? 'var(--success)' : i === idx ? 'color-mix(in oklch, var(--primary) 35%, white)' : 'var(--muted)' }} />
            ))}
          </div>
          <span className="text-sm font-bold text-muted-foreground shrink-0 tabular">{idx + 1}/{total}</span>
        </div>

        {/* Lesson identity row */}
        <div className="flex items-center gap-3 mt-4">
          <div className="w-11 h-11 rounded-2xl bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-2xl shrink-0">
            {lesson.emoji ?? '📚'}
          </div>
          <div>
            <div className="font-display font-black text-foreground text-sm leading-tight">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</div>
            {lesson.subtitle && <div className="text-muted-foreground text-xs mt-0.5">{lesson.subtitle}</div>}
          </div>
        </div>
      </header>

      {/* ── Question card ── */}
      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 lg:max-w-2xl lg:mx-auto lg:w-full" style={{ paddingBottom: feedbackHeight + 24 }}>
        <div className="bg-card rounded-3xl px-5 py-5 shadow-[var(--shadow-md)]">
          {/* Label */}
          <div className="inline-flex items-center mb-4 px-2.5 py-1 rounded-full" style={{ background: 'color-mix(in oklch, var(--primary) 12%, white)' }}>
            <span className="text-[11px] font-black tracking-[0.12em] uppercase leading-none" style={{ color: 'var(--primary)' }}>
              {t(LABEL_KEYS[q?.kind ?? 'mc'], lang)}
            </span>
          </div>

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
                          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: 'color-mix(in oklch, var(--primary) 12%, white)', color: 'var(--primary)' }}
                          aria-label="Дыбыс">
                          <Volume2 size={18} />
                        </button>
                      )}
                    </div>
                  )
                  : <p className="text-xl font-bold text-foreground text-center leading-snug">{prompt}</p>
              )}
            </>
          )}

          {q?.kind === 'clock' && (
            <ClockFace h={q.clockH!} m={q.clockM!} />
          )}

          {(q?.kind === 'tap' || q?.kind === 'match') && (
            <>
              {q.image && <div className="text-4xl text-center mb-3">{q.image}</div>}
              <p className="text-base font-bold text-foreground text-center leading-snug">{prompt}</p>
            </>
          )}
        </div>

        {/* ── Interaction area ── */}
        {renderInteraction()}
      </main>

      {/* ── Feedback panel (fixed bottom) ── */}
      {feedback && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pt-5 pb-10 rounded-t-3xl z-50 animate-mk-pop-in"
          style={{ background: feedback === 'right'
            ? 'color-mix(in oklch, var(--success) 16%, white)'
            : 'color-mix(in oklch, var(--destructive) 13%, white)' }}>
         <div className="lg:max-w-2xl lg:mx-auto">

          {/* Title with icon circle */}
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
              style={{ background: feedback === 'right' ? 'var(--success)' : 'var(--destructive)' }}>
              {feedback === 'right' ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
            </span>
            <span className="font-display font-black text-foreground text-lg leading-tight">
              {feedback === 'right' ? t('correct_fb', lang) : t('wrong_fb', lang)}
            </span>
          </div>

          {/* Wrong: explanation steps */}
          {feedback === 'wrong' && steps.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              <span className="text-xs font-semibold text-foreground/70 mb-0.5">{t('step_by_step', lang)}</span>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/50 rounded-2xl px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 tabular"
                    style={{ background: 'var(--foreground)' }}>{i + 1}</span>
                  <span className="text-foreground font-semibold text-sm">{step}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 bg-white/75 rounded-2xl px-4 py-2.5">
                <span className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0"
                  style={{ background: 'var(--success)' }}>✓</span>
                <span className="text-foreground font-black text-sm">{t('answer_label', lang)} {correctStr()}</span>
              </div>
            </div>
          )}

          {/* Wrong: no steps, just show answer */}
          {feedback === 'wrong' && steps.length === 0 && (
            <p className="text-foreground font-semibold text-sm mb-4">
              {t('correct_answer', lang)} <span className="font-black">{correctStr()}</span>
            </p>
          )}

          {/* Right: show explain if available */}
          {feedback === 'right' && byLang(q?.explainByLang, lang) && (
            <p className="text-foreground/80 text-sm mb-4 whitespace-pre-line leading-relaxed">
              {byLang(q.explainByLang, lang)}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {feedback === 'wrong' && q?.kind === 'type' && (
              <button onClick={retry}
                className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black text-base"
                style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {t('retry', lang)}
              </button>
            )}
            <button onClick={next}
              className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black text-base flex items-center justify-center gap-2"
              style={{ background: feedback === 'right' ? 'var(--success)' : 'var(--foreground)', ['--pop-shadow' as string]: feedback === 'right' ? 'var(--brand-deep)' : 'oklch(0.1 0.02 260)' } as CSSProperties}>
              {t('next', lang)} <ArrowRight size={18} />
            </button>
          </div>
         </div>
        </div>
      )}
    </div>
  )
}
