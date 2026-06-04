import type { I18NKey } from './i18n'

export type Problem = { prompt: string; answer: number; options: string[] }

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
function sfl<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

// 4 multiple-choice options around the answer
function mcOptions(answer: number): string[] {
  const set = new Set<number>([answer])
  for (const d of sfl([1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 10, -10])) {
    if (set.size >= 4) break
    const c = answer + d
    if (c >= 0) set.add(c)
  }
  while (set.size < 4) set.add(answer + set.size * 7)
  return sfl([...set]).map(String)
}

const build = (a: number, op: string, b: number, answer: number): Problem => ({
  prompt: `${a} ${op} ${b}`, answer, options: mcOptions(answer),
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
