export type QuestionKind = 'mc' | 'type' | 'tap' | 'word' | 'match' | 'clock'

export interface ByLang { kk: string; ru: string; en: string }

export interface MatchItem { text: string; group: number }

export interface Question {
  kind: QuestionKind
  // text
  prompt?: string
  promptByLang?: ByLang
  storyByLang?: ByLang
  explainByLang?: ByLang
  image?: string
  big?: boolean
  audio?: string   // Kazakh text to pronounce (shows a 🔊 button in the lesson)
  // mc / word
  options?: string[]
  answer?: number | string
  // type
  // answer is the value
  // tap
  words?: string[]
  correctIdxs?: number[]
  // match
  groupsByLang?: { kk: string[]; ru: string[]; en: string[] }
  items?: MatchItem[]
  // clock
  clockH?: number
  clockM?: number
  stepsByLang?: { kk: string[]; ru: string[]; en: string[] }
}

export interface Lesson {
  id: string
  subjectId: string
  titleByLang: ByLang
  introByLang?: ByLang
  subtitle?: string
  emoji?: string
  grade: number[]
  questions: Question[]
}
