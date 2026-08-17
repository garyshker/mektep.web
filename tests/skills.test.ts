// Brute-force checks on the adaptive engine: every generated task must be
// solvable and correctly classified, every option set must contain exactly one
// true answer, and every diagnoser must name the mistake it claims to name.
// Generators are random, so each invariant runs over thousands of draws.

import { describe, it, expect } from 'vitest'
import {
  ADD_LADDER, SUB_LADDER, MUL_LADDER, DIV_LADDER,
  genAddition, genSubtraction, genMultiplication, genDivision,
  additionSkillOf, subtractionSkillOf,
  additionOptions, subtractionOptions, multiplicationOptions, divisionOptions,
  diagnoseAddition, diagnoseSubtraction, diagnoseMultiplication, diagnoseDivision,
  updateStat, pickSkill, ERROR_TAG_LABEL,
  type AddSkill, type SubSkill, type MulSkill, type DivSkill, type SkillStat, type TaggedOption,
} from '@/lib/skills'

const N = 5000

/** Every option set the child sees must be honest: 4 distinct choices, exactly
 *  one of them correct, all of them plausible (positive integers). */
function expectSaneOptions(opts: TaggedOption[], answer: number, ctx: string, min = 1) {
  const correct = opts.filter(o => o.tag === 'correct')
  expect(correct.length, `${ctx}: exactly one option tagged correct`).toBe(1)
  expect(Number(correct[0].value), `${ctx}: the correct option holds the answer`).toBe(answer)
  const values = opts.map(o => o.value)
  expect(new Set(values).size, `${ctx}: options are distinct (${values.join(',')})`).toBe(values.length)
  expect(opts.length, `${ctx}: 4 options offered`).toBe(4)
  for (const o of opts) {
    const n = Number(o.value)
    expect(Number.isInteger(n), `${ctx}: option ${o.value} is a whole number`).toBe(true)
    // subtraction may legitimately offer 0 (8 − 8); nothing may go negative
    expect(n, `${ctx}: option ${o.value} below the floor`).toBeGreaterThanOrEqual(min)
    expect(ERROR_TAG_LABEL[o.tag] ?? o.tag === 'correct', `${ctx}: tag "${o.tag}" has a parent-facing label`).toBeTruthy()
  }
}

describe('addition', () => {
  it('generates tasks that match the requested skill and stay within 100', () => {
    for (const skill of ADD_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genAddition(skill as AddSkill)
        expect(additionSkillOf(a, b), `gen(${skill}) produced ${a}+${b}`).toBe(skill)
        expect(a + b).toBeLessThanOrEqual(99)
        expect(a).toBeGreaterThan(0)
        expect(b).toBeGreaterThan(0)
      }
    }
  })

  it('offers exactly one correct option', () => {
    for (const skill of ADD_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genAddition(skill as AddSkill)
        expectSaneOptions(additionOptions(a, b), a + b, `${a}+${b}`)
      }
    }
  })

  it('diagnoses: correct answer is never flagged, wrong answer always is', () => {
    for (const skill of ADD_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genAddition(skill as AddSkill)
        expect(diagnoseAddition(a, b, a + b)).toBeNull()
        expect(diagnoseAddition(a, b, a + b + 3)).not.toBeNull()
      }
    }
  })

  it('names the specific slip it claims', () => {
    expect(diagnoseAddition(27, 15, 32)).toBe('forgot_carry')   // added ones, dropped the ten
    expect(diagnoseAddition(27, 15, 12)).toBe('wrong_operation')
    expect(diagnoseAddition(27, 15, 41)).toBe('off_by_one')
    // 23+14 has no carry, so a −10 miss must NOT be blamed on a forgotten carry
    expect(diagnoseAddition(23, 14, 27)).not.toBe('forgot_carry')
  })
})

describe('subtraction', () => {
  it('generates solvable tasks (never negative) matching the skill', () => {
    for (const skill of SUB_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genSubtraction(skill as SubSkill)
        expect(subtractionSkillOf(a, b), `gen(${skill}) produced ${a}−${b}`).toBe(skill)
        expect(a - b, `${a}−${b} must not go negative`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('offers exactly one correct option', () => {
    for (const skill of SUB_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genSubtraction(skill as SubSkill)
        expectSaneOptions(subtractionOptions(a, b), a - b, `${a}−${b}`, 0)
      }
    }
  })

  it('diagnoses correctly', () => {
    for (const skill of SUB_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genSubtraction(skill as SubSkill)
        expect(diagnoseSubtraction(a, b, a - b)).toBeNull()
      }
    }
    expect(diagnoseSubtraction(53, 28, 35)).toBe('forgot_borrow')
    expect(diagnoseSubtraction(53, 28, 81)).toBe('wrong_operation')
  })
})

describe('multiplication & division', () => {
  it('multiplication tasks stay inside the 2–9 tables', () => {
    for (const skill of MUL_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genMultiplication(skill as MulSkill)
        expect(a).toBeGreaterThanOrEqual(2); expect(a).toBeLessThanOrEqual(9)
        expect(b).toBeGreaterThanOrEqual(2); expect(b).toBeLessThanOrEqual(9)
        expectSaneOptions(multiplicationOptions(a, b), a * b, `${a}×${b}`)
        expect(diagnoseMultiplication(a, b, a * b)).toBeNull()
      }
    }
  })

  it('division always divides evenly', () => {
    for (const skill of DIV_LADDER) {
      for (let i = 0; i < N; i++) {
        const { a, b } = genDivision(skill as DivSkill)
        expect(a % b, `${a}÷${b} must be whole`).toBe(0)
        expect(a / b).toBeGreaterThanOrEqual(2)
        expectSaneOptions(divisionOptions(a, b), a / b, `${a}÷${b}`)
        expect(diagnoseDivision(a, b, a / b)).toBeNull()
      }
    }
  })
})

describe('mastery + skill picker', () => {
  it('keeps mastery inside [0,1] and resets the streak on a miss', () => {
    let s: SkillStat | undefined
    for (let i = 0; i < 200; i++) {
      s = updateStat(s, i % 3 !== 0, 'off_by_one', 1_000_000)
      expect(s.mastery).toBeGreaterThanOrEqual(0)
      expect(s.mastery).toBeLessThanOrEqual(1)
      expect(s.correct).toBeLessThanOrEqual(s.attempts)
    }
    const missed = updateStat(s, false, 'off_by_one', 1_000_000)
    expect(missed.streak).toBe(0)
    expect(missed.recentWrong).toBeGreaterThan(0)
  })

  it('schedules a mastered skill into the future, keeps a weak one due now', () => {
    const now = 1_000_000
    let s = updateStat(undefined, true, undefined, now)
    for (let i = 0; i < 20; i++) s = updateStat(s, true, undefined, now)
    expect(s.mastery).toBeGreaterThanOrEqual(0.8)
    expect(s.nextReviewAt!).toBeGreaterThan(now)

    const weak = updateStat(undefined, false, 'random_guess', now)
    expect(weak.nextReviewAt).toBe(now)   // stays in active rotation
  })

  it('never keeps drilling a skill the child has failed 3× in a row', () => {
    const blown: SkillStat = { mastery: 0.1, streak: 0, recentWrong: 3, attempts: 9, correct: 1 }
    const stats: Record<string, SkillStat> = { add_2d_carry: blown }
    for (let roll = 0; roll <= 1; roll += 0.05) {
      const picked = pickSkill(stats, ADD_LADDER, () => roll, 1_000_000)
      expect(picked, `roll ${roll} must not return the fused skill`).not.toBe('add_2d_carry')
      expect(ADD_LADDER).toContain(picked)
    }
  })

  it('always returns a skill from the ladder, whatever the state', () => {
    for (let i = 0; i < 500; i++) {
      const stats: Record<string, SkillStat> = {}
      for (const s of ADD_LADDER) {
        if (Math.random() < 0.7) {
          stats[s] = {
            mastery: Math.random(), streak: Math.floor(Math.random() * 10),
            recentWrong: Math.floor(Math.random() * 5), attempts: Math.floor(Math.random() * 40),
            correct: 0, nextReviewAt: Math.random() < 0.5 ? 0 : 2_000_000,
          }
        }
      }
      expect(ADD_LADDER).toContain(pickSkill(stats, ADD_LADDER, Math.random, 1_000_000))
    }
  })
})
