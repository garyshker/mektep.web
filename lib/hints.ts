// Option builder for the hint scaffold. Lives here (not in the component) so
// the invariant a stuck child depends on — the right answer is always on the
// board, next to plausible neighbours — can be brute-forced in tests.

export type HintStep = {
  ask: string          // the sub-question, in the child's language
  expr?: string        // optional expression shown big under it
  answer: number
  lo: number; hi: number   // plausible range for the generated options
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

/** Up to 4 shuffled choices: the answer plus near-misses drawn from [lo, hi].
 *  The answer is seeded first, so it is on the board even in a cramped range. */
export function hintOptions(s: HintStep): number[] {
  const set = new Set<number>([s.answer])
  let guard = 0
  while (set.size < 4 && guard++ < 60) {
    const d = s.answer + (Math.floor(Math.random() * 5) - 2)
    if (d >= s.lo && d <= s.hi) set.add(d)
  }
  let pad = s.lo
  while (set.size < 4 && pad <= s.hi) { set.add(pad); pad++ }
  return shuffle([...set])
}
