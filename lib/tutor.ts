// Сова-коуч (Socratic tutor) — the LLM layer of the hybrid tutor.
//
// Division of responsibility (the whole point of this design):
//   • CODE owns the truth: deterministic generators build the task, diagnose*()
//     classifies the child's mistake, the mastery engine picks difficulty.
//   • THIS MODULE (LLM) owns only the *voice*: it turns a graded attempt into a
//     warm, Socratic hint. It never computes or grades arithmetic.
//
// Server-only: holds the Gemini key, called from app/api/coach/route.ts. The
// client talks to it through lib/tutor-client.ts (askCoach), never directly.

export type Lang = 'ru' | 'kk' | 'en'

export interface CoachInput {
  lang: Lang
  task: {
    topic: string                       // e.g. "column_addition_transition"
    question: string                    // e.g. "45 + 27"
    expected_answer: string | number    // "72" — for the model's *direction* only, never revealed
  }
  student_input: string | number        // what the child typed, e.g. "62"
  attempt_number: number                 // 1 = soft hint · 2 = micro-steps · 3 = teach the method
  error_tag?: string                     // from diagnose*() in lib/skills.ts — the precise mistake
  recent_context?: string                // Сова's previous line, so she doesn't repeat herself
}

export interface CoachResult {
  dialogue_text: string
  source: 'gemini' | 'fallback' | 'praise'
}

// Swap to a newer Flash here when you want — REST contract is identical.
const GEMINI_MODEL = 'gemini-1.5-flash'
const TIMEOUT_MS = 6000

// Gemini structured-output schema → guarantees valid JSON, no markdown fences.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { dialogue_text: { type: 'STRING' } },
  required: ['dialogue_text'],
} as const

const LANG_NAME: Record<Lang, string> = {
  ru: 'русском языке',
  kk: 'қазақ тілінде',
  en: 'English',
}

// Short, model-facing gloss of each diagnostic tag (the model reads RU fine).
const TAG_GLOSS: Record<string, string> = {
  forgot_carry:       'забыл перенести десяток при переходе через 10',
  forgot_borrow:      'забыл «занять» десяток при вычитании',
  subtracted_smaller: 'вычел меньшую цифру из большей в столбик вместо занимания десятка',
  wrong_operation:    'перепутал действие (сложение/вычитание)',
  off_by_one:         'ошибся на единицу',
  extra_ten:          'прибавил лишний десяток',
  table_neighbor:     'назвал соседний факт таблицы умножения',
  used_addition:      'сложил вместо умножения',
  one_group_off:      'ошибся на одну группу при умножении',
  gave_divisor:       'назвал делитель вместо частного',
  random_guess:       'похоже, пока угадывает',
}

function systemPrompt(lang: Lang): string {
  return [
    'Ты — Сова, добрый ИИ-наставник в детском приложении iMektep (Ұшқын) для учеников 2 класса (7–8 лет).',
    'Ты помогаешь ребёнку самому дойти до ответа по математике — методом Сократа.',
    '',
    'ЖЕЛЕЗНЫЕ ПРАВИЛА:',
    '1. НИКОГДА не называй финальный ответ задачи числом. Веди к нему намёком и вопросом.',
    '2. Реагируй на КОНКРЕТНУЮ ошибку ребёнка (она указана ниже), а не вообще.',
    '3. Очень короткие предложения — 1–3 штуки. Тёплый тон, дружеский эмодзи изредка.',
    '4. Лексика из мира ребёнка: игры, животные, космос, роботы, школа.',
    '5. Глубина подсказки зависит от номера попытки:',
    '   • Попытка 1 — мягко покажи, ГДЕ сбой, и дай один намёк.',
    '   • Попытка 2 — разбей на микрошаги и задай один наводящий вопрос.',
    '   • Попытка 3 — объясни сам МЕТОД (можно на примере с ДРУГИМИ числами), но финальное число текущей задачи не произноси.',
    '6. Не повторяй дословно свою прошлую реплику.',
    `7. Отвечай СТРОГО на ${LANG_NAME[lang]}. Верни только поле dialogue_text.`,
  ].join('\n')
}

function situationPrompt(input: CoachInput): string {
  const gloss = input.error_tag ? (TAG_GLOSS[input.error_tag] ?? input.error_tag) : 'не определён'
  return [
    `Тема: ${input.task.topic}`,
    `Задача: ${input.task.question}`,
    `Правильный ответ (только для понимания направления, НЕ раскрывай ребёнку): ${input.task.expected_answer}`,
    `Ребёнок ответил: ${input.student_input}`,
    `Номер попытки: ${input.attempt_number}`,
    `Диагноз ошибки: ${gloss}`,
    `Твоя прошлая реплика: ${input.recent_context?.trim() || '—'}`,
  ].join('\n')
}

const norm = (v: string | number) => String(v).trim().replace(',', '.')
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

// Static, free, instant praise for correct answers — no reason to spend a token on "Молодец!".
const PRAISE: Record<Lang, string[]> = {
  ru: ['Отлично! 🌟', 'Супер, ты справился!', 'Вот это да — верно! 🚀', 'Молодчина! 🦉', 'Точно в цель! 🎯'],
  kk: ['Жарайсың! 🌟', 'Керемет, дұрыс!', 'Тамаша! 🚀', 'Бәрекелді! 🦉', 'Дөп тапты! 🎯'],
  en: ['Awesome! 🌟', 'You did it!', 'Yes — correct! 🚀', 'Great job! 🦉', 'Bullseye! 🎯'],
}

// Localized fallback hints when Gemini is unavailable (no key / timeout / error).
// Keeps the tutor useful and on-brand even offline.
const FALLBACK: Record<Lang, { generic: [string, string, string]; tags: Record<string, string> }> = {
  ru: {
    generic: [
      'Почти! Давай спокойно проверим ещё разок. 🦉',
      'Идём по шагам: сначала посчитай единицы, потом десятки.',
      'Не спеши. Реши столбиком: единицы, затем десятки — и не забудь про перенос.',
    ],
    tags: {
      forgot_carry: 'Кажется, ты потерял десяток-«гостя». Когда единиц больше 9, один десяток переезжает наверх. 🦉',
      forgot_borrow: 'Единиц не хватает, чтобы вычесть? Тогда «занимаем» один десяток у соседа слева.',
      wrong_operation: 'Глянь на знак внимательно: тут сложение или вычитание? 🤔',
      table_neighbor: 'Похоже, это соседняя клетка таблицы. Посчитай ещё разок по порядку.',
    },
  },
  kk: {
    generic: [
      'Дерлік дұрыс! Тағы бір рет байыппен тексерейік. 🦉',
      'Қадаммен жүрейік: алдымен бірліктерді, сосын ондықтарды сана.',
      'Асықпа. Бағанмен шеш: бірліктер, сосын ондықтар — ауысуды ұмытпа.',
    ],
    tags: {
      forgot_carry: 'Ауысатын ондықты ұмытқан сияқтысың. Бірлік 9-дан асса, бір ондық жоғары көшеді. 🦉',
      forgot_borrow: 'Алу үшін бірлік жетпей тұр ма? Сол жақ көршіден бір ондық «аламыз».',
      wrong_operation: 'Таңбаға мұқият қара: бұл қосу ма, әлде алу ма? 🤔',
      table_neighbor: 'Бұл кестенің көрші торы сияқты. Ретімен қайта сана.',
    },
  },
  en: {
    generic: [
      'Almost! Let’s calmly check it once more. 🦉',
      'Step by step: count the ones first, then the tens.',
      'No rush. Solve in a column: ones, then tens — and don’t forget the carry.',
    ],
    tags: {
      forgot_carry: 'Looks like the carried ten went missing. When the ones pass 9, one ten moves up. 🦉',
      forgot_borrow: 'Not enough ones to subtract? Then we “borrow” one ten from the left neighbour.',
      wrong_operation: 'Look at the sign closely: is this adding or subtracting? 🤔',
      table_neighbor: 'That looks like the neighbouring cell in the table. Count through it again.',
    },
  },
}

function fallbackHint(input: CoachInput): string {
  const f = FALLBACK[input.lang] ?? FALLBACK.ru
  const tagMsg = input.error_tag ? f.tags[input.error_tag] : undefined
  if (tagMsg && input.attempt_number <= 2) return tagMsg
  const idx = Math.min(Math.max(input.attempt_number, 1), 3) - 1
  return f.generic[idx]
}

async function callGemini(input: CoachInput, key: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(input.lang) }] },
        contents: [{ role: 'user', parts: [{ text: situationPrompt(input) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null
    const parsed = JSON.parse(text) as { dialogue_text?: string }
    const out = parsed.dialogue_text?.trim()
    return out || null
  } catch {
    return null   // timeout / network / parse → caller falls back
  } finally {
    clearTimeout(timer)
  }
}

// Main entry point. Correct answer → instant static praise (no LLM). Wrong answer →
// Gemini Socratic hint, with a localized fallback if Gemini is unavailable.
export async function coach(input: CoachInput): Promise<CoachResult> {
  const correct = norm(input.student_input) === norm(input.task.expected_answer)
  if (correct) return { dialogue_text: pick(PRAISE[input.lang] ?? PRAISE.ru), source: 'praise' }

  const key = process.env.GEMINI_API_KEY
  if (key) {
    const text = await callGemini(input, key)
    if (text) return { dialogue_text: text, source: 'gemini' }
  }
  return { dialogue_text: fallbackHint(input), source: 'fallback' }
}
