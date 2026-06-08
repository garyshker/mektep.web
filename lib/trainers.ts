import type { I18NKey } from './i18n'
import { smartOptions, type Op } from './distractors'

export type Problem = { prompt: string; answer: number; options: string[] }

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

const build = (a: number, op: Op, b: number, answer: number): Problem => ({
  prompt: `${a} ${op} ${b}`, answer, options: smartOptions(a, op, b),
})

const genAdd = (): Problem => { const a = ri(2, 49), b = ri(2, 49); return build(a, '+', b, a + b) }
const genSub = (): Problem => { const a = ri(5, 60), b = ri(1, a); return build(a, '−', b, a - b) }
const genMul = (): Problem => { const a = ri(2, 9), b = ri(2, 9); return build(a, '×', b, a * b) }
const genDiv = (): Problem => { const b = ri(2, 9), q = ri(2, 9); return build(b * q, '÷', b, q) }
const genMix = (): Problem => [genAdd, genSub, genMul, genDiv][ri(0, 3)]()

export type Trainer = {
  id: string
  emoji: string
  titleKey: I18NKey
  gen: () => Problem
  color: string
  border: string
}

export const TRAINERS: Trainer[] = [
  { id: 'add', emoji: '➕', titleKey: 'train_add', gen: genAdd, color: '#E7F0FB', border: '#A9CBF0' },
  { id: 'sub', emoji: '➖', titleKey: 'train_sub', gen: genSub, color: '#FFE8ED', border: '#FFC4CF' },
  { id: 'mul', emoji: '✖️', titleKey: 'train_mul', gen: genMul, color: '#E8F5F0', border: '#A8DFCA' },
  { id: 'div', emoji: '➗', titleKey: 'train_div', gen: genDiv, color: '#FFF3E0', border: '#FFD59E' },
  { id: 'mix', emoji: '🔀', titleKey: 'train_mix', gen: genMix, color: '#EDE7FB', border: '#C9B8F0' },
]

export const trainerById = (id: string) => TRAINERS.find(t => t.id === id)

// ── Equations trainer (own page with the animated solver) ─────────────────────
export type EqProblem = { a: number; op: '+' | '-'; b: number; answer: number }
export const genEquation = (): EqProblem => {
  if (Math.random() < 0.5) {
    // x + a = b   →   x = b − a
    const x = ri(2, 20), a = ri(1, 10)
    return { a, op: '+', b: x + a, answer: x }
  }
  // x − a = b   →   x = b + a   (keep x > a so b ≥ 1)
  const a = ri(1, 9), x = ri(a + 1, 20)
  return { a, op: '-', b: x - a, answer: x }
}
