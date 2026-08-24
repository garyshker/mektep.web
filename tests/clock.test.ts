// Telling the time. Every rung is brute-forced over every dial position it can
// produce, because a clock task that offers two identical times — or the right
// answer twice — is invisible in a screenshot and obvious to a child.

import { describe, it, expect } from 'vitest'
import {
  CLOCK_LADDER, genClockTask, clockOptions, diagnoseClock, swappedHands, fmtTime,
  type ClockLevel,
} from '@/lib/clock'

const ALLOWED: Record<ClockLevel, number[]> = {
  hour: [0],
  half: [0, 30],
  quarter: [0, 15, 30, 45],
  five: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
}

const parse = (s: string) => {
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null
}

describe('clock task generation', () => {
  it('only shows the minutes its rung is allowed to teach', () => {
    for (const level of CLOCK_LADDER) {
      for (let i = 0; i < 2000; i++) {
        const task = genClockTask(level)
        expect(ALLOWED[level], `${level} produced ${task.answer}`).toContain(task.m)
        expect(task.h).toBeGreaterThanOrEqual(1)
        expect(task.h).toBeLessThanOrEqual(12)
      }
    }
  })

  it('offers 4 distinct, readable times with exactly one right answer — every dial position', () => {
    for (const level of CLOCK_LADDER) {
      for (let h = 1; h <= 12; h++) {
        for (const m of ALLOWED[level]) {
          for (let run = 0; run < 20; run++) {
            const opts = clockOptions(h, m, level)
            const ctx = `${fmtTime(h, m)} (${level})`
            expect(opts.length, `${ctx}: 4 options`).toBe(4)
            const values = opts.map(o => o.value)
            expect(new Set(values).size, `${ctx}: distinct (${values.join(', ')})`).toBe(4)
            expect(values.filter(v => v === fmtTime(h, m)).length, `${ctx}: the answer appears once`).toBe(1)
            expect(opts.filter(o => o.tag === 'correct').length, `${ctx}: one option tagged correct`).toBe(1)
            for (const v of values) {
              const p = parse(v)
              expect(p, `${ctx}: "${v}" is not a readable time`).not.toBeNull()
              expect(p!.h >= 1 && p!.h <= 12, `${ctx}: "${v}" has an impossible hour`).toBe(true)
              expect(p!.m >= 0 && p!.m <= 59, `${ctx}: "${v}" has impossible minutes`).toBe(true)
            }
          }
        }
      }
    }
  })
})

describe('the misconceptions it is built around', () => {
  it('swapping the hands: 3:30 read off the long hand is 6:15', () => {
    expect(swappedHands(3, 30)).toBe('6:15')
    expect(swappedHands(3, 0)).toBe('12:15')   // long hand on 12 → "twelve o'clock"
    expect(swappedHands(9, 45)).toBe('9:45')   // this one collides with the answer…
  })

  it('…and a colliding distractor is never offered as a wrong option', () => {
    // 9:45 swaps to itself; the option builder must drop it, not show it twice.
    const values = clockOptions(9, 45, 'quarter').map(o => o.value)
    expect(new Set(values).size).toBe(4)
    expect(values.filter(v => v === '9:45').length).toBe(1)
  })

  it('names the slip behind a wrong pick', () => {
    expect(diagnoseClock(3, 30, '3:30')).toBeNull()
    expect(diagnoseClock(3, 30, '6:15')).toBe('swapped_hands')
    expect(diagnoseClock(3, 30, '4:30')).toBe('hour_ahead')
    expect(diagnoseClock(3, 15, '3:03')).toBe('minute_as_number')
  })
})
