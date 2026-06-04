import type { Lesson, Question } from './types'
import { smartOptions } from '../distractors'

// ── Shared helpers ────────────────────────────────────────────────────────────

const _ri = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

function _sfl<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = _ri(0, i);[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function _steps(a: number, op: '+' | '−', b: number): string {
  const tens = Math.floor(b / 10) * 10
  const ones = b % 10
  const r = op === '+' ? a + b : a - b
  if (tens > 0 && ones > 0) {
    const mid = op === '+' ? a + tens : a - tens
    return `${a} ${op} ${tens} = ${mid}\n${mid} ${op} ${ones} = ${r} ✓`
  }
  return `${a} ${op} ${b} = ${r} ✓`
}

function _tapQ(prompt: { kk: string; ru: string; en: string }, correct: string[], wrong: string[]): Question {
  const items = _sfl([
    ...correct.map(e => ({ e, ok: true })),
    ...wrong.map(e => ({ e, ok: false })),
  ])
  return {
    kind: 'tap',
    promptByLang: prompt,
    words: items.map(x => x.e),
    correctIdxs: items.map((x, i) => x.ok ? i : -1).filter(i => i >= 0),
  }
}

// ── Dynamic lesson generators ────────────────────────────────────────────────

export function generateAdditionLesson(): Lesson {
  const used = new Set<string>()
  const pair = (aMin: number, aMax: number, bMin: number, bMax: number) => {
    let a: number, b: number, key: string
    do { a = _ri(aMin, aMax); b = _ri(bMin, bMax); key = `${a}+${b}` } while (used.has(key))
    used.add(key)
    return { a, b }
  }

  const mc = Array.from({ length: 3 }, () => {
    const { a, b } = pair(15, 65, 10, 30)
    const ans = a + b; const opts = smartOptions(a, '+', b)
    return {
      kind: 'mc' as const, big: true, prompt: `${a} + ${b}`,
      options: opts, answer: opts.indexOf(String(ans)),
      explainByLang: { kk: _steps(a, '+', b), ru: _steps(a, '+', b), en: _steps(a, '+', b) },
    }
  })

  const typ = Array.from({ length: 3 }, () => {
    const { a, b } = pair(15, 60, 10, 35)
    return {
      kind: 'type' as const, prompt: `${a} + ${b} = ?`, answer: a + b,
      explainByLang: { kk: _steps(a, '+', b), ru: _steps(a, '+', b), en: _steps(a, '+', b) },
    }
  })

  // Tap: random threshold so pattern varies
  const thr = [20, 30, 40, 50][_ri(0, 3)]
  const pool = Array.from({ length: 20 }, () => {
    const a = _ri(5, 60), b = _ri(5, 60)
    return { expr: `${a}+${b}`, correct: a + b > thr }
  })
  const tapQ = _tapQ(
    { kk: `Қосындысы ${thr}-дан үлкен мысалдарды тап`, ru: `Найди примеры, где сумма больше ${thr}`, en: `Find sums greater than ${thr}` },
    _sfl(pool.filter(p => p.correct)).slice(0, 4).map(p => p.expr),
    _sfl(pool.filter(p => !p.correct)).slice(0, 4).map(p => p.expr),
  )

  // Word problem — pick one of 3 templates
  const wordFns = [
    () => { const { a, b } = pair(20, 55, 10, 40); const ans = a + b; const opts = smartOptions(a, '+', b)
      return { kind: 'word' as const, image: '🍎',
        storyByLang: { kk: `Дүкенде ${a} алма мен ${b} алмұрт бар. Барлығы?`, ru: `В магазине ${a} яблок и ${b} груш. Сколько всего фруктов?`, en: `A shop has ${a} apples and ${b} pears. Total?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
    () => { const { a, b } = pair(25, 60, 10, 35); const ans = a + b; const opts = smartOptions(a, '+', b)
      return { kind: 'word' as const, image: '✏️',
        storyByLang: { kk: `Болатта ${a} қалам болды, досы ${b} берді. Барлығы қанша?`, ru: `У Болата было ${a} карандашей, друг дал ${b}. Сколько стало?`, en: `Bolat had ${a} pencils, got ${b} more. Total?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
    () => { const { a, b } = pair(30, 55, 15, 40); const ans = a + b; const opts = smartOptions(a, '+', b)
      return { kind: 'word' as const, image: '🚌',
        storyByLang: { kk: `Автобуста ${a} адам болды, аялдамада ${b} мінді. Барлығы қанша?`, ru: `В автобусе было ${a} человек, на остановке вошли ${b}. Сколько стало?`, en: `Bus had ${a} people, ${b} more got on. Total?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
  ]
  const wordQ = _sfl(wordFns)[0]()

  return {
    id: 'math-1', subjectId: 'math', emoji: '➕',
    titleByLang: { kk: 'Қосу · 100 ішінде', ru: 'Сложение до 100', en: 'Addition · within 100' },
    introByLang: { kk: '100-ге дейінгі сандарды қосуды үйренеміз!', ru: 'Учимся складывать числа в пределах 100!', en: "Let's practise adding numbers within 100!" },
    grade: [1, 2, 3, 4],
    questions: [...mc, ...typ, tapQ, wordQ],
  }
}

export function generateSubtractionLesson(): Lesson {
  const used = new Set<string>()
  const pair = (aMin: number, aMax: number, bMin: number, bMax: number) => {
    let a: number, b: number, key: string
    do { a = _ri(aMin, aMax); b = _ri(bMin, Math.min(bMax, a - 1)); key = `${a}-${b}` } while (used.has(key) || b <= 0)
    used.add(key)
    return { a, b }
  }

  const mc = Array.from({ length: 3 }, () => {
    const { a, b } = pair(30, 90, 10, 45)
    const ans = a - b; const opts = smartOptions(a, '−', b)
    return {
      kind: 'mc' as const, big: true, prompt: `${a} − ${b}`,
      options: opts, answer: opts.indexOf(String(ans)),
      explainByLang: { kk: _steps(a, '−', b), ru: _steps(a, '−', b), en: _steps(a, '−', b) },
    }
  })

  const typ = Array.from({ length: 3 }, () => {
    const { a, b } = pair(35, 95, 10, 50)
    return {
      kind: 'type' as const, prompt: `${a} − ${b} = ?`, answer: a - b,
      explainByLang: { kk: _steps(a, '−', b), ru: _steps(a, '−', b), en: _steps(a, '−', b) },
    }
  })

  // Tap: find results less than threshold
  const thr = [20, 25, 30, 35][_ri(0, 3)]
  const pool = Array.from({ length: 20 }, () => {
    const a = _ri(20, 90), b = _ri(5, a - 1)
    return { expr: `${a}−${b}`, correct: a - b < thr }
  })
  const tapQ = _tapQ(
    { kk: `Айырмасы ${thr}-дан кіші мысалдарды тап`, ru: `Найди примеры, где разность меньше ${thr}`, en: `Find results less than ${thr}` },
    _sfl(pool.filter(p => p.correct)).slice(0, 4).map(p => p.expr),
    _sfl(pool.filter(p => !p.correct)).slice(0, 4).map(p => p.expr),
  )

  const wordFns = [
    () => { const { a, b } = pair(40, 80, 15, 35); const ans = a - b; const opts = smartOptions(a, '−', b)
      return { kind: 'word' as const, image: '🍭',
        storyByLang: { kk: `Айдада ${a} карамель болды. Ол ${b}-ін берді. Қанша қалды?`, ru: `У Айды было ${a} конфет. Она отдала ${b}. Сколько осталось?`, en: `Aida had ${a} sweets, gave away ${b}. How many left?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
    () => { const { a, b } = pair(50, 90, 20, 45); const ans = a - b; const opts = smartOptions(a, '−', b)
      return { kind: 'word' as const, image: '📚',
        storyByLang: { kk: `Кітапхананың ${a} кітабы болды. ${b}-ін оқушылар алып кетті. Қанша қалды?`, ru: `В библиотеке было ${a} книг. Ученики взяли ${b}. Сколько осталось?`, en: `Library had ${a} books, students took ${b}. How many left?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
    () => { const { a, b } = pair(60, 100, 25, 55); const ans = a - b; const opts = smartOptions(a, '−', b)
      return { kind: 'word' as const, image: '💰',
        storyByLang: { kk: `Болатта ${a} теңге болды. Ол ${b} теңгеге нан сатып алды. Қанша қалды?`, ru: `У Болата было ${a} тенге. Он купил хлеб за ${b} тенге. Сколько осталось?`, en: `Bolat had ${a} tenge, spent ${b}. How much left?` },
        options: opts, answer: opts.indexOf(String(ans)) } },
  ]
  const wordQ = _sfl(wordFns)[0]()

  return {
    id: 'math-2', subjectId: 'math', emoji: '➖',
    titleByLang: { kk: 'Алу · 100 ішінде', ru: 'Вычитание до 100', en: 'Subtraction · within 100' },
    introByLang: { kk: '100-ге дейінгі сандарды алуды үйренеміз!', ru: 'Учимся вычитать в пределах 100!', en: "Let's practise subtraction within 100!" },
    grade: [1, 2, 3, 4],
    questions: [...mc, ...typ, tapQ, wordQ],
  }
}

// ── Clock lesson ─────────────────────────────────────────────────────────────

export function generateClockLesson(): Lesson {
  const ri = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
  const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`
  const minPos = (m: number) => (m === 0 ? 12 : m / 5)
  const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = ri(0, i);
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const used = new Set<string>()
  const clocks: Question[] = []
  while (clocks.length < 8) {
    const h = ri(1, 12)
    const m = MINS[ri(0, MINS.length - 1)]
    const key = `${h}:${m}`
    if (used.has(key)) continue
    used.add(key)

    const correctStr = fmt(h, m)
    const nextH = (h % 12) + 1
    const pos = minPos(m)

    const dSet = new Set([correctStr])
    for (const off of [15, -15, 30, 10, -10, 20, -20, 5, -5]) {
      if (dSet.size >= 3) break
      const dm = ((m + off) % 60 + 60) % 60
      if (MINS.includes(dm)) dSet.add(fmt(h, dm))
    }
    for (let dh = 1; dSet.size < 3; dh++) {
      dSet.add(fmt(((h - 1 + dh) % 12) + 1, m))
    }

    const opts = shuffle([...dSet])
    clocks.push({
      kind: 'clock', clockH: h, clockM: m,
      promptByLang: {
        kk: 'Сағат нешені көрсетіп тұр?',
        ru: 'Сколько времени показывают часы?',
        en: 'What time does the clock show?',
      },
      options: opts,
      answer: opts.indexOf(correctStr),
      stepsByLang: {
        kk: [
          m >= 5 ? `Қысқа стрелка ${h} мен ${nextH} арасында` : `Қысқа стрелка ${h}-де`,
          m === 0 ? `Ұзын стрелка 12-де — 0 минут` : `Ұзын стрелка ${pos}-де — ${m} минут`,
          `Оқимыз: ${correctStr} ✓`,
        ],
        ru: [
          m >= 5 ? `Короткая стрелка между ${h} и ${nextH}` : `Короткая стрелка на ${h}`,
          m === 0 ? `Длинная стрелка на 12 — 0 минут` : `Длинная стрелка на ${pos} — ${m} минут`,
          `Читаем: ${correctStr} ✓`,
        ],
        en: [
          m >= 5 ? `Short hand between ${h} and ${nextH}` : `Short hand at ${h}`,
          m === 0 ? `Long hand at 12 — 0 minutes` : `Long hand at ${pos} — ${m} minutes`,
          `We read: ${correctStr} ✓`,
        ],
      },
    })
  }

  const facts: Question[] = [
    {
      kind: 'mc',
      promptByLang: { kk: 'Бір сағатта қанша минут бар?', ru: 'Сколько минут в одном часе?', en: 'How many minutes are in one hour?' },
      options: ['30', '50', '60', '100'], answer: 2,
      explainByLang: { kk: '1 сағат = 60 минут ✓', ru: '1 час = 60 минут ✓', en: '1 hour = 60 minutes ✓' },
    },
    {
      kind: 'mc',
      promptByLang: { kk: 'Тәулікте қанша сағат бар?', ru: 'Сколько часов в сутках?', en: 'How many hours are in a day?' },
      options: ['12', '20', '24', '48'], answer: 2,
      explainByLang: { kk: 'Тәулік = 24 сағат ✓', ru: 'Сутки = 24 часа ✓', en: 'A day = 24 hours ✓' },
    },
    {
      kind: 'word', image: '⏰',
      storyByLang: { kk: 'Сабақ сағат 8:00-де басталды және 45 минут жүрді. Қашан аяқталады?', ru: 'Урок начался в 8:00 и длился 45 минут. Когда закончился?', en: 'Class started at 8:00 and lasted 45 minutes. When did it end?' },
      options: ['8:35', '8:45', '9:00', '9:15'], answer: 1,
    },
  ]
  shuffle(facts)
  clocks.splice(3, 0, facts[0])
  clocks.splice(7, 0, facts[1])

  return {
    id: 'math-time', subjectId: 'math', emoji: '🕐',
    titleByLang: { kk: 'Уақыт · сағат, минут', ru: 'Время · часы и минуты', en: 'Time · hours & minutes' },
    introByLang: { kk: 'Аналогтік сағатты оқуды үйренеміз!', ru: 'Учимся читать аналоговые часы!', en: "Let's learn to read analog clocks!" },
    grade: [1, 2, 3, 4],
    questions: clocks,
  }
}

export const mathLessons: Lesson[] = [
  {
    id: 'math-1', subjectId: 'math', emoji: '➕',
    titleByLang: { kk: 'Қосу · 100 ішінде', ru: 'Сложение до 100', en: 'Addition · within 100' },
    introByLang: { kk: '100-ге дейінгі сандарды қосуды үйренеміз!', ru: 'Учимся складывать числа в пределах 100!', en: "Let's practise adding numbers within 100!" },
    grade: [1, 2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '36 + 24', options: ['58', '60', '62', '64'], answer: 1,
        explainByLang: { kk: '36 + 20 = 56\n56 + 4 = 60 ✓', ru: '36 + 20 = 56\n56 + 4 = 60 ✓', en: '36 + 20 = 56\n56 + 4 = 60 ✓' } },
      { kind: 'type', prompt: '45 + 18 = ?', answer: 63,
        explainByLang: { kk: '45 + 10 = 55\n55 + 8 = 63 ✓', ru: '45 + 10 = 55\n55 + 8 = 63 ✓', en: '45 + 10 = 55\n55 + 8 = 63 ✓' } },
      { kind: 'mc', big: true, prompt: '27 + 35', options: ['58', '60', '62', '64'], answer: 2,
        explainByLang: { kk: '27 + 30 = 57\n57 + 5 = 62 ✓', ru: '27 + 30 = 57\n57 + 5 = 62 ✓', en: '27 + 30 = 57\n57 + 5 = 62 ✓' } },
      { kind: 'type', prompt: '54 + 27 = ?', answer: 81,
        explainByLang: { kk: '54 + 20 = 74\n74 + 7 = 81 ✓', ru: '54 + 20 = 74\n74 + 7 = 81 ✓', en: '54 + 20 = 74\n74 + 7 = 81 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: 'Жауабы 10-нан үлкен болатын мысалдарды тап', ru: 'Найди примеры, где сумма больше 10', en: 'Tap the sums greater than 10' },
        words: ['3+5', '4+8', '2+6', '7+9', '1+3', '6+7', '2+2', '5+3'], correctIdxs: [1, 3, 5] },
      { kind: 'type', prompt: '63 + 19 = ?', answer: 82,
        explainByLang: { kk: '63 + 10 = 73\n73 + 9 = 82 ✓', ru: '63 + 10 = 73\n73 + 9 = 82 ✓', en: '63 + 10 = 73\n73 + 9 = 82 ✓' } },
      { kind: 'word', image: '🍎🍐',
        storyByLang: { kk: 'Дүкенде 45 алма мен 38 алмұрт бар. Барлығы қанша жеміс?', ru: 'В магазине 45 яблок и 38 груш. Сколько всего фруктов?', en: 'A shop has 45 apples and 38 pears. How many fruits total?' },
        options: ['73', '83', '85', '87'], answer: 1 },
      { kind: 'type', prompt: '48 + 36 = ?', answer: 84,
        explainByLang: { kk: '48 + 30 = 78\n78 + 6 = 84 ✓', ru: '48 + 30 = 78\n78 + 6 = 84 ✓', en: '48 + 30 = 78\n78 + 6 = 84 ✓' } },
      { kind: 'mc', big: true, prompt: '57 + 25', options: ['78', '80', '82', '84'], answer: 2,
        explainByLang: { kk: '57 + 20 = 77\n77 + 5 = 82 ✓', ru: '57 + 20 = 77\n77 + 5 = 82 ✓', en: '57 + 20 = 77\n77 + 5 = 82 ✓' } },
      { kind: 'word',
        storyByLang: { kk: 'Аружанда 32 теңге, Болатта 46 теңге бар. Барлығы қанша?', ru: 'У Аружан 32 тенге, у Болата 46 тенге. Сколько вместе?', en: 'Aruzhan has 32 tenge, Bolat has 46 tenge. Total?' },
        options: ['72 ₸', '76 ₸', '78 ₸', '82 ₸'], answer: 2 },
    ],
  },

  {
    id: 'math-2', subjectId: 'math', emoji: '➖',
    titleByLang: { kk: 'Алу · 100 ішінде', ru: 'Вычитание до 100', en: 'Subtraction · within 100' },
    introByLang: { kk: '100-ге дейінгі сандарды алуды үйренеміз!', ru: 'Учимся вычитать в пределах 100!', en: "Let's practise subtraction within 100!" },
    grade: [1, 2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '45 − 18', options: ['23', '25', '27', '29'], answer: 2,
        explainByLang: { kk: '45 − 10 = 35\n35 − 8 = 27 ✓', ru: '45 − 10 = 35\n35 − 8 = 27 ✓', en: '45 − 10 = 35\n35 − 8 = 27 ✓' } },
      { kind: 'type', prompt: '80 − 37 = ?', answer: 43,
        explainByLang: { kk: '80 − 30 = 50\n50 − 7 = 43 ✓', ru: '80 − 30 = 50\n50 − 7 = 43 ✓', en: '80 − 30 = 50\n50 − 7 = 43 ✓' } },
      { kind: 'mc', big: true, prompt: '73 − 29', options: ['40', '42', '44', '46'], answer: 2,
        explainByLang: { kk: '73 − 20 = 53\n53 − 9 = 44 ✓', ru: '73 − 20 = 53\n53 − 9 = 44 ✓', en: '73 − 20 = 53\n53 − 9 = 44 ✓' } },
      { kind: 'type', prompt: '91 − 54 = ?', answer: 37,
        explainByLang: { kk: '91 − 50 = 41\n41 − 4 = 37 ✓', ru: '91 − 50 = 41\n41 − 4 = 37 ✓', en: '91 − 50 = 41\n41 − 4 = 37 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: 'Жауабы жұп болатын мысалдарды тап', ru: 'Найди примеры с чётным ответом', en: 'Tap examples with an even answer' },
        words: ['50−17', '60−22', '80−45', '40−16', '70−31', '90−64'], correctIdxs: [1, 3, 5] },
      { kind: 'type', prompt: '64 − 28 = ?', answer: 36,
        explainByLang: { kk: '64 − 20 = 44\n44 − 8 = 36 ✓', ru: '64 − 20 = 44\n44 − 8 = 36 ✓', en: '64 − 20 = 44\n44 − 8 = 36 ✓' } },
      { kind: 'word',
        storyByLang: { kk: 'Айданада 50 теңге болды. Ол нанға 23 теңге жұмсады. Қанша қалды?', ru: 'У Айданы было 50 тенге. Она купила хлеб за 23 тенге. Сколько осталось?', en: 'Aidana had 50 tenge. She bought bread for 23 tenge. How much is left?' },
        options: ['21 ₸', '23 ₸', '27 ₸', '29 ₸'], answer: 2 },
      { kind: 'type', prompt: '100 − 63 = ?', answer: 37,
        explainByLang: { kk: '100 − 60 = 40\n40 − 3 = 37 ✓', ru: '100 − 60 = 40\n40 − 3 = 37 ✓', en: '100 − 60 = 40\n40 − 3 = 37 ✓' } },
      { kind: 'mc', big: true, prompt: '82 − 47', options: ['31', '33', '35', '37'], answer: 2,
        explainByLang: { kk: '82 − 40 = 42\n42 − 7 = 35 ✓', ru: '82 − 40 = 42\n42 − 7 = 35 ✓', en: '82 − 40 = 42\n42 − 7 = 35 ✓' } },
      { kind: 'word',
        storyByLang: { kk: 'Сыныпта 32 оқушы болды. 15 оқушы үйде қалды. Сыныпта қанша оқушы?', ru: 'В классе 32 ученика. 15 заболели. Сколько в классе?', en: 'There were 32 pupils. 15 stayed home. How many in class?' },
        options: ['13', '15', '17', '19'], answer: 2 },
    ],
  },

  {
    id: 'math-3', subjectId: 'math', emoji: '✖️',
    titleByLang: { kk: 'Көбейту кестесі · 2-ге', ru: 'Таблица умножения', en: 'Times Tables · ×2' },
    introByLang: { kk: '2-ге көбейтуді үйренеміз!', ru: 'Учим умножение на 2!', en: "Let's learn the 2 times table!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '2 × 3', options: ['4', '5', '6', '8'], answer: 2 },
      { kind: 'mc', big: true, prompt: '2 × 4', options: ['6', '8', '10', '12'], answer: 1 },
      { kind: 'type', prompt: '2 × 5 = ?', answer: 10 },
      { kind: 'mc', big: true, prompt: '2 × 6', options: ['10', '11', '12', '14'], answer: 2 },
      { kind: 'tap',
        promptByLang: { kk: '2-нің көбейтінділерін тап (жұп сандар)', ru: 'Найди произведения числа 2 (чётные)', en: 'Tap all multiples of 2 (even numbers)' },
        words: ['4', '7', '8', '11', '12', '15', '16', '19'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'type', prompt: '2 × 7 = ?', answer: 14 },
      { kind: 'mc', big: true, prompt: '2 × 8', options: ['14', '15', '16', '18'], answer: 2 },
      { kind: 'word', image: '🚲🚲',
        storyByLang: { kk: 'Айдардың 2 велосипеді бар. Әр велосипедтің 2 дөңгелегі. Барлығы қанша дөңгелек?', ru: 'У Айдара 2 велосипеда. У каждого по 2 колеса. Сколько колёс?', en: 'Aidar has 2 bicycles, each with 2 wheels. How many wheels?' },
        options: ['2', '3', '4', '6'], answer: 2 },
      { kind: 'type', prompt: '2 × 9 = ?', answer: 18 },
      { kind: 'mc', big: true, prompt: '2 × 10', options: ['18', '20', '22', '100'], answer: 1 },
    ],
  },

  {
    id: 'math-4', subjectId: 'math', emoji: '✖️',
    titleByLang: { kk: 'Көбейту кестесі · 3-ке', ru: 'Таблица умножения', en: 'Times Tables · ×3' },
    introByLang: { kk: '3-ке көбейтуді үйренеміз!', ru: 'Учим умножение на 3!', en: "Let's learn the 3 times table!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '3 × 3', options: ['7', '8', '9', '12'], answer: 2 },
      { kind: 'mc', big: true, prompt: '3 × 4', options: ['9', '10', '12', '15'], answer: 2 },
      { kind: 'type', prompt: '3 × 5 = ?', answer: 15 },
      { kind: 'mc', big: true, prompt: '3 × 6', options: ['15', '16', '18', '21'], answer: 2 },
      { kind: 'tap',
        promptByLang: { kk: '3-тің көбейтінділерін тап', ru: 'Найди произведения числа 3', en: 'Tap all multiples of 3' },
        words: ['4', '6', '7', '9', '11', '12', '14', '15'], correctIdxs: [1, 3, 5, 7] },
      { kind: 'type', prompt: '3 × 7 = ?', answer: 21 },
      { kind: 'mc', big: true, prompt: '3 × 8', options: ['20', '22', '24', '27'], answer: 2 },
      { kind: 'word', image: '🏠🪟',
        storyByLang: { kk: 'Үйде 3 қатар терезе. Әр қатарда 4 терезе. Барлығы қанша терезе?', ru: 'В доме 3 ряда окон, в каждом по 4. Сколько окон?', en: 'A house has 3 rows of 4 windows each. How many windows?' },
        options: ['8', '10', '12', '15'], answer: 2 },
      { kind: 'type', prompt: '3 × 9 = ?', answer: 27 },
      { kind: 'mc', big: true, prompt: '3 × 10', options: ['27', '28', '30', '33'], answer: 2 },
    ],
  },

  {
    id: 'math-5', subjectId: 'math', emoji: '✖️',
    titleByLang: { kk: 'Көбейту кестесі · 4-ке', ru: 'Таблица умножения', en: 'Times Tables · ×4' },
    introByLang: { kk: '4-ке көбейтуді үйренеміз!', ru: 'Учим умножение на 4!', en: "Let's learn the 4 times table!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '4 × 2', options: ['6', '7', '8', '10'], answer: 2 },
      { kind: 'mc', big: true, prompt: '4 × 3', options: ['10', '11', '12', '14'], answer: 2 },
      { kind: 'type', prompt: '4 × 4 = ?', answer: 16 },
      { kind: 'mc', big: true, prompt: '4 × 5', options: ['16', '18', '20', '22'], answer: 2 },
      { kind: 'type', prompt: '4 × 6 = ?', answer: 24 },
      { kind: 'tap',
        promptByLang: { kk: '4-тің көбейтінділерін тап', ru: 'Найди произведения числа 4', en: 'Tap all multiples of 4' },
        words: ['8', '9', '12', '14', '16', '18', '20', '22'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'mc', big: true, prompt: '4 × 7', options: ['24', '26', '28', '30'], answer: 2 },
      { kind: 'type', prompt: '4 × 8 = ?', answer: 32 },
      { kind: 'mc', big: true, prompt: '4 × 9', options: ['32', '34', '36', '40'], answer: 2 },
      { kind: 'word', image: '🍪🍪🍪🍪',
        storyByLang: { kk: 'Столда 4 кесе тұр. Әр кеседе 4 печенье. Барлығы қанша печенье?', ru: 'На столе 4 чашки, в каждой по 4 печенья. Сколько всего?', en: 'There are 4 cups with 4 cookies each. How many cookies total?' },
        options: ['12', '14', '16', '18'], answer: 2 },
    ],
  },

  {
    id: 'math-6', subjectId: 'math', emoji: '✖️',
    titleByLang: { kk: 'Көбейту кестесі · 5-ке', ru: 'Таблица умножения', en: 'Times Tables · ×5' },
    introByLang: { kk: '5-ке көбейтуді үйренеміз!', ru: 'Учим умножение на 5!', en: "Let's learn the 5 times table!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '5 × 2', options: ['8', '9', '10', '12'], answer: 2 },
      { kind: 'mc', big: true, prompt: '5 × 3', options: ['12', '13', '15', '18'], answer: 2 },
      { kind: 'type', prompt: '5 × 4 = ?', answer: 20 },
      { kind: 'mc', big: true, prompt: '5 × 5', options: ['20', '23', '25', '30'], answer: 2 },
      { kind: 'type', prompt: '5 × 6 = ?', answer: 30 },
      { kind: 'tap',
        promptByLang: { kk: '5-тің көбейтінділерін тап (0 немесе 5-ке аяқталатын)', ru: 'Найди произведения числа 5 (оканчиваются на 0 или 5)', en: 'Tap multiples of 5 (end in 0 or 5)' },
        words: ['10', '12', '15', '18', '20', '22', '25', '27'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'mc', big: true, prompt: '5 × 7', options: ['30', '33', '35', '40'], answer: 2 },
      { kind: 'type', prompt: '5 × 8 = ?', answer: 40 },
      { kind: 'mc', big: true, prompt: '5 × 9', options: ['40', '43', '45', '50'], answer: 2 },
      { kind: 'word', image: '✏️✏️✏️✏️✏️',
        storyByLang: { kk: 'Партада 5 бала отыр. Әр баланың 5 қаламы бар. Барлығы қанша қалам?', ru: 'За партой 5 детей, у каждого 5 карандашей. Сколько карандашей?', en: '5 children each have 5 pencils. How many pencils in total?' },
        options: ['20', '25', '30', '35'], answer: 1 },
    ],
  },

  {
    id: 'math-7', subjectId: 'math', emoji: '✖️',
    titleByLang: { kk: 'Көбейту кестесі · 6-ға', ru: 'Таблица умножения', en: 'Times Tables · ×6' },
    introByLang: { kk: '6-ға көбейтуді үйренеміз!', ru: 'Учим умножение на 6!', en: "Let's learn the 6 times table!" },
    grade: [3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '6 × 2', options: ['10', '11', '12', '14'], answer: 2 },
      { kind: 'mc', big: true, prompt: '6 × 3', options: ['15', '16', '18', '21'], answer: 2 },
      { kind: 'type', prompt: '6 × 4 = ?', answer: 24 },
      { kind: 'mc', big: true, prompt: '6 × 5', options: ['25', '28', '30', '35'], answer: 2 },
      { kind: 'type', prompt: '6 × 6 = ?', answer: 36 },
      { kind: 'tap',
        promptByLang: { kk: '6-ның көбейтінділерін тап', ru: 'Найди произведения числа 6', en: 'Tap all multiples of 6' },
        words: ['12', '14', '18', '20', '24', '25', '30', '35'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'mc', big: true, prompt: '6 × 7', options: ['36', '40', '42', '45'], answer: 2 },
      { kind: 'type', prompt: '6 × 8 = ?', answer: 48 },
      { kind: 'mc', big: true, prompt: '6 × 9', options: ['48', '52', '54', '60'], answer: 2 },
      { kind: 'word', image: '🥚🥚🥚🥚🥚🥚',
        storyByLang: { kk: 'Алты қорапта тауықтың жұмыртқасы бар. Әр қорапта 6 жұмыртқа. Барлығы қанша?', ru: 'В 6 коробках по 6 яиц. Сколько всего яиц?', en: '6 boxes each hold 6 eggs. How many eggs altogether?' },
        options: ['30', '34', '36', '40'], answer: 2 },
    ],
  },

  {
    id: 'math-8', subjectId: 'math', emoji: '➗',
    titleByLang: { kk: 'Бөлу · 2-ге', ru: 'Деление на 2', en: 'Division · ÷2' },
    introByLang: { kk: '2-ге бөлуді үйренеміз!', ru: 'Учимся делить на 2!', en: "Let's practise dividing by 2!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '10 ÷ 2', options: ['3', '4', '5', '6'], answer: 2 },
      { kind: 'type', prompt: '16 ÷ 2 = ?', answer: 8 },
      { kind: 'mc', big: true, prompt: '14 ÷ 2', options: ['5', '6', '7', '8'], answer: 2 },
      { kind: 'type', prompt: '20 ÷ 2 = ?', answer: 10 },
      { kind: 'tap',
        promptByLang: { kk: '2-ге тең бөлінетін сандарды тап', ru: 'Найди числа, которые делятся на 2 ровно', en: 'Tap numbers divisible by 2' },
        words: ['8', '9', '12', '13', '18', '19', '22', '25'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'type', prompt: '18 ÷ 2 = ?', answer: 9 },
      { kind: 'word', image: '🍬🍬🍬🍬🍬🍬',
        storyByLang: { kk: 'Асыл 12 конфет тапты. Ол Ерланмен тең бөлісті. Асылда қанша конфет қалды?', ru: 'Асыл нашёл 12 конфет и поровну поделился с Ерланом. Сколько у Асыла?', en: 'Asyl found 12 sweets and shared equally with Erlan. How many does Asyl keep?' },
        options: ['4', '5', '6', '7'], answer: 2 },
      { kind: 'type', prompt: '24 ÷ 2 = ?', answer: 12 },
    ],
  },

  {
    id: 'math-9', subjectId: 'math', emoji: '⚖️',
    titleByLang: { kk: 'Сандарды салыстыру · < > =', ru: 'Больше / меньше', en: 'Comparing Numbers · < > =' },
    introByLang: { kk: 'Екі таңбалы сандарды салыстыруды үйренеміз!', ru: 'Учимся сравнивать двузначные числа!', en: "Let's learn to compare two-digit numbers!" },
    grade: [1, 2, 3, 4],
    questions: [
      { kind: 'mc', big: true, image: '🔢',
        promptByLang: { kk: '47 __ 74 — қай белгі дұрыс?', ru: '47 __ 74 — какой знак верный?', en: '47 __ 74 — which sign is correct?' },
        options: ['47 > 74', '47 = 74', '47 < 74', '47 ≠ 74'], answer: 2 },
      { kind: 'mc', big: true,
        promptByLang: { kk: '56 __ 65 — қай белгі дұрыс?', ru: '56 __ 65 — какой знак?', en: '56 __ 65 — which sign?' },
        options: ['56 > 65', '56 < 65', '56 = 65', '56 ≥ 65'], answer: 1 },
      { kind: 'tap', image: '📊',
        promptByLang: { kk: '50-ден үлкен сандарды тап', ru: 'Найди числа, которые больше 50', en: 'Tap the numbers greater than 50' },
        words: ['38', '63', '47', '71', '50', '85', '29', '54'], correctIdxs: [1, 3, 5, 7] },
      { kind: 'mc', big: true,
        promptByLang: { kk: 'Қай теңдік дұрыс?', ru: 'Какое равенство верное?', en: 'Which equality is correct?' },
        options: ['30 + 20 = 40', '20 + 30 = 50', '50 + 10 = 70', '40 + 20 = 70'], answer: 1 },
      { kind: 'match', image: '⚖️',
        promptByLang: { kk: 'Санды дұрыс топқа орналастыр', ru: 'Раздели числа на группы', en: 'Sort numbers into the correct group' },
        groupsByLang: { kk: ['50-ден кіші', '50-ден үлкен'], ru: ['Меньше 50', 'Больше 50'], en: ['Less than 50', 'Greater than 50'] },
        items: [
          { text: '37', group: 0 },
          { text: '82', group: 1 },
          { text: '49', group: 0 },
          { text: '61', group: 1 },
          { text: '25', group: 0 },
          { text: '99', group: 1 },
        ] },
      { kind: 'word', image: '🛒',
        storyByLang: { kk: 'Нанның бағасы 65 теңге, сүттің бағасы 56 теңге. Қайсысы қымбат?', ru: 'Хлеб стоит 65 тенге, молоко — 56 тенге. Что дороже?', en: 'Bread costs 65 tenge, milk costs 56 tenge. Which is more expensive?' },
        options: ['Молоко', 'Хлеб', 'Одинаково', 'Не знаю'], answer: 1 },
      { kind: 'type',
        promptByLang: { kk: 'Саны жазылсын: жиырма үш', ru: 'Запиши число: двадцать три', en: 'Write the number: twenty-three' },
        answer: 23 },
      { kind: 'mc', big: true,
        promptByLang: { kk: 'Ең үлкен санды тап', ru: 'Найди наибольшее число', en: 'Find the greatest number' },
        options: ['78', '87', '77', '88'], answer: 3 },
    ],
  },

  {
    id: 'math-10', subjectId: 'math', emoji: '📏',
    titleByLang: { kk: 'Ұзындық · см, дм, м', ru: 'Длина · см, дм, м', en: 'Length · cm, dm, m' },
    introByLang: { kk: 'Сантиметр, дециметр және метрді үйренеміз!', ru: 'Изучаем сантиметры, дециметры и метры!', en: "Let's learn centimetres, decimetres and metres!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', image: '📏',
        promptByLang: { kk: '1 дм = қанша сантиметр?', ru: '1 дм = сколько сантиметров?', en: '1 dm = how many centimetres?' },
        options: ['1 см', '5 см', '10 см', '100 см'], answer: 2 },
      { kind: 'mc',
        promptByLang: { kk: '1 м = қанша дециметр?', ru: '1 м = сколько дециметров?', en: '1 m = how many decimetres?' },
        options: ['5 дм', '10 дм', '100 дм', '1000 дм'], answer: 1 },
      { kind: 'type',
        promptByLang: { kk: '3 дм = ? см', ru: '3 дм = ? см', en: '3 dm = ? cm' },
        answer: 30 },
      { kind: 'tap', image: '📐',
        promptByLang: { kk: 'Сантиметрмен өлшейтін заттарды тап', ru: 'Найди предметы, которые измеряют в сантиметрах', en: 'Tap things usually measured in centimetres' },
        words: ['карандаш', 'автобус', 'линейка', 'Алатау', 'книга', 'поле'], correctIdxs: [0, 2, 4] },
      { kind: 'mc',
        promptByLang: { kk: '50 см = қанша дециметр?', ru: '50 см = сколько дециметров?', en: '50 cm = how many decimetres?' },
        options: ['5 дм', '10 дм', '50 дм', '500 дм'], answer: 0 },
      { kind: 'word', image: '📏✏️',
        storyByLang: { kk: 'Асылдың қаламы 15 см. Сызғышы 2 дм. Сызғыш қанша сантиметрге ұзын?', ru: 'Карандаш Асыла — 15 см, линейка — 2 дм. На сколько см линейка длиннее?', en: "Asyl's pencil is 15 cm, ruler is 2 dm. How many cm longer is the ruler?" },
        options: ['3 см', '5 см', '7 см', '10 см'], answer: 1 },
      { kind: 'type',
        promptByLang: { kk: '2 м = ? дм', ru: '2 м = ? дм', en: '2 m = ? dm' },
        answer: 20 },
      { kind: 'match', image: '📐📏',
        promptByLang: { kk: 'Заттарды өлшем бірлігіне сай топтастыр', ru: 'Сгруппируй предметы по единице измерения', en: "Group objects by the unit you'd use to measure them" },
        groupsByLang: { kk: ['Сантиметр (см)', 'Метр (м)'], ru: ['Сантиметры (см)', 'Метры (м)'], en: ['Centimetres (cm)', 'Metres (m)'] },
        items: [
          { text: 'карандаш', group: 0 },
          { text: 'комната', group: 1 },
          { text: 'палец', group: 0 },
          { text: 'дорога', group: 1 },
        ] },
    ],
  },

  {
    id: 'math-11', subjectId: 'math', emoji: '🧪',
    titleByLang: { kk: 'Көлем мен масса · литр, кг', ru: 'Объём и масса', en: 'Volume & Mass · litre, kg' },
    introByLang: { kk: 'Литр мен килограммды үйренеміз!', ru: 'Изучаем литры и килограммы!', en: "Let's learn litres and kilograms!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc', image: '🥛',
        promptByLang: { kk: 'Сүттің 2 литрлік 2 шөлмегі бар. Барлығы қанша литр?', ru: 'Есть 2 бутылки молока по 2 литра. Сколько всего литров?', en: 'There are 2 bottles of milk, 2 litres each. Total litres?' },
        options: ['2', '3', '4', '6'], answer: 2 },
      { kind: 'tap', image: '🍶💧',
        promptByLang: { kk: 'Литрмен өлшейтін заттарды тап', ru: 'Найди то, что измеряют в литрах', en: 'Tap things measured in litres' },
        words: ['чай', 'яблоко', 'вода', 'книга', 'молоко', 'карандаш'], correctIdxs: [0, 2, 4] },
      { kind: 'mc', image: '⚖️',
        promptByLang: { kk: '1 кг = қанша грамм?', ru: '1 кг = сколько граммов?', en: '1 kg = how many grams?' },
        options: ['10 г', '100 г', '1000 г', '10 000 г'], answer: 2 },
      { kind: 'type',
        promptByLang: { kk: 'Шелекке 5 л су сыйды. 3 шелек су = ? литр', ru: 'В ведро входит 5 л воды. 3 ведра = ? л', en: 'A bucket holds 5 L. 3 buckets = ? litres' },
        answer: 15 },
      { kind: 'word', image: '🍉',
        storyByLang: { kk: 'Қарбыз 4 кг, алма 2 кг. Барлық жемістің массасы қанша?', ru: 'Арбуз весит 4 кг, яблоки — 2 кг. Сколько весят все фрукты?', en: 'A watermelon weighs 4 kg, apples 2 kg. What is the total mass?' },
        options: ['5 кг', '6 кг', '7 кг', '8 кг'], answer: 1 },
      { kind: 'match', image: '🏪',
        promptByLang: { kk: 'Тауарды өлшем бірлігіне сай топтастыр', ru: 'Сгруппируй товары по единице измерения', en: 'Group items by measurement unit' },
        groupsByLang: { kk: ['Литр (л)', 'Килограмм (кг)'], ru: ['Литр (л)', 'Килограмм (кг)'], en: ['Litre (L)', 'Kilogram (kg)'] },
        items: [
          { text: 'молоко', group: 0 },
          { text: 'мука', group: 1 },
          { text: 'сок', group: 0 },
          { text: 'мясо', group: 1 },
          { text: 'бензин', group: 0 },
          { text: 'картошка', group: 1 },
        ] },
      { kind: 'word', image: '🛍️',
        storyByLang: { kk: 'Нурлан базардан 3 кг алма мен 2 кг алмұрт сатып алды. Барлық жемістің салмағы қанша?', ru: 'Нурлан купил 3 кг яблок и 2 кг груш. Сколько кг фруктов он купил всего?', en: 'Nurlan bought 3 kg of apples and 2 kg of pears. What is the total mass of fruit?' },
        options: ['4 кг', '5 кг', '6 кг', '7 кг'], answer: 1 },
      { kind: 'type',
        promptByLang: { kk: 'Аквариумда 10 л су бар еді. 3 л буланды. Қанша л қалды?', ru: 'В аквариуме было 10 л воды. Испарилось 3 л. Сколько осталось?', en: 'An aquarium had 10 L of water. 3 L evaporated. How many litres remain?' },
        answer: 7 },
    ],
  },

  {
    id: 'math-12', subjectId: 'math', emoji: '➗',
    titleByLang: { kk: 'Бөлу · 3-ке, 4-ке, 5-ке', ru: 'Деление', en: 'Division · ÷3, ÷4, ÷5' },
    introByLang: { kk: '3-ке, 4-ке, 5-ке бөлуді үйренеміз!', ru: 'Учимся делить на 3, 4 и 5!', en: "Let's practise dividing by 3, 4 and 5!" },
    grade: [3, 4],
    questions: [
      { kind: 'mc', big: true, image: '➗',
        promptByLang: { kk: '15 ÷ 3 = ?', ru: '15 ÷ 3 = ?', en: '15 ÷ 3 = ?' },
        options: ['3', '4', '5', '6'], answer: 2 },
      { kind: 'mc', big: true,
        promptByLang: { kk: '20 ÷ 4 = ?', ru: '20 ÷ 4 = ?', en: '20 ÷ 4 = ?' },
        options: ['4', '5', '6', '7'], answer: 1 },
      { kind: 'type',
        promptByLang: { kk: '25 ÷ 5 = ?', ru: '25 ÷ 5 = ?', en: '25 ÷ 5 = ?' },
        answer: 5 },
      { kind: 'tap', image: '🔢',
        promptByLang: { kk: '3-ке тең бөлінетін сандарды тап', ru: 'Найди числа, делящиеся на 3 без остатка', en: 'Tap numbers divisible by 3' },
        words: ['9', '10', '12', '14', '15', '16', '18', '20'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'mc', big: true,
        promptByLang: { kk: '24 ÷ 4 = ?', ru: '24 ÷ 4 = ?', en: '24 ÷ 4 = ?' },
        options: ['5', '6', '7', '8'], answer: 1 },
      { kind: 'word', image: '🎒📓',
        storyByLang: { kk: 'Мұғалім 15 дәптерді 3 топқа тең бөлді. Әр топта қанша дәптер?', ru: 'Учитель разделил 15 тетрадей поровну на 3 группы. Сколько тетрадей в каждой группе?', en: 'The teacher divided 15 notebooks equally into 3 groups. How many in each group?' },
        options: ['3', '4', '5', '6'], answer: 2 },
      { kind: 'type',
        promptByLang: { kk: '40 ÷ 5 = ?', ru: '40 ÷ 5 = ?', en: '40 ÷ 5 = ?' },
        answer: 8 },
      { kind: 'word', image: '🍭🍭🍭🍭',
        storyByLang: { kk: 'Айгерімнің 20 карамелі бар. Ол 4 досымен тең бөлісті. Әр адамға қанша тиді?', ru: 'У Айгерим 20 карамелей. Она поровну поделила их с 4 подругами. По сколько досталось каждой?', en: 'Aigerim has 20 sweets and shares them equally with 4 friends. How many does each person get?' },
        options: ['3', '4', '5', '6'], answer: 1 },
    ],
  },

  // ── New lessons ──────────────────────────────────────────────────────────

  {
    id: 'math-13', subjectId: 'math', emoji: '7️⃣',
    titleByLang: { kk: 'Көбейту кестесі · 7, 8, 9', ru: 'Таблица умножения · 7, 8, 9', en: 'Times Tables · ×7, ×8, ×9' },
    introByLang: { kk: '7, 8, 9-ға көбейтуді үйренеміз!', ru: 'Учим умножение на 7, 8 и 9!', en: "Let's learn the 7, 8 and 9 times tables!" },
    grade: [3, 4],
    questions: [
      { kind: 'mc', big: true, prompt: '7 × 6', options: ['38', '40', '42', '44'], answer: 2,
        explainByLang: { kk: '7 × 6 = 42 ✓', ru: '7 × 6 = 42 ✓', en: '7 × 6 = 42 ✓' } },
      { kind: 'mc', big: true, prompt: '8 × 7', options: ['54', '56', '58', '60'], answer: 1,
        explainByLang: { kk: '8 × 7 = 56 ✓', ru: '8 × 7 = 56 ✓', en: '8 × 7 = 56 ✓' } },
      { kind: 'type', prompt: '9 × 4 = ?', answer: 36,
        explainByLang: { kk: '9 × 4 = 36 ✓', ru: '9 × 4 = 36 ✓', en: '9 × 4 = 36 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: '7-ге бөлінетін сандарды тап', ru: 'Найди числа из таблицы 7', en: 'Tap multiples of 7' },
        words: ['14', '18', '21', '24', '28', '30', '35', '36'], correctIdxs: [0, 2, 4, 6] },
      { kind: 'mc', big: true, prompt: '8 × 9', options: ['63', '70', '72', '74'], answer: 2,
        explainByLang: { kk: '8 × 9 = 72 ✓', ru: '8 × 9 = 72 ✓', en: '8 × 9 = 72 ✓' } },
      { kind: 'type', prompt: '7 × 8 = ?', answer: 56,
        explainByLang: { kk: '7 × 8 = 56 ✓', ru: '7 × 8 = 56 ✓', en: '7 × 8 = 56 ✓' } },
      { kind: 'word', image: '🪑',
        storyByLang: { kk: 'Концерт залында 9 қатар орындық бар, әр қатарда 8 орындық. Барлығы қанша орындық?', ru: 'В зале 9 рядов по 8 кресел. Сколько всего кресел?', en: 'There are 9 rows of 8 seats. How many seats in total?' },
        options: ['63', '70', '72', '80'], answer: 2 },
      { kind: 'mc', big: true, prompt: '9 × 9', options: ['72', '79', '81', '83'], answer: 2,
        explainByLang: { kk: '9 × 9 = 81 ✓', ru: '9 × 9 = 81 ✓', en: '9 × 9 = 81 ✓' } },
    ],
  },

  {
    id: 'math-14', subjectId: 'math', emoji: '½',
    titleByLang: { kk: 'Бөлшектер · ½, ¼, ⅓', ru: 'Дроби · ½, ¼, ⅓', en: 'Fractions · ½, ¼, ⅓' },
    introByLang: { kk: 'Бөліктерді үйренеміз!', ru: 'Учимся работать с дробями!', en: "Let's learn fractions!" },
    grade: [3, 4],
    questions: [
      { kind: 'mc',
        promptByLang: { kk: '12-нің жартысы қанша?', ru: 'Половина от 12 — это...', en: 'Half of 12 is...' },
        options: ['4', '6', '8', '10'], answer: 1,
        explainByLang: { kk: '12 ÷ 2 = 6 ✓', ru: '12 ÷ 2 = 6 ✓', en: '12 ÷ 2 = 6 ✓' } },
      { kind: 'mc',
        promptByLang: { kk: '20-ның ширегі (¼) қанша?', ru: 'Четверть от 20 — это...', en: 'One quarter of 20 is...' },
        options: ['4', '5', '6', '8'], answer: 1,
        explainByLang: { kk: '20 ÷ 4 = 5 ✓', ru: '20 ÷ 4 = 5 ✓', en: '20 ÷ 4 = 5 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: 'Жартысы 4 болатын сандарды тап', ru: 'Найди числа, половина которых равна 4', en: 'Tap numbers whose half is 4' },
        words: ['6', '8', '10', '12', '14', '16'], correctIdxs: [1, 3] },
      { kind: 'type',
        promptByLang: { kk: '18-нің ⅓ бөлігі = ?', ru: 'Треть от 18 = ?', en: 'One third of 18 = ?' },
        answer: 6,
        explainByLang: { kk: '18 ÷ 3 = 6 ✓', ru: '18 ÷ 3 = 6 ✓', en: '18 ÷ 3 = 6 ✓' } },
      { kind: 'word', image: '🍕',
        storyByLang: { kk: 'Пицца 4 тең бөлікке бөлінді. Саша 2 бөлік жеді. Ол пицаның қандай бөлігін жеді?', ru: 'Пицца разрезана на 4 равные части. Саша съел 2 части. Какую долю пиццы он съел?', en: 'A pizza is cut into 4 equal parts. Sasha ate 2 parts. What fraction did he eat?' },
        options: ['¼', '⅓', '½', '¾'], answer: 2 },
      { kind: 'mc',
        promptByLang: { kk: 'Қай бөлшек ½-ден үлкен?', ru: 'Какая дробь больше ½?', en: 'Which fraction is greater than ½?' },
        options: ['¼', '⅓', '½', '¾'], answer: 3,
        explainByLang: { kk: '¾ > ½ ✓', ru: '¾ > ½ ✓', en: '¾ > ½ ✓' } },
      { kind: 'type',
        promptByLang: { kk: '24-тің ¼ бөлігі = ?', ru: 'Четверть от 24 = ?', en: 'One quarter of 24 = ?' },
        answer: 6,
        explainByLang: { kk: '24 ÷ 4 = 6 ✓', ru: '24 ÷ 4 = 6 ✓', en: '24 ÷ 4 = 6 ✓' } },
      { kind: 'word', image: '🎂',
        storyByLang: { kk: 'Торт 8 тең бөлікке кесілді. Ас үйде 3 бөлік қалды. Тортың қандай бөлігі қалды?', ru: 'Торт разрезан на 8 частей. Осталось 3 части. Какая доля торта осталась?', en: 'A cake is cut into 8 pieces. 3 pieces remain. What fraction of the cake is left?' },
        options: ['¼', '⅜', '½', '⅝'], answer: 1 },
    ],
  },

  {
    id: 'math-15', subjectId: 'math', emoji: '📐',
    titleByLang: { kk: 'Геометрия · аудан мен периметр', ru: 'Геометрия · площадь и периметр', en: 'Geometry · area & perimeter' },
    introByLang: { kk: 'Геометриялық фигуралармен таныс болайық!', ru: 'Знакомимся с площадью и периметром!', en: "Let's explore area and perimeter!" },
    grade: [3, 4],
    questions: [
      { kind: 'mc',
        promptByLang: { kk: 'Ені 4 см, ұзындығы 6 см тіктөртбұрыштың периметрі қанша?', ru: 'Периметр прямоугольника 4 см × 6 см = ?', en: 'Perimeter of a 4 cm × 6 cm rectangle = ?' },
        options: ['10 см', '20 см', '24 см', '40 см'], answer: 1,
        explainByLang: { kk: 'P = 2 × (4+6) = 20 см ✓', ru: 'P = 2 × (4+6) = 20 см ✓', en: 'P = 2 × (4+6) = 20 cm ✓' } },
      { kind: 'type',
        promptByLang: { kk: '3 см × 5 см тіктөртбұрыштың ауданы (кв.см)?', ru: 'Площадь прямоугольника 3 см × 5 см (кв.см)?', en: 'Area of a 3 cm × 5 cm rectangle (cm²)?' },
        answer: 15,
        explainByLang: { kk: 'S = 3 × 5 = 15 кв.см ✓', ru: 'S = 3 × 5 = 15 кв.см ✓', en: 'S = 3 × 5 = 15 cm² ✓' } },
      { kind: 'tap',
        promptByLang: { kk: '4 бұрышты фигураларды тап', ru: 'Найди четырёхугольники', en: 'Tap the quadrilaterals' },
        words: ['Квадрат', 'Треугольник', 'Ромб', 'Круг', 'Прямоугольник', 'Трапеция'], correctIdxs: [0, 2, 4, 5] },
      { kind: 'mc',
        promptByLang: { kk: 'Қабырғасы 5 см квадраттың ауданы?', ru: 'Площадь квадрата со стороной 5 см?', en: 'Area of a square with side 5 cm?' },
        options: ['10 кв.см', '20 кв.см', '25 кв.см', '30 кв.см'], answer: 2,
        explainByLang: { kk: 'S = 5 × 5 = 25 кв.см ✓', ru: 'S = 5 × 5 = 25 кв.см ✓', en: 'S = 5 × 5 = 25 cm² ✓' } },
      { kind: 'word', image: '🏡',
        storyByLang: { kk: 'Бақша 8 м × 6 м. Бақшаны айнала қоршау тұрғызу үшін қанша метр тор керек?', ru: 'Огород 8 м × 6 м. Сколько метров забора нужно, чтобы огородить его по периметру?', en: 'A garden is 8 m × 6 m. How many metres of fence to go around the perimeter?' },
        options: ['14 м', '24 м', '28 м', '48 м'], answer: 2,
        explainByLang: { kk: 'P = 2 × (8+6) = 28 м ✓', ru: 'P = 2 × (8+6) = 28 м ✓', en: 'P = 2 × (8+6) = 28 m ✓' } },
      { kind: 'type',
        promptByLang: { kk: 'Периметрі 24 см квадраттың қабырғасы (см)?', ru: 'Сторона квадрата с периметром 24 см (см)?', en: 'Side of a square with perimeter 24 cm (cm)?' },
        answer: 6,
        explainByLang: { kk: 'P = 4 × a → a = 24 ÷ 4 = 6 см ✓', ru: 'P = 4 × a → a = 24 ÷ 4 = 6 см ✓', en: 'P = 4 × a → a = 24 ÷ 4 = 6 cm ✓' } },
      { kind: 'match',
        promptByLang: { kk: 'Фигураларды сәйкестендір', ru: 'Сопоставь фигуры', en: 'Match the shapes' },
        groupsByLang: { kk: ['3 бұрыш', '4 бұрыш'], ru: ['3 угла', '4 угла'], en: ['3 corners', '4 corners'] },
        items: [
          { text: 'Квадрат', group: 1 },
          { text: 'Треугольник', group: 0 },
          { text: 'Прямоугольник', group: 1 },
          { text: 'Равносторонний △', group: 0 },
        ] },
      { kind: 'word', image: '📏',
        storyByLang: { kk: 'Бөлменің ауданы 20 кв.м, ені 4 м. Бөлменің ұзындығы қанша?', ru: 'Площадь комнаты 20 кв.м, ширина 4 м. Какова длина комнаты?', en: 'A room has area 20 m² and width 4 m. What is its length?' },
        options: ['4 м', '5 м', '6 м', '8 м'], answer: 1,
        explainByLang: { kk: 'S = a × b → 20 = 4 × b → b = 5 м ✓', ru: 'S = a × b → 20 = 4 × b → b = 5 м ✓', en: 'S = a × b → 20 = 4 × b → b = 5 m ✓' } },
    ],
  },

  {
    id: 'math-16', subjectId: 'math', emoji: '🔢',
    titleByLang: { kk: '1000-ға дейінгі сандар', ru: 'Числа до 1000', en: 'Numbers up to 1000' },
    introByLang: { kk: 'Үш таңбалы сандармен жұмыс жасаймыз!', ru: 'Работаем с трёхзначными числами!', en: "Let's work with three-digit numbers!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'mc',
        promptByLang: { kk: '347 санында жүздіктер қанша?', ru: 'Сколько сотен в числе 347?', en: 'How many hundreds in 347?' },
        options: ['2', '3', '4', '7'], answer: 1,
        explainByLang: { kk: '347 = 3 жүз + 4 он + 7 бірлік ✓', ru: '347 = 3 сотни + 4 десятка + 7 единиц ✓', en: '347 = 3 hundreds + 4 tens + 7 units ✓' } },
      { kind: 'mc',
        promptByLang: { kk: 'Қай сан 500 + 60 + 8-ге тең?', ru: 'Какое число равно 500 + 60 + 8?', en: 'Which number equals 500 + 60 + 8?' },
        options: ['508', '560', '568', '5608'], answer: 2,
        explainByLang: { kk: '500 + 60 + 8 = 568 ✓', ru: '500 + 60 + 8 = 568 ✓', en: '500 + 60 + 8 = 568 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: '500-ден үлкен сандарды тап', ru: 'Найди числа больше 500', en: 'Tap numbers greater than 500' },
        words: ['348', '501', '499', '612', '487', '700', '123', '555'], correctIdxs: [1, 3, 5, 7] },
      { kind: 'type',
        promptByLang: { kk: '200 + 300 = ?', ru: '200 + 300 = ?', en: '200 + 300 = ?' },
        answer: 500,
        explainByLang: { kk: '2 жүз + 3 жүз = 5 жүз = 500 ✓', ru: '2 сотни + 3 сотни = 5 сотен = 500 ✓', en: '2 hundreds + 3 hundreds = 5 hundreds = 500 ✓' } },
      { kind: 'mc',
        promptByLang: { kk: '680, 670, 660, 650, ...  Келесі сан?', ru: '680, 670, 660, 650, ... Следующее число?', en: '680, 670, 660, 650, ... Next number?' },
        options: ['630', '640', '645', '655'], answer: 1,
        explainByLang: { kk: 'Әр сайын −10: 650 − 10 = 640 ✓', ru: 'Каждый раз −10: 650 − 10 = 640 ✓', en: 'Each time −10: 650 − 10 = 640 ✓' } },
      { kind: 'word', image: '🏬',
        storyByLang: { kk: 'Кітап дүкенінде 450 кітап болды. Тағы 275 кітап әкелді. Барлығы қанша кітап?', ru: 'В книжном магазине было 450 книг. Привезли ещё 275. Сколько книг стало?', en: 'A bookshop had 450 books. 275 more arrived. How many books in total?' },
        options: ['625', '700', '725', '750'], answer: 2,
        explainByLang: { kk: '450 + 275 = 725 ✓', ru: '450 + 275 = 725 ✓', en: '450 + 275 = 725 ✓' } },
      { kind: 'type',
        promptByLang: { kk: '1000 − 360 = ?', ru: '1000 − 360 = ?', en: '1000 − 360 = ?' },
        answer: 640,
        explainByLang: { kk: '1000 − 300 = 700\n700 − 60 = 640 ✓', ru: '1000 − 300 = 700\n700 − 60 = 640 ✓', en: '1000 − 300 = 700\n700 − 60 = 640 ✓' } },
      { kind: 'match',
        promptByLang: { kk: 'Санды жүздіктермен сәйкестендір', ru: 'Сопоставь число с сотнями', en: 'Match the number to its hundreds' },
        groupsByLang: { kk: ['4 жүздік', '7 жүздік'], ru: ['4 сотни', '7 сотни'], en: ['4 hundreds', '7 hundreds'] },
        items: [
          { text: '423', group: 0 },
          { text: '712', group: 1 },
          { text: '478', group: 0 },
          { text: '799', group: 1 },
        ] },
    ],
  },

  {
    id: 'math-17', subjectId: 'math', emoji: '🔄',
    titleByLang: { kk: 'Жұп, тақ сандар және дөңгелектеу', ru: 'Чётные, нечётные и округление', en: 'Even, odd & rounding' },
    introByLang: { kk: 'Сандарды зерттейміз!', ru: 'Исследуем числа!', en: "Let's explore numbers!" },
    grade: [2, 3, 4],
    questions: [
      { kind: 'tap',
        promptByLang: { kk: 'Жұп сандарды тап', ru: 'Найди чётные числа', en: 'Tap the even numbers' },
        words: ['3', '8', '15', '22', '37', '44', '51', '60'], correctIdxs: [1, 3, 5, 7] },
      { kind: 'mc',
        promptByLang: { kk: '47 санын ондыққа дейін дөңгелектесек қандай болады?', ru: 'Округли 47 до ближайшего десятка', en: 'Round 47 to the nearest ten' },
        options: ['40', '45', '50', '55'], answer: 2,
        explainByLang: { kk: '47 ≈ 50 (7 ≥ 5, жоғары дөңгелектейміз) ✓', ru: '47 ≈ 50 (цифра 7 ≥ 5, округляем вверх) ✓', en: '47 ≈ 50 (7 ≥ 5, round up) ✓' } },
      { kind: 'mc',
        promptByLang: { kk: '132 санын жүздікке дейін дөңгелектесек?', ru: 'Округли 132 до сотни', en: 'Round 132 to the nearest hundred' },
        options: ['100', '130', '140', '200'], answer: 0,
        explainByLang: { kk: '132 ≈ 100 (32 < 50, төмен дөңгелектейміз) ✓', ru: '132 ≈ 100 (32 < 50, округляем вниз) ✓', en: '132 ≈ 100 (32 < 50, round down) ✓' } },
      { kind: 'tap',
        promptByLang: { kk: 'Тақ сандарды тап', ru: 'Найди нечётные числа', en: 'Tap the odd numbers' },
        words: ['10', '13', '24', '31', '48', '55', '62', '77'], correctIdxs: [1, 3, 5, 7] },
      { kind: 'type',
        promptByLang: { kk: '83 санын ондыққа дейін дөңгелектесек?', ru: 'Округли 83 до десятка', en: 'Round 83 to the nearest ten' },
        answer: 80,
        explainByLang: { kk: '83 ≈ 80 (3 < 5, төмен дөңгелектейміз) ✓', ru: '83 ≈ 80 (3 < 5, округляем вниз) ✓', en: '83 ≈ 80 (3 < 5, round down) ✓' } },
      { kind: 'word', image: '🏪',
        storyByLang: { kk: 'Дүкенде 348 нан бар. Бұл санды жүздікке дейін дөңгелектесек?', ru: 'В магазине 348 булок хлеба. Округли до сотни.', en: 'A store has 348 loaves. Round to the nearest hundred.' },
        options: ['200', '300', '350', '400'], answer: 1,
        explainByLang: { kk: '348 ≈ 300 (48 < 50) ✓', ru: '348 ≈ 300 (48 < 50) ✓', en: '348 ≈ 300 (48 < 50) ✓' } },
      { kind: 'mc',
        promptByLang: { kk: 'Жұп санды тап', ru: 'Какое число чётное?', en: 'Which number is even?' },
        options: ['71', '83', '96', '105'], answer: 2,
        explainByLang: { kk: '96 — жұп (2-ге қалдықсыз бөлінеді) ✓', ru: '96 — чётное (делится на 2 без остатка) ✓', en: '96 is even (divisible by 2) ✓' } },
      { kind: 'type',
        promptByLang: { kk: '450 санын жүздікке дейін дөңгелектесек?', ru: 'Округли 450 до сотни', en: 'Round 450 to the nearest hundred' },
        answer: 500,
        explainByLang: { kk: '450 ≈ 500 (50 ≥ 50, жоғары) ✓', ru: '450 ≈ 500 (50 ≥ 50, вверх) ✓', en: '450 ≈ 500 (50 ≥ 50, round up) ✓' } },
    ],
  },

  {
    id: 'math-18', subjectId: 'math', emoji: '⚡',
    titleByLang: { kk: 'Аралас есептеулер · + − × ÷', ru: 'Смешанные вычисления', en: 'Mixed operations · + − × ÷' },
    introByLang: { kk: 'Барлық амалдарды қолданамыз!', ru: 'Используем все четыре действия!', en: "Let's use all four operations!" },
    grade: [3, 4],
    questions: [
      { kind: 'type', prompt: '(4 + 6) × 3 = ?', answer: 30,
        explainByLang: { kk: 'Жақша ішін бірінші: 4+6=10\n10 × 3 = 30 ✓', ru: 'Сначала скобки: 4+6=10\n10 × 3 = 30 ✓', en: 'Brackets first: 4+6=10\n10 × 3 = 30 ✓' } },
      { kind: 'mc', big: true, prompt: '24 ÷ 4 + 8',
        options: ['10', '12', '14', '16'], answer: 2,
        explainByLang: { kk: 'Бөлуді бірінші: 24÷4=6\n6 + 8 = 14 ✓', ru: 'Сначала деление: 24÷4=6\n6 + 8 = 14 ✓', en: 'Division first: 24÷4=6\n6 + 8 = 14 ✓' } },
      { kind: 'type', prompt: '50 − 3 × 9 = ?', answer: 23,
        explainByLang: { kk: 'Бірінші × : 3×9=27\n50 − 27 = 23 ✓', ru: 'Сначала ×: 3×9=27\n50 − 27 = 23 ✓', en: 'Multiplication first: 3×9=27\n50 − 27 = 23 ✓' } },
      { kind: 'tap',
        promptByLang: { kk: 'Жауабы 20 болатын мысалдарды тап', ru: 'Найди примеры с ответом 20', en: 'Tap expressions equal to 20' },
        words: ['4×5', '100÷5', '3×7−1', '10+10', '6×4−4', '25−5'], correctIdxs: [0, 3, 4, 5] },
      { kind: 'mc', big: true, prompt: '(15 − 9) × 4',
        options: ['20', '22', '24', '26'], answer: 2,
        explainByLang: { kk: '15−9=6\n6 × 4 = 24 ✓', ru: '15−9=6\n6 × 4 = 24 ✓', en: '15−9=6\n6 × 4 = 24 ✓' } },
      { kind: 'word', image: '🛍️',
        storyByLang: { kk: 'Кітап 45 теңге, қалам 12 теңге. Аша 3 кітап пен 2 қалам сатып алды. Жалпы бағасы қанша?', ru: 'Книга стоит 45 тенге, ручка — 12 тенге. Аша купила 3 книги и 2 ручки. Сколько потратила?', en: 'A book costs 45 tenge, a pen 12 tenge. Asha bought 3 books and 2 pens. How much did she spend?' },
        options: ['111 ₸', '159 ₸', '161 ₸', '180 ₸'], answer: 1,
        explainByLang: { kk: '3×45 = 135\n2×12 = 24\n135 + 24 = 159 ✓', ru: '3×45 = 135\n2×12 = 24\n135 + 24 = 159 ✓', en: '3×45 = 135\n2×12 = 24\n135 + 24 = 159 ✓' } },
      { kind: 'type', prompt: '(8 + 4) × (9 − 5) = ?', answer: 48,
        explainByLang: { kk: '8+4=12, 9−5=4\n12 × 4 = 48 ✓', ru: '8+4=12, 9−5=4\n12 × 4 = 48 ✓', en: '8+4=12, 9−5=4\n12 × 4 = 48 ✓' } },
      { kind: 'word', image: '🚌',
        storyByLang: { kk: 'Автобуста 36 жолаушы болды. 12 адам түсті, сосын 8 адам мінді. Қазір қанша жолаушы?', ru: 'В автобусе было 36 пассажиров. Вышло 12, вошло 8. Сколько пассажиров сейчас?', en: 'A bus had 36 passengers. 12 got off, 8 got on. How many passengers now?' },
        options: ['28', '30', '32', '34'], answer: 2,
        explainByLang: { kk: '36 − 12 + 8 = 32 ✓', ru: '36 − 12 + 8 = 32 ✓', en: '36 − 12 + 8 = 32 ✓' } },
    ],
  },
]
