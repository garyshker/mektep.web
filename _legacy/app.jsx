// app.jsx — iMektep main application
// Loaded 3rd by the sequential loader in index.html, after:
//   tweaks-panel.jsx  → sets window.useTweaks, window.TweaksPanel, etc.
//   lesson-runner.jsx → sets window.LessonRunner, window.pickLang, etc.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Capture shared dependencies from window at module-load time.
// Because the sequential loader ran the above two files first, these are
// already set by the time this file executes.
const {
  LessonRunner,
  MathSprintMinute,
  pickLang,
} = window;

const {
  useTweaks,
  TweaksPanel, TweakSection, TweakRow,
  TweakToggle, TweakRadio, TweakSelect, TweakButton,
} = window;

// ─── Tweaks defaults ───────────────────────────────────────────────

const TWEAK_DEFAULTS = {
  mascot: true,
  density: "comfortable",
  showCallouts: true,
  language: "kk",
  darkMode: false,
};

// ─── Subject icons ─────────────────────────────────────────────────

const IconMath = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 8h10M9 12h6M7 16h4M14 16l3 3M17 16l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconKaz = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 5.5C7 4 10 4 12 5.5C14 4 17 4 20 5.5V19c-3-1.5-6-1.5-8 0c-2-1.5-5-1.5-8 0V5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 5.5V19" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconWorld = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconEng = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M4 18l4-10 4 10M5.5 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 12c1.5-2 4-2 5 0c1 2-2 3-2.5 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconLogic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
    <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M17.5 14v7M14 17.5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconMusic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M9 18V6l12-2v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const Sparkle = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2l1.6 4.7L18 8l-4.4 1.3L12 14l-1.6-4.7L6 8l4.4-1.3L12 2zM18 14l.9 2.6L21 17.5l-2.1.9L18 21l-.9-2.6L15 17.5l2.1-.9L18 14z"/>
  </svg>
);
const Star = ({ on }) => (
  <svg className={"s " + (on ? "" : "off")} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"/>
  </svg>
);

// ─── Sound effects (Web Audio API, no external files) ──────────────
const SFX = (() => {
  let ctx = null;
  const ac = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (freq, dur, type='sine', vol=0.13, startFreq=null, endFreq=null) => {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type;
      if (startFreq && endFreq) {
        o.frequency.setValueAtTime(startFreq, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + dur);
      } else { o.frequency.value = freq; }
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    } catch(e) {}
  };
  const seq = (notes) => notes.forEach(([f, t, d, tp, v]) => {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.13, c.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + d);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + t); o.stop(c.currentTime + t + d);
    } catch(e) {}
  });
  const sfx = {
    flip:    () => tone(520, 0.07, 'sine', 0.09),
    match:   () => seq([[523,.0,.15],[659,.1,.15],[784,.2,.25]]),
    wrong:   () => tone(0, 0.18, 'sawtooth', 0.09, 260, 160),
    win:     () => seq([[523,.0,.2],[659,.1,.2],[784,.2,.2],[1047,.32,.4]]),
    eat:     () => tone(0, 0.1, 'sine', 0.1, 550, 880),
    die:     () => tone(0, 0.5, 'sawtooth', 0.12, 380, 90),
    correct: () => tone(0, 0.12, 'sine', 0.1, 440, 660),
    tick:    () => tone(880, 0.05, 'sine', 0.07),
    complete:() => seq([[523,.0,.18],[659,.12,.18],[784,.24,.18],[1047,.38,.35]]),
  };
  // wire up window.sound* used by QuickGame
  window.soundCorrect  = sfx.correct;
  window.soundWrong    = sfx.wrong;
  window.soundComplete = sfx.complete;
  window.soundTick     = sfx.tick;
  return sfx;
})();

// ─── UI strings (3 languages) ──────────────────────────────────────

const L = {
  kk: {
    welcome: (n) => `Сәлем, ${n || 'Оқушы'}!`,
    welcomeSub: "Бүгін не үйренеміз?",
    eyebrowPick: "ПӘНДІ ТАҢДА",
    title: "Бастауыш сыныптарға арналған сабақтар",
    continueEyebrow: "Жалғастыр",
    continueTitle: "Қосу · 100 ішінде · 1-сабақ",
    continueSub: "Сен бұл сабаққа кеше уақыт бөлдің. Енді 5 минут қалды.",
    continueBtn: "Сабақты жалғастыру",
    quests: "Бүгінгі тапсырмалар",
    questsPill: "3 / 4",
    q1: "Бір сабақты аяқта",   q1m: "≈ 8 мин",
    q2: "20 карточкамен жатта", q2m: "Қазақ тілі",
    q3: "Бір викторинаны өт",   q3m: "Математика",
    q4: "Достарыңмен ойна",     q4m: "Жаңа!",
    eyebrowAll: "БАРЛЫҚ ПӘНДЕР",
    all: "Барлық пәндер",
    seeAll: "Барлығын көру",
    soon: "ЖАҚЫНДА",
    notify: "Хабарласам",
    lessonOf: (a, b) => `${a}-сабақ / ${b}`,
    next: "Келесі:",
    friends: "Сыныптастарың онлайн",
    friendsSub: "5 дос қазір сабақ оқып жатыр",
    leaderboard: "Көшбасшылар",
    mascotMsg: "Қайта оралғаныңа қуаныштымын! Бүгін көбейту кестесін бітірейік 🚀",
    level: "Деңгей",
    obSub: "Атыңды жаз, оқуды бастайық!",
    obPlaceholder: "Атыңды жаз",
    obStart: "Бастайық →",
    darkMode: "Күңгірт тақырып",
    seeAllToast: "Барлық пәндер — жақында!",
    leaderboardToast: "Рейтинг — жақында!",
    allDone: "Барлық сабақтар аяқталды! 🎉",
    allDoneSub: "Жаңа сабақтарды күт",
    allDoneBtn: "Күту...",
    quickGame: "Жылдам ойын",
    quickGameSub: "× ÷ жылдамдық тесті",
    perfect:"Тамаша! 🌟", great:"Жарайсың!", good:"Жақсы!", tryAgain:"Тағы бір рет!",
    quit:"Шығу", retry:"Қайталау",
    continueBtnShort: "Жалғастыру →",
    grade: (g) => `${g}-сынып`,
    gradeLabel: "Қай сыныпта оқисың?",
    pickGame: "Ойын таңда",
    mathSprint: "Математикалық жарыс",
    mathSprintSub: "× ÷ жылдамдық сынағы",
    trueFalse: "Дұрыс па?",
    trueFalseSub: "Жауабын тексер",
    difficulty: ["Оңай", "Орта", "Қиын"],
    combo: (n) => `${n} қатарынан 🔥`,
    trueBtn: "✓ Дұрыс",
    falseBtn: "✗ Қате",
    missingNum: "Санды тап", missingNumSub: "Жоғалған санды тап",
    compareRush: "Салыстыр", compareRushSub: "< немесе > таңда",
    numChain: "Сан тізбегі", numChainSub: "Қадамдарды орында",
    wordProb: "Есеп", wordProbSub: "Мәтінді оқы, жауап тап",
    lessBtn: "◀ Кіші", moreBtn: "Үлкен ▶",
    multiTable: "Көбейту кестесі", multiTableSub: "2-ден 9-ға дейін",
    multiTablePick: "Санды таңда", multiTablePractice: "Жаттықтыру",
    multiTableStart: "Жаттығуды бастау →",
    logout: "Шығу", home: "Үй",
    tetrisTitle: "Тетрис",
    tetrisScore: "Ұпай", tetrisLines: "Жол", tetrisLevel: "Деңгей",
    tetrisHint: "Түрту — бұру  ·  Сырғыту — жылжыту  ·  Төмен — тастау",
    tetrisOver: "ОЙЫН БІТТІ", tetrisRestart: "Қайтадан ойнау үшін басыңыз",
    games: "Ойындар", tetrisDesc: "Блоктарды тер", playBtn: "Ойна →",
    g2048Desc: "Бірдей сандарды біріктір", g2048Hint: "Свайп — жылжыту  ·  2048-ге жет!",
    bestScore: "Рекорд", memoryTitle: "Жад ойыны", memoryDesc: "Жұп карточкаларды тап",
    snakeTitle: "Сандық жылан", snakeDesc: "Сандарды жина",
    moves: "қадам", memoryPairs: "жұп", memoryWin: "Жеңдіңіз! 🎉", memoryPreview: "Жаттап ал!",
    weekProgress: "Апта барысы",
    lessonOfDay: "КҮН САБАҒЫ",
    parentCabinet: "Ата-ана кабинеті",
    parentCabinetSub: "Баланың есебі мен прогресі",
    subjectProgress: "Пәндер бойынша прогресс",
    recommendations: "Ұсыныстар",
    streakDays: "күн қатарынан",
    gradeWord: "Сынып",
    practiceMode: "Математикалық спринт",
    practiceModeSub: "1 минутта мүмкіндігінше көп",
    clockLesson: "Сағатты оқу",
    clockLessonSub: "Аналогтік сағат · сағат және минут",
    clockLessonBtn: "Сабақты бастау →",
    questions: "сұрақ",
    allGrades: "Барлық сыныптар",
  },
  ru: {
    welcome: (n) => `Привет, ${n || 'Ученик'}!`,
    welcomeSub: "Что изучим сегодня?",
    eyebrowPick: "ВЫБЕРИ ПРЕДМЕТ",
    title: "Уроки для начальной школы",
    continueEyebrow: "Продолжить",
    continueTitle: "Сложение · до 100 · урок 1",
    continueSub: "Ты занимался этим вчера. Осталось 5 минут.",
    continueBtn: "Продолжить урок",
    quests: "Задания на сегодня",
    questsPill: "3 / 4",
    q1: "Закончи один урок",    q1m: "≈ 8 мин",
    q2: "Повтори 20 карточек",  q2m: "Казахский",
    q3: "Пройди викторину",     q3m: "Математика",
    q4: "Играй с друзьями",     q4m: "Новое!",
    eyebrowAll: "ВСЕ ПРЕДМЕТЫ",
    all: "Все предметы",
    seeAll: "Смотреть всё",
    soon: "СКОРО",
    notify: "Сообщить",
    lessonOf: (a, b) => `Урок ${a} из ${b}`,
    next: "Далее:",
    friends: "Одноклассники онлайн",
    friendsSub: "5 друзей сейчас учатся",
    leaderboard: "Рейтинг",
    mascotMsg: "С возвращением! Давай добьём таблицу умножения 🚀",
    level: "Уровень",
    obSub: "Напиши своё имя и начнём учиться!",
    obPlaceholder: "Твоё имя",
    obStart: "Начнём →",
    darkMode: "Тёмная тема",
    seeAllToast: "Все предметы — скоро!",
    leaderboardToast: "Рейтинг — скоро!",
    allDone: "Все уроки пройдены! 🎉",
    allDoneSub: "Ждите новые уроки",
    allDoneBtn: "Ожидать...",
    quickGame: "Быстрая игра",
    quickGameSub: "× ÷ тест на скорость",
    perfect:"Отлично! 🌟", great:"Хорошо!", good:"Неплохо!", tryAgain:"Ещё раз!",
    quit:"Выйти", retry:"Снова",
    continueBtnShort: "Продолжить →",
    grade: (g) => `${g} класс`,
    gradeLabel: "В каком классе учишься?",
    pickGame: "Выбери игру",
    mathSprint: "Математический спринт",
    mathSprintSub: "× ÷ тест на скорость",
    trueFalse: "Верно или нет?",
    trueFalseSub: "Проверь ответ",
    difficulty: ["Легко", "Средне", "Сложно"],
    combo: (n) => `${n} подряд 🔥`,
    trueBtn: "✓ Верно",
    falseBtn: "✗ Неверно",
    missingNum: "Найди число", missingNumSub: "Что вместо ?",
    compareRush: "Сравни", compareRushSub: "Выбери < или >",
    numChain: "Цепочка чисел", numChainSub: "Считай по шагам",
    wordProb: "Задачи", wordProbSub: "Читай текст, найди ответ",
    lessBtn: "◀ Меньше", moreBtn: "Больше ▶",
    multiTable: "Таблица умножения", multiTableSub: "от 2 до 9",
    multiTablePick: "Выбери число", multiTablePractice: "Тренировка",
    multiTableStart: "Приступить →",
    logout: "Выйти", home: "Главная",
    tetrisTitle: "Тетрис",
    tetrisScore: "Счёт", tetrisLines: "Линии", tetrisLevel: "Уровень",
    tetrisHint: "Тап — поворот  ·  Свайп — двигай  ·  Вниз — сброс",
    tetrisOver: "ИГРА ОКОНЧЕНА", tetrisRestart: "Нажмите чтобы начать снова",
    games: "Игры", tetrisDesc: "Складывай блоки", playBtn: "Играть →",
    g2048Desc: "Объединяй одинаковые числа", g2048Hint: "Свайп — двигай  ·  Достигни 2048!",
    bestScore: "Рекорд", memoryTitle: "Память", memoryDesc: "Найди пары карточек",
    snakeTitle: "Математическая змейка", snakeDesc: "Собирай числа",
    moves: "ходов", memoryPairs: "пар", memoryWin: "Победа! 🎉", memoryPreview: "Запомни!",
    weekProgress: "Прогресс недели",
    lessonOfDay: "УРОК ДНЯ",
    parentCabinet: "Кабинет родителя",
    parentCabinetSub: "Отчёт и прогресс ребёнка",
    subjectProgress: "Прогресс по предметам",
    recommendations: "Рекомендации",
    streakDays: "дней подряд",
    gradeWord: "Класс",
    practiceMode: "Математический спринт",
    practiceModeSub: "Сколько решишь за 1 минуту?",
    clockLesson: "Читаем часы",
    clockLessonSub: "Аналоговые часы · часы и минуты",
    clockLessonBtn: "Начать урок →",
    questions: "вопросов",
    allGrades: "Все классы",
  },
  en: {
    welcome: (n) => `Hi, ${n || 'Student'}!`,
    welcomeSub: "What shall we learn today?",
    eyebrowPick: "PICK A SUBJECT",
    title: "Lessons for primary school",
    continueEyebrow: "Continue",
    continueTitle: "Addition · within 100 · Lesson 1",
    continueSub: "You spent time on this yesterday. Just 5 minutes left.",
    continueBtn: "Resume lesson",
    quests: "Today's quests",
    questsPill: "3 / 4",
    q1: "Finish a lesson",   q1m: "≈ 8 min",
    q2: "Review 20 cards",   q2m: "Kazakh",
    q3: "Take one quiz",     q3m: "Math",
    q4: "Play with friends", q4m: "New!",
    eyebrowAll: "ALL SUBJECTS",
    all: "All subjects",
    seeAll: "See all",
    soon: "SOON",
    notify: "Notify me",
    lessonOf: (a, b) => `Lesson ${a} of ${b}`,
    next: "Next:",
    friends: "Classmates online",
    friendsSub: "5 friends are learning right now",
    leaderboard: "Leaderboard",
    mascotMsg: "Welcome back! Let's finish times tables today 🚀",
    level: "Level",
    obSub: "Enter your name and let's start learning!",
    obPlaceholder: "Your name",
    obStart: "Let's go →",
    darkMode: "Dark mode",
    seeAllToast: "All subjects — coming soon!",
    leaderboardToast: "Leaderboard — coming soon!",
    allDone: "All lessons complete! 🎉",
    allDoneSub: "New lessons coming soon",
    allDoneBtn: "Coming soon...",
    quickGame: "Quick Game",
    quickGameSub: "× ÷ speed test",
    perfect:"Excellent! 🌟", great:"Great!", good:"Good!", tryAgain:"Try again!",
    quit:"Quit", retry:"Again",
    continueBtnShort: "Continue →",
    grade: (g) => `Grade ${g}`,
    gradeLabel: "What grade are you in?",
    pickGame: "Pick a game",
    mathSprint: "Math Sprint",
    mathSprintSub: "× ÷ speed test",
    trueFalse: "True or False?",
    trueFalseSub: "Check the equation",
    difficulty: ["Easy", "Medium", "Hard"],
    combo: (n) => `${n} in a row 🔥`,
    trueBtn: "✓ True",
    falseBtn: "✗ False",
    missingNum: "Missing Number", missingNumSub: "What replaces ?",
    compareRush: "Compare Rush", compareRushSub: "Pick < or >",
    numChain: "Number Chain", numChainSub: "Follow the steps",
    wordProb: "Word Problems", wordProbSub: "Read and solve",
    lessBtn: "◀ Less", moreBtn: "More ▶",
    multiTable: "Times Table", multiTableSub: "from 2 to 9",
    multiTablePick: "Pick a number", multiTablePractice: "Practice",
    multiTableStart: "Start practice →",
    logout: "Log out", home: "Home",
    tetrisTitle: "Tetris",
    tetrisScore: "Score", tetrisLines: "Lines", tetrisLevel: "Level",
    tetrisHint: "Tap — rotate  ·  Swipe — move  ·  Down — drop",
    tetrisOver: "GAME OVER", tetrisRestart: "Tap to play again",
    games: "Games", tetrisDesc: "Stack the blocks", playBtn: "Play →",
    g2048Desc: "Merge matching numbers", g2048Hint: "Swipe to move  ·  Reach 2048!",
    bestScore: "Best", memoryTitle: "Memory", memoryDesc: "Find the matching pairs",
    snakeTitle: "Math Snake", snakeDesc: "Collect numbers in order",
    moves: "moves", memoryPairs: "pairs", memoryWin: "You win! 🎉", memoryPreview: "Memorize!",
    weekProgress: "Week progress",
    lessonOfDay: "LESSON OF THE DAY",
    parentCabinet: "Parent Cabinet",
    parentCabinetSub: "Child report & progress",
    subjectProgress: "Subject progress",
    recommendations: "Recommendations",
    streakDays: "days in a row",
    gradeWord: "Grade",
    practiceMode: "Math Sprint",
    practiceModeSub: "How many in 1 minute?",
    clockLesson: "Reading Clocks",
    clockLessonSub: "Analog clock · hours & minutes",
    clockLessonBtn: "Start lesson →",
    questions: "questions",
    allGrades: "All grades",
  },
};

// ─── Subject catalogue ─────────────────────────────────────────────

const SUB_CONTENT = {
  kk: [
    { id:"math", name:"Математика", tag:"Қосу, алу, көбейту, бөлу", color:"math", icon: IconMath, ready:true,
      lessonTitles:{ 1:"Қосу · 100 ішінде", 2:"Алу · 100 ішінде", 3:"Көбейту кестесі · 2-ге", 4:"Көбейту кестесі · 3-ке", 5:"Көбейту кестесі · 4-ке", 6:"Көбейту кестесі · 5-ке", 7:"Көбейту кестесі · 6-ға", 8:"Бөлу · 2-ге", 9:"Сандарды салыстыру · < > =", 10:"Ұзындық · см, дм, м", 11:"Көлем мен масса · литр, кг", 12:"Бөлу · 3-ке, 4-ке, 5-ке" } },
    { id:"kaz",  name:"Қазақ тілі", tag:"Әліпби, дыбыстар, сөздер", color:"kaz", icon: IconKaz, ready:true,
      lessonTitles:{ 1:"Қазақ әліпбиі · ерекше әріптер", 2:"Буын · сөзді бөлу", 3:"Жануарлар · сөздік", 4:"Жуан және жіңішке дыбыстар", 5:"Сөз құрастыру", 6:"Түстер", 7:"Зат есім", 8:"Сын есім", 9:"Етістік", 10:"Мәтін оқу", 11:"Күндер мен айлар", 12:"Сөйлем" } },
    { id:"world", name:"Дүниетану", tag:"Табиғат, жануарлар", color:"world", icon: IconWorld, ready:true,
      lessonTitles:{ 1:"Жыл мезгілдері", 2:"Жабайы жануарлар", 3:"Өсімдіктер", 4:"Адам денесі", 5:"Біздің қала", 6:"Су", 7:"Күн жүйесі", 8:"Қазақстан" } },
    { id:"eng",   name:"English",   tag:"Сөздер мен сөйлемдер", color:"eng", icon: IconEng, ready:true,
      lessonTitles:{ 1:"Ағылшынша сандар · 1-10", 2:"Ағылшынша түстер" } },
    { id:"logic", name:"Логикалық есептер", tag:"Ойын, жұмбақ, логика", color:"logic", icon: IconLogic, ready:false },
    { id:"music", name:"Музыка",  tag:"Ноталар, ырғақ, ән", color:"music", icon: IconMusic, ready:false },
  ],
  ru: [
    { id:"math", name:"Математика", tag:"Сложение, вычитание, умножение, деление", color:"math", icon: IconMath, ready:true,
      lessonTitles:{ 1:"Сложение · до 100", 2:"Вычитание · до 100", 3:"Таблица умножения · на 2", 4:"Таблица умножения · на 3", 5:"Таблица умножения · на 4", 6:"Таблица умножения · на 5", 7:"Таблица умножения · на 6", 8:"Деление · на 2", 9:"Сравнение чисел · < > =", 10:"Длина · см, дм, м", 11:"Объём и масса · литр, кг", 12:"Деление · на 3, 4, 5" } },
    { id:"kaz",  name:"Казахский",  tag:"Алфавит, звуки, слова", color:"kaz", icon: IconKaz, ready:true,
      lessonTitles:{ 1:"Казахский алфавит · особые буквы", 2:"Слог · деление слова", 3:"Животные · словарь", 4:"Твёрдые и мягкие звуки", 5:"Составь слово", 6:"Цвета", 7:"Имя существительное", 8:"Имя прилагательное", 9:"Глагол", 10:"Чтение текста", 11:"Дни и месяцы", 12:"Предложение" } },
    { id:"world", name:"Дүниетану", tag:"Природа, животные", color:"world", icon: IconWorld, ready:true,
      lessonTitles:{ 1:"Времена года", 2:"Дикие животные", 3:"Растения", 4:"Тело человека", 5:"Наш город", 6:"Вода", 7:"Солнечная система", 8:"Казахстан" } },
    { id:"eng",   name:"English",   tag:"Слова и предложения", color:"eng", icon: IconEng, ready:true,
      lessonTitles:{ 1:"Числа по-английски · 1–10", 2:"Цвета по-английски" } },
    { id:"logic", name:"Логические задачи", tag:"Игры, загадки, логика", color:"logic", icon: IconLogic, ready:false },
    { id:"music", name:"Музыка",  tag:"Ноты, ритм, пение", color:"music", icon: IconMusic, ready:false },
  ],
  en: [
    { id:"math", name:"Math",   tag:"Addition, subtraction, multiplication, division", color:"math", icon: IconMath, ready:true,
      lessonTitles:{ 1:"Addition · within 100", 2:"Subtraction · within 100", 3:"Times tables · ×2", 4:"Times tables · ×3", 5:"Times tables · ×4", 6:"Times tables · ×5", 7:"Times tables · ×6", 8:"Division · ÷2", 9:"Comparing numbers · < > =", 10:"Length · cm, dm, m", 11:"Volume & Mass · litre, kg", 12:"Division · ÷3, ÷4, ÷5" } },
    { id:"kaz",  name:"Kazakh", tag:"Alphabet, sounds, words", color:"kaz", icon: IconKaz, ready:true,
      lessonTitles:{ 1:"Kazakh Alphabet · special letters", 2:"Syllables · splitting words", 3:"Animals · vocabulary", 4:"Hard & soft vowels", 5:"Build a word", 6:"Colors", 7:"Noun", 8:"Adjective", 9:"Verb", 10:"Reading Comprehension", 11:"Days and Months", 12:"Sentence" } },
    { id:"world", name:"World Studies", tag:"Nature, animals", color:"world", icon: IconWorld, ready:true,
      lessonTitles:{ 1:"Seasons of the Year", 2:"Wild Animals", 3:"Plants", 4:"Human Body", 5:"Our City", 6:"Water", 7:"Solar System", 8:"Kazakhstan" } },
    { id:"eng",   name:"English",       tag:"Words and sentences", color:"eng", icon: IconEng, ready:true,
      lessonTitles:{ 1:"Numbers in English · 1–10", 2:"Colors in English" } },
    { id:"logic", name:"Logic Puzzles", tag:"Games, riddles & logic", color:"logic", icon: IconLogic, ready:false },
    { id:"music", name:"Music",  tag:"Notes, rhythm & songs", color:"music", icon: IconMusic, ready:false },
  ],
};

// ─── Grade system ──────────────────────────────────────────────────

const GRADE_INFO = {
  1: { emoji:'🐣', color:'#F97316', bg:'#FFF7ED', label:{ kk:'1-сынып', ru:'1 класс', en:'Grade 1' } },
  2: { emoji:'🚀', color:'#8B5CF6', bg:'#F5F3FF', label:{ kk:'2-сынып', ru:'2 класс', en:'Grade 2' } },
  3: { emoji:'🌿', color:'#0D9488', bg:'#F0FDFA', label:{ kk:'3-сынып', ru:'3 класс', en:'Grade 3' } },
  4: { emoji:'🔭', color:'#2563EB', bg:'#EFF6FF', label:{ kk:'4-сынып', ru:'4 класс', en:'Grade 4' } },
};

// null for a subject = hidden for that grade. Otherwise overrides lessonTitles + of.
// grade 2 = null means "use default SUB_CONTENT" (it's our base content).
const GRADE_SUBJECTS = {
  1: {
    kk: {
      math:  { of:5, lessonTitles:{1:"Сандар · 1-10",2:"Сандар · 11-20",3:"Қосу · 10 ішінде",4:"Алу · 10 ішінде",5:"Геометриялық фигуралар"} },
      kaz:   { of:3, lessonTitles:{1:"Қазақ әліпбиі",2:"Жануарлар сөздігі",3:"Менің отбасым"} },
      world: { of:2, lessonTitles:{1:"Жыл мезгілдері",2:"Жабайы жануарлар"} },
      eng:   null,
    },
    ru: {
      math:  { of:5, lessonTitles:{1:"Числа · 1–10",2:"Числа · 11–20",3:"Сложение · до 10",4:"Вычитание · до 10",5:"Геометрические фигуры"} },
      kaz:   { of:3, lessonTitles:{1:"Казахский алфавит",2:"Словарь животных",3:"Моя семья"} },
      world: { of:2, lessonTitles:{1:"Времена года",2:"Дикие животные"} },
      eng:   null,
    },
    en: {
      math:  { of:5, lessonTitles:{1:"Numbers · 1–10",2:"Numbers · 11–20",3:"Addition · within 10",4:"Subtraction · within 10",5:"Shapes"} },
      kaz:   { of:3, lessonTitles:{1:"Kazakh Alphabet",2:"Animal vocabulary",3:"My family"} },
      world: { of:2, lessonTitles:{1:"Seasons",2:"Wild Animals"} },
      eng:   null,
    },
  },
  2: null, // uses default SUB_CONTENT
  3: {
    kk: {
      math:  { of:12, lessonTitles:{1:"Үш таңбалы сандар · қосу",2:"Үш таңбалы сандар · алу",3:"Көбейту · 7-ге, 8-ге, 9-ға",4:"Бөлу · 3-ке, 4-ке",5:"Бөлу · 5-ке, 6-ға",6:"Уақыт · сағат, минут",7:"Санды дөңгелектеу",8:"Периметр",9:"Аудан",10:"2 амалды есептер",11:"3 амалды есептер",12:"Жылдық қайталау"} },
      kaz:   { of:6, lessonTitles:{1:"Зат есім",2:"Сын есім",3:"Мәтін оқу",4:"Сөйлем мүшелері",5:"Диктант тренажері",6:"Шығарма"} },
      world: { of:4, lessonTitles:{1:"Қазақстан картасы",2:"Табиғат аймақтары",3:"Жануарлар дүниесі",4:"Адам мен табиғат"} },
      eng:   { of:4, lessonTitles:{1:"Алфавит · A-Z",2:"Дене мүшелері",3:"Тамақ · сөздік",4:"Менің күнім"} },
    },
    ru: {
      math:  { of:12, lessonTitles:{1:"Трёхзначные числа · сложение",2:"Трёхзначные числа · вычитание",3:"Умножение · на 7, 8, 9",4:"Деление · на 3, 4",5:"Деление · на 5, 6",6:"Время · часы, минуты",7:"Округление чисел",8:"Периметр",9:"Площадь",10:"Задачи · 2 действия",11:"Задачи · 3 действия",12:"Итоговое повторение"} },
      kaz:   { of:6, lessonTitles:{1:"Имя существительное",2:"Имя прилагательное",3:"Чтение текста",4:"Члены предложения",5:"Диктант",6:"Сочинение"} },
      world: { of:4, lessonTitles:{1:"Карта Казахстана",2:"Природные зоны",3:"Животный мир",4:"Человек и природа"} },
      eng:   { of:4, lessonTitles:{1:"Алфавит · A-Z",2:"Части тела",3:"Еда · словарь",4:"Мой день"} },
    },
    en: {
      math:  { of:12, lessonTitles:{1:"3-digit addition",2:"3-digit subtraction",3:"Times tables · ×7,×8,×9",4:"Division · ÷3, ÷4",5:"Division · ÷5, ÷6",6:"Time · hours & minutes",7:"Rounding numbers",8:"Perimeter",9:"Area",10:"2-step word problems",11:"3-step word problems",12:"Annual review"} },
      kaz:   { of:6, lessonTitles:{1:"Nouns",2:"Adjectives",3:"Reading texts",4:"Sentence structure",5:"Dictation practice",6:"Essay writing"} },
      world: { of:4, lessonTitles:{1:"Map of Kazakhstan",2:"Natural zones",3:"Animal world",4:"Humans & nature"} },
      eng:   { of:4, lessonTitles:{1:"Alphabet · A-Z",2:"Body parts",3:"Food vocabulary",4:"My day"} },
    },
  },
  4: {
    kk: {
      math:  { of:12, lessonTitles:{1:"Үлкен сандар · миллионға дейін",2:"Бөлшектер · кіріспе",3:"Ондық бөлшектер",4:"Бұрыштар · өлшеу",5:"Үшбұрыш · қасиеттері",6:"Периметр мен аудан",7:"Теңдеулер · x-ті табу",8:"Пропорция",9:"Масштаб",10:"Координаттар жүйесі",11:"3 амалды есептер",12:"Жылдық тест"} },
      kaz:   { of:6, lessonTitles:{1:"Туынды сөздер",2:"Етістік шақтары",3:"Күрделі сөйлемдер",4:"Пунктуация",5:"Хат жазу",6:"Мазмұндама"} },
      world: { of:5, lessonTitles:{1:"Ежелгі Қазақстан",2:"Көшпенділер мәдениеті",3:"Мемлекет рәміздері",4:"Табиғи ресурстар",5:"Экология және адам"} },
      eng:   { of:5, lessonTitles:{1:"Present Simple",2:"Past Simple",3:"My school life",4:"Hobbies & sports",5:"Short story writing"} },
    },
    ru: {
      math:  { of:12, lessonTitles:{1:"Большие числа · до миллиона",2:"Дроби · введение",3:"Десятичные дроби",4:"Углы · измерение",5:"Треугольники",6:"Периметр и площадь",7:"Уравнения · найди x",8:"Пропорции",9:"Масштаб",10:"Система координат",11:"Задачи · 3 действия",12:"Годовой тест"} },
      kaz:   { of:6, lessonTitles:{1:"Производные слова",2:"Времена глагола",3:"Сложные предложения",4:"Пунктуация",5:"Письмо",6:"Изложение"} },
      world: { of:5, lessonTitles:{1:"Древний Казахстан",2:"Культура кочевников",3:"Символы государства",4:"Природные ресурсы",5:"Экология"} },
      eng:   { of:5, lessonTitles:{1:"Present Simple",2:"Past Simple",3:"My school life",4:"Hobbies & sports",5:"Short story"} },
    },
    en: {
      math:  { of:12, lessonTitles:{1:"Large numbers · to a million",2:"Fractions · intro",3:"Decimal fractions",4:"Angles · measuring",5:"Triangles",6:"Perimeter & area",7:"Equations · find x",8:"Proportions",9:"Scale",10:"Coordinate system",11:"3-step word problems",12:"Annual test"} },
      kaz:   { of:6, lessonTitles:{1:"Derived words",2:"Verb tenses",3:"Complex sentences",4:"Punctuation",5:"Letter writing",6:"Retelling"} },
      world: { of:5, lessonTitles:{1:"Ancient Kazakhstan",2:"Nomad culture",3:"State symbols",4:"Natural resources",5:"Ecology"} },
      eng:   { of:5, lessonTitles:{1:"Present Simple",2:"Past Simple",3:"My school life",4:"Hobbies & sports",5:"Short story writing"} },
    },
  },
};

const LESSON_FOR = (subjectId, lessonNum, grade) => {
  if (subjectId === 'math') {
    if (grade === 3 && lessonNum === 6) return 'math-time';
    return `math-${lessonNum}`;
  }
  if (subjectId === 'kaz')   return `kaz-${lessonNum}`;
  if (subjectId === 'world') return `world-${lessonNum}`;
  if (subjectId === 'eng')   return `eng-${lessonNum}`;
  return null;
};

// ─── Progress ──────────────────────────────────────────────────────

const DEFAULT_PROGRESS = {
  name: '',
  grade: null,
  math:  { lesson: 1, stars: 0, of: 12 },
  kaz:   { lesson: 1, stars: 0, of: 12 },
  world: { lesson: 1, stars: 0, of: 8 },
  eng:   { lesson: 1, stars: 0, of: 2 },
  totalXP: 0,
  level: 1,
  streak: 0,
  lastPlayed: null,
  lastSubjectId: 'math',
  questsDone: [false, false, false, false],
};

const PROGRESS_KEY = 'mektep_progress_v1';

// ─── A/B Testing ───────────────────────────────────────────────────

const AB_TESTS = {
  ab_timer:  { variants: ['A','B'], desc: 'QuickGame timer · 5s (A) vs 8s (B)' },
  ab_cta:    { variants: ['A','B'], desc: 'Continue CTA · full (A) vs short (B)' },
  ab_grade:  { variants: ['A','B'], desc: 'Onboarding · name only (A) vs +grade (B)' },
};

const AB_KEY = 'mektep_ab_v1';
const _abCache = {};

function getVariant(testId) {
  if (_abCache[testId]) return _abCache[testId];
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(AB_KEY) || '{}'); } catch(e) {}
  if (stored[testId]) { _abCache[testId] = stored[testId]; return stored[testId]; }
  const v = Math.random() < 0.5 ? 'A' : 'B';
  _abCache[testId] = v;
  try { stored[testId] = v; localStorage.setItem(AB_KEY, JSON.stringify(stored)); } catch(e) {}
  return v;
}

function forceVariant(testId, v) {
  _abCache[testId] = v;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(AB_KEY) || '{}'); } catch(e) {}
  stored[testId] = v;
  try { localStorage.setItem(AB_KEY, JSON.stringify(stored)); } catch(e) {}
}

function logABEvent(testId, variant, event, data) {
  // Replace with real analytics (Firebase logEvent, Mixpanel, etc.)
  console.log(`[AB] ${testId}/${variant} → ${event}`, data || '');
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...DEFAULT_PROGRESS,
        ...saved,
        math:  { ...DEFAULT_PROGRESS.math,  ...(saved.math  || {}), of: DEFAULT_PROGRESS.math.of  },
        kaz:   { ...DEFAULT_PROGRESS.kaz,   ...(saved.kaz   || {}), of: DEFAULT_PROGRESS.kaz.of   },
        world: { ...DEFAULT_PROGRESS.world, ...(saved.world || {}), of: DEFAULT_PROGRESS.world.of },
        eng:   { ...DEFAULT_PROGRESS.eng,   ...(saved.eng   || {}), of: DEFAULT_PROGRESS.eng.of   },
      };
    }
  } catch (e) {}
  return DEFAULT_PROGRESS;
}

function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
}

function subjectsFor(lang, progress) {
  const prog = progress || DEFAULT_PROGRESS;
  const grade = prog.grade || 2;
  const gradeOverrides = GRADE_SUBJECTS[grade]?.[lang]; // null = use defaults

  return SUB_CONTENT[lang].filter(s => {
    if (!s.ready) return true;
    // Grade-specific: null entry means "hide this subject for this grade"
    if (gradeOverrides && gradeOverrides[s.id] === null) return false;
    return true;
  }).map(s => {
    if (!s.ready) return s;
    const override = gradeOverrides?.[s.id];
    const lessonTitles = override?.lessonTitles ?? s.lessonTitles;
    const of = override?.of ?? DEFAULT_PROGRESS[s.id]?.of ?? Object.keys(lessonTitles || {}).length;
    const p = prog[s.id];
    const lessonNum = p?.lesson ?? 1;
    const allDone = lessonNum > of;
    const safeNum = Math.min(lessonNum, of);
    const nextTitle = lessonTitles[safeNum] || lessonTitles[1];
    return { ...s, lessonTitles, lesson: lessonNum, of, stars: p?.stars ?? 0, next: nextTitle,
             lessonId: allDone ? null : LESSON_FOR(s.id, lessonNum, grade), allDone };
  });
}

// ─── Language chip ─────────────────────────────────────────────────

function LangChip({ lang, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const flags  = { kk: '🇰🇿', ru: '🇷🇺', en: '🇬🇧' };
  const names  = { kk: 'Қазақша', ru: 'Русский', en: 'English' };
  const shorts = { kk: 'ҚАЗ', ru: 'РУС', en: 'ENG' };

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={btnRef} className="lang-chip" onClick={toggle}>
      <span className="lang-flag">{flags[lang]}</span>
      <span className="lang-full">{names[lang]}</span>
      <span className="lang-short">{shorts[lang]}</span>
      <span className="caret">▼</span>
      {open && (
        <>
          {/* backdrop closes on outside tap */}
          <div style={{ position:'fixed', inset:0, zIndex:999 }}
               onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          {/* dropdown — position:fixed escapes any overflow:hidden parent */}
          <div style={{ position:'fixed', top: pos.top, right: pos.right,
            background:'var(--card)', borderRadius:16, padding:6,
            boxShadow:'0 8px 32px rgba(0,0,0,.14)', border:'1px solid var(--line)',
            minWidth:168, zIndex:1000 }}>
            {Object.keys(names).map(k => (
              <div key={k}
                onClick={(e) => { e.stopPropagation(); onChange(k); setOpen(false); }}
                style={{ padding:'11px 14px', borderRadius:11, display:'flex', alignItems:'center',
                  gap:10, background: k === lang ? 'var(--card-soft)' : 'transparent',
                  cursor:'pointer', fontWeight: k === lang ? 800 : 600 }}>
                <span className="lang-flag">{flags[k]}</span>
                <span>{names[k]}</span>
                {k === lang && <span style={{ marginLeft:'auto', color:'var(--brand)', fontSize:16 }}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Subject card blob colors ──────────────────────────────────────

const BLOB_COLORS = { math:'#DCFCE7', kaz:'#FEE2E2', world:'#DBEAFE', eng:'#EDE9FE' };
function blobColorFor(id) { return BLOB_COLORS[id] || '#F3F4F6'; }

// ─── Subject card ──────────────────────────────────────────────────

function SubjectCard({ s, t, onOpen }) {
  const Icon = s.icon;
  if (!s.ready) {
    return (
      <div className="subject locked">
        <div className="subj-top">
          <div className="subj-ic" style={{ background: `var(--${s.color}-bg)`, color: `var(--${s.color}-ic)`, opacity: .7 }}><Icon /></div>
          <div className="soon-pill">{t.soon}</div>
        </div>
        <div className="locked-cnt">
          <div className="subj-name">{s.name}</div>
          <div className="subj-tag">{s.tag}</div>
          <div className="countdown">
            <div className="seg"><b>{s.days}</b><span>day</span></div>
            <div className="seg"><b>04</b><span>hr</span></div>
            <div className="seg"><b>22</b><span>min</span></div>
          </div>
          <button className="notify-btn">🔔 {t.notify}</button>
        </div>
      </div>
    );
  }
  const pct = Math.round((s.lesson / s.of) * 100);
  return (
    <div className="subject" onClick={onOpen}>
      <div className="subj-blob" style={{ background: blobColorFor(s.id) }} />
      <div className="subj-top">
        <div className="subj-ic" style={{ background: `var(--${s.color}-bg)`, color: `var(--${s.color}-ic)` }}><Icon /></div>
        <div className="subj-stars">{[0,1,2].map(i => <Star key={i} on={i < s.stars} />)}</div>
      </div>
      <div>
        <div className="subj-name">{s.name}</div>
        <div className="subj-tag">{s.tag}</div>
      </div>
      <div>
        <div className="subj-prog">
          <div className="subj-prog-row"><span>{t.lessonOf(s.lesson, s.of)}</span><span>{pct}%</span></div>
          <div className="subj-bar"><div style={{ width: pct + '%', background: `var(--${s.color}-ic)` }}></div></div>
        </div>
        <div className="subj-cta">
          <div className="next"><span className="dot" style={{ background: `var(--${s.color}-ic)` }}></span>{t.next} {s.next}</div>
          <div className="subj-go">→</div>
        </div>
      </div>
    </div>
  );
}

// ─── Lesson modal ──────────────────────────────────────────────────

function LessonModal({ s, t, onClose, onStart }) {
  if (!s) return null;
  const Icon = s.icon;
  const lessons = Array.from({ length: s.of }, (_, i) => ({
    n: i + 1,
    name: s.lessonTitles?.[i + 1] || `${s.name} · ${i + 1}`,
    min: 6 + (i % 4) * 2,
    done: i + 1 < s.lesson,
    cur:  i + 1 === s.lesson,
  })).slice(Math.max(0, s.lesson - 2), s.lesson + 3);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-ic" style={{ background: `var(--${s.color}-bg)`, color: `var(--${s.color}-ic)` }}><Icon /></div>
          <div>
            <h3>{s.name}</h3>
            <div className="modal-sub">{t.lessonOf(s.lesson, s.of)} · {Math.round((s.lesson / s.of) * 100)}% complete</div>
          </div>
        </div>
        <div className="modal-list">
          {lessons.map(l => (
            <div key={l.n} className={"les " + (l.done ? "done " : "") + (l.cur ? "cur" : "")}>
              <div className="les-n">{l.done ? "✓" : l.n}</div>
              <div className="les-name">{l.name}</div>
              <div className="les-min">{l.min} min</div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn prim" onClick={() => { onClose(); onStart(s.lessonId); }}>▶ {t.continueBtn}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding ────────────────────────────────────────────────────

function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [lang, setLang] = useState('kk');
  const [grade, setGrade] = useState(null);
  const t = L[lang];
  const flags  = { kk:'🇰🇿', ru:'🇷🇺', en:'🇬🇧' };
  const labels = { kk:'Қаз',  ru:'Рус',  en:'Eng'  };

  const submit = () => {
    if (!grade) return;
    logABEvent('ab_grade', getVariant('ab_grade'), 'onboarding_done', { grade });
    onDone(name.trim(), lang, grade);
  };

  return (
    <>
      {step === 1 ? (
        <div className="onboarding">
          <MascotSvg />
          <h1 className="ob-title">iМектеп</h1>
          <p className="ob-sub">{t.obSub}</p>
          <div className="ob-form">
            <input
              className="ob-input"
              placeholder={t.obPlaceholder}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
              autoFocus
              maxLength={30}
            />
            <div className="ob-langs">
              {['kk','ru','en'].map(k => (
                <button key={k} className={"ob-lang " + (lang === k ? "on" : "")} onClick={() => setLang(k)}>
                  {flags[k]} {labels[k]}
                </button>
              ))}
            </div>
            <button className="ob-start" disabled={!name.trim()} onClick={() => setStep(2)}>
              {t.obStart}
            </button>
          </div>
          <p className="ob-copy">© 2025 iМектеп</p>
        </div>
      ) : (
        <div className="onboarding">
          <button className="ob-back" onClick={() => setStep(1)}>←</button>
          <p className="ob-grade-label">{t.gradeLabel}</p>
          <div className="ob-grades">
            {[1,2,3,4].map(g => {
              const gi = GRADE_INFO[g];
              const sel = grade === g;
              return (
                <button key={g}
                  className={"ob-grade-btn " + (sel ? "on" : "")}
                  style={sel
                    ? { background: gi.color, borderColor: gi.color }
                    : { background: gi.bg, borderColor: gi.color + '28', '--gc': gi.color }
                  }
                  onClick={() => setGrade(g)}>
                  <span className="ob-grade-num">{g}</span>
                  <span className="ob-grade-name">{gi.label[lang]}</span>
                </button>
              );
            })}
          </div>
          <button className="ob-start" disabled={!grade} onClick={submit}>
            {t.obStart}
          </button>
          <p className="ob-copy">© 2025 iМектеп</p>
        </div>
      )}
    </>
  );
}

// ─── Tetris Widget (home screen) ─────────────────────────────────
const TW_COLS = 10, TW_ROWS = 14, TW_B = 28;
const TW_XP   = [0, 10, 25, 50, 100]; // XP per 0/1/2/3/4 lines cleared

function TetrisWidget({ t }) {
  const cvs  = useRef(null);
  const tRef = useRef(t);
  tRef.current = t;

  const [disp, setDisp] = useState({ score:0, xp:0, level:1, lines:0, over:false });

  useEffect(() => {
    const el = cvs.current;
    if (!el) return;
    el.width  = TW_COLS * TW_B;
    el.height = TW_ROWS * TW_B;
    const ctx = el.getContext('2d');

    const g = {
      board: Array.from({length: TW_ROWS}, () => Array(TW_COLS).fill(null)),
      cur: null, cx: 0, cy: 0,
      score: 0, xp: 0, level: 1, lines: 0,
      over: false, raf: null, lastDrop: 0,
    };

    const sync = () => setDisp({ score:g.score, xp:g.xp, level:g.level, lines:g.lines, over:g.over });
    const rot90 = s => s[0].map((_, c) => s.map(r => r[c]).reverse());
    const fits = (s, x, y) => {
      for (let r = 0; r < s.length; r++)
        for (let c = 0; c < s[r].length; c++) {
          if (!s[r][c]) continue;
          const nx = x+c, ny = y+r;
          if (nx < 0 || nx >= TW_COLS || ny >= TW_ROWS) return false;
          if (ny >= 0 && g.board[ny][nx]) return false;
        }
      return true;
    };

    const spawn = () => {
      const p = MT_PIECES[Math.floor(Math.random() * MT_PIECES.length)];
      g.cur = { s: p.s.map(r=>[...r]), c: p.c };
      g.cx  = Math.floor((TW_COLS - g.cur.s[0].length) / 2);
      g.cy  = -g.cur.s.length;
    };

    const lockPiece = () => {
      let overflow = false;
      for (let r = 0; r < g.cur.s.length; r++)
        for (let c = 0; c < g.cur.s[r].length; c++) {
          if (!g.cur.s[r][c]) continue;
          const ny = g.cy + r;
          if (ny < 0) { overflow = true; continue; }
          g.board[ny][g.cx + c] = g.cur.c;
        }
      if (overflow) { g.over = true; sync(); return; }
      let cleared = 0;
      for (let r = TW_ROWS-1; r >= 0; r--)
        if (g.board[r].every(Boolean)) { g.board.splice(r,1); g.board.unshift(Array(TW_COLS).fill(null)); r++; cleared++; }
      if (cleared) {
        g.score += cleared * 100 * g.level;
        g.xp    += TW_XP[Math.min(cleared,4)] * g.level;
        g.lines += cleared;
        g.level  = Math.min(10, 1 + Math.floor(g.lines / 5));
        sync();
      }
      spawn();
    };

    const blk = (x, y, color, alpha=1) => {
      const px=x*TW_B+1, py=y*TW_B+1, sz=TW_B-2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(px,py,sz,sz,5) : ctx.rect(px,py,sz,sz);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(px+1,py+1,sz-2,Math.floor(sz*.35),3) : ctx.rect(px+1,py+1,sz-2,Math.floor(sz*.35));
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      ctx.fillStyle = '#F3FAF6';
      ctx.fillRect(0,0,el.width,el.height);
      // subtle grid
      ctx.strokeStyle='rgba(0,0,0,0.05)'; ctx.lineWidth=.5;
      for (let r=0;r<=TW_ROWS;r++){ctx.beginPath();ctx.moveTo(0,r*TW_B);ctx.lineTo(el.width,r*TW_B);ctx.stroke();}
      for (let c=0;c<=TW_COLS;c++){ctx.beginPath();ctx.moveTo(c*TW_B,0);ctx.lineTo(c*TW_B,el.height);ctx.stroke();}
      // board
      for (let r=0;r<TW_ROWS;r++) for (let c=0;c<TW_COLS;c++) if (g.board[r][c]) blk(c,r,g.board[r][c]);
      // ghost
      if (g.cur && !g.over) {
        let gy = g.cy;
        while (fits(g.cur.s,g.cx,gy+1)) gy++;
        if (gy !== g.cy)
          for (let r=0;r<g.cur.s.length;r++)
            for (let c=0;c<g.cur.s[r].length;c++)
              if (g.cur.s[r][c] && gy+r>=0) blk(g.cx+c,gy+r,g.cur.c,0.2);
      }
      // current piece
      if (g.cur)
        for (let r=0;r<g.cur.s.length;r++)
          for (let c=0;c<g.cur.s[r].length;c++)
            if (g.cur.s[r][c] && g.cy+r>=0) blk(g.cx+c,g.cy+r,g.cur.c);
      // game over overlay
      if (g.over) {
        ctx.fillStyle='rgba(15,42,34,0.72)'; ctx.fillRect(0,0,el.width,el.height);
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font=`900 20px Nunito,system-ui`; ctx.fillStyle='#fff';
        ctx.fillText(tRef.current.tetrisOver||'GAME OVER', el.width/2, el.height/2-14);
        ctx.font=`600 13px Nunito,system-ui`; ctx.fillStyle='rgba(255,255,255,.65)';
        ctx.fillText(tRef.current.tetrisRestart||'Tap to play again', el.width/2, el.height/2+12);
      }
    };

    const speed = () => Math.max(80, 650 - (g.level-1)*58);

    const loop = ts => {
      if (!g.over) {
        if (ts - g.lastDrop > speed()) {
          if (!g.cur) spawn();
          fits(g.cur.s,g.cx,g.cy+1) ? g.cy++ : lockPiece();
          g.lastDrop = ts;
        }
        draw();
        g.raf = requestAnimationFrame(loop);
      } else { draw(); }
    };

    const restart = () => {
      g.board = Array.from({length:TW_ROWS},()=>Array(TW_COLS).fill(null));
      g.cur=null; g.cx=0; g.cy=0; g.score=0; g.xp=0; g.level=1; g.lines=0;
      g.over=false; g.lastDrop=0; sync(); spawn();
      g.raf = requestAnimationFrame(loop);
    };

    el.addEventListener('click', () => { if (g.over) restart(); else el.focus(); });

    const onKey = e => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) return;
      e.preventDefault();
      if (!g.cur || g.over) return;
      if (e.key==='ArrowLeft'  && fits(g.cur.s,g.cx-1,g.cy)) { g.cx--; draw(); }
      if (e.key==='ArrowRight' && fits(g.cur.s,g.cx+1,g.cy)) { g.cx++; draw(); }
      if (e.key==='ArrowDown')  { fits(g.cur.s,g.cx,g.cy+1)?g.cy++:lockPiece(); draw(); }
      if (e.key==='ArrowUp')    { const r=rot90(g.cur.s); if(fits(r,g.cx,g.cy)){g.cur.s=r;draw();} }
      if (e.key===' ')          { while(fits(g.cur.s,g.cx,g.cy+1))g.cy++; lockPiece(); draw(); }
    };
    el.addEventListener('keydown', onKey);

    // Touch: tap = rotate · swipe left/right = move · swipe down = hard drop
    let tx0=0, ty0=0, tMoved=false;
    const onTS = e => { tx0=e.touches[0].clientX; ty0=e.touches[0].clientY; tMoved=false; };
    const onTM = e => {
      if (!g.cur || g.over) return;
      const dx=e.touches[0].clientX-tx0, dy=e.touches[0].clientY-ty0;
      if (Math.abs(dx) > 18) {
        // real-time horizontal sliding
        const steps = Math.round(dx / TW_B);
        if (steps !== 0) {
          const nx = g.cx + steps;
          if (fits(g.cur.s, nx, g.cy)) { g.cx = nx; tx0 = e.touches[0].clientX; draw(); }
        }
        tMoved = true;
      }
      if (dy > 32) tMoved = true; // mark as moved so tap-rotate won't fire
    };
    const onTE = e => {
      if (g.over) { restart(); return; }
      if (!g.cur) return;
      const dx=e.changedTouches[0].clientX-tx0, dy=e.changedTouches[0].clientY-ty0;
      if (!tMoved && Math.abs(dx)<12 && Math.abs(dy)<12) {
        // tap → rotate
        const r=rot90(g.cur.s);
        if(fits(r,g.cx,g.cy)){g.cur.s=r;draw();}
      } else if (dy > 40) {
        // swipe down → hard drop
        while(fits(g.cur.s,g.cx,g.cy+1)) g.cy++;
        lockPiece(); draw();
      }
    };
    el.addEventListener('touchstart',onTS,{passive:true});
    el.addEventListener('touchmove', onTM,{passive:true});
    el.addEventListener('touchend',  onTE,{passive:true});

    spawn(); g.raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(g.raf); el.removeEventListener('keydown',onKey); el.removeEventListener('touchstart',onTS); el.removeEventListener('touchmove',onTM); el.removeEventListener('touchend',onTE); };
  }, []);

  return (
    <div className="tetris-widget">
      <div className="tetris-head">
        <div className="tetris-name">
          <div className="tetris-ico">◼</div>
          {t.tetrisTitle}
        </div>
        <div className={"tetris-xp" + (disp.xp > 0 ? " has-xp" : "")}>
          <span className="tetris-xp-bolt">⚡</span>
          <span className="tetris-xp-num">{disp.xp}</span>
          <span className="tetris-xp-lbl">XP</span>
        </div>
      </div>
      <div className="tetris-board-wrap">
        <canvas ref={cvs} tabIndex={0} style={{ display:'block', borderRadius:'10px', cursor:'pointer' }} />
      </div>
      <div className="tetris-stats">
        <div className="tetris-stat">
          <div className="tetris-stat-n">{disp.score.toLocaleString()}</div>
          <div className="tetris-stat-l">{t.tetrisScore}</div>
        </div>
        <div className="tetris-divider" />
        <div className="tetris-stat">
          <div className="tetris-stat-n">{disp.lines}</div>
          <div className="tetris-stat-l">{t.tetrisLines}</div>
        </div>
        <div className="tetris-divider" />
        <div className="tetris-stat">
          <div className="tetris-stat-n">{disp.level}</div>
          <div className="tetris-stat-l">{t.tetrisLevel}</div>
        </div>
      </div>
      <div className="tetris-hint">{t.tetrisHint}</div>
    </div>
  );
}

// ─── Mascot: geometric angular owl ──────────────────────────────
const MascotSvg = () => (
  <svg className="ob-mascot" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* body */}
    <polygon points="80,28 130,60 130,120 80,148 30,120 30,60" fill="#0E8C6B"/>
    <polygon points="80,28 130,60 130,120 80,148 30,120 30,60" fill="url(#bodyGrad)"/>
    {/* ear tufts */}
    <polygon points="48,42 38,20 60,36" fill="#0A6E55"/>
    <polygon points="112,42 122,20 100,36" fill="#0A6E55"/>
    {/* face plate */}
    <ellipse cx="80" cy="92" rx="34" ry="36" fill="#E8F5F1"/>
    {/* left eye ring */}
    <circle cx="64" cy="82" r="14" fill="#0E8C6B"/>
    <circle cx="64" cy="82" r="10" fill="#fff"/>
    <circle cx="66" cy="80" r="6" fill="#1A1A2E"/>
    <circle cx="68" cy="78" r="2" fill="#fff"/>
    {/* right eye ring */}
    <circle cx="96" cy="82" r="14" fill="#0E8C6B"/>
    <circle cx="96" cy="82" r="10" fill="#fff"/>
    <circle cx="98" cy="80" r="6" fill="#1A1A2E"/>
    <circle cx="100" cy="78" r="2" fill="#fff"/>
    {/* beak */}
    <polygon points="80,92 73,100 87,100" fill="#F97316"/>
    {/* belly number π */}
    <text x="80" y="128" fontSize="18" fontWeight="900" textAnchor="middle" fill="#0E8C6B" fontFamily="system-ui">π</text>
    {/* wing left */}
    <polygon points="30,60 8,90 30,100" fill="#0A6E55" opacity=".85"/>
    {/* wing right */}
    <polygon points="130,60 152,90 130,100" fill="#0A6E55" opacity=".85"/>
    <defs>
      <linearGradient id="bodyGrad" x1="80" y1="28" x2="80" y2="148" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff" stopOpacity=".12"/>
        <stop offset="1" stopColor="#000" stopOpacity=".08"/>
      </linearGradient>
    </defs>
  </svg>
);

// ─── Tetris block icon (for game card) ──────────────────────────
const TetrisBlockIcon = ({ size=44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <rect x="1"  y="31" width="9" height="9" rx="2.5" fill="#0E8C6B"/>
    <rect x="12" y="31" width="9" height="9" rx="2.5" fill="#F97316"/>
    <rect x="23" y="31" width="9" height="9" rx="2.5" fill="#8B5CF6"/>
    <rect x="34" y="31" width="9" height="9" rx="2.5" fill="#0D9488"/>
    <rect x="1"  y="20" width="9" height="9" rx="2.5" fill="#E11D48"/>
    <rect x="12" y="20" width="9" height="9" rx="2.5" fill="#0E8C6B"/>
    <rect x="23" y="20" width="9" height="9" rx="2.5" fill="#F97316"/>
    <rect x="34" y="20" width="9" height="9" rx="2.5" fill="#2563EB"/>
    <rect x="12" y="9"  width="9" height="9" rx="2.5" fill="#8B5CF6"/>
    <rect x="23" y="9"  width="9" height="9" rx="2.5" fill="#D97706"/>
    <rect x="12" y="1"  width="9" height="6" rx="2.5" fill="#E11D48" opacity=".5"/>
  </svg>
);

// ─── Game card icons ─────────────────────────────────────────────
const MemoryIcon = ({size=44}) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <rect x="2"  y="7" width="19" height="30" rx="5" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"/>
    <path d="M9 17h5M11.5 14.5v5" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round"/>
    <rect x="23" y="7" width="19" height="30" rx="5" fill="rgba(255,255,255,.92)"/>
    <text x="32.5" y="27" textAnchor="middle" dominantBaseline="middle" fontSize="20" fill="#F59E0B">★</text>
  </svg>
);
const MathSnakeIcon = ({size=44}) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <path d="M7 37 L7 25 L37 25 L37 13 L21 13" stroke="rgba(255,255,255,.65)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="21" cy="13" r="7" fill="rgba(255,255,255,.95)"/>
    <circle cx="23" cy="11" r="1.8" fill="#1D4ED8"/>
    <circle cx="7" cy="37" r="5.5" fill="rgba(255,255,255,.9)"/>
    <text x="7"  y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="900" fill="#2563EB">3</text>
    <circle cx="22" cy="25" r="5.5" fill="rgba(255,255,255,.7)"/>
    <text x="22" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="900" fill="#2563EB">7</text>
  </svg>
);

// ─── 2048 Game ────────────────────────────────────────────────────
function Game2048({ t, onBack }) {
  const mkEmpty  = () => Array(4).fill(null).map(() => Array(4).fill(0));
  const addRandom = b => {
    const empty = [];
    for (let r=0;r<4;r++) for (let c=0;c<4;c++) if (!b[r][c]) empty.push([r,c]);
    if (!empty.length) return b;
    const [r,c] = empty[Math.floor(Math.random()*empty.length)];
    const nb = b.map(row=>[...row]); nb[r][c] = Math.random()<.9?2:4; return nb;
  };
  const initBoard = () => addRandom(addRandom(mkEmpty()));

  const [board,  setBoard]  = useState(initBoard);
  const [score,  setScore]  = useState(0);
  const [best,   setBest]   = useState(() => { try{return parseInt(localStorage.getItem('imt_2048_best')||'0');}catch(e){return 0;} });
  const [xp,     setXP]     = useState(0);
  const [over,   setOver]   = useState(false);
  const [won,    setWon]    = useState(false);
  const [xpPop,  setXpPop]  = useState(false);
  const [ts,     setTs]     = useState(null);

  const applyMove = (b, dir) => {
    const slide = row => {
      let r=row.filter(v=>v>0), d=0;
      for (let i=0;i<r.length-1;i++) if(r[i]===r[i+1]){r[i]*=2;d+=r[i];r[i+1]=0;}
      r=r.filter(v=>v>0); while(r.length<4) r.push(0); return {r,d};
    };
    const tr = m => m[0].map((_,i)=>m.map(row=>row[i]));
    let nb=b.map(row=>[...row]), delta=0;
    if      (dir==='left')  nb=nb.map(row=>{const {r,d}=slide(row);delta+=d;return r;});
    else if (dir==='right') nb=nb.map(row=>{const {r,d}=slide([...row].reverse());delta+=d;return r.reverse();});
    else if (dir==='up')    nb=tr(tr(nb).map(col=>{const {r,d}=slide(col);delta+=d;return r;}));
    else if (dir==='down')  nb=tr(tr(nb).map(col=>{const {r,d}=slide([...col].reverse());delta+=d;return r.reverse();}));
    const changed = JSON.stringify(nb)!==JSON.stringify(b);
    return {nb,delta,changed};
  };

  const isGameOver = b => {
    for(let r=0;r<4;r++) for(let c=0;c<4;c++){
      if(!b[r][c]) return false;
      if(c<3&&b[r][c]===b[r][c+1]) return false;
      if(r<3&&b[r][c]===b[r+1][c]) return false;
    } return true;
  };

  const handleMove = useCallback(dir => {
    if (over) return;
    setBoard(prev => {
      const {nb,delta,changed} = applyMove(prev,dir);
      if (!changed) return prev;
      const next = addRandom(nb);
      if (delta>0) {
        setScore(s => { const ns=s+delta; setBest(b=>{if(ns>b){try{localStorage.setItem('imt_2048_best',ns);}catch(e){}return ns;}return b;}); return ns; });
        setXP(x => x + Math.floor(delta/4));
        setXpPop(true); setTimeout(()=>setXpPop(false),350);
      }
      if (!won && next.flat().includes(2048)) setWon(true);
      if (isGameOver(next)) setOver(true);
      return next;
    });
  }, [over, won]);

  const restart = () => { setBoard(initBoard()); setScore(0); setXP(0); setOver(false); setWon(false); };

  useEffect(() => {
    const MAP={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
    const fn = e => { if(!MAP[e.key])return; e.preventDefault(); handleMove(MAP[e.key]); };
    window.addEventListener('keydown',fn); return ()=>window.removeEventListener('keydown',fn);
  }, [handleMove]);

  const onTouchStart = e => setTs({x:e.touches[0].clientX,y:e.touches[0].clientY});
  const onTouchEnd   = e => {
    if(!ts) return;
    const dx=e.changedTouches[0].clientX-ts.x, dy=e.changedTouches[0].clientY-ts.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<28){setTs(null);return;}
    Math.abs(dx)>Math.abs(dy) ? handleMove(dx>0?'right':'left') : handleMove(dy>0?'down':'up');
    setTs(null);
  };

  const TILE_BG = {0:'#CDC1B4',2:'#EEE4DA',4:'#EDE0C8',8:'#F2B179',16:'#F59563',32:'#F67C5F',64:'#F65E3B',128:'#EDCF72',256:'#EDCC61',512:'#EDC850',1024:'#EDC53F',2048:'#EDC22E'};
  const TILE_FG = {0:'transparent',2:'#776E65',4:'#776E65'};

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <div className="games-topbar">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="games-topbar-title">2048</span>
          <div style={{width:40}}/>
        </div>
        <div className="g2048-wrap">
          <div className="g2048-stats-row">
            <div className="g2048-stat-box"><div className="g2048-stat-n">{score.toLocaleString()}</div><div className="g2048-stat-l">{t.tetrisScore}</div></div>
            <div className="g2048-stat-box"><div className="g2048-stat-n">{best.toLocaleString()}</div><div className="g2048-stat-l">{t.bestScore}</div></div>
            <div className={"g2048-xp" + (xpPop?" pop":"")}>⚡ <b>{xp}</b> <span>XP</span></div>
          </div>
          <div className="g2048-board-outer" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="g2048-board">
              {board.flat().map((v,i)=>(
                <div key={i} className="g2048-cell" style={{
                  background: TILE_BG[v]||'#3C3A32',
                  color: TILE_FG[v]||'#fff',
                  fontSize: v>=1024?'clamp(13px,4vw,20px)':v>=128?'clamp(15px,4.5vw,24px)':'clamp(18px,5.5vw,30px)',
                }}>{v||''}</div>
              ))}
            </div>
            {over && !won && (
              <div className="g2048-overlay">
                <div className="g2048-over-title">{t.tetrisOver}</div>
                <div className="g2048-over-score">{score.toLocaleString()}</div>
                <button className="g2048-action-btn" onClick={restart}>{t.retry} ↺</button>
              </div>
            )}
            {won && (
              <div className="g2048-overlay g2048-won">
                <div style={{fontSize:44}}>🎉</div>
                <div className="g2048-over-title">2048!</div>
                <div className="g2048-over-score">{score.toLocaleString()}</div>
                <button className="g2048-action-btn" onClick={()=>setWon(false)}>{t.continueBtnShort}</button>
              </div>
            )}
          </div>
          <p className="g2048-hint">{t.g2048Hint}</p>
          <button className="g2048-new-btn" onClick={restart}>{t.retry} ↺</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tetris fullscreen wrapper ────────────────────────────────────
function TetrisFullScreen({ t, onBack }) {
  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <div className="games-topbar">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="games-topbar-title">{t.tetrisTitle}</span>
          <div style={{width:40}} />
        </div>
        <div className="tetris-fullscreen">
          <TetrisWidget t={t} />
        </div>
      </div>
    </div>
  );
}

// ─── Mini Tetris (login decoration) ──────────────────────────────
const MT_COLS = 10, MT_ROWS = 6, MT_B = 26;
const MT_PIECES = [
  { s:[[1,1,1,1]],           c:'#0E8C6B' },
  { s:[[1,1],[1,1]],         c:'#F97316' },
  { s:[[0,1,0],[1,1,1]],     c:'#8B5CF6' },
  { s:[[0,1,1],[1,1,0]],     c:'#0D9488' },
  { s:[[1,1,0],[0,1,1]],     c:'#E11D48' },
  { s:[[1,0,0],[1,1,1]],     c:'#2563EB' },
  { s:[[0,0,1],[1,1,1]],     c:'#D97706' },
];

function MiniTetris() {
  const cvs = useRef(null);
  useEffect(() => {
    const el = cvs.current;
    if (!el) return;
    el.width  = MT_COLS * MT_B;
    el.height = MT_ROWS * MT_B;
    const ctx = el.getContext('2d');
    const board = Array.from({length: MT_ROWS}, () => Array(MT_COLS).fill(null));
    let cur = null, cx = 0, cy = 0;

    const rot90 = s => s[0].map((_, c) => s.map(r => r[c]).reverse());

    const fits = (s, x, y) => {
      for (let r = 0; r < s.length; r++)
        for (let c = 0; c < s[r].length; c++) {
          if (!s[r][c]) continue;
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= MT_COLS || ny >= MT_ROWS) return false;
          if (ny >= 0 && board[ny][nx]) return false;
        }
      return true;
    };

    const spawn = () => {
      const p = MT_PIECES[Math.floor(Math.random() * MT_PIECES.length)];
      cur = { s: p.s.map(r => [...r]), c: p.c };
      cx = Math.floor((MT_COLS - cur.s[0].length) / 2);
      cy = -cur.s.length;
    };

    const lock = () => {
      let overflow = false;
      for (let r = 0; r < cur.s.length; r++)
        for (let c = 0; c < cur.s[r].length; c++) {
          if (!cur.s[r][c]) continue;
          const ny = cy + r;
          if (ny < 0) { overflow = true; continue; }
          board[ny][cx + c] = cur.c;
        }
      if (overflow) { for (let i = 0; i < MT_ROWS; i++) board[i].fill(null); }
      for (let r = MT_ROWS - 1; r >= 0; r--)
        if (board[r].every(Boolean)) { board.splice(r, 1); board.unshift(Array(MT_COLS).fill(null)); r++; }
      spawn();
    };

    const blk = (x, y, color) => {
      const px = x * MT_B + 1, py = y * MT_B + 1, sz = MT_B - 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(px, py, sz, sz, 4) : ctx.rect(px, py, sz, sz);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(px + 1, py + 1, sz - 2, Math.floor(sz * 0.38), 3)
        : ctx.rect(px + 1, py + 1, sz - 2, Math.floor(sz * 0.38));
      ctx.fill();
    };

    const draw = () => {
      ctx.clearRect(0, 0, el.width, el.height);
      for (let r = 0; r < MT_ROWS; r++)
        for (let c = 0; c < MT_COLS; c++)
          if (board[r][c]) blk(c, r, board[r][c]);
      if (cur)
        for (let r = 0; r < cur.s.length; r++)
          for (let c = 0; c < cur.s[r].length; c++)
            if (cur.s[r][c] && cy + r >= 0) blk(cx + c, cy + r, cur.c);
    };

    const drop = () => {
      if (!cur) { spawn(); return; }
      fits(cur.s, cx, cy + 1) ? cy++ : lock();
      draw();
    };

    spawn(); draw();
    const iv = setInterval(drop, 650);

    const onKey = e => {
      if (!cur) return;
      if (e.key === 'ArrowLeft'  && fits(cur.s, cx - 1, cy)) { cx--; draw(); }
      if (e.key === 'ArrowRight' && fits(cur.s, cx + 1, cy)) { cx++; draw(); }
      if (e.key === 'ArrowDown')  { drop(); }
      if (e.key === 'ArrowUp') {
        const r = rot90(cur.s);
        if (fits(r, cx, cy)) { cur.s = r; draw(); }
      }
    };
    window.addEventListener('keydown', onKey);

    let tx0 = 0, ty0 = 0;
    const onTS = e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; };
    const onTE = e => {
      if (!cur) return;
      const dx = e.changedTouches[0].clientX - tx0;
      const dy = e.changedTouches[0].clientY - ty0;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        const r = rot90(cur.s);
        if (fits(r, cx, cy)) { cur.s = r; draw(); }
      } else if (Math.abs(dx) > Math.abs(dy)) {
        const nx = cx + Math.sign(dx) * Math.round(Math.abs(dx) / MT_B);
        if (fits(cur.s, nx, cy)) { cx = nx; draw(); }
      } else if (dy > 24) {
        while (fits(cur.s, cx, cy + 1)) cy++;
        lock(); draw();
      }
    };
    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchend',   onTE, { passive: true });

    return () => {
      clearInterval(iv);
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchend',   onTE);
    };
  }, []);

  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0,
      display:'flex', justifyContent:'center',
      paddingBottom:'env(safe-area-inset-bottom,0px)',
      zIndex:1, pointerEvents:'none',
    }}>
      <canvas ref={cvs} style={{
        display:'block', borderRadius:'12px 12px 0 0',
        opacity:0.75, pointerEvents:'all',
      }} />
    </div>
  );
}

// ─── Quick Game ────────────────────────────────────────────────────

const _WPN = { kk:['Аяй','Нұрбол','Темір','Дина','Асыл','Жансая','Болат','Айгүл'], ru:['Айбек','Нургуль','Темир','Дина','Асыл','Жанна','Болат','Айгуль'], en:['Aibek','Nurgul','Temir','Dina','Asyl','Zhanna','Bolat','Aigul'] };
const _wpk = arr => arr[Math.floor(Math.random() * arr.length)];

// Kazakh vowel-harmony suffix helpers
function _kzFront(w) {
  const F='еіүөЕІҮӨ', B='аоұыАОҰЫ';
  for (let i=w.length-1; i>=0; i--) { if(F.includes(w[i]))return true; if(B.includes(w[i]))return false; }
  return false;
}
function kzLoc(w) { // locative: -да/-де/-та/-те
  const f=_kzFront(w), hard='пткқсшхфцч'.includes(w[w.length-1].toLowerCase());
  return hard ? (f?'те':'та') : (f?'де':'да');
}
function kzGen(w) { // genitive: -ның/-нің/-тың/-тің/-дың/-дің
  const f=_kzFront(w), l=w[w.length-1].toLowerCase();
  // vowels + soft-vowel letters (я/ю/ё = end in vowel sound in loanword names)
  if('аеіоөұүыйяюёАЕІОӨҰҮЫ'.includes(l)) return f?'нің':'ның';
  if('пткқсшхфцч'.includes(l)) return f?'тің':'тың';
  return f?'дің':'дың';
}

const WP_GENERATORS = {
  1: [
    (L) => { const n=_wpk(_WPN[L]),a=2+Math.floor(Math.random()*7),b=1+Math.floor(Math.random()*(10-a)),ans=a+b; return { ans, text:{kk:`${n}-${kzLoc(n)} ${a} алма болды. Досы тағы ${b} алма берді. Барлығы қанша алма болды?`,ru:`У ${n} было ${a} яблок. Друг дал ещё ${b}. Сколько стало?`,en:`${n} had ${a} apples. A friend gave ${b} more. How many now?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),total=7+Math.floor(Math.random()*8),eaten=2+Math.floor(Math.random()*(total-3)),ans=total-eaten; return { ans, text:{kk:`${n}-${kzLoc(n)} ${total} печенье болды. Ол ${eaten} жеді. Қанша қалды?`,ru:`У ${n} было ${total} печенек. Съел(а) ${eaten}. Сколько осталось?`,en:`${n} had ${total} cookies and ate ${eaten}. How many are left?`}[L] }; },
    (L) => { const a=2+Math.floor(Math.random()*5),b=1+Math.floor(Math.random()*5),c=1+Math.floor(Math.random()*5),ans=a+b+c; return { ans, text:{kk:`Себетте ${a} қызыл, ${b} сары және ${c} жасыл алма бар. Барлығы қанша?`,ru:`В корзине ${a} красных, ${b} жёлтых и ${c} зелёных яблок. Сколько всего?`,en:`A basket has ${a} red, ${b} yellow, and ${c} green apples. Total?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),total=8+Math.floor(Math.random()*8),given=3+Math.floor(Math.random()*(total-4)),ans=total-given; return { ans, text:{kk:`${n}-${kzLoc(n)} ${total} бояу қалам болды. Ол ${given} қаламды досына берді. Қанша қалды?`,ru:`У ${n} было ${total} карандашей. Отдал(а) ${given}. Сколько осталось?`,en:`${n} had ${total} pencils and gave ${given} away. How many are left?`}[L] }; },
  ],
  2: [
    (L) => { const n=_wpk(_WPN[L]),rows=2+Math.floor(Math.random()*4),cols=2+Math.floor(Math.random()*4),ans=rows*cols; return { ans, text:{kk:`${n} ${rows} қатарда, әр қатарда ${cols} гүл отырғызды. Барлығы қанша гүл?`,ru:`${n} посадил(а) цветы в ${rows} ряда по ${cols}. Сколько всего?`,en:`${n} planted flowers in ${rows} rows of ${cols}. How many total?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),boxes=3+Math.floor(Math.random()*5),perBox=2+Math.floor(Math.random()*6),ans=boxes*perBox; return { ans, text:{kk:`${n} ${boxes} қорапқа, әр қорапқа ${perBox} кітап салды. Барлығы қанша кітап?`,ru:`${n} разложил(а) по ${boxes} коробкам по ${perBox} книг. Сколько книг?`,en:`${n} packed ${boxes} boxes with ${perBox} books each. Total books?`}[L] }; },
    (L) => { const g=[2,3,4,5][Math.floor(Math.random()*4)],ans=2+Math.floor(Math.random()*5),total=ans*g; return { ans, text:{kk:`${total} бадам ${g} баланың арасында тең бөлінді. Әрқайсысына қанша тиді?`,ru:`${total} орехов поровну разделили между ${g} детьми. Сколько каждому?`,en:`${total} nuts shared equally among ${g} children. How many each?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),price=3+Math.floor(Math.random()*6),count=3+Math.floor(Math.random()*5),ans=price*count; return { ans, text:{kk:`Бір шоколад ${price} теңге тұрады. ${n} ${count} шоколад сатып алды. Барлығы қанша теңге?`,ru:`Шоколад стоит ${price} тенге. ${n} купил(а) ${count} штуки. Сколько заплатил(а)?`,en:`One chocolate costs ${price} tenge. ${n} bought ${count}. Total cost?`}[L] }; },
  ],
  3: [
    (L) => { const n=_wpk(_WPN[L]),s=3+Math.floor(Math.random()*7),ans=4*s; return { ans, text:{kk:`${n}-${kzGen(n)} бөлмесі шаршы пішінді, бір жағы ${s} м. Периметрі қанша?`,ru:`Комната ${n} квадратная, сторона ${s} м. Найди периметр.`,en:`${n}'s room is a square with side ${s} m. What is the perimeter?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),w=3+Math.floor(Math.random()*7),h=3+Math.floor(Math.random()*7),ans=2*(w+h); return { ans, text:{kk:`${n}-${kzGen(n)} бақшасы тіктөртбұрышты: ені ${w} м, ұзындығы ${h} м. Периметрі қанша?`,ru:`Огород ${n}: ширина ${w} м, длина ${h} м. Найди периметр.`,en:`${n}'s garden is ${w} m wide and ${h} m long. Perimeter?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),ans=(2+Math.floor(Math.random()*6))*4,total=ans*2; return { ans, text:{kk:`${n}-${kzLoc(n)} ${total} кәмпит бар. Ол жартысын берді. Қанша берді?`,ru:`У ${n} есть ${total} конфет. Отдал(а) половину. Сколько отдал(а)?`,en:`${n} has ${total} candies and gives away half. How many?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),ans=(2+Math.floor(Math.random()*5))*8,total=ans*4; return { ans, text:{kk:`${n}-${kzGen(n)} дәптерінде ${total} бет бар. Ол төрттен бірін толтырды. Қанша бет?`,ru:`У ${n} тетрадь на ${total} страниц. Заполнил(а) четверть. Сколько страниц?`,en:`${n} has a ${total}-page notebook and filled one quarter. How many pages?`}[L] }; },
  ],
  4: [
    (L) => { const n=_wpk(_WPN[L]),w=3+Math.floor(Math.random()*7),h=2+Math.floor(Math.random()*7),ans=w*h; return { ans, text:{kk:`${n}-${kzGen(n)} бақшасы тіктөртбұрышты: ені ${w} м, ұзындығы ${h} м. Ауданы қанша?`,ru:`Участок ${n}: ширина ${w} м, длина ${h} м. Найди площадь.`,en:`${n}'s plot is ${w} m × ${h} m. What is the area?`}[L] }; },
    (L) => { const b=4+Math.floor(Math.random()*8),x=2+Math.floor(Math.random()*9),ans=x,a=x+b; return { ans, text:{kk:`x + ${b} = ${a}. x-ті тап.`,ru:`x + ${b} = ${a}. Найди x.`,en:`x + ${b} = ${a}. Find x.`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),spd=3+Math.floor(Math.random()*5),time=2+Math.floor(Math.random()*4),ans=spd*time; return { ans, text:{kk:`${n} сағатына ${spd} км жылдамдықпен жүрді. ${time} сағатта қанша км жүрді?`,ru:`${n} шёл со скоростью ${spd} км/ч в течение ${time} часов. Какое расстояние?`,en:`${n} walked at ${spd} km/h for ${time} hours. Distance covered?`}[L] }; },
    (L) => { const n=_wpk(_WPN[L]),price=5+Math.floor(Math.random()*10),count=2+Math.floor(Math.random()*7),total=price*count,paid=total+10+Math.floor(Math.random()*20),ans=paid-total; return { ans, text:{kk:`${n} ${count} дәптер сатып алды, әрқайсысы ${price} теңге. ${paid} теңге берді. Қайтарымы қанша?`,ru:`${n} купил(а) ${count} тетради по ${price} тенге. Дал(а) ${paid} тенге. Сдача?`,en:`${n} bought ${count} notebooks at ${price} tenge each and paid ${paid}. Change?`}[L] }; },
  ],
};

function makeWpOpts(ans) {
  const opts = new Set([ans]);
  for (const v of [ans+1, ans-1, ans+2, ans-2, ans+3, ans-3, ans+5, ans*2, Math.max(1, ans-10)]) {
    if (v > 0 && v !== ans) opts.add(v);
    if (opts.size === 4) break;
  }
  let d = 6;
  while (opts.size < 4) { opts.add(ans + d); d++; }
  return [...opts].sort(() => Math.random() - 0.5);
}

function makeWordProblems(grade, lang, count = 10) {
  const gens = WP_GENERATORS[grade] || WP_GENERATORS[2];
  return Array.from({ length: count }, (_, i) => {
    const { text, ans } = gens[i % gens.length](lang);
    return { text, ans, opts: makeWpOpts(ans) };
  });
}

function makeQ(difficulty, grade) {
  grade = grade || 2;
  // Grade 1: addition and subtraction within 20
  if (grade === 1) {
    const add = Math.random() > 0.4;
    const a = 1 + Math.floor(Math.random() * 9);
    const b = add
      ? 1 + Math.floor(Math.random() * Math.min(9, 20 - a))
      : 1 + Math.floor(Math.random() * a);
    const ans = add ? a + b : a - b;
    const prompt = add ? `${a} + ${b}` : `${a} − ${b}`;
    const ws = [];
    while (ws.length < 3) {
      const delta = (Math.floor(Math.random() * 4) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const w = ans + delta;
      if (w >= 0 && w !== ans && !ws.includes(w)) ws.push(w);
    }
    return { prompt, ans, opts: [ans, ...ws].sort(() => Math.random() - 0.5) };
  }
  // Grade 3–4: start with harder tables
  const startDiff = grade >= 4 ? 3 : grade >= 3 ? 2 : 1;
  const eff = Math.max(startDiff, difficulty);
  const mul = Math.random() > 0.4;
  const tables = eff >= 3 ? [2,3,4,5,6,7,8,9]
               : eff >= 2 ? [2,3,4,5,6]
               : [2,3,5];
  const maxB = eff >= 3 ? 9 : eff >= 2 ? 8 : 5;
  const a = tables[Math.floor(Math.random() * tables.length)];
  const b = 2 + Math.floor(Math.random() * (maxB - 1));
  const ans = mul ? a * b : a;
  const prompt = mul ? `${a} × ${b}` : `${a * b} ÷ ${b}`;
  const ws = [];
  while (ws.length < 3) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
    const w = ans + delta;
    if (w > 0 && w !== ans && !ws.includes(w)) ws.push(w);
  }
  return { prompt, ans, opts: [ans, ...ws].sort(() => Math.random() - 0.5) };
}

function makeTFQs(total, grade) {
  grade = grade || 2;
  return Array.from({ length: total }, () => {
    // Grade 1: simple addition/subtraction
    if (grade === 1) {
      const add = Math.random() > 0.5;
      const a = 1 + Math.floor(Math.random() * 9);
      const b = add ? 1 + Math.floor(Math.random() * Math.min(9, 20 - a)) : 1 + Math.floor(Math.random() * a);
      const correct = add ? a + b : a - b;
      const expr = add ? `${a} + ${b}` : `${a} − ${b}`;
      const isTrue = Math.random() > 0.5;
      let shown = correct;
      if (!isTrue) {
        let delta;
        do { delta = (Math.floor(Math.random() * 4) + 1) * (Math.random() > 0.5 ? 1 : -1); }
        while (correct + delta < 0);
        shown = correct + delta;
      }
      return { prompt: `${expr} = ${shown}`, answer: isTrue };
    }
    // Grade 2+: multiplication and division
    const mul = Math.random() > 0.4;
    const maxN = grade >= 4 ? 9 : grade >= 3 ? 8 : 7;
    const a = 2 + Math.floor(Math.random() * (maxN - 1));
    const b = 2 + Math.floor(Math.random() * (maxN - 1));
    const correct = mul ? a * b : a;
    const expr = mul ? `${a} × ${b}` : `${a * b} ÷ ${b}`;
    const isTrue = Math.random() > 0.5;
    let shown = correct;
    if (!isTrue) {
      let delta;
      do { delta = (Math.floor(Math.random() * 4) + 1) * (Math.random() > 0.5 ? 1 : -1); }
      while (correct + delta <= 0);
      shown = correct + delta;
    }
    return { prompt: `${expr} = ${shown}`, answer: isTrue };
  });
}

function makeMissingQs(total, grade) {
  grade = grade || 2;
  return Array.from({ length: total }, () => {
    let prompt, correct;
    if (grade === 1) {
      const add = Math.random() > 0.5;
      const a = 2 + Math.floor(Math.random() * 8);
      const b = 1 + Math.floor(Math.random() * Math.min(8, add ? 18 - a : a - 1));
      const hideFirst = Math.random() > 0.5;
      if (add) {
        if (hideFirst) { prompt = `? + ${b} = ${a+b}`; correct = a; }
        else           { prompt = `${a} + ? = ${a+b}`; correct = b; }
      } else {
        if (hideFirst) { prompt = `? − ${b} = ${a-b}`; correct = a; }
        else           { prompt = `${a} − ? = ${a-b}`; correct = b; }
      }
    } else {
      const ops = grade >= 3 ? ['+','−','×','÷'] : ['+','−','×'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      const mx = grade >= 4 ? 12 : 9;
      if (op === '+') {
        const a = 3 + Math.floor(Math.random() * mx), b = 3 + Math.floor(Math.random() * mx);
        if (Math.random() > 0.5) { prompt = `? + ${b} = ${a+b}`; correct = a; }
        else                     { prompt = `${a} + ? = ${a+b}`; correct = b; }
      } else if (op === '−') {
        const b = 2 + Math.floor(Math.random() * mx), a = b + 2 + Math.floor(Math.random() * mx);
        if (Math.random() > 0.5) { prompt = `? − ${b} = ${a-b}`; correct = a; }
        else                     { prompt = `${a} − ? = ${a-b}`; correct = b; }
      } else if (op === '×') {
        const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
        if (Math.random() > 0.5) { prompt = `? × ${b} = ${a*b}`; correct = a; }
        else                     { prompt = `${a} × ? = ${a*b}`; correct = b; }
      } else {
        const b = 2 + Math.floor(Math.random() * 8), a = b * (2 + Math.floor(Math.random() * 8));
        if (Math.random() > 0.5) { prompt = `? ÷ ${b} = ${a/b}`; correct = a; }
        else                     { prompt = `${a} ÷ ? = ${a/b}`; correct = b; }
      }
    }
    const ws = new Set();
    while (ws.size < 3) {
      const d = (1 + Math.floor(Math.random() * 5)) * (Math.random() > 0.5 ? 1 : -1);
      const w = correct + d;
      if (w > 0 && w !== correct) ws.add(w);
    }
    return { prompt, ans: correct, opts: [correct, ...ws].sort(() => Math.random() - 0.5) };
  });
}

function makeCompareQs(total, grade) {
  grade = grade || 2;
  const makeExpr = () => {
    const ops = grade === 1 ? ['+','−'] : ['+','−','×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const mx = grade >= 4 ? 12 : grade >= 3 ? 9 : grade >= 2 ? 7 : 5;
    let a, b;
    if (op === '+')      { a = 1+Math.floor(Math.random()*mx); b = 1+Math.floor(Math.random()*mx); }
    else if (op === '−') { a = 3+Math.floor(Math.random()*mx); b = 1+Math.floor(Math.random()*(a-1)); }
    else                 { a = 2+Math.floor(Math.random()*7);  b = 2+Math.floor(Math.random()*7); }
    const val = op==='+' ? a+b : op==='−' ? a-b : a*b;
    return { expr: `${a} ${op} ${b}`, val };
  };
  return Array.from({ length: total }, () => {
    let left, right;
    do { left = makeExpr(); right = makeExpr(); } while (left.val === right.val);
    return { left: left.expr, right: right.expr, answer: left.val < right.val ? '<' : '>' };
  });
}

function makeChainQs(total, grade) {
  grade = grade || 2;
  return Array.from({ length: total }, () => {
    const steps = grade === 1 ? 2 : 3;
    const ops = grade === 1 ? ['+','−'] : ['+','−','×'];
    const mx = grade >= 4 ? 9 : grade >= 3 ? 7 : 6;
    let val = 2 + Math.floor(Math.random() * (grade === 1 ? 6 : 9));
    const parts = [`${val}`];
    for (let i = 0; i < steps; i++) {
      const op = ops[Math.floor(Math.random() * ops.length)];
      let n;
      if (op === '+')      { n = 1+Math.floor(Math.random()*mx); val += n; parts.push(`+${n}`); }
      else if (op === '−') { n = 1+Math.floor(Math.random()*Math.min(val-1,mx)); val -= n; parts.push(`−${n}`); }
      else                 { n = 2+Math.floor(Math.random()*3); val *= n; parts.push(`×${n}`); }
    }
    const ws = new Set();
    while (ws.size < 3) {
      const d = (1+Math.floor(Math.random()*(grade===1?3:7))) * (Math.random()>0.5?1:-1);
      const w = val + d;
      if (w > 0 && w !== val) ws.add(w);
    }
    return { prompt: parts.join(' → ') + ' = ?', ans: val, opts: [val,...ws].sort(()=>Math.random()-0.5) };
  });
}

function GameResult({ score, total, t, onBack, onRestart }) {
  const pct = Math.round(score / total * 100);
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👍' : '💪';
  const msg   = pct >= 90 ? t.perfect : pct >= 70 ? t.great : pct >= 50 ? t.good : t.tryAgain;
  useEffect(() => { window.soundComplete?.(); }, []);
  return (
    <div className="qgame-shell">
      <div className="qgame-done">
        <div style={{ fontSize: 64 }}>{emoji}</div>
        <div className="qgame-score-big">{score}<span>/{total}</span></div>
        <div className="qgame-done-msg">{msg}</div>
        <div className="qgame-done-btns">
          <button className="btn ghost" onClick={onBack}>{t.quit}</button>
          <button className="btn prim" onClick={onRestart}>{t.retry} ↺</button>
        </div>
      </div>
    </div>
  );
}


function MathSprintRound({ t, onBack, onRestart, grade }) {
  const TOTAL = 20;
  const [timerVariant] = useState(() => getVariant('ab_timer'));
  const SECS = timerVariant === 'B' ? 8 : 5;
  const circ = 113;
  const startDiff = (grade || 2) >= 4 ? 3 : (grade || 2) >= 3 ? 2 : 1;
  const [difficulty, setDifficulty] = useState(startDiff);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState(null);
  const [qs, setQs] = useState(() => Array.from({ length: TOTAL }, () => makeQ(startDiff, grade)));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [tLeft, setTLeft] = useState(SECS);
  const busy = useRef(false);
  const curAns = useRef(null);
  const diffRef = useRef(1);
  const comboRef = useRef(0);
  const idxRef = useRef(0);

  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];
  curAns.current = cur?.ans;

  useEffect(() => {
    logABEvent('ab_timer', timerVariant, 'sprint_started', { secs: SECS });
  }, []);

  useEffect(() => {
    if (isDone) logABEvent('ab_timer', timerVariant, 'sprint_completed', { score, total: TOTAL });
  }, [isDone]);

  const go = useCallback((picked) => {
    if (busy.current) return;
    busy.current = true;
    document.activeElement?.blur();
    const ok = picked === curAns.current;
    if (ok) {
      window.soundCorrect?.();
      setScore(s => s + 1);
      comboRef.current += 1;
      setCombo(comboRef.current);
      if ([3, 6, 9].includes(comboRef.current) && diffRef.current < 3) {
        const nd = diffRef.current + 1;
        diffRef.current = nd;
        setDifficulty(nd);
        setComboFlash(comboRef.current);
        const ci = idxRef.current;
        setQs(prev => [
          ...prev.slice(0, ci + 1),
          ...Array.from({ length: TOTAL - ci - 1 }, () => makeQ(nd, grade)),
        ]);
        setTimeout(() => setComboFlash(null), 900);
      }
    } else {
      window.soundWrong?.();
      comboRef.current = 0;
      setCombo(0);
    }
    setChosen(picked);
    setTimeout(() => {
      idxRef.current += 1;
      setIdx(i => i + 1);
      setTLeft(SECS);
      setChosen(null);
      busy.current = false;
    }, 600);
  }, []);

  const goRef = useRef(go); goRef.current = go;

  useEffect(() => {
    if (isDone || chosen !== null) return;
    if (tLeft <= 0) { goRef.current('__timeout__'); return; }
    if (tLeft <= 3) window.soundTick?.();
    const id = setTimeout(() => setTLeft(n => n - 1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, isDone, chosen]);

  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;

  const diffLabels = t.difficulty || ['Easy', 'Medium', 'Hard'];
  const diffColors = ['#0E8C6B', '#F59E0B', '#EF4444'];

  return (
    <div className="qgame-shell">
      {comboFlash && (
        <div className="combo-flash">{t.combo ? t.combo(comboFlash) : `${comboFlash} in a row 🔥`}</div>
      )}
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">
          {qs.map((_, i) => <div key={i} className={"qgd" + (i < idx ? " done" : i === idx ? " cur" : "")} />)}
        </div>
        <div className="qgame-counter">{idx + 1}/{TOTAL}</div>
      </div>
      <div className="qgame-body">
        <div className="qgame-meta-row">
          <div className="diff-badge" style={{ background: diffColors[difficulty-1] + '22', color: diffColors[difficulty-1] }}>
            {diffLabels[difficulty - 1]}
          </div>
          {combo >= 2 && <div className="combo-badge">🔥 ×{combo}</div>}
        </div>
        <div className="qgame-ring-wrap">
          <svg viewBox="0 0 44 44" className="qgame-ring">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="3"/>
            <circle key={idx} cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${circ} ${circ}`} strokeLinecap="round"
              style={{ transform:'rotate(-90deg)', transformOrigin:'center',
                       animation:`qgame-cd ${SECS}s linear forwards` }}
            />
          </svg>
          <span className="qgame-ring-num">{tLeft}</span>
        </div>
        <div className="qgame-prompt">{cur.prompt} = ?</div>
        <div className="qgame-opts">
          {cur.opts.map((opt, i) => {
            let cls = "qgame-opt";
            if (chosen !== null) {
              const timedOut = chosen === '__timeout__';
              if (opt === cur.ans) cls += timedOut ? " reveal" : " right";
              else if (!timedOut && opt === chosen) cls += " wrong";
            }
            return (
              <button key={`${idx}-${i}`} className={cls} disabled={chosen !== null} onClick={() => go(opt)}>{opt}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrueFalseRound({ t, onBack, onRestart, grade }) {
  const TOTAL = 20, SECS = 4, circ = 113;
  const [qs] = useState(() => makeTFQs(TOTAL, grade));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [tLeft, setTLeft] = useState(SECS);
  const busy = useRef(false);
  const ansRef = useRef(null);

  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];
  ansRef.current = cur?.answer;

  const go = useCallback((picked) => {
    if (busy.current) return;
    busy.current = true;
    document.activeElement?.blur();
    const isTimeout = picked === '__timeout__';
    const ok = !isTimeout && picked === ansRef.current;
    if (ok) { window.soundCorrect?.(); setScore(s => s + 1); }
    else window.soundWrong?.();
    setChosen(picked);
    setTimeout(() => {
      setIdx(i => i + 1);
      setTLeft(SECS);
      setChosen(null);
      busy.current = false;
    }, 700);
  }, []);

  const goRef = useRef(go); goRef.current = go;

  useEffect(() => {
    if (isDone || chosen !== null) return;
    if (tLeft <= 0) { goRef.current('__timeout__'); return; }
    if (tLeft <= 2) window.soundTick?.();
    const id = setTimeout(() => setTLeft(n => n - 1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, isDone, chosen]);

  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;

  const timedOut = chosen === '__timeout__';
  let trueClass = "tf-btn tf-true", falseClass = "tf-btn tf-false";
  if (chosen !== null) {
    if (cur.answer) trueClass  += (!timedOut && chosen === true)  ? " tf-right" : " tf-reveal";
    else            falseClass += (!timedOut && chosen === false)  ? " tf-right" : " tf-reveal";
    if (!timedOut && chosen === true  && !cur.answer) trueClass  += " tf-wrong";
    if (!timedOut && chosen === false &&  cur.answer) falseClass += " tf-wrong";
  }

  return (
    <div className="qgame-shell">
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">
          {qs.map((_, i) => <div key={i} className={"qgd" + (i < idx ? " done" : i === idx ? " cur" : "")} />)}
        </div>
        <div className="qgame-counter">{idx + 1}/{TOTAL}</div>
      </div>
      <div className="tf-body">
        <div className="qgame-ring-wrap">
          <svg viewBox="0 0 44 44" className="qgame-ring">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="3"/>
            <circle key={idx} cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${circ} ${circ}`} strokeLinecap="round"
              style={{ transform:'rotate(-90deg)', transformOrigin:'center',
                       animation:`qgame-cd ${SECS}s linear forwards` }}
            />
          </svg>
          <span className="qgame-ring-num">{tLeft}</span>
        </div>
        <div className="tf-prompt">{cur.prompt}</div>
        <div className="tf-opts">
          <button className={trueClass} disabled={chosen !== null} onClick={() => go(true)}>
            {t.trueBtn || '✓ True'}
          </button>
          <button className={falseClass} disabled={chosen !== null} onClick={() => go(false)}>
            {t.falseBtn || '✗ False'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MathSprintGame({ t, onBack, grade }) {
  const [key, setKey] = useState(0);
  return <MathSprintRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k + 1)} grade={grade} />;
}

function TrueFalseGame({ t, onBack, grade }) {
  const [key, setKey] = useState(0);
  return <TrueFalseRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k + 1)} grade={grade} />;
}

function MissingNumberRound({ t, onBack, onRestart, grade }) {
  const TOTAL = 15, SECS = 5, circ = 113;
  const [qs] = useState(() => makeMissingQs(TOTAL, grade));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [tLeft, setTLeft] = useState(SECS);
  const busy = useRef(false);
  const ansRef = useRef(null);
  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];
  ansRef.current = cur?.ans;
  const go = useCallback((picked) => {
    if (busy.current) return;
    busy.current = true;
    document.activeElement?.blur();
    const ok = picked !== '__timeout__' && picked === ansRef.current;
    if (ok) { window.soundCorrect?.(); setScore(s => s+1); } else window.soundWrong?.();
    setChosen(picked);
    setTimeout(() => { setIdx(i => i+1); setTLeft(SECS); setChosen(null); busy.current = false; }, 700);
  }, []);
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => {
    if (isDone || chosen !== null) return;
    if (tLeft <= 0) { goRef.current('__timeout__'); return; }
    if (tLeft <= 2) window.soundTick?.();
    const id = setTimeout(() => setTLeft(n => n-1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, isDone, chosen]);
  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;
  return (
    <div className="qgame-shell">
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">{qs.map((_,i)=><div key={i} className={"qgd"+(i<idx?" done":i===idx?" cur":"")}/>)}</div>
        <div className="qgame-counter">{idx+1}/{TOTAL}</div>
      </div>
      <div className="qgame-body">
        <div className="qgame-ring-wrap">
          <svg viewBox="0 0 44 44" className="qgame-ring">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="3"/>
            <circle key={idx} cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${circ} ${circ}`} strokeLinecap="round"
              style={{transform:'rotate(-90deg)',transformOrigin:'center',animation:`qgame-cd ${SECS}s linear forwards`}}/>
          </svg>
          <span className="qgame-ring-num">{tLeft}</span>
        </div>
        <div className="qgame-prompt">{cur.prompt}</div>
        <div className="qgame-opts">
          {cur.opts.map((opt,i) => {
            let cls = "qgame-opt";
            if (chosen !== null) {
              const to = chosen === '__timeout__';
              if (opt === cur.ans) cls += to ? " reveal" : " right";
              else if (!to && opt === chosen) cls += " wrong";
            }
            return <button key={`${idx}-${i}`} className={cls} disabled={chosen!==null} onClick={()=>go(opt)}>{opt}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function MissingNumberGame({ t, onBack, grade }) {
  const [key, setKey] = useState(0);
  return <MissingNumberRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k+1)} grade={grade} />;
}

function ComparisonRound({ t, onBack, onRestart, grade }) {
  const TOTAL = 20, SECS = 6, circ = 113;
  const [qs] = useState(() => makeCompareQs(TOTAL, grade));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [tLeft, setTLeft] = useState(SECS);
  const busy = useRef(false);
  const ansRef = useRef(null);
  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];
  ansRef.current = cur?.answer;
  const go = useCallback((picked) => {
    if (busy.current) return;
    busy.current = true;
    document.activeElement?.blur();
    const ok = picked !== '__timeout__' && picked === ansRef.current;
    if (ok) { window.soundCorrect?.(); setScore(s => s+1); } else window.soundWrong?.();
    setChosen(picked);
    setTimeout(() => { setIdx(i => i+1); setTLeft(SECS); setChosen(null); busy.current = false; }, 700);
  }, []);
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => {
    if (isDone || chosen !== null) return;
    if (tLeft <= 0) { goRef.current('__timeout__'); return; }
    if (tLeft <= 1) window.soundTick?.();
    const id = setTimeout(() => setTLeft(n => n-1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, isDone, chosen]);
  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;
  const isTimeout = chosen === '__timeout__';
  const correct = cur.answer;
  let ltClass = "compare-btn", gtClass = "compare-btn";
  if (chosen !== null) {
    if (isTimeout) {
      ltClass += correct === '<' ? " reveal" : "";
      gtClass += correct === '>' ? " reveal" : "";
    } else if (chosen === '<') {
      ltClass += correct === '<' ? " right" : " wrong";
      if (correct === '>') gtClass += " reveal";
    } else {
      gtClass += correct === '>' ? " right" : " wrong";
      if (correct === '<') ltClass += " reveal";
    }
  }
  return (
    <div className="qgame-shell">
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">{qs.map((_,i)=><div key={i} className={"qgd"+(i<idx?" done":i===idx?" cur":"")}/>)}</div>
        <div className="qgame-counter">{idx+1}/{TOTAL}</div>
      </div>
      <div className="qgame-body">
        <div className="qgame-ring-wrap">
          <svg viewBox="0 0 44 44" className="qgame-ring">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="3"/>
            <circle key={idx} cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${circ} ${circ}`} strokeLinecap="round"
              style={{transform:'rotate(-90deg)',transformOrigin:'center',animation:`qgame-cd ${SECS}s linear forwards`}}/>
          </svg>
          <span className="qgame-ring-num">{tLeft}</span>
        </div>
        <div className="compare-exprs">
          <div className="compare-expr">{cur.left}</div>
          <div className="compare-vs">?</div>
          <div className="compare-expr">{cur.right}</div>
        </div>
        <div className="compare-btns">
          <button className={ltClass} disabled={chosen!==null} onClick={() => go('<')}>
            <span className="compare-sym">{'<'}</span>
            <span className="compare-lbl">{t.lessBtn || '◀ Less'}</span>
          </button>
          <button className={gtClass} disabled={chosen!==null} onClick={() => go('>')}>
            <span className="compare-sym">{'>'}</span>
            <span className="compare-lbl">{t.moreBtn || 'More ▶'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonGame({ t, onBack, grade }) {
  const [key, setKey] = useState(0);
  return <ComparisonRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k+1)} grade={grade} />;
}

function NumberChainRound({ t, onBack, onRestart, grade }) {
  const TOTAL = 12, SECS = 10, circ = 113;
  const [qs] = useState(() => makeChainQs(TOTAL, grade));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [tLeft, setTLeft] = useState(SECS);
  const busy = useRef(false);
  const ansRef = useRef(null);
  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];
  ansRef.current = cur?.ans;
  const go = useCallback((picked) => {
    if (busy.current) return;
    busy.current = true;
    document.activeElement?.blur();
    const ok = picked !== '__timeout__' && picked === ansRef.current;
    if (ok) { window.soundCorrect?.(); setScore(s => s+1); } else window.soundWrong?.();
    setChosen(picked);
    setTimeout(() => { setIdx(i => i+1); setTLeft(SECS); setChosen(null); busy.current = false; }, 700);
  }, []);
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => {
    if (isDone || chosen !== null) return;
    if (tLeft <= 0) { goRef.current('__timeout__'); return; }
    if (tLeft <= 2) window.soundTick?.();
    const id = setTimeout(() => setTLeft(n => n-1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, isDone, chosen]);
  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;
  return (
    <div className="qgame-shell">
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">{qs.map((_,i)=><div key={i} className={"qgd"+(i<idx?" done":i===idx?" cur":"")}/>)}</div>
        <div className="qgame-counter">{idx+1}/{TOTAL}</div>
      </div>
      <div className="qgame-body">
        <div className="qgame-ring-wrap">
          <svg viewBox="0 0 44 44" className="qgame-ring">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="3"/>
            <circle key={idx} cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${circ} ${circ}`} strokeLinecap="round"
              style={{transform:'rotate(-90deg)',transformOrigin:'center',animation:`qgame-cd ${SECS}s linear forwards`}}/>
          </svg>
          <span className="qgame-ring-num">{tLeft}</span>
        </div>
        <div className="qgame-prompt chain-prompt">{cur.prompt}</div>
        <div className="qgame-opts">
          {cur.opts.map((opt,i) => {
            let cls = "qgame-opt";
            if (chosen !== null) {
              const to = chosen === '__timeout__';
              if (opt === cur.ans) cls += to ? " reveal" : " right";
              else if (!to && opt === chosen) cls += " wrong";
            }
            return <button key={`${idx}-${i}`} className={cls} disabled={chosen!==null} onClick={()=>go(opt)}>{opt}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function NumberChainGame({ t, onBack, grade }) {
  const [key, setKey] = useState(0);
  return <NumberChainRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k+1)} grade={grade} />;
}

const IcoSprint = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h8l-2 8 12-12h-8l2-8z"/>
  </svg>
);
const IcoTF = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 13l3.5 3.5L13 9"/>
    <path d="M16 9l4 4M20 9l-4 4"/>
  </svg>
);
const IcoMissing = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="3" y="5" width="18" height="14" rx="4"/>
    <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
    <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const IcoCompare = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l-3 4 3 4"/>
    <path d="M19 8l3 4-3 4"/>
    <path d="M2 12h20"/>
  </svg>
);
const IcoChain = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="5" cy="12" r="3"/>
    <circle cx="19" cy="12" r="3"/>
    <path d="M8 12h8"/>
    <path d="M14 7l5 5-5 5"/>
  </svg>
);
const IcoWord = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4"/>
    <path d="M7 8h10M7 12h7M7 16h5"/>
  </svg>
);

function WordProblemRound({ t, onBack, onRestart, grade, lang }) {
  const TOTAL = 10;
  const [qs] = useState(() => makeWordProblems(grade || 2, lang || 'kk', TOTAL));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState(null);
  const busy = useRef(false);
  const isDone = idx >= TOTAL;
  const cur = qs[Math.min(idx, TOTAL - 1)];

  const go = useCallback((picked) => {
    if (busy.current || chosen !== null) return;
    busy.current = true;
    document.activeElement?.blur();
    const ok = picked === cur.ans;
    if (ok) { SFX.correct(); setScore(s => s + 1); } else SFX.wrong();
    setChosen(picked);
    setTimeout(() => { setIdx(i => i + 1); setChosen(null); busy.current = false; }, 800);
  }, [chosen, cur]);

  if (isDone) return <GameResult score={score} total={TOTAL} t={t} onBack={onBack} onRestart={onRestart} />;
  return (
    <div className="qgame-shell">
      <div className="qgame-top">
        <button className="lt-close" onClick={onBack}>✕</button>
        <div className="qgame-dots">{qs.map((_, i) => (
          <div key={i} className={"qgd" + (i < idx ? " done" : i === idx ? " cur" : "")} />
        ))}</div>
        <div className="qgame-counter">{idx + 1}/{TOTAL}</div>
      </div>
      <div className="wp-body">
        <div className="wp-num-badge">{idx + 1} / {TOTAL}</div>
        <div className="wp-text">{cur.text}</div>
        <div className="wp-opts">
          {cur.opts.map((opt, i) => {
            let cls = "wp-opt";
            if (chosen !== null) {
              if (opt === cur.ans) cls += " right";
              else if (opt === chosen) cls += " wrong";
            }
            return <button key={`${idx}-${i}`} className={cls} disabled={chosen !== null} onClick={() => go(opt)}>{opt}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

function WordProblemGame({ t, onBack, grade, lang }) {
  const [key, setKey] = useState(0);
  return <WordProblemRound key={key} t={t} onBack={onBack} onRestart={() => setKey(k => k + 1)} grade={grade} lang={lang} />;
}

function GamePicker({ t, onPick, onClose }) {
  const games = [
    { id:'sprint',  Icon:IcoSprint,  color:'#F59E0B', bg:'#FFFBEB', name:t.mathSprint,  sub:t.mathSprintSub },
    { id:'tf',      Icon:IcoTF,      color:'#8B5CF6', bg:'#F5F3FF', name:t.trueFalse,   sub:t.trueFalseSub },
    { id:'missing', Icon:IcoMissing, color:'#0D9488', bg:'#F0FDFA', name:t.missingNum,  sub:t.missingNumSub },
    { id:'compare', Icon:IcoCompare, color:'#2563EB', bg:'#EFF6FF', name:t.compareRush, sub:t.compareRushSub },
    { id:'chain',   Icon:IcoChain,   color:'#E11D48', bg:'#FFF1F2', name:t.numChain,    sub:t.numChainSub },
    { id:'word',    Icon:IcoWord,    color:'#059669', bg:'#ECFDF5', name:t.wordProb,    sub:t.wordProbSub },
  ];
  return (
    <div className="qgame-shell picker-shell">
      <div className="picker-header">
        <button className="back-btn" onClick={onClose}>←</button>
        <div className="picker-title">{t.pickGame}</div>
        <div/>
      </div>
      <div className="picker-grid">
        {games.map((g, i) => (
          <div key={g.id}
            className="picker-card"
            style={{ '--pc': g.color, '--pb': g.bg }}
            onClick={() => onPick(g.id)}>
            <div className="picker-icon-wrap"><g.Icon/></div>
            <div className="picker-card-body">
              <div className="picker-name">{g.name}</div>
              <div className="picker-sub">{g.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Times Table ───────────────────────────────────────────────────

function MultiTablePicker({ t, onPick, onClose }) {
  const [preview, setPreview] = useState(null);

  const togglePreview = (n) => setPreview(p => p === n ? null : n);

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <div className="game-top">
          <button className="back-btn" onClick={onClose}>←</button>
          <div className="game-top-title">{t.multiTable}</div>
          <div />
        </div>
        <div className="mt-pick-label">{t.multiTablePick}</div>
        <div className="mt-grid">
          {[2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              className={"mt-num-btn" + (preview === n ? " sel" : "")}
              onClick={() => togglePreview(n)}
            >
              ×{n}
            </button>
          ))}
        </div>

        {preview !== null && (
          <div key={preview} className="mt-table-preview">
            <div className="mt-table-rows">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(factor => (
                <div key={factor} className="mt-row">
                  <span className="mt-row-expr">{preview} × {factor}</span>
                  <span className="mt-row-eq">=</span>
                  <span className="mt-row-result">{preview * factor}</span>
                </div>
              ))}
            </div>
            <button className="mt-table-start" onClick={() => onPick(preview)}>
              {t.multiTableStart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiTablePractice({ t, num, onBack }) {
  // queue holds factors still to master; wrong answers get reinserted
  const [queue, setQueue] = useState(() =>
    [...Array(10)].map((_, i) => i + 1).sort(() => Math.random() - .5)
  );
  const [mastered, setMastered] = useState(() => new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [chosen, setChosen] = useState(null);

  const isDone = queue.length === 0;
  const factor = queue[0];

  // regenerate options when the factor changes
  const opts = useMemo(() => {
    if (!factor) return [];
    const ans = num * factor;
    // distractors: adjacent entries in the same table (±1, ±2 from factor)
    const nearby = [-2, -1, 1, 2]
      .map(d => num * (factor + d))
      .filter(v => v > 0 && v !== ans);
    // shuffle nearby and take 3; fill with ±num offsets if somehow not enough
    const shuffled = nearby.sort(() => Math.random() - .5);
    const distractors = [];
    for (const v of shuffled) {
      if (distractors.length === 3) break;
      distractors.push(v);
    }
    while (distractors.length < 3) {
      const v = ans + (distractors.length + 1) * num;
      if (v !== ans && !distractors.includes(v)) distractors.push(v);
    }
    return [...distractors, ans].sort(() => Math.random() - .5);
  }, [factor, num]);

  const ans = factor ? num * factor : 0;

  const pick = (opt) => {
    if (chosen !== null || isDone) return;
    setChosen(opt);
    const ok = opt === ans;
    ok ? window.soundCorrect?.() : window.soundWrong?.();
    if (ok) setCorrectCount(n => n + 1);

    setTimeout(() => {
      setQueue(prev => {
        const [cur, ...rest] = prev;
        if (!ok) {
          // reinsert after 3 positions so child sees something else first
          const at = Math.min(3, rest.length);
          return [...rest.slice(0, at), cur, ...rest.slice(at)];
        }
        return rest; // mastered — remove from queue
      });
      if (ok) setMastered(prev => { const s = new Set(prev); s.add(factor); return s; });
      setChosen(null);
    }, 700);
  };

  if (isDone) {
    const pct = Math.round((correctCount / (correctCount + queue.length)) * 100) || 100;
    return (
      <div className="game-shell">
        <div className="game-shell-inner">
        <div className="mt-result">
          <div className="mt-result-icon">{mastered.size >= 9 ? '🏆' : mastered.size >= 7 ? '⭐' : '💪'}</div>
          <div className="mt-result-score">{mastered.size}/10</div>
          <div className="mt-result-sub">{t.multiTablePractice} ×{num}</div>
          <div className="mt-result-btns">
            <button className="btn prim" style={{flex:1}} onClick={onBack}>← {t.multiTablePick}</button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  const progress = mastered.size / 10;

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
      <div className="game-top">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="mt-prog-bar"><div style={{ width: (progress * 100) + '%' }} /></div>
        <div className="mt-score-chip">{mastered.size}/10</div>
      </div>
      <div className="mt-q-area">
        <div className="mt-question">{num} × {factor} = ?</div>
      </div>
      <div className="mt-options">
        {opts.map((opt, i) => {
          let cls = "mt-opt";
          if (chosen !== null) {
            if (opt === ans) cls += " correct";
            else if (opt === chosen) cls += " wrong";
          }
          return <button key={i} className={cls} onClick={() => pick(opt)}>{opt}</button>;
        })}
      </div>
      </div>
    </div>
  );
}

function MultiTableView({ t, onClose }) {
  const [num, setNum] = useState(null);
  if (!num) return <MultiTablePicker t={t} onPick={setNum} onClose={onClose} />;
  return <MultiTablePractice t={t} num={num} onBack={() => setNum(null)} />;
}

function QuickGame({ t, onClose, grade, lang }) {
  const [mode, setMode] = useState(null);
  const back = () => setMode(null);
  if (!mode)           return <GamePicker        t={t} onPick={setMode} onClose={onClose} />;
  if (mode==='sprint')  return <MathSprintGame    t={t} onBack={back} grade={grade} />;
  if (mode==='tf')      return <TrueFalseGame     t={t} onBack={back} grade={grade} />;
  if (mode==='missing') return <MissingNumberGame t={t} onBack={back} grade={grade} />;
  if (mode==='compare') return <ComparisonGame    t={t} onBack={back} grade={grade} />;
  if (mode==='chain')   return <NumberChainGame   t={t} onBack={back} grade={grade} />;
  if (mode==='word')    return <WordProblemGame   t={t} onBack={back} grade={grade} lang={lang} />;
  return null;
}

// ─── Memory Game ───────────────────────────────────────────────────
const MEMORY_PAIRS = {
  1: [['1+2','3'],['2+2','4'],['2+3','5'],['3+3','6'],['3+4','7'],['4+4','8'],['4+5','9'],['5+5','10']],
  2: [['2×3','6'],['3×3','9'],['3×4','12'],['4×4','16'],['3×5','15'],['4×5','20'],['4×6','24'],['5×5','25']],
  3: [['6×7','42'],['7×7','49'],['8×6','48'],['9×6','54'],['7×8','56'],['9×7','63'],['8×8','64'],['9×8','72']],
  4: [['24÷4','6'],['35÷5','7'],['48÷6','8'],['63÷7','9'],['80÷8','10'],['66÷6','11'],['72÷6','12'],['91÷7','13']],
};

function MemoryGame({ t, onBack, grade = 2 }) {
  const pairs = MEMORY_PAIRS[grade] || MEMORY_PAIRS[2];

  const makeDeck = () => {
    const cards = pairs.flatMap(([q, a], i) => [
      { id: i*2,   pairId: i, text: q },
      { id: i*2+1, pairId: i, text: a },
    ]);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  const [deck, setDeck] = useState(makeDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [xp, setXp] = useState(0);
  const [xpPop, setXpPop] = useState(false);
  const [preview, setPreview] = useState(true);
  const lock = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setPreview(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const flip = (idx) => {
    if (preview || lock.current || matched.has(deck[idx].pairId) || flipped.includes(idx) || flipped.length === 2) return;
    SFX.flip();
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves(m => m + 1);
      lock.current = true;
      const [a, b] = next;
      if (deck[a].pairId === deck[b].pairId) {
        setTimeout(() => {
          setMatched(prev => {
            const s = new Set(prev); s.add(deck[a].pairId);
            if (s.size === pairs.length) { setWon(true); SFX.win(); } else SFX.match();
            return s;
          });
          setXp(x => { setXpPop(true); setTimeout(() => setXpPop(false), 350); return x + 20; });
          setFlipped([]); lock.current = false;
        }, 500);
      } else {
        setTimeout(() => { SFX.wrong(); setFlipped([]); lock.current = false; }, 600);
      }
    }
  };

  const restart = () => {
    setDeck(makeDeck()); setFlipped([]); setMatched(new Set());
    setMoves(0); setWon(false); setXp(0); setPreview(true);
    setTimeout(() => setPreview(false), 1500);
  };

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <div className="games-topbar">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="games-topbar-title">{t.memoryTitle}</span>
          <div className={`g2048-xp${xpPop ? ' pop' : ''}`} style={{fontSize:13,fontWeight:900,color:'#D97706'}}>+{xp} XP</div>
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',padding:'6px 16px 4px',fontSize:13,fontWeight:800,color:'var(--ink-mute)'}}>
          <span>🎯 {matched.size}/{pairs.length} {t.memoryPairs||'жұп'}</span>
          <span>🔄 {moves} {t.moves||'қадам'}</span>
        </div>
        {preview && (
          <div style={{textAlign:'center',padding:'4px 16px 8px',fontSize:13,fontWeight:800,color:'var(--brand)',letterSpacing:'.02em'}}>
            👁 {t.memoryPreview||'Жаттап ал!'}
          </div>
        )}
        {won ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:24}}>
            <div style={{fontSize:64}}>🎉</div>
            <div style={{fontSize:24,fontWeight:900}}>{t.memoryWin||'Жеңдіңіз!'}</div>
            <div style={{fontSize:15,color:'var(--ink-mute)',fontWeight:700}}>{moves} {t.moves||'қадам'} · +{xp} XP</div>
            <button className="play-btn" onClick={restart} style={{background:'var(--brand)',color:'#fff',marginTop:8}}>
              🔄 {t.tetrisRestart}
            </button>
          </div>
        ) : (
          <div style={{padding:'0 16px 24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,flex:1,alignContent:'start'}}>
            {deck.map((card, idx) => {
              const isMatched = matched.has(card.pairId);
              const isFlipped = preview || flipped.includes(idx) || isMatched;
              return (
                <div key={card.id} onClick={() => flip(idx)} style={{
                  aspectRatio:'1', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: card.text.length > 2 ? 15 : 22, fontWeight:900,
                  cursor: preview || isMatched ? 'default' : 'pointer',
                  transition:'all .25s',
                  background: isMatched ? '#D1FAE5' : isFlipped ? 'var(--card)' : 'var(--brand)',
                  border: `2px solid ${isMatched ? '#6EE7B7' : isFlipped ? 'var(--line)' : 'transparent'}`,
                  color: isFlipped || isMatched ? 'var(--ink)' : 'transparent',
                  boxShadow: isFlipped && !isMatched ? '0 4px 14px rgba(0,0,0,.12)' : 'none',
                  transform: preview && !isMatched ? 'scale(1.02)' : 'scale(1)',
                  userSelect:'none',
                  outline: preview ? '2px solid rgba(14,140,107,.3)' : 'none',
                }}>{card.text}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Math Snake ────────────────────────────────────────────────────
const SN_COLS = 12, SN_ROWS = 15, SN_B = 26;

function MathSnake({ t, onBack }) {
  const canvasRef = useRef(null);
  const G = useRef(null);
  const rafRef = useRef(null);
  const [disp, setDisp] = useState({ score: 0, target: 1, over: false, xp: 0 });

  const spawnFood = (g) => {
    while (g.food.length < 4) {
      const val = g.target + g.food.length;
      let x, y, tries = 0;
      do {
        x = Math.floor(Math.random() * SN_COLS);
        y = Math.floor(Math.random() * SN_ROWS);
        tries++;
      } while (tries < 100 && (
        g.snake.some(s => s.x===x && s.y===y) ||
        g.food.some(f => f.x===x && f.y===y)
      ));
      g.food.push({ x, y, val });
    }
  };

  const initGame = () => {
    const g = {
      snake: [{x:5,y:7},{x:4,y:7},{x:3,y:7}],
      dir:{x:1,y:0}, nextDir:{x:1,y:0},
      food:[], target:1, score:0, xp:0,
      over:false, speed:220, lastMove:0,
    };
    spawnFood(g);
    return g;
  };

  const draw = (g) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = SN_COLS*SN_B, H = SN_ROWS*SN_B;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-soft') || '#F0FDF4';
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = 'rgba(14,140,107,.08)'; ctx.lineWidth = 1;
    for (let x=0;x<=SN_COLS;x++){ctx.beginPath();ctx.moveTo(x*SN_B,0);ctx.lineTo(x*SN_B,H);ctx.stroke();}
    for (let y=0;y<=SN_ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*SN_B);ctx.lineTo(W,y*SN_B);ctx.stroke();}
    const rr = (x,y,w,h,r) => { ctx.beginPath(); if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);}else{ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();} };
    // food
    g.food.forEach(f => {
      const isTarget = f.val === g.target;
      ctx.fillStyle = isTarget ? '#F97316' : '#CBD5E1';
      rr(f.x*SN_B+2,f.y*SN_B+2,SN_B-4,SN_B-4,7); ctx.fill();
      if (isTarget) { ctx.strokeStyle='#EA580C'; ctx.lineWidth=2; rr(f.x*SN_B+2,f.y*SN_B+2,SN_B-4,SN_B-4,7); ctx.stroke(); }
      ctx.fillStyle = isTarget ? '#fff' : '#64748B';
      ctx.font = `bold ${Math.round(SN_B*0.46)}px system-ui`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(f.val, f.x*SN_B+SN_B/2, f.y*SN_B+SN_B/2);
    });
    // snake
    g.snake.forEach((s, i) => {
      const alpha = Math.max(0.25, 1 - i*0.06);
      ctx.fillStyle = i===0 ? '#0E8C6B' : `rgba(14,140,107,${alpha})`;
      rr(s.x*SN_B+1,s.y*SN_B+1,SN_B-2,SN_B-2,i===0?8:5); ctx.fill();
      if (i===0) {
        ctx.fillStyle='#fff';
        [[6,6],[SN_B-6,6]].forEach(([ex,ey])=>{ctx.beginPath();ctx.arc(s.x*SN_B+ex,s.y*SN_B+ey,2.5,0,Math.PI*2);ctx.fill();});
        ctx.fillStyle='#000';
        [[6,6],[SN_B-6,6]].forEach(([ex,ey])=>{ctx.beginPath();ctx.arc(s.x*SN_B+ex,s.y*SN_B+ey,1.2,0,Math.PI*2);ctx.fill();});
      }
    });
    // game over overlay
    if (g.over) {
      ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#fff'; ctx.font='bold 20px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('💀 GAME OVER', W/2, H/2-14);
      ctx.font='bold 13px system-ui'; ctx.fillStyle='rgba(255,255,255,.75)';
      ctx.fillText('Tap to restart', W/2, H/2+14);
    }
  };

  const startLoop = (g) => {
    cancelAnimationFrame(rafRef.current);
    const loop = (ts) => {
      if (!G.current || G.current.over) { draw(G.current); return; }
      if (ts - G.current.lastMove >= G.current.speed) {
        G.current.lastMove = ts;
        G.current.dir = G.current.nextDir;
        const h = { x: G.current.snake[0].x + G.current.dir.x, y: G.current.snake[0].y + G.current.dir.y };
        if (h.x<0||h.x>=SN_COLS||h.y<0||h.y>=SN_ROWS||G.current.snake.some(s=>s.x===h.x&&s.y===h.y)) {
          G.current.over = true; SFX.die(); draw(G.current);
          setDisp(d=>({...d,over:true})); return;
        }
        G.current.snake.unshift(h);
        const fi = G.current.food.findIndex(f=>f.x===h.x&&f.y===h.y);
        if (fi !== -1) {
          const eaten = G.current.food[fi];
          if (eaten.val === G.current.target) {
            SFX.eat();
            G.current.food.splice(fi,1); G.current.target++; G.current.score++;
            G.current.xp += 15; G.current.speed = Math.max(80, G.current.speed-6);
            spawnFood(G.current);
            setDisp({score:G.current.score,target:G.current.target,over:false,xp:G.current.xp});
          } else {
            SFX.wrong();
            G.current.snake.pop(); G.current.snake.pop();
          }
        } else {
          G.current.snake.pop();
        }
        draw(G.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const cv = canvasRef.current;
    cv.width = SN_COLS*SN_B; cv.height = SN_ROWS*SN_B;
    G.current = initGame();
    draw(G.current);
    startLoop(G.current);

    const onKey = (e) => {
      if (!G.current) return;
      if (G.current.over) { G.current = initGame(); setDisp({score:0,target:1,over:false,xp:0}); startLoop(G.current); return; }
      const map = {ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
      const nd = map[e.key]; if (!nd) return;
      if (nd.x !== -G.current.dir.x || nd.y !== -G.current.dir.y) G.current.nextDir = nd;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('keydown', onKey); };
  }, []);

  const setDir = (nd) => {
    if (!G.current) return;
    if (G.current.over) { G.current = initGame(); setDisp({score:0,target:1,over:false,xp:0}); startLoop(G.current); return; }
    if (nd.x !== -G.current.dir.x || nd.y !== -G.current.dir.y) G.current.nextDir = nd;
  };

  // swipe
  const sw = useRef({});
  const onTS = e => { sw.current = {x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTE = e => {
    const dx = e.changedTouches[0].clientX - sw.current.x;
    const dy = e.changedTouches[0].clientY - sw.current.y;
    if (Math.abs(dx)<20 && Math.abs(dy)<20) return;
    if (Math.abs(dx) > Math.abs(dy)) setDir({x:dx>0?1:-1,y:0});
    else setDir({x:0,y:dy>0?1:-1});
  };

  const dpBtn = (label, dir) => (
    <button onPointerDown={e=>{e.preventDefault();setDir(dir);}} style={{
      width:50,height:50,borderRadius:13,border:'1.5px solid var(--line)',
      background:'var(--card)',fontSize:20,cursor:'pointer',touchAction:'none',
      display:'flex',alignItems:'center',justifyContent:'center',
      boxShadow:'0 2px 8px rgba(0,0,0,.09)',userSelect:'none',WebkitUserSelect:'none',
    }}>{label}</button>
  );
  const DPad = () => (
    <div style={{display:'grid',gridTemplateColumns:'54px 54px 54px',gridTemplateRows:'54px 54px 54px',gap:4,margin:'8px auto 0',width:'fit-content'}}>
      <div/>{dpBtn('↑',{x:0,y:-1})}<div/>
      {dpBtn('←',{x:-1,y:0})}<div/>{dpBtn('→',{x:1,y:0})}
      <div/>{dpBtn('↓',{x:0,y:1})}<div/>
    </div>
  );

  return (
    <div className="game-shell">
      <div className="game-shell-inner">
        <div className="games-topbar">
          <button className="back-btn" onClick={onBack}>←</button>
          <span className="games-topbar-title">{t.snakeTitle}</span>
          <div style={{fontSize:13,fontWeight:900,color:'#D97706'}}>+{disp.xp} XP</div>
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',padding:'6px 16px 8px',fontSize:14,fontWeight:800}}>
          <span style={{color:'#F97316'}}>→ {disp.target}</span>
          <span style={{color:'var(--ink-mute)'}}>✅ {disp.score}</span>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'0 16px 8px'}}>
          <canvas ref={canvasRef}
            onTouchStart={onTS} onTouchEnd={onTE}
            onClick={() => { if (G.current?.over) { G.current=initGame(); setDisp({score:0,target:1,over:false,xp:0}); startLoop(G.current); }}}
            style={{borderRadius:14,maxWidth:'100%',border:'1.5px solid var(--line)',display:'block'}}
          />
          <DPad />
        </div>
      </div>
    </div>
  );
}

// ─── Parent Cabinet ────────────────────────────────────────────────

function ParentView({ progress, lang, onClose }) {
  const t = L[lang];
  const subjects = [
    { id:'math',  label:{ kk:'Математика', ru:'Математика', en:'Math' }, color:'#0E8C6B' },
    { id:'kaz',   label:{ kk:'Қазақ тілі', ru:'Казахский', en:'Kazakh' }, color:'#2563EB' },
    { id:'world', label:{ kk:'Дүниетану', ru:'Окр. мир', en:'World Studies' }, color:'#D97706' },
    { id:'eng',   label:{ kk:'Ағылшын', ru:'Английский', en:'English' }, color:'#7C3AED' },
  ];

  return (
    <div className="parent-view">
      <div className="parent-top">
        <button className="lt-close" onClick={onClose}>✕</button>
        <h2 className="parent-title">{t.parentCabinet || 'Кабинет родителя'}</h2>
      </div>

      <div className="parent-body">
        <div className="parent-child-card">
          <div className="parent-avatar">{(progress.name||'А')[0].toUpperCase()}</div>
          <div>
            <div className="parent-name">{progress.name || '—'}</div>
            <div className="parent-grade-line">{t.gradeWord || 'Класс'} {progress.grade || '—'} · {progress.streak} {t.streakDays || 'дней подряд'} 🔥</div>
          </div>
          <div className="parent-xp-big">
            <div className="parent-xp-num">{progress.totalXP}</div>
            <div className="parent-xp-label">XP</div>
          </div>
        </div>

        <h3 className="parent-section-title">{t.subjectProgress || 'Прогресс по предметам'}</h3>
        <div className="parent-subjects">
          {subjects.map(s => {
            const p = progress[s.id] || { lesson:1, of:12, stars:0 };
            const pct = Math.min(100, Math.round(((p.lesson-1)/p.of)*100));
            const stars = p.stars || 0;
            return (
              <div key={s.id} className="parent-subj-row">
                <div className="parent-subj-dot" style={{background:s.color}} />
                <div className="parent-subj-name">{s.label[lang] || s.label.ru}</div>
                <div className="parent-subj-bar">
                  <div className="parent-subj-fill" style={{width:pct+'%', background:s.color}} />
                </div>
                <div className="parent-subj-pct">{pct}%</div>
                <div className="parent-subj-stars">{'★'.repeat(Math.min(stars,3))}{'☆'.repeat(Math.max(0,3-Math.min(stars,3)))}</div>
              </div>
            );
          })}
        </div>

        <h3 className="parent-section-title">{t.recommendations || 'Рекомендации'}</h3>
        <div className="parent-recs">
          {(() => {
            const recs = [];
            subjects.forEach(s => {
              const p = progress[s.id] || { lesson:1, of:12, stars:0 };
              const pct = Math.min(100, Math.round(((p.lesson-1)/p.of)*100));
              if (pct < 30) recs.push({ icon:'📚', text: lang==='kk' ? `${s.label.kk} бойынша тәжірибені арттырыңыз` : lang==='en' ? `Practise ${s.label.en} more` : `Больше занимайтесь: ${s.label.ru}` });
            });
            if (progress.streak < 3) recs.push({ icon:'🔥', text: lang==='kk' ? 'Күн сайын оқуды дағдыға айналдырыңыз' : lang==='en' ? 'Build a daily learning habit' : 'Занимайтесь каждый день' });
            if (recs.length === 0) recs.push({ icon:'⭐', text: lang==='kk' ? 'Тамаша! Барлық нәтижелер жақсы.' : lang==='en' ? 'Excellent progress on all subjects!' : 'Отличный прогресс по всем предметам!' });
            return recs.map((r,i) => (
              <div key={i} className="parent-rec">
                <span className="parent-rec-icon">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ));
          })()}
        </div>

        <div className="parent-note">{lang==='kk' ? '* Деректер осы құрылғыда сақталады' : lang==='en' ? '* Data is stored on this device' : '* Данные хранятся на этом устройстве'}</div>
      </div>
    </div>
  );
}

// ─── Home screen ───────────────────────────────────────────────────

function HomeView({ tweaks, setTweak, progress, setProgress, onStartLesson, showToast }) {
  const t = L[tweaks.language];
  const subs = subjectsFor(tweaks.language, progress);
  const [open, setOpen] = useState(null);
  const [quickGame, setQuickGame] = useState(false);
  const [multiTable, setMultiTable] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [userMenu, setUserMenu] = useState(false);
  const [showParent, setShowParent] = useState(false);

  const logout = () => {
    try { localStorage.removeItem(PROGRESS_KEY); } catch(e) {}
    setProgress(DEFAULT_PROGRESS);
    setUserMenu(false);
  };
  const ctaVariant = getVariant('ab_cta');
  const quests = progress.questsDone;
  const setQuests = (q) => setProgress(p => ({ ...p, questsDone: q }));
  const subject = (id) => subs.find(s => s.id === id);

  if (showParent)    return <ParentView     progress={progress} lang={tweaks.language} onClose={() => setShowParent(false)} />;
  if (showPractice)  return <MathSprintMinute grade={progress.grade || 2} lang={tweaks.language}
                              onClose={() => setShowPractice(false)} />;
  if (quickGame)     return <QuickGame      t={t} onClose={() => setQuickGame(false)} grade={progress.grade || 2} lang={tweaks.language} />;
  if (multiTable)          return <MultiTableView    t={t} onClose={() => setMultiTable(false)} />;
  if (activeGame==='tetris') return <TetrisFullScreen t={t} onBack={() => setActiveGame(null)} />;
  if (activeGame==='2048')   return <Game2048         t={t} onBack={() => setActiveGame(null)} />;
  if (activeGame==='memory') return <MemoryGame       t={t} onBack={() => setActiveGame(null)} grade={progress.grade || 2} />;
  if (activeGame==='snake')  return <MathSnake        t={t} onBack={() => setActiveGame(null)} />;

  return (
    <div className="v2">
      {/* ── top bar ── */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sparkle style={{ color: '#fff' }} /></div>
          <div>
            <div className="brand-sub">{t.welcomeSub}</div>
            <div className="brand-name">{t.welcome(progress.name)}</div>
          </div>
        </div>
        <div className="topbar-right">
          {progress.grade && (
            <div className="grade-badge">
              <span>{GRADE_INFO[progress.grade]?.emoji}</span>
              <span className="grade-label">{GRADE_INFO[progress.grade]?.label[tweaks.language]}</span>
            </div>
          )}
          <div className="chip streak"><div className="flame">🔥</div>{progress.streak}</div>
          <div className="chip xp">
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-mute)', fontWeight: 800 }}>{t.level} {progress.level}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)' }}>{progress.totalXP} XP</span>
            </div>
            <div className="xp-ring" style={{ '--pct': progress.totalXP % 100 }}>
              <span>{progress.totalXP % 100}</span>
            </div>
          </div>
          <button
            className="chip"
            style={{ fontSize: 18, padding: '7px 10px', lineHeight: 1 }}
            onClick={() => setTweak('darkMode', !tweaks.darkMode)}
            title={tweaks.darkMode ? 'Light mode' : 'Dark mode'}
          >{tweaks.darkMode ? '☀️' : '🌙'}</button>
          <LangChip lang={tweaks.language} onChange={(v) => setTweak('language', v)} />
          <div className="avatar-wrap">
            <div className="avatar" onClick={() => setUserMenu(v => !v)}>{(progress.name || 'А')[0].toUpperCase()}</div>
            {userMenu && <>
              <div className="user-menu-backdrop" onClick={() => setUserMenu(false)} />
              <div className="user-menu">
                <div className="user-menu-name">{progress.name}</div>
                <button className="user-menu-logout" onClick={logout}>🚪 {t.logout || 'Шығу'}</button>
              </div>
            </>}
          </div>
        </div>
      </div>

      {/* ── weekly progress bar ── */}
      <div className="week-bar-wrap">
        <span className="week-bar-label">{t.weekProgress || 'Прогресс недели'}</span>
        <div className="week-segs">
          {Array.from({length:7},(_,i) => (
            <div key={i} className={"week-seg" + (i < Math.min(progress.streak,7) ? " filled" : "")} />
          ))}
        </div>
        <span className="week-bar-count">{Math.min(progress.streak,7)}/7</span>
      </div>

      {/* ── hero: continue + quests ── */}
      <div className="hero">
        {(() => {
          const lastSub = subs.find(s => s.id === (progress.lastSubjectId || 'math')) || subs.find(s => s.ready);
          const subProg = progress[lastSub?.id] || { lesson: 1, of: 12 };
          const allDone = lastSub?.allDone;
          const pct = allDone ? 100 : Math.round(((subProg.lesson - 1) / (lastSub?.of || 12)) * 100);
          return (
            <div className="continue" style={{ cursor: allDone ? 'default' : 'pointer' }} onClick={() => {
              if (!allDone && lastSub?.lessonId) {
                logABEvent('ab_cta', ctaVariant, 'continue_clicked', { subject: lastSub.id });
                onStartLesson(lastSub.lessonId);
              }
            }}>
              <div className="continue-lesson-tag">{t.lessonOfDay || 'УРОК ДНЯ'}</div>
              <div>
                <div className="continue-eyebrow">{t.continueEyebrow} · {lastSub?.name}</div>
                {allDone
                  ? <><h2>{t.allDone}</h2><div className="sub">{t.allDoneSub}</div></>
                  : <><h2>{lastSub?.next || t.continueTitle}</h2><div className="sub">{t.continueSub}</div></>
                }
              </div>
              <div className="continue-row">
                <div className="continue-meta">
                  <div className="continue-bar">
                    <div style={{ width: pct + '%' }}></div>
                  </div>
                  <div className="continue-bar-text">
                    <span>{t.lessonOf(Math.min(subProg.lesson, lastSub?.of ?? 12), lastSub?.of ?? 12)}</span>
                    <span>{allDone ? '✓' : '+45 XP'}</span>
                  </div>
                </div>
                <button className="play-btn" disabled={allDone} style={allDone ? {opacity:.5,cursor:'default'} : {}}>
                  <div className="ic">{allDone ? '✓' : '▶'}</div>
                  {allDone ? t.allDoneBtn : ctaVariant === 'B' ? t.continueBtnShort : t.continueBtn}
                </button>
              </div>
            </div>
          );
        })()}

        <div className="quests">
          <div className="quests-head">
            <h3>{t.quests}</h3>
            <div className="quests-pill">{t.questsPill}</div>
          </div>
          {[
            { title: t.q1, meta: t.q1m, xp: "+10" },
            { title: t.q2, meta: t.q2m, xp: "+15" },
            { title: t.q3, meta: t.q3m, xp: "+20" },
            { title: t.q4, meta: t.q4m, xp: "+25" },
          ].map((q, i) => (
            <div key={i} className={"quest " + (quests[i] ? "done" : "")} style={{ cursor: 'pointer' }}
              onClick={() => { const c = [...quests]; c[i] = !c[i]; setQuests(c); }}>
              <div className="quest-check">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="quest-body">
                <div className="quest-title">{q.title}</div>
                <div className="quest-meta">{q.meta}</div>
              </div>
              <div className="quest-reward">{q.xp} XP</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── game launchers ── */}
      <div className="game-launchers">
        <div className="qgame-launcher" onClick={() => setQuickGame(true)}>
          <div className="qgl-left">
            <div className="qgl-icon">⚡</div>
            <div>
              <div className="qgl-title">{t.quickGame}</div>
              <div className="qgl-sub">{t.quickGameSub}</div>
            </div>
          </div>
          <div className="qgl-arrow">→</div>
        </div>
        <div className="qgame-launcher mt-launcher" onClick={() => setMultiTable(true)}>
          <div className="qgl-left">
            <div className="qgl-icon">×</div>
            <div>
              <div className="qgl-title">{t.multiTable}</div>
              <div className="qgl-sub">{t.multiTableSub}</div>
            </div>
          </div>
          <div className="qgl-arrow">→</div>
        </div>
        <div className="qgame-launcher practice-launcher" onClick={() => setShowPractice(true)}>
          <div className="qgl-left">
            <div className="qgl-icon">🏋️</div>
            <div>
              <div className="qgl-title">{t.practiceMode}</div>
              <div className="qgl-sub">{t.practiceModeSub}</div>
            </div>
          </div>
          <div className="qgl-arrow">→</div>
        </div>
        <div className="qgame-launcher clock-launcher" onClick={() => onStartLesson('math-time')}>
          <div className="qgl-left">
            <div className="qgl-icon">⏰</div>
            <div>
              <div className="qgl-title">{t.clockLesson}</div>
              <div className="qgl-sub">{t.clockLessonSub}</div>
            </div>
          </div>
          <div className="qgl-arrow">→</div>
        </div>
      </div>

      {/* ── subject grid ── */}
      <div className="section-head">
        <div>
          <h2>{t.all}</h2>
        </div>
        <button className="more" onClick={() => showToast?.(t.seeAllToast)}>{t.seeAll} →</button>
      </div>

      <div className="grid">
        {subs.map(s => (
          <SubjectCard key={s.id} s={s} t={t}
            onOpen={() => s.ready && setOpen(s.id)} />
        ))}
      </div>

      {/* ── friends strip ── */}
      <div className="friends">
        <div className="friends-l">
          <div className="stack">
            {[{bg:'#FFB547',tx:'Б'},{bg:'#5764D8',tx:'А'},{bg:'#E14B73',tx:'Д'},{bg:'#2D9D5C',tx:'М'},{bg:'var(--ink)',tx:'+1'}]
              .map((a, i) => <div key={i} className="a" style={{ background: a.bg }}>{a.tx}</div>)}
          </div>
          <div>
            <div className="friends-title">{t.friends}</div>
            <div className="friends-sub">{t.friendsSub}</div>
          </div>
        </div>
        <div className="friends-r">
          <button className="leaderboard-btn" onClick={() => showToast?.(t.leaderboardToast)}>🏆 {t.leaderboard}</button>
        </div>
      </div>

      {/* ── games section ── */}
      <div className="section-head">
        <div><h2>{t.games}</h2></div>
      </div>
      <div className="games-grid">
        <div className="game-card" onClick={() => setActiveGame('tetris')}>
          <div className="game-card-banner" style={{background:'linear-gradient(135deg,#0A6E54,#0E8C6B,#22C55E)'}}>
            <TetrisBlockIcon size={52}/>
          </div>
          <div className="game-card-body">
            <div className="game-card-name">{t.tetrisTitle}</div>
            <div className="game-card-desc">{t.tetrisDesc}</div>
            <div className="game-card-cta">{t.playBtn}</div>
          </div>
        </div>
        <div className="game-card" onClick={() => setActiveGame('2048')}>
          <div className="game-card-banner" style={{background:'linear-gradient(135deg,#92400E,#D97706,#FCD34D)'}}>
            <span style={{fontSize:48,lineHeight:1}}>🔢</span>
          </div>
          <div className="game-card-body">
            <div className="game-card-name">2048</div>
            <div className="game-card-desc">{t.g2048Desc}</div>
            <div className="game-card-cta">{t.playBtn}</div>
          </div>
        </div>
        <div className="game-card" onClick={() => setActiveGame('memory')}>
          <div className="game-card-banner" style={{background:'linear-gradient(135deg,#831843,#DB2777,#F9A8D4)'}}>
            <MemoryIcon size={52}/>
          </div>
          <div className="game-card-body">
            <div className="game-card-name">{t.memoryTitle}</div>
            <div className="game-card-desc">{t.memoryDesc}</div>
            <div className="game-card-cta">{t.playBtn}</div>
          </div>
        </div>
        <div className="game-card" onClick={() => setActiveGame('snake')}>
          <div className="game-card-banner" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB,#60A5FA)'}}>
            <MathSnakeIcon size={52}/>
          </div>
          <div className="game-card-body">
            <div className="game-card-name">{t.snakeTitle}</div>
            <div className="game-card-desc">{t.snakeDesc}</div>
            <div className="game-card-cta">{t.playBtn}</div>
          </div>
        </div>
      </div>

      {tweaks.mascot && (
        <div className="mascot">
          <div className="mascot-bubble">{t.mascotMsg}</div>
          <div className="mascot-body">🦊</div>
        </div>
      )}

      {/* ── parent entry ── */}
      <div className="parent-entry" onClick={() => setShowParent(true)}>
        <div className="parent-entry-ic">👨‍👩‍👦</div>
        <div>
          <div className="parent-entry-title">{t.parentCabinet || 'Кабинет родителя'}</div>
          <div className="parent-entry-sub">{t.parentCabinetSub || 'Отчёт и прогресс ребёнка'}</div>
        </div>
        <div className="parent-entry-arrow">→</div>
      </div>

      {open && <LessonModal s={subject(open)} t={t} onClose={() => setOpen(null)} onStart={onStartLesson} />}
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────

function App() {
  const [tweaks, setTweakRaw] = useState(TWEAK_DEFAULTS);
  const setTweak = (key, val) => setTweakRaw(t => ({ ...t, [key]: val }));

  useEffect(() => {
    document.body.classList.toggle('dense', tweaks.density === 'dense');
    document.body.classList.toggle('no-mascot', !tweaks.mascot);
    document.body.classList.toggle('dark', !!tweaks.darkMode);
  }, [tweaks.density, tweaks.mascot, tweaks.darkMode]);

  const [showCallouts, setShowCallouts] = useState(true);
  const [progress, setProgressRaw] = useState(loadProgress);
  const [activeLesson, setActiveLesson] = useState(null);

  useEffect(() => {
    [1,2,3,4].forEach(g => document.body.classList.remove('grade-' + g));
    if (progress.grade) document.body.classList.add('grade-' + progress.grade);
  }, [progress.grade]);
  const [toast, setToast] = useState(null);

  const setProgress = (updater) => {
    setProgressRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveProgress(next);
      return next;
    });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleLessonComplete = ({ lessonId, correct, total, stars, xp }) => {
    const parts = lessonId.split('-');
    const subjectId = parts[0];
    const lessonNum = parseInt(parts[1], 10);
    setProgress(prev => {
      const defaultOf = { math:12, kaz:12, world:8, eng:2 }[subjectId] ?? 12;
      const subj = prev[subjectId] || { lesson: lessonNum, stars: 0, of: defaultOf };
      const advancing = lessonNum >= subj.lesson;
      const newLesson = advancing ? Math.min(subj.of, lessonNum + 1) : subj.lesson;
      const newStars  = advancing ? Math.max(subj.stars, stars) : subj.stars;
      const newXP     = prev.totalXP + xp;
      const newQuests = [...prev.questsDone];
      newQuests[0] = true;
      if (subjectId === 'kaz'   && !newQuests[1]) newQuests[1] = true;
      if (subjectId === 'math'  && !newQuests[2]) newQuests[2] = true;

      // Real streak calculation
      const now = new Date();
      const todayStr = now.toDateString();
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      const lastStr = prev.lastPlayed ? new Date(prev.lastPlayed).toDateString() : null;
      let newStreak = prev.streak || 0;
      if (lastStr === todayStr) {
        // already played today, streak unchanged
      } else if (lastStr === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      return {
        ...prev,
        [subjectId]: { ...subj, lesson: newLesson, stars: newStars },
        totalXP: newXP,
        level: Math.floor(newXP / 100) + 1,
        streak: newStreak,
        lastPlayed: now.toISOString(),
        lastSubjectId: subjectId,
        questsDone: newQuests,
      };
    });
    showToast(`+${xp} XP`);
  };

  // ── Onboarding ──
  if (!progress.name || !progress.grade) {
    return (
      <OnboardingScreen onDone={(name, lang, grade) => {
        setProgress(p => ({ ...p, name, grade }));
        setTweak('language', lang);
      }} />
    );
  }

  // ── Active lesson ──
  if (activeLesson) {
    return (
      <>
        <LessonRunner
          lessonId={activeLesson}
          lang={tweaks.language}
          onClose={() => setActiveLesson(null)}
          onComplete={handleLessonComplete}
        />
        {toast && <div className="toast"><div className="ic">⚡</div><span>{toast}</span></div>}
      </>
    );
  }

  // ── Home screen ──
  return (
    <>
      <HomeView
        tweaks={tweaks} setTweak={setTweak}
        progress={progress} setProgress={setProgress}
        onStartLesson={(id) => setActiveLesson(id)}
        showToast={showToast}
      />
      {toast && <div className="toast"><div className="ic">⚡</div><span>{toast}</span></div>}

      {showCallouts && (
        <div className="callouts">
          <span className="x" onClick={() => setShowCallouts(false)}>✕</span>
          <h4>Try it</h4>
          <ul>
            <li>Tap the green "Continue" card</li>
            <li>Or tap Математика / Қазақ тілі</li>
            <li>Solve 6–10 problems · earn ★ + XP</li>
            <li>Progress saves automatically</li>
          </ul>
        </div>
      )}

      {TweaksPanel && (
        <TweaksPanel title="Tweaks">
          <TweakSection title="Language">
            <TweakSelect label="UI language" value={tweaks.language} onChange={(v) => setTweak('language', v)}
              options={[{value:'kk',label:'Қазақша'},{value:'ru',label:'Русский'},{value:'en',label:'English'}]} />
          </TweakSection>
          <TweakSection title="Personality">
            <TweakToggle label="Mascot" value={tweaks.mascot} onChange={(v) => setTweak('mascot', v)} />
            <TweakToggle label="Dark mode" value={tweaks.darkMode} onChange={(v) => setTweak('darkMode', v)} />
            <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweak('density', v)}
              options={[{value:'comfortable',label:'Comfortable'},{value:'dense',label:'Dense'}]} />
            <TweakToggle label="Show callouts" value={showCallouts} onChange={(v) => setShowCallouts(v)} />
          </TweakSection>
          <TweakSection title="Progress">
            <TweakButton label="Reset progress" onClick={() => {
              localStorage.removeItem(PROGRESS_KEY);
              setProgressRaw(DEFAULT_PROGRESS);
              showToast('Progress reset');
            }} />
            <TweakButton label="Change name" onClick={() => {
              setProgress(p => ({ ...p, name: '' }));
            }} />
          </TweakSection>
          <TweakSection title="A/B Tests">
            {Object.entries(AB_TESTS).map(([id, cfg]) => {
              const cur = getVariant(id);
              return (
                <TweakRow key={id} label={cfg.desc}>
                  <div style={{ display:'flex', gap:4 }}>
                    {cfg.variants.map(v => (
                      <button key={v} onClick={() => { forceVariant(id, v); window.location.reload(); }}
                        style={{ padding:'3px 12px', borderRadius:8,
                          border: cur === v ? '2px solid var(--brand)' : '1.5px solid var(--line)',
                          background: cur === v ? 'var(--brand)' : 'transparent',
                          color: cur === v ? '#fff' : 'var(--ink)',
                          cursor:'pointer', fontSize:12, fontWeight:700 }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </TweakRow>
              );
            })}
          </TweakSection>
        </TweaksPanel>
      )}
    </>
  );
}

// ─── Export for sequential loader ──────────────────────────────────
window.App = App;
