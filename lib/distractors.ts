// Pedagogically-targeted wrong answers (common kid mistakes), not random noise.
export type Op = '+' | '−' | '×' | '÷'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function answerOf(a: number, op: Op, b: number): number {
  return op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b
}

/** 4 shuffled options (incl. the answer) with mistake-based distractors. */
export function smartOptions(a: number, op: Op, b: number): string[] {
  const answer = answerOf(a, op, b)

  // Typical mistakes for each operation
  const ideas: number[] = []
  if (op === '+') {
    ideas.push(answer - 10)        // forgot the carry
    ideas.push(answer + 10)        // double-counted the carry
    ideas.push(a + (b % 10))       // added only the units of b
    ideas.push(answer - 1)
  } else if (op === '−') {
    ideas.push(a + b)              // did + instead of −
    ideas.push(answer + 10)        // borrow error
    ideas.push(answer - 10)
    ideas.push(answer + 1)
  } else if (op === '×') {
    ideas.push(a * (b + 1))        // neighbour in the table
    ideas.push(a * (b - 1))        // neighbour in the table
    ideas.push(a + b)              // confused × with +
    ideas.push(answer + a)
  } else { // ÷
    ideas.push(b)                  // gave the divisor
    ideas.push(answer + 1)
    ideas.push(answer - 1)
    ideas.push(answer + 2)
  }

  const wrong: number[] = []
  const seen = new Set<number>([answer])
  const consider = (c: number) => { if (Number.isInteger(c) && c > 0 && !seen.has(c)) { seen.add(c); wrong.push(c) } }

  shuffle(ideas).forEach(c => { if (wrong.length < 3) consider(c) })
  // pad with nearby values if we still need more
  for (const d of [1, -1, 2, -2, 3, -3, 5, -5, 10, -10, 7, -7]) {
    if (wrong.length >= 3) break
    consider(answer + d)
  }

  return shuffle([answer, ...wrong.slice(0, 3)].map(String))
}
