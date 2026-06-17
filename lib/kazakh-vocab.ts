// Kazakh A1 vocabulary, organised into thematic units. Each word carries its
// Kazakh form + Russian/English meaning + an emoji for instant comprehension.
// The trainer drills these adaptively (per-word mastery + spaced repetition),
// reusing the mastery engine in ./skills — skill_id = `kaz:<theme>:<word>`.

import type { ByLang } from './lessons/types'
import type { Lang } from './i18n'

export type VocabWord = { id: string; kk: string; ru: string; en: string; emoji: string }
export type VocabTheme = { id: string; emoji: string; name: ByLang; words: VocabWord[] }

export const VOCAB_THEMES: VocabTheme[] = [
  {
    id: 'greetings', emoji: '👋', name: { kk: 'Сәлемдесу', ru: 'Приветствия', en: 'Greetings' },
    words: [
      { id: 'hello', kk: 'Сәлем', ru: 'Привет', en: 'Hello', emoji: '👋' },
      { id: 'bye', kk: 'Сау бол', ru: 'Пока', en: 'Goodbye', emoji: '🫡' },
      { id: 'thanks', kk: 'Рахмет', ru: 'Спасибо', en: 'Thank you', emoji: '🙏' },
      { id: 'sorry', kk: 'Кешіріңіз', ru: 'Извините', en: 'Sorry', emoji: '🙇' },
      { id: 'yes', kk: 'Иә', ru: 'Да', en: 'Yes', emoji: '✅' },
      { id: 'no', kk: 'Жоқ', ru: 'Нет', en: 'No', emoji: '❌' },
      { id: 'good', kk: 'Жақсы', ru: 'Хорошо', en: 'Good', emoji: '👍' },
      { id: 'howareyou', kk: 'Қалайсың?', ru: 'Как дела?', en: 'How are you?', emoji: '🙂' },
    ],
  },
  {
    id: 'family', emoji: '👨‍👩‍👧', name: { kk: 'Отбасы', ru: 'Семья', en: 'Family' },
    words: [
      { id: 'mother', kk: 'Ана', ru: 'Мама', en: 'Mother', emoji: '👩' },
      { id: 'father', kk: 'Әке', ru: 'Папа', en: 'Father', emoji: '👨' },
      { id: 'grandfather', kk: 'Ата', ru: 'Дедушка', en: 'Grandfather', emoji: '👴' },
      { id: 'grandmother', kk: 'Әже', ru: 'Бабушка', en: 'Grandmother', emoji: '👵' },
      { id: 'child', kk: 'Бала', ru: 'Ребёнок', en: 'Child', emoji: '🧒' },
      { id: 'brother', kk: 'Аға', ru: 'Старший брат', en: 'Older brother', emoji: '👦' },
      { id: 'sister', kk: 'Апа', ru: 'Старшая сестра', en: 'Older sister', emoji: '👧' },
      { id: 'family', kk: 'Отбасы', ru: 'Семья', en: 'Family', emoji: '👨‍👩‍👧' },
    ],
  },
  {
    id: 'animals', emoji: '🐾', name: { kk: 'Жануарлар', ru: 'Животные', en: 'Animals' },
    words: [
      { id: 'cat', kk: 'Мысық', ru: 'Кошка', en: 'Cat', emoji: '🐱' },
      { id: 'dog', kk: 'Ит', ru: 'Собака', en: 'Dog', emoji: '🐶' },
      { id: 'horse', kk: 'Жылқы', ru: 'Лошадь', en: 'Horse', emoji: '🐴' },
      { id: 'cow', kk: 'Сиыр', ru: 'Корова', en: 'Cow', emoji: '🐮' },
      { id: 'sheep', kk: 'Қой', ru: 'Овца', en: 'Sheep', emoji: '🐑' },
      { id: 'camel', kk: 'Түйе', ru: 'Верблюд', en: 'Camel', emoji: '🐫' },
      { id: 'wolf', kk: 'Қасқыр', ru: 'Волк', en: 'Wolf', emoji: '🐺' },
      { id: 'bear', kk: 'Аю', ru: 'Медведь', en: 'Bear', emoji: '🐻' },
      { id: 'fox', kk: 'Түлкі', ru: 'Лиса', en: 'Fox', emoji: '🦊' },
      { id: 'fish', kk: 'Балық', ru: 'Рыба', en: 'Fish', emoji: '🐟' },
    ],
  },
  {
    id: 'colors', emoji: '🎨', name: { kk: 'Түстер', ru: 'Цвета', en: 'Colors' },
    words: [
      { id: 'red', kk: 'Қызыл', ru: 'Красный', en: 'Red', emoji: '🔴' },
      { id: 'blue', kk: 'Көк', ru: 'Синий', en: 'Blue', emoji: '🔵' },
      { id: 'green', kk: 'Жасыл', ru: 'Зелёный', en: 'Green', emoji: '🟢' },
      { id: 'yellow', kk: 'Сары', ru: 'Жёлтый', en: 'Yellow', emoji: '🟡' },
      { id: 'white', kk: 'Ақ', ru: 'Белый', en: 'White', emoji: '⚪' },
      { id: 'black', kk: 'Қара', ru: 'Чёрный', en: 'Black', emoji: '⚫' },
      { id: 'brown', kk: 'Қоңыр', ru: 'Коричневый', en: 'Brown', emoji: '🟤' },
      { id: 'pink', kk: 'Қызғылт', ru: 'Розовый', en: 'Pink', emoji: '🌸' },
    ],
  },
  {
    id: 'food', emoji: '🍽️', name: { kk: 'Тағам', ru: 'Еда', en: 'Food' },
    words: [
      { id: 'bread', kk: 'Нан', ru: 'Хлеб', en: 'Bread', emoji: '🍞' },
      { id: 'water', kk: 'Су', ru: 'Вода', en: 'Water', emoji: '💧' },
      { id: 'milk', kk: 'Сүт', ru: 'Молоко', en: 'Milk', emoji: '🥛' },
      { id: 'meat', kk: 'Ет', ru: 'Мясо', en: 'Meat', emoji: '🍖' },
      { id: 'apple', kk: 'Алма', ru: 'Яблоко', en: 'Apple', emoji: '🍎' },
      { id: 'tea', kk: 'Шай', ru: 'Чай', en: 'Tea', emoji: '🍵' },
      { id: 'egg', kk: 'Жұмыртқа', ru: 'Яйцо', en: 'Egg', emoji: '🥚' },
      { id: 'sugar', kk: 'Қант', ru: 'Сахар', en: 'Sugar', emoji: '🧂' },
    ],
  },
  {
    id: 'numbers', emoji: '🔢', name: { kk: 'Сандар', ru: 'Числа', en: 'Numbers' },
    words: [
      { id: 'one', kk: 'Бір', ru: '1', en: 'One', emoji: '1️⃣' },
      { id: 'two', kk: 'Екі', ru: '2', en: 'Two', emoji: '2️⃣' },
      { id: 'three', kk: 'Үш', ru: '3', en: 'Three', emoji: '3️⃣' },
      { id: 'four', kk: 'Төрт', ru: '4', en: 'Four', emoji: '4️⃣' },
      { id: 'five', kk: 'Бес', ru: '5', en: 'Five', emoji: '5️⃣' },
      { id: 'six', kk: 'Алты', ru: '6', en: 'Six', emoji: '6️⃣' },
      { id: 'seven', kk: 'Жеті', ru: '7', en: 'Seven', emoji: '7️⃣' },
      { id: 'eight', kk: 'Сегіз', ru: '8', en: 'Eight', emoji: '8️⃣' },
      { id: 'nine', kk: 'Тоғыз', ru: '9', en: 'Nine', emoji: '9️⃣' },
      { id: 'ten', kk: 'Он', ru: '10', en: 'Ten', emoji: '🔟' },
    ],
  },
  {
    id: 'body', emoji: '🧍', name: { kk: 'Дене мүшелері', ru: 'Части тела', en: 'Body' },
    words: [
      { id: 'head', kk: 'Бас', ru: 'Голова', en: 'Head', emoji: '🗣️' },
      { id: 'eye', kk: 'Көз', ru: 'Глаз', en: 'Eye', emoji: '👁️' },
      { id: 'ear', kk: 'Құлақ', ru: 'Ухо', en: 'Ear', emoji: '👂' },
      { id: 'nose', kk: 'Мұрын', ru: 'Нос', en: 'Nose', emoji: '👃' },
      { id: 'mouth', kk: 'Ауыз', ru: 'Рот', en: 'Mouth', emoji: '👄' },
      { id: 'hand', kk: 'Қол', ru: 'Рука', en: 'Hand', emoji: '✋' },
      { id: 'foot', kk: 'Аяқ', ru: 'Нога', en: 'Foot', emoji: '🦶' },
      { id: 'hair', kk: 'Шаш', ru: 'Волосы', en: 'Hair', emoji: '💇' },
    ],
  },
  {
    id: 'nature', emoji: '🌿', name: { kk: 'Табиғат', ru: 'Природа', en: 'Nature' },
    words: [
      { id: 'sun', kk: 'Күн', ru: 'Солнце', en: 'Sun', emoji: '☀️' },
      { id: 'moon', kk: 'Ай', ru: 'Луна', en: 'Moon', emoji: '🌙' },
      { id: 'star', kk: 'Жұлдыз', ru: 'Звезда', en: 'Star', emoji: '⭐' },
      { id: 'tree', kk: 'Ағаш', ru: 'Дерево', en: 'Tree', emoji: '🌳' },
      { id: 'flower', kk: 'Гүл', ru: 'Цветок', en: 'Flower', emoji: '🌸' },
      { id: 'mountain', kk: 'Тау', ru: 'Гора', en: 'Mountain', emoji: '⛰️' },
      { id: 'river', kk: 'Өзен', ru: 'Река', en: 'River', emoji: '🏞️' },
      { id: 'sky', kk: 'Аспан', ru: 'Небо', en: 'Sky', emoji: '☁️' },
    ],
  },
]

export const skillIdOf = (themeId: string, wordId: string) => `kaz:${themeId}:${wordId}`

// The meaning shown to the learner (they learn Kazakh, so the prompt/answer is
// in their interface language — Russian by default, English for en users).
export const meaningOf = (w: VocabWord, lang: Lang) => (lang === 'en' ? w.en : w.ru)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

export type VocabMode = 'recognition' | 'production' | 'listening'
export type VocabQuestion = { word: VocabWord; mode: VocabMode; options: string[]; answer: string }

// Scaffold difficulty by mastery: receptive (kk→meaning) → productive
// (meaning→kk) → aural (audio→kk). Distractors come from the SAME theme so
// they're plausible, not random noise.
export function buildVocabQuestion(theme: VocabTheme, word: VocabWord, mastery: number, lang: Lang): VocabQuestion {
  const mode: VocabMode = mastery < 0.35 ? 'recognition' : mastery < 0.7 ? 'production' : 'listening'
  const others = shuffle(theme.words.filter(w => w.id !== word.id)).slice(0, 3)
  if (mode === 'recognition') {
    const answer = meaningOf(word, lang)
    return { word, mode, answer, options: shuffle([answer, ...others.map(w => meaningOf(w, lang))]) }
  }
  // production & listening both ask for the Kazakh form
  return { word, mode, answer: word.kk, options: shuffle([word.kk, ...others.map(w => w.kk)]) }
}
