import { mathLessons } from './math'
import type { Lesson } from './types'

export const ALL_LESSONS: Lesson[] = [...mathLessons]

export const LESSONS_BY_ID: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map(l => [l.id, l])
)

export const SUBJECTS = [
  { id: 'math',    label: 'Математика', labelKk: 'Математика', emoji: '🔢', color: '#22C55E', bg: '#F0FDF4' },
  { id: 'kazakh',  label: 'Казахский',  labelKk: 'Қазақ тілі', emoji: '🇰🇿', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'russian', label: 'Русский',    labelKk: 'Орыс тілі',  emoji: '📖', color: '#3B82F6', bg: '#EFF6FF' },
]

export type { Lesson, Question, QuestionKind } from './types'
