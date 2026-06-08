// Adaptive engine for Addition (PoC). Pure logic — no Supabase here.
// Skill taxonomy + diagnostic distractors + mastery math + bucket picker.

import type { ByLang } from './lessons/types'

export type AddSkill = 'add_1d' | 'add_2d_no_carry' | 'add_2d_carry'

// Easiest → hardest (used for fallback after the frustration fuse)
export const ADD_LADDER: AddSkill[] = ['add_1d', 'add_2d_no_carry', 'add_2d_carry']

export const ADD_SKILL_LABEL: Record<AddSkill, ByLang> = {
  add_1d:          { ru: 'Однозначные',          kk: 'Бір таңбалы',        en: 'Single-digit' },
  add_2d_no_carry: { ru: 'Без перехода',         kk: 'Ауысусыз',           en: 'No carry' },
  add_2d_carry:    { ru: 'Переход через 10',     kk: 'Ондыққа ауысу',      en: 'Carry over ten' },
}

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const carries = (a: number, b: number) => (a % 10) + (b % 10) >= 10

// Parent-facing, "the system heals" copy for each mistake type
export const ERROR_TAG_LABEL: Record<string, ByLang> = {
  forgot_carry:    { ru: 'Спотыкается на переходе через десяток (например, 27 + 15). Делаем упор на разбор таких примеров.', kk: 'Ондыққа ауысуда қателеседі (мысалы, 27 + 15). Осындай мысалдарды талдауға баса назар аударамыз.', en: 'Stumbles on carrying over ten (e.g. 27 + 15). We focus on these.' },
  wrong_operation: { ru: 'Иногда путает сложение и вычитание.', kk: 'Кейде қосу мен алуды шатастырады.', en: 'Sometimes mixes up adding and subtracting.' },
  off_by_one:      { ru: 'Небольшие промахи в счёте на единицу.', kk: 'Санауда бір санға қателеседі.', en: 'Small off-by-one counting slips.' },
  extra_ten:       { ru: 'Иногда прибавляет лишний десяток.', kk: 'Кейде артық ондық қосады.', en: 'Sometimes adds an extra ten.' },
  random_guess:    { ru: 'Пока угадывает — нужно закрепить счёт.', kk: 'Әзірге болжайды — санауды бекіту керек.', en: 'Still guessing — needs to cement counting.' },
}

// Diagnose a free-typed answer (cleaner signal than MC — almost no lucky guesses)
export function diagnoseAddition(a: number, b: number, typed: number): string | null {
  const ans = a + b
  if (typed === ans) return null
  if (carries(a, b) && typed === ans - 10) return 'forgot_carry'
  if (typed === Math.abs(a - b)) return 'wrong_operation'
  if (typed === ans - 1 || typed === ans + 1) return 'off_by_one'
  return 'random_guess'
}

export function additionSkillOf(a: number, b: number): AddSkill {
  if (a < 10 && b < 10) return 'add_1d'
  return carries(a, b) ? 'add_2d_carry' : 'add_2d_no_carry'
}

export function genAddition(skill: AddSkill): { a: number; b: number } {
  if (skill === 'add_1d') return { a: ri(2, 9), b: ri(2, 9) }
  for (let i = 0; i < 80; i++) {
    const a = ri(11, 79)
    const b = ri(11, Math.min(79, 99 - a))
    if (b < 11) continue
    if (skill === 'add_2d_carry' && carries(a, b)) return { a, b }
    if (skill === 'add_2d_no_carry' && !carries(a, b)) return { a, b }
  }
  return skill === 'add_2d_carry' ? { a: 27, b: 15 } : { a: 23, b: 14 }
}

// ── Diagnostic distractors: each wrong option carries the error it represents ──
export type TaggedOption = { value: string; tag: string }

export function additionOptions(a: number, b: number): TaggedOption[] {
  const ans = a + b
  const out: TaggedOption[] = []
  const push = (v: number, tag: string) => {
    if (v > 0 && v !== ans && !out.some(o => o.value === String(v))) out.push({ value: String(v), tag })
  }
  if (carries(a, b)) push(ans - 10, 'forgot_carry')   // added ones, forgot to carry the ten
  push(Math.abs(a - b), 'wrong_operation')            // subtracted instead of adding
  push(ans + 10, 'extra_ten')
  push(ans - 1, 'off_by_one')
  push(ans + 1, 'off_by_one')
  push(ans + 2, 'near')
  const distractors = out.slice(0, 3)
  const all: TaggedOption[] = [{ value: String(ans), tag: 'correct' }, ...distractors]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  return all
}

// ── Mastery state (mirrors the user_skill_mastery row, client-side) ───────────
export type SkillStat = {
  mastery: number
  streak: number
  recentWrong: number
  attempts: number
  correct: number
  lastErrorTag?: string
  nextReviewAt?: number
}

const FUSE = 3            // wrong-in-a-row that locks a skill (drop to an easier one)
const MASTERED = 0.8

export function updateStat(prev: SkillStat | undefined, correct: boolean, errorTag: string | undefined, nowMs: number): SkillStat {
  const p = prev ?? { mastery: 0, streak: 0, recentWrong: 0, attempts: 0, correct: 0 }
  const mastery = Math.max(0, Math.min(1, p.mastery * 0.75 + (correct ? 1 : 0) * 0.25))
  return {
    mastery,
    streak: correct ? p.streak + 1 : 0,
    recentWrong: correct ? 0 : p.recentWrong + 1,
    attempts: p.attempts + 1,
    correct: p.correct + (correct ? 1 : 0),
    lastErrorTag: correct ? p.lastErrorTag : (errorTag ?? p.lastErrorTag),
    nextReviewAt: mastery >= MASTERED ? nowMs + 2 * 86_400_000 : nowMs,
  }
}

// Bucket picker: 60% practice the weak / 20% explore new / 20% warm-up mastered.
// A skill with FUSE+ wrongs in a row is locked → the picker naturally drops to
// the remaining (easier) skills, restoring the child's morale.
export function pickSkill(stats: Record<string, SkillStat>, rng: () => number = Math.random): AddSkill {
  const stat = (s: AddSkill) => stats[s]
  const avail = ADD_LADDER.filter(s => (stat(s)?.recentWrong ?? 0) < FUSE)
  const pool = avail.length ? avail : (['add_1d'] as AddSkill[])

  const unattempted = pool.filter(s => !stat(s) || stat(s)!.attempts === 0)
  const mastered = pool.filter(s => (stat(s)?.mastery ?? 0) >= MASTERED)
  const practice = pool.filter(s => stat(s) && stat(s)!.attempts > 0 && stat(s)!.mastery < MASTERED)
  const weakest = [...pool].sort((x, y) => (stat(x)?.mastery ?? 0) - (stat(y)?.mastery ?? 0))[0]

  const roll = rng()
  if (roll < 0.6 && practice.length) {
    return [...practice].sort((x, y) => stat(x)!.mastery - stat(y)!.mastery)[0]
  }
  if (roll < 0.8 && unattempted.length) return unattempted[0]   // lowest rung first
  if (mastered.length) return mastered[Math.floor(rng() * mastered.length)]
  return weakest ?? pool[0]
}
