import { mathLessons, generateAdditionLesson, generateSubtractionLesson, generateEquationLesson, generateG1AdditionLesson, generateG1SubtractionLesson } from './math'
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
  generateG1AdditionLesson(),       // grade 1 — within 20 (shown first to a grade-1 child)
  generateG1SubtractionLesson(),    // grade 1 — within 20
  generateAdditionLesson(),         // grade 2+ — within 100
  generateSubtractionLesson(),
  generateEquationLesson(),
  ...mathLessons.filter(l => l.id !== 'math-1' && l.id !== 'math-2').map(randomiseTaps),
  // Clock is now a standalone game (/game/clock), not a linear lesson.
  ...kazakhLessons,
]

export const LESSONS_BY_ID: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map(l => [l.id, l])
)

export const SUBJECTS = [
  { id: 'math',    label: 'Математика', labelKk: 'Математика',  labelEn: 'Math',    descKk: 'Қосу, алу, көбейту, бөлу', descRu: 'Сложение, вычитание, умножение', descEn: 'Add, subtract, multiply', emoji: '📊', color: '#22C55E', bg: '#E8F8EE' },
  { id: 'kazakh',  label: 'Казахский',  labelKk: 'Қазақ тілі',  labelEn: 'Kazakh',  descKk: 'Әліпби, дыбыстар, сөздер', descRu: 'Алфавит, звуки, слова',          descEn: 'Alphabet, sounds, words', emoji: '📖', color: '#F59E0B', bg: '#FFF8E8' },
  { id: 'russian', label: 'Русский',    labelKk: 'Орыс тілі',   labelEn: 'Russian', descKk: 'Орыс тілін үйрен',        descRu: 'Учим русский',                   descEn: 'Learn Russian', emoji: '📝', color: '#3B82F6', bg: '#EEF3FF' },
]

export const UPCOMING_SUBJECTS = [
  { id: 'world',   labelKk: 'Дүниетану', labelRu: 'Познание мира', labelEn: 'World', descKk: 'Табиғат, жануарлар', descRu: 'Природа, животные',  descEn: 'Nature, animals',    emoji: '🌍', color: '#10B981' },
  { id: 'english', labelKk: 'English',   labelRu: 'Английский',    labelEn: 'English', descKk: 'Сөздер мен сөйлемдер', descRu: 'Слова и предложения', descEn: 'Words and sentences', emoji: '🔤', color: '#6366F1' },
]

type Lang = 'kk' | 'ru' | 'en'
type SubjectLike = { label?: string; labelKk?: string; labelRu?: string; labelEn?: string; descKk?: string; descRu?: string; descEn?: string }
export const subjectLabel = (s: SubjectLike, lang: Lang) =>
  (lang === 'kk' ? s.labelKk : lang === 'en' ? s.labelEn : (s.labelRu ?? s.label)) ?? s.labelKk ?? s.label ?? ''
export const subjectDesc = (s: SubjectLike, lang: Lang) =>
  (lang === 'kk' ? s.descKk : lang === 'en' ? s.descEn : s.descRu) ?? s.descKk ?? ''

export type { Lesson, Question, QuestionKind } from './types'
