import { mathLessons, generateClockLesson, generateAdditionLesson, generateSubtractionLesson } from './math'
import { kazakhLessons } from './kazakh'
import type { Lesson } from './types'

function randomiseTaps(lesson: Lesson): Lesson {
  return {
    ...lesson,
    questions: lesson.questions.map(q => {
      if (q.kind !== 'tap' || !q.words || !q.correctIdxs) return q
      const items = q.words.map((w, i) => ({ w, ok: q.correctIdxs!.includes(i) }))
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]]
      }
      return {
        ...q,
        words: items.map(p => p.w),
        correctIdxs: items.map((p, i) => p.ok ? i : -1).filter(i => i >= 0),
      }
    }),
  }
}

export const ALL_LESSONS: Lesson[] = [
  generateAdditionLesson(),
  generateSubtractionLesson(),
  ...mathLessons.filter(l => l.id !== 'math-1' && l.id !== 'math-2').map(randomiseTaps),
  generateClockLesson(),
  ...kazakhLessons,
]

export const LESSONS_BY_ID: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map(l => [l.id, l])
)

export const SUBJECTS = [
  { id: 'math',    label: 'Математика', labelKk: 'Математика',  descKk: 'Қосу, алу, көбейту, бөлу',    emoji: '📊', color: '#22C55E', bg: '#E8F8EE' },
  { id: 'kazakh',  label: 'Казахский',  labelKk: 'Қазақ тілі', descKk: 'Әліпби, дыбыстар, сөздер',    emoji: '📖', color: '#F59E0B', bg: '#FFF8E8' },
  { id: 'russian', label: 'Русский',    labelKk: 'Орыс тілі',  descKk: 'Орыс тілін үйрен',             emoji: '📝', color: '#3B82F6', bg: '#EEF3FF' },
]

export const UPCOMING_SUBJECTS = [
  { id: 'world',   labelKk: 'Дүниетану',          descKk: 'Табиғат, жануарлар',      emoji: '🌍', color: '#10B981' },
  { id: 'english', labelKk: 'English',             descKk: 'Сөздер мен сөйлемдер',   emoji: '🔤', color: '#6366F1' },
]

export type { Lesson, Question, QuestionKind } from './types'
