export type QuestionKind = 'mc' | 'type' | 'tap' | 'word' | 'match' | 'clock' | 'tf' | 'pairs' | 'equation' | 'addsub'

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
  // tf — `answer` is 'true' | 'false'
  // pairs — connect a↔b
  pairs?: { a: string; b: string }[]
  // equation — `x op a = b` (or `a − x = b` when xRight), `answer` is x; drives the animated solver
  eq?: { a: number; op: '+' | '-'; b: number; xRight?: boolean }
  // addsub — `a ± b`, `answer` is the result; drives the animated number-line explainer
  nl?: { a: number; op: '+' | '-'; b: number }
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
