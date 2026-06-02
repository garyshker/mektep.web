export type Lang = 'ru' | 'kk' | 'en'

export const I18N = {
  // Bottom nav
  nav_home:           { ru: 'Главная',                    kk: 'Басты',                      en: 'Home' },
  nav_lessons:        { ru: 'Уроки',                      kk: 'Сабақтар',                   en: 'Lessons' },
  nav_leaderboard:    { ru: 'Рейтинг',                    kk: 'Рейтинг',                    en: 'Ranking' },
  nav_profile:        { ru: 'Профиль',                    kk: 'Профиль',                    en: 'Profile' },

  // Common
  grade:              { ru: 'класс',                      kk: 'сынып',                      en: 'grade' },
  level:              { ru: 'Уровень',                    kk: 'Деңгей',                     en: 'Level' },

  // Home
  hello:              { ru: 'Привет,',                    kk: 'Сәлем,',                     en: 'Hello,' },
  continue_learn:     { ru: 'Продолжить',                 kk: 'Жалғастыру',                 en: 'Continue' },
  start:              { ru: 'Старт',                      kk: 'Бастау',                     en: 'Start' },
  games:              { ru: 'Игры',                       kk: 'Ойындар',                    en: 'Games' },
  all_lessons:        { ru: '📚 Все уроки →',             kk: '📚 Барлық сабақтар →',       en: '📚 All lessons →' },
  streak_remind:      { ru: 'дн. подряд — не прерывай!', kk: 'күн қатарынан — үзбе!',      en: 'days in a row — keep going!' },

  // Lessons page
  lessons:            { ru: 'Уроки',                      kk: 'Сабақтар',                   en: 'Lessons' },
  min:                { ru: 'мин',                        kk: 'мин',                        en: 'min' },
  tasks:              { ru: 'зад.',                       kk: 'тапс.',                      en: 'tasks' },
  coming_soon_tmpl:   { ru: 'Уроки для [N] класса скоро появятся', kk: '[N] сыныпқа арналған сабақтар жақында пайда болады', en: 'Lessons for grade [N] coming soon' },
  next_section:       { ru: 'Дальше',                     kk: 'Кейінгі',                    en: 'Next' },

  // Lesson runner labels
  label_mc:           { ru: 'ВЫБЕРИ ОТВЕТ',               kk: 'ЖАУАПТЫ ТАҢДА',              en: 'CHOOSE ANSWER' },
  label_type:         { ru: 'ВВЕДИ ОТВЕТ',                kk: 'ЖАУАПТЫ ЖАЗДЫР',             en: 'TYPE ANSWER' },
  label_tap:          { ru: 'ВЫБЕРИ ВСЕ ПРАВИЛЬНЫЕ',      kk: 'БАРЛЫҚ ДҰРЫСТЫ ТАП',         en: 'TAP ALL CORRECT' },
  label_word:         { ru: 'РЕШИ ЗАДАЧУ',                kk: 'ЕСЕПТІ ШЕШ',                 en: 'SOLVE THE PROBLEM' },
  label_match:        { ru: 'РАЗДЕЛИ НА ГРУППЫ',          kk: 'ТОПТАРҒА БӨЛ',               en: 'SORT INTO GROUPS' },
  label_clock:        { ru: 'КОТОРЫЙ ЧАС?',               kk: 'САҒАТ НЕШЕДЕ?',              en: 'WHAT TIME IS IT?' },

  // Lesson runner UI
  check:              { ru: 'Проверить',                  kk: 'Тексеру',                    en: 'Check' },
  next:               { ru: 'Дальше',                     kk: 'Келесі',                     en: 'Next' },
  correct_fb:         { ru: 'Отлично! Так держать!',      kk: 'Керемет! Солай ұста!',       en: 'Great! Keep it up!' },
  wrong_fb:           { ru: 'Не совсем. Давай разберём:', kk: 'Дұрыс емес. Талдайық:',      en: "Not quite. Let's review:" },
  step_by_step:       { ru: 'Шаг за шагом:',             kk: 'Қадам бойынша:',             en: 'Step by step:' },
  answer_label:       { ru: 'Ответ:',                     kk: 'Жауап:',                     en: 'Answer:' },
  correct_answer:     { ru: 'Правильный ответ:',          kk: 'Дұрыс жауап:',               en: 'Correct answer:' },
  retry:              { ru: 'Попробовать снова',          kk: 'Қайталау',                   en: 'Try again' },

  // Done screen
  lesson_done:        { ru: 'Урок завершён!',             kk: 'Сабақ аяқталды!',            en: 'Lesson complete!' },
  score_tmpl:         { ru: '[N] из [T] правильно',       kk: '[N] / [T] дұрыс',            en: '[N] of [T] correct' },
  again:              { ru: 'Ещё раз',                    kk: 'Қайтадан',                   en: 'Again' },
  not_found:          { ru: 'Урок не найден',             kk: 'Сабақ табылмады',            en: 'Lesson not found' },

  // Profile
  days_streak:        { ru: 'Дней подряд',                kk: 'Күн қатарынан',              en: 'Day streak' },
  lessons_count:      { ru: 'Уроков',                     kk: 'Сабақтар',                   en: 'Lessons' },
  stars_earned:       { ru: 'Заработано звёзд:',          kk: 'Жұлдыз жиналды:',            en: 'Stars earned:' },
  completed_lessons:  { ru: 'Пройденные уроки',           kk: 'Өткен сабақтар',             en: 'Completed lessons' },
  edit_profile:       { ru: 'Редактировать профиль',      kk: 'Профильді өзгерту',          en: 'Edit profile' },
  sign_out:           { ru: 'Выйти из аккаунта',          kk: 'Шығу',                       en: 'Sign out' },

  // Leaderboard
  top_by_xp:          { ru: 'Топ по очкам опыта',         kk: 'Тәжірибе ұпайы бойынша үздіктер', en: 'Top by XP' },
  your_rank:          { ru: 'Твоё место',                 kk: 'Орның',                      en: 'Your rank' },
  top3:               { ru: 'Топ 3',                      kk: 'Үздік 3',                    en: 'Top 3' },
  no_users:           { ru: 'Пока никого нет. Будь первым!', kk: 'Әлі ешкім жоқ. Бірінші бол!', en: 'No one yet. Be the first!' },
} as const

export type I18NKey = keyof typeof I18N

export function t(key: I18NKey, lang: Lang): string {
  return (I18N[key] as Record<string, string>)[lang] ?? (I18N[key] as Record<string, string>).ru ?? key
}
