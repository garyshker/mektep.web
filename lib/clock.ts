// Telling the time — task generation and diagnostic distractors.
//
// The clock GAME (/game/clock) throws random 5-minute times at the child from
// the first second. That is practice, not teaching. Reading a dial is learned
// in a fixed order, and each rung has its own misconception:
//
//   hour    — whole hours. The long hand always at 12.
//   half    — half past. The hour hand now sits BETWEEN two numbers, which is
//             where "3:30 → 4:30" is born.
//   quarter — quarter past / quarter to.
//   five    — every 5 minutes: the child must count the dial by fives.
//
// Pure logic, no React: the trainer renders it, the tests brute-force it.

export type ClockLevel = 'hour' | 'half' | 'quarter' | 'five'
export const CLOCK_LADDER: ClockLevel[] = ['hour', 'half', 'quarter', 'five']

/** Minutes each rung is allowed to show. */
const MINUTES: Record<ClockLevel, number[]> = {
  hour: [0],
  half: [0, 30],
  quarter: [0, 15, 30, 45],
  five: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
}

export type TimeOption = { value: string; tag: string }
export type ClockTask = { h: number; m: number; level: ClockLevel; answer: string; options: TimeOption[] }

export const fmtTime = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

/** What the child would answer if they swapped the hands: the LONG hand read as
 *  the hour, the short one as minutes. The single most common clock error. */
export function swappedHands(h: number, m: number): string {
  const asHour = m / 5 === 0 ? 12 : m / 5          // where the long hand points
  const asMinutes = ((h % 12) * 5) % 60            // where the short hand points
  return fmtTime(asHour, asMinutes)
}

export function clockOptions(h: number, m: number, level: ClockLevel): TimeOption[] {
  const answer = fmtTime(h, m)
  const out: TimeOption[] = []
  const push = (v: string, tag: string) => {
    if (v !== answer && !out.some(o => o.value === v)) out.push({ value: v, tag })
  }

  // Every distractor names a real mistake rather than being noise.
  push(swappedHands(h, m), 'swapped_hands')
  push(fmtTime((h % 12) + 1, m), 'hour_ahead')          // hour hand read as the next number
  if (m > 0) push(fmtTime(h, m / 5), 'minute_as_number') // "3:15" read as "3:03"
  push(fmtTime(h === 1 ? 12 : h - 1, m), 'hour_behind')
  push(fmtTime(h, (m + 30) % 60), 'half_off')
  push(fmtTime(h, m === 0 ? 55 : m - 5), 'five_off')

  const picked = out.slice(0, 3)
  // Pad from the same rung, so a wrong option never looks obviously impossible.
  let guard = 0
  while (picked.length < 3 && guard++ < 60) {
    const v = fmtTime(ri(1, 12), MINUTES[level][ri(0, MINUTES[level].length - 1)])
    if (v !== answer && !picked.some(o => o.value === v)) picked.push({ value: v, tag: 'other' })
  }
  return shuffle([{ value: answer, tag: 'correct' }, ...picked])
}

export function genClockTask(level: ClockLevel): ClockTask {
  const h = ri(1, 12)
  const mins = MINUTES[level]
  const m = mins[ri(0, mins.length - 1)]
  return { h, m, level, answer: fmtTime(h, m), options: clockOptions(h, m, level) }
}

/** Diagnose a wrong pick, so the trainer can say what went wrong. */
export function diagnoseClock(h: number, m: number, picked: string): string | null {
  if (picked === fmtTime(h, m)) return null
  if (picked === swappedHands(h, m)) return 'swapped_hands'
  if (picked === fmtTime((h % 12) + 1, m)) return 'hour_ahead'
  if (m > 0 && picked === fmtTime(h, m / 5)) return 'minute_as_number'
  return 'other'
}
