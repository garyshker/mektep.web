// Adaptive engine for Addition (PoC). Pure logic — no Supabase here.
// Skill taxonomy + diagnostic distractors + mastery math + bucket picker.

import type { ByLang } from './lessons/types'
import type { I18NKey } from './i18n'

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
  forgot_borrow:   { ru: 'Спотыкается на занимании десятка (например, 53 − 28). Делаем упор на разбор таких примеров.', kk: 'Ондық алуда қателеседі (мысалы, 53 − 28). Осындай мысалдарды талдауға баса назар аударамыз.', en: 'Stumbles on borrowing a ten (e.g. 53 − 28). We focus on these.' },
  subtracted_smaller: { ru: 'Вычитает меньшую цифру из большей в столбик, не занимая десяток.', kk: 'Бағанада кіші санды үлкеннен алады, ондық алмайды.', en: 'Subtracts the smaller digit from the larger without borrowing.' },
  off_by_one:      { ru: 'Небольшие промахи в счёте на единицу.', kk: 'Санауда бір санға қателеседі.', en: 'Small off-by-one counting slips.' },
  near:            { ru: 'Часто отвечает близко к верному — счёт почти закрепился, нужна точность.', kk: 'Жиі дұрысқа жақын жауап береді — санау бекіндеп қалды, дәлдік керек.', en: 'Often answers close to correct — nearly there, just needs precision.' },
  extra_ten:       { ru: 'Иногда прибавляет лишний десяток.', kk: 'Кейде артық ондық қосады.', en: 'Sometimes adds an extra ten.' },
  random_guess:    { ru: 'Пока угадывает — нужно закрепить счёт.', kk: 'Әзірге болжайды — санауды бекіту керек.', en: 'Still guessing — needs to cement counting.' },
  table_neighbor:  { ru: 'Путает соседние факты в таблице умножения (например, 7×8 и 7×7).', kk: 'Көбейту кестесіндегі көрші фактілерді шатастырады (мысалы, 7×8 және 7×7).', en: 'Mixes up neighbouring facts in the times table (e.g. 7×8 vs 7×7).' },
  used_addition:   { ru: 'Иногда складывает вместо умножения.', kk: 'Кейде көбейтудің орнына қосады.', en: 'Sometimes adds instead of multiplying.' },
  one_group_off:   { ru: 'Ошибается на одну группу при умножении.', kk: 'Көбейткенде бір топқа қателеседі.', en: 'Off by one group when multiplying.' },
  gave_divisor:    { ru: 'При делении называет делитель вместо частного.', kk: 'Бөлгенде бөлінді орнына бөлгішті айтады.', en: 'Gives the divisor instead of the quotient when dividing.' },
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

// Spaced repetition (Leitner-style): the longer the correct streak on a mastered
// skill, the further out its next review. Keeps mastered facts fresh without
// re-drilling them every day.
const REVIEW_DAYS = [2, 5, 14, 30]       // streak bucket → days until next review
function reviewDelayMs(streak: number): number {
  const idx = streak >= 8 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0
  return REVIEW_DAYS[idx] * 86_400_000
}

export function updateStat(prev: SkillStat | undefined, correct: boolean, errorTag: string | undefined, nowMs: number = Date.now()): SkillStat {
  const p = prev ?? { mastery: 0, streak: 0, recentWrong: 0, attempts: 0, correct: 0 }
  const mastery = Math.max(0, Math.min(1, p.mastery * 0.75 + (correct ? 1 : 0) * 0.25))
  const streak = correct ? p.streak + 1 : 0
  return {
    mastery,
    streak,
    recentWrong: correct ? 0 : p.recentWrong + 1,
    attempts: p.attempts + 1,
    correct: p.correct + (correct ? 1 : 0),
    lastErrorTag: correct ? p.lastErrorTag : (errorTag ?? p.lastErrorTag),
    // Mastered → schedule a future review (interval grows with the streak);
    // not yet mastered → keep it in active rotation (due now).
    nextReviewAt: mastery >= MASTERED ? nowMs + reviewDelayMs(streak) : nowMs,
  }
}

// Bucket picker: 60% practice the weak / due reviews / 20% explore new / 20% warm-up.
// A skill with FUSE+ wrongs in a row is locked → the picker naturally drops to
// the remaining (easier) skills, restoring the child's morale. Generic over any
// difficulty ladder (addition, subtraction, …).
export function pickSkill(stats: Record<string, SkillStat>, ladder: string[], rng: () => number = Math.random, now: number = Date.now()): string {
  const stat = (s: string) => stats[s]
  const avail = ladder.filter(s => (stat(s)?.recentWrong ?? 0) < FUSE)
  const pool = avail.length ? avail : [ladder[0]]

  const unattempted = pool.filter(s => !stat(s) || stat(s)!.attempts === 0)
  const mastered = pool.filter(s => (stat(s)?.mastery ?? 0) >= MASTERED)
  const practice = pool.filter(s => stat(s) && stat(s)!.attempts > 0 && stat(s)!.mastery < MASTERED)
  const weakest = [...pool].sort((x, y) => (stat(x)?.mastery ?? 0) - (stat(y)?.mastery ?? 0))[0]

  // Spaced repetition: mastered skills whose review has come due, most overdue first.
  const due = mastered
    .filter(s => (stat(s)!.nextReviewAt ?? 0) <= now)
    .sort((x, y) => (stat(x)!.nextReviewAt ?? 0) - (stat(y)!.nextReviewAt ?? 0))

  const roll = rng()
  if (roll < 0.6 && practice.length) {
    return [...practice].sort((x, y) => stat(x)!.mastery - stat(y)!.mastery)[0]
  }
  if (due.length) return due[0]                                 // refresh before exploring new
  if (roll < 0.8 && unattempted.length) return unattempted[0]   // lowest rung first
  if (mastered.length) return mastered[Math.floor(rng() * mastered.length)]
  return weakest ?? pool[0]
}

// ── Subtraction (within 100) — mirrors addition ───────────────────────────────
export type SubSkill = 'sub_1d' | 'sub_2d_no_borrow' | 'sub_2d_borrow'
export const SUB_LADDER: SubSkill[] = ['sub_1d', 'sub_2d_no_borrow', 'sub_2d_borrow']

export const SUB_SKILL_LABEL: Record<SubSkill, ByLang> = {
  sub_1d:           { ru: 'Однозначные',        kk: 'Бір таңбалы',        en: 'Single-digit' },
  sub_2d_no_borrow: { ru: 'Без занимания',      kk: 'Алусыз',             en: 'No borrow' },
  sub_2d_borrow:    { ru: 'Занимание десятка',  kk: 'Ондық алу',          en: 'Borrow a ten' },
}

const borrows = (a: number, b: number) => (a % 10) < (b % 10)

export function subtractionSkillOf(a: number, b: number): SubSkill {
  if (a < 10 && b < 10) return 'sub_1d'
  return borrows(a, b) ? 'sub_2d_borrow' : 'sub_2d_no_borrow'
}

export function genSubtraction(skill: SubSkill): { a: number; b: number } {
  if (skill === 'sub_1d') { const a = ri(3, 9); return { a, b: ri(1, a) } }
  for (let i = 0; i < 80; i++) {
    const a = ri(21, 98)
    const b = ri(11, a - 1)
    if (b < 11) continue
    if (skill === 'sub_2d_borrow' && borrows(a, b)) return { a, b }
    if (skill === 'sub_2d_no_borrow' && !borrows(a, b)) return { a, b }
  }
  return skill === 'sub_2d_borrow' ? { a: 53, b: 28 } : { a: 48, b: 23 }
}

export function subtractionOptions(a: number, b: number): TaggedOption[] {
  const ans = a - b
  const out: TaggedOption[] = []
  const push = (v: number, tag: string) => {
    if (v >= 0 && v !== ans && !out.some(o => o.value === String(v))) out.push({ value: String(v), tag })
  }
  if (borrows(a, b)) push(ans + 10, 'forgot_borrow')   // borrowed in the ones, forgot to drop a ten
  // "subtract the smaller digit from the larger" in each column
  const ss = Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10))
  push(ss, 'subtracted_smaller')
  push(a + b, 'wrong_operation')                        // added instead
  push(ans - 1, 'off_by_one')
  push(ans + 1, 'off_by_one')
  push(ans + 2, 'near')
  const distractors = out.slice(0, 3)
  const all: TaggedOption[] = [{ value: String(ans), tag: 'correct' }, ...distractors]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  return all
}

export function diagnoseSubtraction(a: number, b: number, typed: number): string | null {
  const ans = a - b
  if (typed === ans) return null
  if (borrows(a, b) && typed === ans + 10) return 'forgot_borrow'
  const ss = Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10))
  if (typed === ss && ss !== ans) return 'subtracted_smaller'
  if (typed === a + b) return 'wrong_operation'
  if (typed === ans - 1 || typed === ans + 1) return 'off_by_one'
  return 'random_guess'
}

// ── Multiplication (times tables 2–9) ─────────────────────────────────────────
export type MulSkill = 'mul_easy' | 'mul_mid' | 'mul_hard'
export const MUL_LADDER: MulSkill[] = ['mul_easy', 'mul_mid', 'mul_hard']
const MUL_SET: Record<MulSkill, number[]> = { mul_easy: [2, 3, 4, 5], mul_mid: [6, 7], mul_hard: [8, 9] }

export const MUL_SKILL_LABEL: Record<MulSkill, ByLang> = {
  mul_easy: { ru: 'Таблица 2–5', kk: '2–5 кестесі', en: 'Tables 2–5' },
  mul_mid:  { ru: 'Таблица 6–7', kk: '6–7 кестесі', en: 'Tables 6–7' },
  mul_hard: { ru: 'Таблица 8–9', kk: '8–9 кестесі', en: 'Tables 8–9' },
}

export function genMultiplication(skill: MulSkill): { a: number; b: number } {
  const set = MUL_SET[skill]
  const a = set[Math.floor(Math.random() * set.length)]
  return { a, b: ri(2, 9) }
}

export function multiplicationOptions(a: number, b: number): TaggedOption[] {
  const ans = a * b
  const out: TaggedOption[] = []
  const push = (v: number, tag: string) => {
    if (Number.isInteger(v) && v > 0 && v !== ans && !out.some(o => o.value === String(v))) out.push({ value: String(v), tag })
  }
  push(a * (b + 1), 'table_neighbor')   // the next fact in the table
  push(a * (b - 1), 'table_neighbor')   // the previous fact
  push(a + b, 'used_addition')          // added instead of multiplying
  push(ans + a, 'one_group_off')        // one extra group
  push(ans - a, 'one_group_off')        // one group short
  push(ans + 1, 'near'); push(ans - 1, 'near')
  const distractors = out.slice(0, 3)
  const all: TaggedOption[] = [{ value: String(ans), tag: 'correct' }, ...distractors]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[all[i], all[j]] = [all[j], all[i]] }
  return all
}

export function diagnoseMultiplication(a: number, b: number, typed: number): string | null {
  const ans = a * b
  if (typed === ans) return null
  if (typed === a * (b + 1) || typed === a * (b - 1)) return 'table_neighbor'
  if (typed === a + b) return 'used_addition'
  if (typed === ans + a || typed === ans - a) return 'one_group_off'
  return 'random_guess'
}

// ── Division (inverse of the tables; whole-number quotients) ───────────────────
export type DivSkill = 'div_easy' | 'div_mid' | 'div_hard'
export const DIV_LADDER: DivSkill[] = ['div_easy', 'div_mid', 'div_hard']
const DIV_SET: Record<DivSkill, number[]> = { div_easy: [2, 3, 4, 5], div_mid: [6, 7], div_hard: [8, 9] }

export const DIV_SKILL_LABEL: Record<DivSkill, ByLang> = {
  div_easy: { ru: 'Деление 2–5', kk: '2–5-ке бөлу', en: 'Divide by 2–5' },
  div_mid:  { ru: 'Деление 6–7', kk: '6–7-ге бөлу', en: 'Divide by 6–7' },
  div_hard: { ru: 'Деление 8–9', kk: '8–9-ға бөлу', en: 'Divide by 8–9' },
}

export function genDivision(skill: DivSkill): { a: number; b: number } {
  const set = DIV_SET[skill]
  const b = set[Math.floor(Math.random() * set.length)]
  const q = ri(2, 9)
  return { a: b * q, b }   // a ÷ b = q, always whole
}

export function divisionOptions(a: number, b: number): TaggedOption[] {
  const ans = a / b
  const out: TaggedOption[] = []
  const push = (v: number, tag: string) => {
    if (Number.isInteger(v) && v > 0 && v !== ans && !out.some(o => o.value === String(v))) out.push({ value: String(v), tag })
  }
  push(b, 'gave_divisor')               // answered with the divisor
  push(ans + 1, 'off_by_one'); push(ans - 1, 'off_by_one')
  push(ans + 2, 'near'); push(ans - 2, 'near')
  push(b + 1, 'near')
  const distractors = out.slice(0, 3)
  const all: TaggedOption[] = [{ value: String(ans), tag: 'correct' }, ...distractors]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[all[i], all[j]] = [all[j], all[i]] }
  return all
}

export function diagnoseDivision(a: number, b: number, typed: number): string | null {
  const ans = a / b
  if (typed === ans) return null
  if (typed === b) return 'gave_divisor'
  if (typed === ans - 1 || typed === ans + 1) return 'off_by_one'
  return 'random_guess'
}

// ── Ladder registry ───────────────────────────────────────────────────────────
// Single source of truth: every adaptive trainer ladder. The progress dashboard
// and any other consumer should iterate this so new ladders appear automatically.
export type SkillLadder = { id: string; titleKey: I18NKey; trainerPath: string; ladder: string[]; label: Record<string, ByLang> }
export const SKILL_LADDERS: SkillLadder[] = [
  { id: 'add', titleKey: 'train_add', trainerPath: '/train/smart-add', ladder: ADD_LADDER, label: ADD_SKILL_LABEL },
  { id: 'sub', titleKey: 'train_sub', trainerPath: '/train/smart-sub', ladder: SUB_LADDER, label: SUB_SKILL_LABEL },
  { id: 'mul', titleKey: 'train_smart_mul', trainerPath: '/train/smart-mul', ladder: MUL_LADDER, label: MUL_SKILL_LABEL },
  { id: 'div', titleKey: 'train_smart_div', trainerPath: '/train/smart-div', ladder: DIV_LADDER, label: DIV_SKILL_LABEL },
]

// All skill ids across every ladder, and a flat id→label map.
export const ALL_SKILL_IDS: string[] = SKILL_LADDERS.flatMap(l => l.ladder)
export const SKILL_LABEL_ALL: Record<string, ByLang> = Object.assign({}, ...SKILL_LADDERS.map(l => l.label))
// Which trainer a given skill belongs to (for "practice this" links).
export function trainerPathForSkill(skill: string): string {
  return SKILL_LADDERS.find(l => l.ladder.includes(skill))?.trainerPath ?? '/train/smart-add'
}
