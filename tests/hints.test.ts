// The hint scaffold is the child's way out when they are stuck, so its own
// buttons must never be broken: the answer is always offered, and the choices
// are always distinct and plausible.

import { describe, it, expect } from 'vitest'
import { hintOptions, type HintStep } from '@/lib/hints'

// Every (answer, lo, hi) shape the shipped trainers actually ask for.
const RANGES: { lo: number; hi: number }[] = [
  { lo: 0, hi: 5 },    // count — a ten-frame row (empty row is a valid "0")
  { lo: 1, hi: 10 },   // count total, compare towers
  { lo: 0, hi: 10 },   // word problems
  { lo: 0, hi: 20 },   // counting sticks
  { lo: 1, hi: 6 },    // cross-ten: how many to make 10
  { lo: 4, hi: 10 },   // cross-ten: counters in the first frame
  { lo: 8, hi: 12 },   // cross-ten: the full ten
  { lo: 1, hi: 9 },    // cross-ten: the rest
  { lo: 11, hi: 18 },  // cross-ten: the total
  { lo: 2, hi: 10 },   // bonds: the whole
  { lo: 0, hi: 9 },    // bonds: the missing part
  { lo: 1, hi: 9 },    // place value: bundles of ten, tens digit
  { lo: 10, hi: 99 },  // place value: the 2-digit number itself
  { lo: 2, hi: 5 },    // equal groups / sharing: groups and how many in each
  { lo: 2, hi: 30 },   // equal groups / sharing: the total
  { lo: 0, hi: 30 },   // two-step word problems
]

describe('hintOptions', () => {
  it('always offers the answer, in 4 distinct choices, for every range in use', () => {
    for (const { lo, hi } of RANGES) {
      for (let answer = lo; answer <= hi; answer++) {
        for (let run = 0; run < 200; run++) {
          const step: HintStep = { ask: '?', answer, lo, hi }
          const opts = hintOptions(step)
          const ctx = `answer ${answer} in [${lo}, ${hi}]`
          expect(opts, `${ctx}: the answer must be on the board`).toContain(answer)
          expect(new Set(opts).size, `${ctx}: distinct choices (${opts.join(',')})`).toBe(opts.length)
          expect(opts.length, `${ctx}: 4 choices offered`).toBe(4)
          for (const v of opts) {
            expect(Number.isInteger(v), `${ctx}: choice ${v} is a whole number`).toBe(true)
            expect(v, `${ctx}: choice ${v} below the range`).toBeGreaterThanOrEqual(Math.min(lo, answer))
            expect(v, `${ctx}: choice ${v} above the range`).toBeLessThanOrEqual(Math.max(hi, answer))
          }
        }
      }
    }
  })

  it('still returns the answer when the range is too cramped for 4 choices', () => {
    const opts = hintOptions({ ask: '?', answer: 3, lo: 3, hi: 4 })
    expect(opts).toContain(3)
    expect(new Set(opts).size).toBe(opts.length)
  })
})
