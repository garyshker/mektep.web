// The generic trainers + the equation generator. Same contract everywhere:
// the task must be solvable, and the button set must contain the true answer
// exactly once.

import { describe, it, expect } from 'vitest'
import { TRAINERS, genEquation, genEquationExample } from '@/lib/trainers'
import { smartOptions, answerOf, type Op } from '@/lib/distractors'

const N = 5000

describe('smartOptions', () => {
  const cases: [number, Op, number][] = []
  for (let a = 2; a <= 60; a++) {
    for (let b = 1; b <= 30; b++) {
      cases.push([a, '+', b])
      if (a > b) cases.push([a, '−', b])
    }
  }
  for (let a = 2; a <= 9; a++) for (let b = 2; b <= 9; b++) { cases.push([a, '×', b]); cases.push([a * b, '÷', b]) }

  it('gives 4 distinct options containing the answer, over every task the app can pose', () => {
    for (const [a, op, b] of cases) {
      const answer = answerOf(a, op, b)
      const opts = smartOptions(a, op, b)
      const ctx = `${a} ${op} ${b}`
      expect(opts.length, `${ctx}: 4 options`).toBe(4)
      expect(new Set(opts).size, `${ctx}: distinct options (${opts.join(',')})`).toBe(4)
      expect(opts.filter(o => o === String(answer)).length, `${ctx}: answer appears exactly once`).toBe(1)
      for (const o of opts) {
        expect(Number.isInteger(Number(o)), `${ctx}: option ${o} is a whole number`).toBe(true)
        expect(Number(o), `${ctx}: option ${o} is positive`).toBeGreaterThan(0)
      }
    }
  })
})

describe('trainer generators', () => {
  it('every trainer produces a solvable task whose options hold the answer', () => {
    for (const tr of TRAINERS) {
      for (let i = 0; i < N; i++) {
        const p = tr.gen()
        const ctx = `${tr.id}: ${p.prompt}`
        const [aRaw, op, bRaw] = p.prompt.split(' ')
        const a = Number(aRaw), b = Number(bRaw)
        expect(Number.isInteger(a) && Number.isInteger(b), `${ctx}: numeric operands`).toBe(true)
        // the stated answer must actually be the answer to the stated prompt
        expect(answerOf(a, op as Op, b), `${ctx}: prompt and answer agree`).toBe(p.answer)
        expect(p.answer, `${ctx}: answer is a whole number`).toBe(Math.round(p.answer))
        expect(p.answer, `${ctx}: no negative results for a child`).toBeGreaterThanOrEqual(0)
        expect(p.options.filter(o => o === String(p.answer)).length, `${ctx}: answer among options once`).toBe(1)
        expect(new Set(p.options).size, `${ctx}: distinct options`).toBe(p.options.length)
      }
    }
  })
})

describe('equations', () => {
  it('every generated equation is true and has a positive whole solution', () => {
    for (let i = 0; i < N; i++) {
      const e = genEquation()
      const ctx = e.xRight ? `${e.a} ${e.op} x = ${e.b}` : `x ${e.op} ${e.a} = ${e.b}`
      // substitute the answer back into the equation
      const lhs = e.xRight
        ? (e.op === '+' ? e.a + e.answer : e.a - e.answer)
        : (e.op === '+' ? e.answer + e.a : e.answer - e.a)
      expect(lhs, `${ctx}: substituting x=${e.answer} must satisfy it`).toBe(e.b)
      expect(e.answer, `${ctx}: x is positive`).toBeGreaterThan(0)
      expect(e.b, `${ctx}: right-hand side is positive`).toBeGreaterThan(0)
      expect(e.a, `${ctx}: left operand is positive`).toBeGreaterThan(0)
    }
  })

  it('the worked example has the same form but different numbers', () => {
    for (let i = 0; i < N; i++) {
      const like = genEquation()
      const ex = genEquationExample(like)
      expect(ex.op, 'same operation').toBe(like.op)
      expect(!!ex.xRight, 'same shape').toBe(!!like.xRight)
      const lhs = ex.xRight
        ? (ex.op === '+' ? ex.a + ex.answer : ex.a - ex.answer)
        : (ex.op === '+' ? ex.answer + ex.a : ex.answer - ex.a)
      expect(lhs, 'the example itself must be a true equation').toBe(ex.b)
      // it must not hand the child the very task they are stuck on
      expect(ex.a === like.a && ex.b === like.b, 'example differs from the live task').toBe(false)
    }
  })
})
