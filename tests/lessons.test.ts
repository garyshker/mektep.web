// Lesson content contract. The runner (app/lesson/[id]/page.tsx) grades like this:
//   mc | word | clock      → correct = options[answer]  (answer is an INDEX)
//   type | equation | addsub → typed text compared to String(answer)
//   tap → correctIdxs · tf → String(answer) · match → items[].group · pairs → a↔b
// A question that breaks that shape is either impossible or graded wrong, so
// every lesson — static and generated — is checked against it here.

import { describe, it, expect } from 'vitest'
import { ALL_LESSONS } from '@/lib/lessons'
import {
  generateAdditionLesson, generateSubtractionLesson, generateEquationLesson,
  generateG1AdditionLesson, generateG1SubtractionLesson,
} from '@/lib/lessons/math'
import type { Lesson, Question } from '@/lib/lessons/types'

/** If the prompt is a plain arithmetic expression, compute its true value. */
function arithmeticAnswer(prompt: string | undefined): number | null {
  if (!prompt) return null
  const m = prompt.trim().match(/^(\d+)\s*([+\-−×÷*/])\s*(\d+)$/)
  if (!m) return null
  const a = Number(m[1]), b = Number(m[3])
  switch (m[2]) {
    case '+': return a + b
    case '-': case '−': return a - b
    case '×': case '*': return a * b
    default: return b === 0 ? null : a / b
  }
}

function checkQuestion(q: Question, ctx: string) {
  switch (q.kind) {
    case 'mc':
    case 'word':
    case 'clock': {
      expect(Array.isArray(q.options) && q.options!.length >= 2, `${ctx}: needs options`).toBe(true)
      const opts = q.options!
      expect(typeof q.answer, `${ctx}: answer must be an index`).toBe('number')
      const idx = q.answer as number
      expect(Number.isInteger(idx) && idx >= 0 && idx < opts.length,
        `${ctx}: answer index ${idx} outside options (len ${opts.length})`).toBe(true)
      expect(new Set(opts).size, `${ctx}: duplicate options [${opts.join(', ')}]`).toBe(opts.length)
      for (const o of opts) expect(String(o).trim().length, `${ctx}: empty option`).toBeGreaterThan(0)
      const truth = arithmeticAnswer(q.prompt)
      if (truth !== null) {
        expect(String(opts[idx]), `${ctx}: "${q.prompt}" is ${truth}, but the marked answer is ${opts[idx]}`)
          .toBe(String(truth))
      }
      break
    }
    case 'type': {
      expect(q.answer !== undefined && String(q.answer).trim() !== '', `${ctx}: type question needs an answer`).toBe(true)
      const truth = arithmeticAnswer(q.prompt)
      if (truth !== null) {
        expect(String(q.answer), `${ctx}: "${q.prompt}" is ${truth}, but the expected answer is ${q.answer}`)
          .toBe(String(truth))
      }
      break
    }
    case 'equation': {
      expect(q.eq, `${ctx}: equation needs eq`).toBeTruthy()
      const { a, op, b, xRight } = q.eq!
      const x = Number(q.answer)
      expect(Number.isInteger(x), `${ctx}: x must be a whole number`).toBe(true)
      const lhs = xRight ? (op === '+' ? a + x : a - x) : (op === '+' ? x + a : x - a)
      expect(lhs, `${ctx}: x=${x} does not satisfy the equation`).toBe(b)
      break
    }
    case 'addsub': {
      expect(q.nl, `${ctx}: addsub needs nl`).toBeTruthy()
      const { a, op, b } = q.nl!
      expect(Number(q.answer), `${ctx}: ${a} ${op} ${b} mis-stated`).toBe(op === '+' ? a + b : a - b)
      break
    }
    case 'tap': {
      expect(q.words?.length, `${ctx}: tap needs words`).toBeGreaterThan(0)
      expect(q.correctIdxs?.length, `${ctx}: tap needs at least one correct word`).toBeGreaterThan(0)
      for (const i of q.correctIdxs!) {
        expect(Number.isInteger(i) && i >= 0 && i < q.words!.length,
          `${ctx}: correct index ${i} outside words (len ${q.words!.length})`).toBe(true)
      }
      expect(new Set(q.correctIdxs).size, `${ctx}: repeated correct index`).toBe(q.correctIdxs!.length)
      expect(q.correctIdxs!.length, `${ctx}: every word correct makes the task trivial`).toBeLessThan(q.words!.length)
      break
    }
    case 'tf':
      expect(['true', 'false'], `${ctx}: tf answer must be true/false, got ${q.answer}`).toContain(String(q.answer))
      break
    case 'match': {
      expect(q.items?.length, `${ctx}: match needs items`).toBeGreaterThan(0)
      const g = q.groupsByLang!
      expect(g, `${ctx}: match needs groups`).toBeTruthy()
      expect(g.ru.length === g.kk.length && g.ru.length === g.en.length, `${ctx}: group lists differ in length`).toBe(true)
      for (const it of q.items!) {
        expect(Number.isInteger(it.group) && it.group >= 0 && it.group < g.ru.length,
          `${ctx}: item "${it.text}" points at group ${it.group}, only ${g.ru.length} groups`).toBe(true)
      }
      break
    }
    case 'pairs': {
      expect(q.pairs?.length, `${ctx}: pairs needs pairs`).toBeGreaterThan(0)
      for (const p of q.pairs!) {
        expect(p.a.trim().length, `${ctx}: empty left side`).toBeGreaterThan(0)
        expect(p.b.trim().length, `${ctx}: empty right side`).toBeGreaterThan(0)
      }
      const lefts = q.pairs!.map(p => p.a)
      expect(new Set(lefts).size, `${ctx}: duplicate left sides make the match ambiguous`).toBe(lefts.length)
      break
    }
  }
}

function checkLesson(l: Lesson, tag = '') {
  const ctx0 = `${tag}${l.id}`
  expect(l.questions.length, `${ctx0}: lesson has no questions`).toBeGreaterThan(0)
  expect(l.grade.length, `${ctx0}: lesson targets no grade`).toBeGreaterThan(0)
  for (const lang of ['kk', 'ru', 'en'] as const) {
    expect(l.titleByLang[lang]?.trim().length, `${ctx0}: missing ${lang} title`).toBeGreaterThan(0)
  }
  l.questions.forEach((q, i) => checkQuestion(q, `${ctx0} q${i + 1} (${q.kind})`))
}

describe('lesson catalogue', () => {
  it('has unique ids and a known subject', () => {
    const ids = ALL_LESSONS.map(l => l.id)
    expect(new Set(ids).size, `duplicate lesson ids: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(', ')}`).toBe(ids.length)
    for (const l of ALL_LESSONS) expect(['math', 'kazakh'], `${l.id}: unknown subject`).toContain(l.subjectId)
  })

  it('every shipped lesson question is answerable and correctly keyed', () => {
    for (const l of ALL_LESSONS) checkLesson(l)
  })
})

describe('trilingual content', () => {
  // A Kazakh screen was showing Russian nouns: only the PROMPT of a tap/match
  // question was ever translated, while the words themselves were one flat
  // array. Numbers and expressions need no translation — words do.
  const hasLetters = (s: string) => /\p{L}{2,}/u.test(s.replace(/△/g, ''))

  it('tap words that are words, not numbers, carry kk/ru/en', () => {
    for (const l of ALL_LESSONS) {
      if (l.subjectId !== 'math') continue      // the Kazakh course teaches the words themselves
      l.questions.forEach((q, i) => {
        if (q.kind !== 'tap' || !q.words) return
        if (!q.words.some(hasLetters)) return
        const by = (q as { wordsByLang?: { kk: string[]; ru: string[]; en: string[] } }).wordsByLang
        expect(by, `${l.id} q${i + 1}: worded tap without wordsByLang — a Kazakh child sees Russian`).toBeTruthy()
        for (const lang of ['kk', 'ru', 'en'] as const) {
          expect(by![lang].length, `${l.id} q${i + 1}: ${lang} list length must match words`).toBe(q.words!.length)
          for (const w of by![lang]) expect(w.trim().length, `${l.id} q${i + 1}: empty ${lang} word`).toBeGreaterThan(0)
        }
      })
    }
  })

  it('match items that are words carry kk/ru/en', () => {
    for (const l of ALL_LESSONS) {
      if (l.subjectId !== 'math') continue
      l.questions.forEach((q, i) => {
        if (q.kind !== 'match' || !q.items) return
        for (const it of q.items) {
          if (!hasLetters(it.text)) continue
          expect(it.textByLang, `${l.id} q${i + 1}: "${it.text}" has no textByLang`).toBeTruthy()
          for (const lang of ['kk', 'ru', 'en'] as const) {
            expect(it.textByLang![lang].trim().length, `${l.id} q${i + 1}: empty ${lang} label`).toBeGreaterThan(0)
          }
        }
      })
    }
  })
})

describe('generated lessons (random each time — run them many times)', () => {
  const generators = {
    g1_add: generateG1AdditionLesson,
    g1_sub: generateG1SubtractionLesson,
    add: generateAdditionLesson,
    sub: generateSubtractionLesson,
    eq: generateEquationLesson,
  }

  for (const [name, gen] of Object.entries(generators)) {
    it(`${name}: 300 fresh draws are all valid`, () => {
      for (let i = 0; i < 300; i++) checkLesson(gen(), `${name}#${i} `)
    })
  }

  // A session is meant to run ~5 minutes. Two of these lessons had crept to 11
  // questions, which is where a 7-year-old starts quitting mid-lesson.
  it('stays within 8–10 questions — the agreed session length', () => {
    for (const [name, gen] of Object.entries(generators)) {
      for (let i = 0; i < 50; i++) {
        const n = gen().questions.length
        expect(n, `${name}: ${n} questions, over the 10-question ceiling`).toBeLessThanOrEqual(10)
        expect(n, `${name}: only ${n} questions, under the 8-question floor`).toBeGreaterThanOrEqual(8)
      }
    }
  })
})
