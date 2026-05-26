export type QuestionKind = 'mc' | 'type' | 'clock'

export interface Question {
  kind: QuestionKind
  prompt: string
  options?: string[]
  answer: string
  hint?: string
  // clock specific
  h?: number
  m?: number
  stepsByLang?: { ru: string[]; kk: string[]; en: string[] }
}

export interface Lesson {
  id: string
  subjectId: string
  title: string
  titleKk?: string
  emoji: string
  grade: number[]
  questions: Question[]
}
