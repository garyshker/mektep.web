// Lesson Runner — interactive lesson player for Mektep
const { useState, useEffect, useRef, useMemo } = React;

// ────────────────────────────────────────────────────────────────────
// SOUND SYSTEM  (Web Audio API — no external files)
// ────────────────────────────────────────────────────────────────────

function _tone(freq, type, vol, start, dur, ctx) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.start(start); o.stop(start + dur + 0.05);
}

function soundCorrect() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    _tone(523, 'sine', 0.25, ctx.currentTime,       0.12, ctx);
    _tone(659, 'sine', 0.25, ctx.currentTime + 0.10, 0.15, ctx);
    _tone(784, 'sine', 0.25, ctx.currentTime + 0.22, 0.20, ctx);
  } catch(e) {}
}

function soundWrong() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    _tone(300, 'sawtooth', 0.18, ctx.currentTime,       0.10, ctx);
    _tone(220, 'sawtooth', 0.18, ctx.currentTime + 0.12, 0.18, ctx);
  } catch(e) {}
}

function soundComplete() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => _tone(f, 'sine', 0.2, ctx.currentTime + i * 0.13, 0.25, ctx));
  } catch(e) {}
}

function soundTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    _tone(1046, 'sine', 0.1, ctx.currentTime, 0.07, ctx);
  } catch(e) {}
}

// ────────────────────────────────────────────────────────────────────
// RESUME  (save/restore mid-lesson to localStorage)
// ────────────────────────────────────────────────────────────────────

const RESUME_KEY = 'mektep_resume_v1';
const RESUME_TTL = 24 * 60 * 60 * 1000;

function saveResume(state) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify({ ...state, ts: Date.now() })); } catch(e) {}
}
function loadResume(lessonId) {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (r.lessonId !== lessonId) return null;
    if (Date.now() - r.ts > RESUME_TTL) { localStorage.removeItem(RESUME_KEY); return null; }
    return r;
  } catch(e) { return null; }
}
function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch(e) {}
}

// ────────────────────────────────────────────────────────────────────
// LESSON CONTENT
// ────────────────────────────────────────────────────────────────────

const LESSONS = {

  // ─── Math · Lesson 1 — Addition within 100 ───
  "math-1": {
    id:"math-1", subjectId:"math",
    titleByLang:{ kk:"Қосу · 100 ішінде", ru:"Сложение · в пределах 100", en:"Addition · within 100" },
    introByLang:{ kk:"100-ге дейінгі сандарды қосуды үйренеміз!", ru:"Учимся складывать числа в пределах 100!", en:"Let's practise adding numbers within 100!" },
    questions:[
      { kind:"mc", big:true, prompt:"36 + 24", options:["58","60","62","64"], answer:1,
        explainByLang:{ kk:"36 + 20 = 56\n56 + 4 = 60 ✓", ru:"36 + 20 = 56\n56 + 4 = 60 ✓", en:"36 + 20 = 56\n56 + 4 = 60 ✓" } },
      { kind:"type", prompt:"45 + 18 = ?", answer:63,
        explainByLang:{ kk:"45 + 10 = 55\n55 + 8 = 63 ✓", ru:"45 + 10 = 55\n55 + 8 = 63 ✓", en:"45 + 10 = 55\n55 + 8 = 63 ✓" } },
      { kind:"mc", big:true, prompt:"27 + 35", options:["58","60","62","64"], answer:2,
        explainByLang:{ kk:"27 + 30 = 57\n57 + 5 = 62 ✓", ru:"27 + 30 = 57\n57 + 5 = 62 ✓", en:"27 + 30 = 57\n57 + 5 = 62 ✓" } },
      { kind:"type", prompt:"54 + 27 = ?", answer:81,
        explainByLang:{ kk:"54 + 20 = 74\n74 + 7 = 81 ✓", ru:"54 + 20 = 74\n74 + 7 = 81 ✓", en:"54 + 20 = 74\n74 + 7 = 81 ✓" } },
      { kind:"tap",
        promptByLang:{ kk:"Жауабы 10-нан үлкен болатын мысалдарды тап", ru:"Найди примеры, где сумма больше 10", en:"Tap the sums greater than 10" },
        words:["3+5","4+8","2+6","7+9","1+3","6+7","2+2","5+3"], correctIdxs:[1,3,5] },
      { kind:"type", prompt:"63 + 19 = ?", answer:82,
        explainByLang:{ kk:"63 + 10 = 73\n73 + 9 = 82 ✓", ru:"63 + 10 = 73\n73 + 9 = 82 ✓", en:"63 + 10 = 73\n73 + 9 = 82 ✓" } },
      { kind:"word", image:"🍎🍐",
        storyByLang:{ kk:"Дүкенде 45 алма мен 38 алмұрт бар. Барлығы қанша жеміс?", ru:"В магазине 45 яблок и 38 груш. Сколько всего фруктов?", en:"A shop has 45 apples and 38 pears. How many fruits total?" },
        options:["73","83","85","87"], answer:1 },
      { kind:"type", prompt:"48 + 36 = ?", answer:84,
        explainByLang:{ kk:"48 + 30 = 78\n78 + 6 = 84 ✓", ru:"48 + 30 = 78\n78 + 6 = 84 ✓", en:"48 + 30 = 78\n78 + 6 = 84 ✓" } },
      { kind:"mc", big:true, prompt:"57 + 25", options:["78","80","82","84"], answer:2,
        explainByLang:{ kk:"57 + 20 = 77\n77 + 5 = 82 ✓", ru:"57 + 20 = 77\n77 + 5 = 82 ✓", en:"57 + 20 = 77\n77 + 5 = 82 ✓" } },
      { kind:"word",
        storyByLang:{ kk:"Аружанда 32 теңге, Болатта 46 теңге бар. Барлығы қанша?", ru:"У Аружан 32 тенге, у Болата 46 тенге. Сколько вместе?", en:"Aruzhan has 32 tenge, Bolat has 46 tenge. Total?" },
        options:["72 ₸","76 ₸","78 ₸","82 ₸"], answer:2 },
    ]
  },

  // ─── Math · Lesson 2 — Subtraction within 100 ───
  "math-2": {
    id:"math-2", subjectId:"math",
    titleByLang:{ kk:"Алу · 100 ішінде", ru:"Вычитание · в пределах 100", en:"Subtraction · within 100" },
    introByLang:{ kk:"100-ге дейінгі сандарды алуды үйренеміз!", ru:"Учимся вычитать в пределах 100!", en:"Let's practise subtraction within 100!" },
    questions:[
      { kind:"mc", big:true, prompt:"45 − 18", options:["23","25","27","29"], answer:2,
        explainByLang:{ kk:"45 − 10 = 35\n35 − 8 = 27 ✓", ru:"45 − 10 = 35\n35 − 8 = 27 ✓", en:"45 − 10 = 35\n35 − 8 = 27 ✓" } },
      { kind:"type", prompt:"80 − 37 = ?", answer:43,
        explainByLang:{ kk:"80 − 30 = 50\n50 − 7 = 43 ✓", ru:"80 − 30 = 50\n50 − 7 = 43 ✓", en:"80 − 30 = 50\n50 − 7 = 43 ✓" } },
      { kind:"mc", big:true, prompt:"73 − 29", options:["40","42","44","46"], answer:2,
        explainByLang:{ kk:"73 − 20 = 53\n53 − 9 = 44 ✓", ru:"73 − 20 = 53\n53 − 9 = 44 ✓", en:"73 − 20 = 53\n53 − 9 = 44 ✓" } },
      { kind:"type", prompt:"91 − 54 = ?", answer:37,
        explainByLang:{ kk:"91 − 50 = 41\n41 − 4 = 37 ✓", ru:"91 − 50 = 41\n41 − 4 = 37 ✓", en:"91 − 50 = 41\n41 − 4 = 37 ✓" } },
      { kind:"tap",
        promptByLang:{ kk:"Жауабы жұп болатын мысалдарды тап", ru:"Найди примеры с чётным ответом", en:"Tap examples with an even answer" },
        words:["50−17","60−22","80−45","40−16","70−31","90−64"], correctIdxs:[1,3,5] },
      { kind:"type", prompt:"64 − 28 = ?", answer:36,
        explainByLang:{ kk:"64 − 20 = 44\n44 − 8 = 36 ✓", ru:"64 − 20 = 44\n44 − 8 = 36 ✓", en:"64 − 20 = 44\n44 − 8 = 36 ✓" } },
      { kind:"word",
        storyByLang:{ kk:"Айданада 50 теңге болды. Ол нанға 23 теңге жұмсады. Қанша қалды?", ru:"У Айданы было 50 тенге. Она купила хлеб за 23 тенге. Сколько осталось?", en:"Aidana had 50 tenge. She bought bread for 23 tenge. How much is left?" },
        options:["21 ₸","23 ₸","27 ₸","29 ₸"], answer:2 },
      { kind:"type", prompt:"100 − 63 = ?", answer:37,
        explainByLang:{ kk:"100 − 60 = 40\n40 − 3 = 37 ✓", ru:"100 − 60 = 40\n40 − 3 = 37 ✓", en:"100 − 60 = 40\n40 − 3 = 37 ✓" } },
      { kind:"mc", big:true, prompt:"82 − 47", options:["31","33","35","37"], answer:2,
        explainByLang:{ kk:"82 − 40 = 42\n42 − 7 = 35 ✓", ru:"82 − 40 = 42\n42 − 7 = 35 ✓", en:"82 − 40 = 42\n42 − 7 = 35 ✓" } },
      { kind:"word",
        storyByLang:{ kk:"Сыныпта 32 оқушы болды. 15 оқушы үйде қалды. Сыныпта қанша оқушы?", ru:"В классе 32 ученика. 15 заболели. Сколько в классе?", en:"There were 32 pupils. 15 stayed home. How many in class?" },
        options:["13","15","17","19"], answer:2 },
    ]
  },

  // ─── Math · Lesson 3 — ×2 times table ───
  "math-3": {
    id:"math-3", subjectId:"math",
    titleByLang:{ kk:"Көбейту кестесі · 2-ге", ru:"Таблица умножения · на 2", en:"Times Tables · ×2" },
    introByLang:{ kk:"2-ге көбейтуді үйренеміз!", ru:"Учим умножение на 2!", en:"Let's learn the 2 times table!" },
    questions:[
      { kind:"mc", big:true, prompt:"2 × 3", options:["4","5","6","8"], answer:2 },
      { kind:"mc", big:true, prompt:"2 × 4", options:["6","8","10","12"], answer:1 },
      { kind:"type", prompt:"2 × 5 = ?", answer:10 },
      { kind:"mc", big:true, prompt:"2 × 6", options:["10","11","12","14"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"2-нің көбейтінділерін тап (жұп сандар)", ru:"Найди произведения числа 2 (чётные)", en:"Tap all multiples of 2 (even numbers)" },
        words:["4","7","8","11","12","15","16","19"], correctIdxs:[0,2,4,6] },
      { kind:"type", prompt:"2 × 7 = ?", answer:14 },
      { kind:"mc", big:true, prompt:"2 × 8", options:["14","15","16","18"], answer:2 },
      { kind:"word", image:"🚲🚲",
        storyByLang:{ kk:"Айдардың 2 велосипеді бар. Әр велосипедтің 2 дөңгелегі. Барлығы қанша дөңгелек?", ru:"У Айдара 2 велосипеда. У каждого по 2 колеса. Сколько колёс?", en:"Aidar has 2 bicycles, each with 2 wheels. How many wheels?" },
        options:["2","3","4","6"], answer:2 },
      { kind:"type", prompt:"2 × 9 = ?", answer:18 },
      { kind:"mc", big:true, prompt:"2 × 10", options:["18","20","22","100"], answer:1 },
    ]
  },

  // ─── Math · Lesson 4 — ×3 times table ───
  "math-4": {
    id:"math-4", subjectId:"math",
    titleByLang:{ kk:"Көбейту кестесі · 3-ке", ru:"Таблица умножения · на 3", en:"Times Tables · ×3" },
    introByLang:{ kk:"3-ке көбейтуді үйренеміз!", ru:"Учим умножение на 3!", en:"Let's learn the 3 times table!" },
    questions:[
      { kind:"mc", big:true, prompt:"3 × 3", options:["7","8","9","12"], answer:2 },
      { kind:"mc", big:true, prompt:"3 × 4", options:["9","10","12","15"], answer:2 },
      { kind:"type", prompt:"3 × 5 = ?", answer:15 },
      { kind:"mc", big:true, prompt:"3 × 6", options:["15","16","18","21"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"3-тің көбейтінділерін тап", ru:"Найди произведения числа 3", en:"Tap all multiples of 3" },
        words:["4","6","7","9","11","12","14","15"], correctIdxs:[1,3,5,7] },
      { kind:"type", prompt:"3 × 7 = ?", answer:21 },
      { kind:"mc", big:true, prompt:"3 × 8", options:["20","22","24","27"], answer:2 },
      { kind:"word", image:"🏠🪟",
        storyByLang:{ kk:"Үйде 3 қатар терезе. Әр қатарда 4 терезе. Барлығы қанша терезе?", ru:"В доме 3 ряда окон, в каждом по 4. Сколько окон?", en:"A house has 3 rows of 4 windows each. How many windows?" },
        options:["8","10","12","15"], answer:2 },
      { kind:"type", prompt:"3 × 9 = ?", answer:27 },
      { kind:"mc", big:true, prompt:"3 × 10", options:["27","28","30","33"], answer:2 },
    ]
  },

  // ─── Math · Lesson 5 — ×4 times table ───
  "math-5": {
    id:"math-5", subjectId:"math",
    titleByLang:{ kk:"Көбейту кестесі · 4-ке", ru:"Таблица умножения · на 4", en:"Times Tables · ×4" },
    introByLang:{ kk:"4-ке көбейтуді үйренеміз!", ru:"Учим умножение на 4!", en:"Let's learn the 4 times table!" },
    questions:[
      { kind:"mc", big:true, prompt:"4 × 2", options:["6","7","8","10"], answer:2 },
      { kind:"mc", big:true, prompt:"4 × 3", options:["10","11","12","14"], answer:2 },
      { kind:"type", prompt:"4 × 4 = ?", answer:16 },
      { kind:"mc", big:true, prompt:"4 × 5", options:["16","18","20","22"], answer:2 },
      { kind:"type", prompt:"4 × 6 = ?", answer:24 },
      { kind:"tap",
        promptByLang:{ kk:"4-тің көбейтінділерін тап", ru:"Найди произведения числа 4", en:"Tap all multiples of 4" },
        words:["8","9","12","14","16","18","20","22"], correctIdxs:[0,2,4,6] },
      { kind:"mc", big:true, prompt:"4 × 7", options:["24","26","28","30"], answer:2 },
      { kind:"type", prompt:"4 × 8 = ?", answer:32 },
      { kind:"mc", big:true, prompt:"4 × 9", options:["32","34","36","40"], answer:2 },
      { kind:"word", image:"🍪🍪🍪🍪",
        storyByLang:{ kk:"Столда 4 кесе тұр. Әр кеседе 4 печенье. Барлығы қанша печенье?", ru:"На столе 4 чашки, в каждой по 4 печенья. Сколько всего?", en:"There are 4 cups with 4 cookies each. How many cookies total?" },
        options:["12","14","16","18"], answer:2 },
    ]
  },

  // ─── Math · Lesson 6 — ×5 times table ───
  "math-6": {
    id:"math-6", subjectId:"math",
    titleByLang:{ kk:"Көбейту кестесі · 5-ке", ru:"Таблица умножения · на 5", en:"Times Tables · ×5" },
    introByLang:{ kk:"5-ке көбейтуді үйренеміз!", ru:"Учим умножение на 5!", en:"Let's learn the 5 times table!" },
    questions:[
      { kind:"mc", big:true, prompt:"5 × 2", options:["8","9","10","12"], answer:2 },
      { kind:"mc", big:true, prompt:"5 × 3", options:["12","13","15","18"], answer:2 },
      { kind:"type", prompt:"5 × 4 = ?", answer:20 },
      { kind:"mc", big:true, prompt:"5 × 5", options:["20","23","25","30"], answer:2 },
      { kind:"type", prompt:"5 × 6 = ?", answer:30 },
      { kind:"tap",
        promptByLang:{ kk:"5-тің көбейтінділерін тап (0 немесе 5-ке аяқталатын)", ru:"Найди произведения числа 5 (оканчиваются на 0 или 5)", en:"Tap multiples of 5 (end in 0 or 5)" },
        words:["10","12","15","18","20","22","25","27"], correctIdxs:[0,2,4,6] },
      { kind:"mc", big:true, prompt:"5 × 7", options:["30","33","35","40"], answer:2 },
      { kind:"type", prompt:"5 × 8 = ?", answer:40 },
      { kind:"mc", big:true, prompt:"5 × 9", options:["40","43","45","50"], answer:2 },
      { kind:"word", image:"✏️✏️✏️✏️✏️",
        storyByLang:{ kk:"Партада 5 бала отыр. Әр баланың 5 қаламы бар. Барлығы қанша қалам?", ru:"За партой 5 детей, у каждого 5 карандашей. Сколько карандашей?", en:"5 children each have 5 pencils. How many pencils in total?" },
        options:["20","25","30","35"], answer:1 },
    ]
  },

  // ─── Math · Lesson 7 — ×6 times table ───
  "math-7": {
    id:"math-7", subjectId:"math",
    titleByLang:{ kk:"Көбейту кестесі · 6-ға", ru:"Таблица умножения · на 6", en:"Times Tables · ×6" },
    introByLang:{ kk:"6-ға көбейтуді үйренеміз!", ru:"Учим умножение на 6!", en:"Let's learn the 6 times table!" },
    questions:[
      { kind:"mc", big:true, prompt:"6 × 2", options:["10","11","12","14"], answer:2 },
      { kind:"mc", big:true, prompt:"6 × 3", options:["15","16","18","21"], answer:2 },
      { kind:"type", prompt:"6 × 4 = ?", answer:24 },
      { kind:"mc", big:true, prompt:"6 × 5", options:["25","28","30","35"], answer:2 },
      { kind:"type", prompt:"6 × 6 = ?", answer:36 },
      { kind:"tap",
        promptByLang:{ kk:"6-ның көбейтінділерін тап", ru:"Найди произведения числа 6", en:"Tap all multiples of 6" },
        words:["12","14","18","20","24","25","30","35"], correctIdxs:[0,2,4,6] },
      { kind:"mc", big:true, prompt:"6 × 7", options:["36","40","42","45"], answer:2 },
      { kind:"type", prompt:"6 × 8 = ?", answer:48 },
      { kind:"mc", big:true, prompt:"6 × 9", options:["48","52","54","60"], answer:2 },
      { kind:"word", image:"🥚🥚🥚🥚🥚🥚",
        storyByLang:{ kk:"Алты қорапта тауықтың жұмыртқасы бар. Әр қорапта 6 жұмыртқа. Барлығы қанша?", ru:"В 6 коробках по 6 яиц. Сколько всего яиц?", en:"6 boxes each hold 6 eggs. How many eggs altogether?" },
        options:["30","34","36","40"], answer:2 },
    ]
  },

  // ─── Math · Lesson 8 — ÷2 division ───
  "math-8": {
    id:"math-8", subjectId:"math",
    titleByLang:{ kk:"Бөлу · 2-ге", ru:"Деление · на 2", en:"Division · ÷2" },
    introByLang:{ kk:"2-ге бөлуді үйренеміз!", ru:"Учимся делить на 2!", en:"Let's practise dividing by 2!" },
    questions:[
      { kind:"mc", big:true, prompt:"10 ÷ 2", options:["3","4","5","6"], answer:2 },
      { kind:"type", prompt:"16 ÷ 2 = ?", answer:8 },
      { kind:"mc", big:true, prompt:"14 ÷ 2", options:["5","6","7","8"], answer:2 },
      { kind:"type", prompt:"20 ÷ 2 = ?", answer:10 },
      { kind:"tap",
        promptByLang:{ kk:"2-ге тең бөлінетін сандарды тап", ru:"Найди числа, которые делятся на 2 ровно", en:"Tap numbers divisible by 2" },
        words:["8","9","12","13","18","19","22","25"], correctIdxs:[0,2,4,6] },
      { kind:"type", prompt:"18 ÷ 2 = ?", answer:9 },
      { kind:"word", image:"🍬🍬🍬🍬🍬🍬  🍬🍬🍬🍬🍬🍬",
        storyByLang:{ kk:"Асыл 12 конфет тапты. Ол Ерланмен тең бөлісті. Асылда қанша конфет қалды?", ru:"Асыл нашёл 12 конфет и поровну поделился с Ерланом. Сколько у Асыла?", en:"Asyl found 12 sweets and shared equally with Erlan. How many does Asyl keep?" },
        options:["4","5","6","7"], answer:2 },
      { kind:"type", prompt:"24 ÷ 2 = ?", answer:12 },
    ]
  },

  // ─── Math · Lesson 9 — Comparing numbers ───
  "math-9": {
    id:"math-9", subjectId:"math",
    titleByLang:{ kk:"Сандарды салыстыру · < > =", ru:"Сравнение чисел · < > =", en:"Comparing Numbers · < > =" },
    introByLang:{ kk:"Екі таңбалы сандарды салыстыруды үйренеміз!", ru:"Учимся сравнивать двузначные числа!", en:"Let's learn to compare two-digit numbers!" },
    questions:[
      { kind:"mc", big:true, image:"🔢",
        promptByLang:{ kk:"47 __ 74 — қай белгі дұрыс?", ru:"47 __ 74 — какой знак верный?", en:"47 __ 74 — which sign is correct?" },
        options:["47 > 74","47 = 74","47 < 74","47 ≠ 74"], answer:2 },
      { kind:"mc", big:true,
        promptByLang:{ kk:"56 __ 65 — қай белгі дұрыс?", ru:"56 __ 65 — какой знак?", en:"56 __ 65 — which sign?" },
        options:["56 > 65","56 < 65","56 = 65","56 ≥ 65"], answer:1 },
      { kind:"tap", image:"📊",
        promptByLang:{ kk:"50-ден үлкен сандарды тап", ru:"Найди числа, которые больше 50", en:"Tap the numbers greater than 50" },
        words:["38","63","47","71","50","85","29","54"], correctIdxs:[1,3,5,7] },
      { kind:"mc", big:true,
        promptByLang:{ kk:"Қай теңдік дұрыс?", ru:"Какое равенство верное?", en:"Which equality is correct?" },
        options:["30 + 20 = 40","20 + 30 = 50","50 + 10 = 70","40 + 20 = 70"], answer:1 },
      { kind:"match", image:"⚖️",
        promptByLang:{ kk:"Санды дұрыс топқа орналастыр", ru:"Раздели числа на группы", en:"Sort numbers into the correct group" },
        groupsByLang:{ kk:["50-ден кіші","50-ден үлкен"], ru:["Меньше 50","Больше 50"], en:["Less than 50","Greater than 50"] },
        items:[
          { text:"37", group:0 },
          { text:"82", group:1 },
          { text:"49", group:0 },
          { text:"61", group:1 },
          { text:"25", group:0 },
          { text:"99", group:1 },
        ] },
      { kind:"word", image:"🛒",
        storyByLang:{ kk:"Нанның бағасы 65 теңге, сүттің бағасы 56 теңге. Қайсысы қымбат?", ru:"Хлеб стоит 65 тенге, молоко — 56 тенге. Что дороже?", en:"Bread costs 65 tenge, milk costs 56 tenge. Which is more expensive?" },
        options:["Сүт / Молоко / Milk","Нан / Хлеб / Bread","Бірдей / Одинаково / Same","Білмеймін / Не знаю / Don't know"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"Саны жазылсын: жиырма үш", ru:"Запиши число: двадцать три", en:"Write the number: twenty-three" },
        answer:23 },
      { kind:"mc", big:true,
        promptByLang:{ kk:"Ең үлкен санды тап", ru:"Найди наибольшее число", en:"Find the greatest number" },
        options:["78","87","77","88"], answer:3 },
    ]
  },

  // ─── Math · Lesson 10 — Length: cm, dm, m ───
  "math-10": {
    id:"math-10", subjectId:"math",
    titleByLang:{ kk:"Ұзындық · см, дм, м", ru:"Длина · см, дм, м", en:"Length · cm, dm, m" },
    introByLang:{ kk:"Сантиметр, дециметр және метрді үйренеміз!", ru:"Изучаем сантиметры, дециметры и метры!", en:"Let's learn centimetres, decimetres and metres!" },
    questions:[
      { kind:"mc", image:"📏",
        promptByLang:{ kk:"1 дм = қанша сантиметр?", ru:"1 дм = сколько сантиметров?", en:"1 dm = how many centimetres?" },
        options:["1 см","5 см","10 см","100 см"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"1 м = қанша дециметр?", ru:"1 м = сколько дециметров?", en:"1 m = how many decimetres?" },
        options:["5 дм","10 дм","100 дм","1000 дм"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"3 дм = ? см", ru:"3 дм = ? см", en:"3 dm = ? cm" },
        answer:30 },
      { kind:"tap", image:"📐",
        promptByLang:{ kk:"Сантиметрмен өлшейтін заттарды тап", ru:"Найди предметы, которые измеряют в сантиметрах", en:"Tap things usually measured in centimetres" },
        words:["қарандаш / карандаш","автобус / автобус","сызғыш / линейка","Алатау / Алатау","кітап / книга","дала / поле"],
        correctIdxs:[0,2,4] },
      { kind:"mc",
        promptByLang:{ kk:"50 см = қанша дециметр?", ru:"50 см = сколько дециметров?", en:"50 cm = how many decimetres?" },
        options:["5 дм","10 дм","50 дм","500 дм"], answer:0 },
      { kind:"word", image:"📏✏️",
        storyByLang:{ kk:"Асылдың қаламы 15 см. Сызғышы 2 дм. Сызғыш қанша сантиметрге ұзын?", ru:"Карандаш Асыла — 15 см, линейка — 2 дм. На сколько см линейка длиннее?", en:"Asyl's pencil is 15 cm, ruler is 2 dm. How many cm longer is the ruler?" },
        options:["3 см","5 см","7 см","10 см"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"2 м = ? дм", ru:"2 м = ? дм", en:"2 m = ? dm" },
        answer:20 },
      { kind:"match", image:"📐📏",
        promptByLang:{ kk:"Заттарды өлшем бірлігіне сай топтастыр", ru:"Сгруппируй предметы по единице измерения", en:"Group objects by the unit you'd use to measure them" },
        groupsByLang:{ kk:["Сантиметр (см)","Метр (м)"], ru:["Сантиметры (см)","Метры (м)"], en:["Centimetres (cm)","Metres (m)"] },
        items:[
          { text:"қалам / карандаш", group:0 },
          { text:"бөлме / комната",  group:1 },
          { text:"саусақ / палец",   group:0 },
          { text:"жол / дорога",     group:1 },
        ] },
    ]
  },

  // ─── Math · Lesson 11 — Volume (litres) & Mass (kg) ───
  "math-11": {
    id:"math-11", subjectId:"math",
    titleByLang:{ kk:"Көлем мен масса · литр, кг", ru:"Объём и масса · литр, кг", en:"Volume & Mass · litre, kg" },
    introByLang:{ kk:"Литр мен килограммды үйренеміз!", ru:"Изучаем литры и килограммы!", en:"Let's learn litres and kilograms!" },
    questions:[
      { kind:"mc", image:"🥛",
        promptByLang:{ kk:"Сүттің 2 литрлік 2 шөлмегі бар. Барлығы қанша литр?", ru:"Есть 2 бутылки молока по 2 литра. Сколько всего литров?", en:"There are 2 bottles of milk, 2 litres each. Total litres?" },
        options:["2","3","4","6"], answer:2 },
      { kind:"tap", image:"🍶💧",
        promptByLang:{ kk:"Литрмен өлшейтін заттарды тап", ru:"Найди то, что измеряют в литрах", en:"Tap things measured in litres" },
        words:["шай / чай","алма / яблоко","су / вода","кітап / книга","сүт / молоко","қалам / карандаш"],
        correctIdxs:[0,2,4] },
      { kind:"mc", image:"⚖️",
        promptByLang:{ kk:"1 кг = қанша грамм?", ru:"1 кг = сколько граммов?", en:"1 kg = how many grams?" },
        options:["10 г","100 г","1000 г","10 000 г"], answer:2 },
      { kind:"type",
        promptByLang:{ kk:"Шелекке 5 л су сыйды. 3 шелек су = ? литр", ru:"В ведро входит 5 л воды. 3 ведра = ? л", en:"A bucket holds 5 L. 3 buckets = ? litres" },
        answer:15 },
      { kind:"word", image:"🍉",
        storyByLang:{ kk:"Қарбыз 4 кг, алма 2 кг. Барлық жемістің массасы қанша?", ru:"Арбуз весит 4 кг, яблоки — 2 кг. Сколько весят все фрукты?", en:"A watermelon weighs 4 kg, apples 2 kg. What is the total mass?" },
        options:["5 кг","6 кг","7 кг","8 кг"], answer:1 },
      { kind:"match", image:"🏪",
        promptByLang:{ kk:"Тауарды өлшем бірлігіне сай топтастыр", ru:"Сгруппируй товары по единице измерения", en:"Group items by measurement unit" },
        groupsByLang:{ kk:["Литр (л)","Килограмм (кг)"], ru:["Литр (л)","Килограмм (кг)"], en:["Litre (L)","Kilogram (kg)"] },
        items:[
          { text:"сүт / молоко",    group:0 },
          { text:"ұн / мука",       group:1 },
          { text:"шырын / сок",     group:0 },
          { text:"ет / мясо",       group:1 },
          { text:"бензин / бензин", group:0 },
          { text:"картоп / картошка", group:1 },
        ] },
      { kind:"word", image:"🛍️",
        storyByLang:{ kk:"Нурлан базардан 3 кг алма мен 2 кг алмұрт сатып алды. Ол 30 теңгеден 1 кг алма сатып алды. Барлық жемістің салмағы қанша?", ru:"Нурлан купил 3 кг яблок и 2 кг груш. Сколько кг фруктов он купил всего?", en:"Nurlan bought 3 kg of apples and 2 kg of pears. What is the total mass of fruit?" },
        options:["4 кг","5 кг","6 кг","7 кг"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"Аквариумда 10 л су бар еді. 3 л буланды. Қанша л қалды?", ru:"В аквариуме было 10 л воды. Испарилось 3 л. Сколько осталось?", en:"An aquarium had 10 L of water. 3 L evaporated. How many litres remain?" },
        answer:7 },
    ]
  },

  // ─── Math · Lesson 12 — Division ÷3, ÷4, ÷5 ───
  "math-12": {
    id:"math-12", subjectId:"math",
    titleByLang:{ kk:"Бөлу · 3-ке, 4-ке, 5-ке", ru:"Деление · на 3, 4, 5", en:"Division · ÷3, ÷4, ÷5" },
    introByLang:{ kk:"3-ке, 4-ке, 5-ке бөлуді үйренеміз!", ru:"Учимся делить на 3, 4 и 5!", en:"Let's practise dividing by 3, 4 and 5!" },
    questions:[
      { kind:"mc", big:true, image:"➗",
        promptByLang:{ kk:"15 ÷ 3 = ?", ru:"15 ÷ 3 = ?", en:"15 ÷ 3 = ?" },
        options:["3","4","5","6"], answer:2 },
      { kind:"mc", big:true,
        promptByLang:{ kk:"20 ÷ 4 = ?", ru:"20 ÷ 4 = ?", en:"20 ÷ 4 = ?" },
        options:["4","5","6","7"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"25 ÷ 5 = ?", ru:"25 ÷ 5 = ?", en:"25 ÷ 5 = ?" },
        answer:5 },
      { kind:"tap", image:"🔢",
        promptByLang:{ kk:"3-ке тең бөлінетін сандарды тап", ru:"Найди числа, делящиеся на 3 без остатка", en:"Tap numbers divisible by 3" },
        words:["9","10","12","14","15","16","18","20"], correctIdxs:[0,2,4,6] },
      { kind:"mc", big:true,
        promptByLang:{ kk:"24 ÷ 4 = ?", ru:"24 ÷ 4 = ?", en:"24 ÷ 4 = ?" },
        options:["5","6","7","8"], answer:1 },
      { kind:"word", image:"🎒📓",
        storyByLang:{ kk:"Мұғалім 15 дәптерді 3 топқа тең бөлді. Әр топта қанша дәптер?", ru:"Учитель разделил 15 тетрадей поровну на 3 группы. Сколько тетрадей в каждой группе?", en:"The teacher divided 15 notebooks equally into 3 groups. How many in each group?" },
        options:["3","4","5","6"], answer:2 },
      { kind:"type",
        promptByLang:{ kk:"40 ÷ 5 = ?", ru:"40 ÷ 5 = ?", en:"40 ÷ 5 = ?" },
        answer:8 },
      { kind:"word", image:"🍭🍭🍭🍭",
        storyByLang:{ kk:"Айгерімнің 20 карамелі бар. Ол 4 досымен тең бөлісті. Айгерімнің өзінде қанша карамель қалды?", ru:"У Айгерим 20 карамелей. Она поровну поделила их с 4 подругами. По сколько досталось каждой?", en:"Aigerim has 20 sweets and shares them equally with 4 friends. How many does each person get?" },
        options:["3","4","5","6"], answer:1 },
    ]
  },

  // ─── Kazakh · Lesson 1 — Special letters of Kazakh alphabet ───
  "kaz-1": {
    id:"kaz-1", subjectId:"kaz",
    titleByLang:{ kk:"Қазақ әліпбиі · ерекше әріптер", ru:"Казахский алфавит · особые буквы", en:"Kazakh Alphabet · special letters" },
    introByLang:{ kk:"Қазақ тілінде орыс тілінде жоқ 9 ерекше әріп бар!", ru:"В казахском алфавите 9 особых букв, которых нет в русском!", en:"Kazakh has 9 special letters not found in Russian!" },
    questions:[
      { kind:"tap",
        promptByLang:{ kk:"Қазақ тіліне тән ерекше әріптерді тап", ru:"Найди буквы, уникальные для казахского языка", en:"Tap the letters unique to Kazakh" },
        words:["А","Ә","Б","Ғ","Д","Қ","Л","Ң","Р","Ө","С","Ү","Т","Ұ","Х","Һ"],
        correctIdxs:[1,3,5,7,9,11,13,15] },
      { kind:"mc",
        promptByLang:{ kk:"Қай әріп «ң» дыбысын береді? (мысалы: «таңертең»)", ru:"Какая буква даёт звук «нг» (как в слове «таңертең»)?", en:"Which letter makes the 'ng' sound (as in 'таңертең')?" },
        options:["н","ң","м","ж"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"«Ғ» әрпі қай сөзде кездеседі?", ru:"В каком слове встречается буква «Ғ»?", en:"Which word contains the letter «Ғ»?" },
        options:["гүл","ғылым","газет","гараж"], answer:1 },
      { kind:"match",
        promptByLang:{ kk:"Әріпті оның мысалы бар сөзбен жұптастыр", ru:"Сопоставь букву со словом-примером", en:"Match the letter to a word that contains it" },
        groupsByLang:{ kk:["Жуан","Жіңішке"], ru:["Твёрдый","Мягкий"], en:["Hard","Soft"] },
        items:[
          { text:"Ұ → ұя",  group:0 },
          { text:"Ү → үй",  group:1 },
          { text:"Қ → қар", group:0 },
          { text:"Ң → ән",  group:1 },
          { text:"Ғ → ғана",group:0 },
          { text:"Ө → өрік",group:1 },
        ] },
      { kind:"type",
        promptByLang:{ kk:"«Бала» сөзіндегі дауысты дыбыстар санын жаз", ru:"Сколько гласных в слове «Бала»?", en:"How many vowels are in the word «Бала»?" },
        answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Ән» сөзі қай топқа жатады?", ru:"К какой группе относится слово «Ән»?", en:"Which group does the word «Ән» belong to?" },
        options:["Жуан","Жіңішке","Аралас","Бейтарап"], answer:1 },
    ]
  },

  // ─── Kazakh · Lesson 2 — Syllables (Буын) ───
  "kaz-2": {
    id:"kaz-2", subjectId:"kaz",
    titleByLang:{ kk:"Буын · сөзді бөлу", ru:"Слог · деление слова", en:"Syllables · splitting words" },
    introByLang:{ kk:"Сөзді буынға бөлуді үйренеміз! Әр буында бір дауысты дыбыс болады.", ru:"Учимся делить слова на слоги! В каждом слоге один гласный звук.", en:"Let's learn to split words into syllables! Each syllable has one vowel." },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"«Мек-теп» сөзіндегі буын саны?", ru:"Сколько слогов в слове «Мек-теп»?", en:"How many syllables does «Мек-теп» have?" },
        options:["1","2","3","4"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"«Ана» сөзін дұрыс буынға бөл", ru:"Правильно раздели слово «Ана» на слоги", en:"Correctly split «Ана» into syllables" },
        options:["А-на","Ан-а","А-н-а","Ана"], answer:0 },
      { kind:"tap",
        promptByLang:{ kk:"2 буынды сөздерді тап", ru:"Найди двухсложные слова", en:"Tap the two-syllable words" },
        words:["ат","апа","мектеп","бала","күн","терезе","дос","ана"],
        correctIdxs:[1,3,7] },
      { kind:"mc",
        promptByLang:{ kk:"«Та-ра-зы» сөзінде неше буын бар?", ru:"Сколько слогов в слове «Та-ра-зы»?", en:"How many syllables in «Та-ра-зы»?" },
        options:["1","2","3","4"], answer:2 },
      { kind:"type",
        promptByLang:{ kk:"«Балапан» сөзіндегі буын санын жаз", ru:"Запиши количество слогов в слове «Балапан»", en:"Write the number of syllables in «Балапан»" },
        answer:3 },
      { kind:"word",
        storyByLang:{ kk:"Мұғалім «қалам» сөзін тақтаға жазды. «Қалам» сөзі неше буыннан тұрады?", ru:"Учитель написал слово «қалам» на доске. Сколько в нём слогов?", en:"The teacher wrote «қалам» on the board. How many syllables?" },
        options:["1","2","3","4"], answer:1 },
    ]
  },

  // ─── Kazakh · Lesson 3 — Animals (Жануарлар) ───
  "kaz-3": {
    id:"kaz-3", subjectId:"kaz",
    titleByLang:{ kk:"Жануарлар · сөздік", ru:"Животные · словарь", en:"Animals · vocabulary" },
    introByLang:{ kk:"Жануарлардың қазақша атауларын үйренейік!", ru:"Выучим казахские названия животных!", en:"Let's learn animal names in Kazakh!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"«Жылқы» қазақша нені білдіреді?", ru:"Что означает казахское слово «Жылқы»?", en:"What does the Kazakh word «Жылқы» mean?" },
        options:["Cow","Horse","Sheep","Camel"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"«Horse» қазақша қалай айтылады?", ru:"Как по-казахски «лошадь»?", en:"How do you say 'horse' in Kazakh?" },
        options:["сиыр","түйе","жылқы","қой"], answer:2 },
      { kind:"match",
        promptByLang:{ kk:"Жануарды оның қазақша атауымен жұптастыр", ru:"Сопоставь животное с его казахским названием", en:"Match the animal to its Kazakh name" },
        groupsByLang:{ kk:["Үй жануарлары","Жабайы жануарлар"], ru:["Домашние","Дикие"], en:["Domestic","Wild"] },
        items:[
          { text:"ит",   group:0 },
          { text:"бөрі", group:1 },
          { text:"мысық",group:0 },
          { text:"түлкі",group:1 },
          { text:"сиыр", group:0 },
          { text:"аю",   group:1 },
        ] },
      { kind:"tap",
        promptByLang:{ kk:"Үй жануарларын тап", ru:"Найди домашних животных", en:"Tap the domestic animals" },
        words:["бөрі","ит","аю","мысық","жолбарыс","сиыр","түлкі","қой"],
        correctIdxs:[1,3,5,7] },
      { kind:"mc",
        promptByLang:{ kk:"«Аю» қандай жануар?", ru:"Какое животное «Аю»?", en:"What animal is «Аю»?" },
        options:["Wolf","Fox","Bear","Deer"], answer:2 },
      { kind:"word",
        storyByLang:{ kk:"Зоопаркта жолбарыс, аю, және бөрі бар. Олар қандай жануарлар?", ru:"В зоопарке есть жолбарыс, аю и бөрі. Какие это животные?", en:"The zoo has жолбарыс, аю and бөрі. What kind of animals are they?" },
        options:["Үй жануарлары","Жабайы жануарлар","Құстар","Балықтар"], answer:1 },
    ]
  },

  // ─── Kazakh · Lesson 4 — Hard & soft vowels ───
  "kaz-4": {
    id:"kaz-4", subjectId:"kaz",
    titleByLang:{ kk:"Жуан және жіңішке дыбыстар", ru:"Твёрдые и мягкие гласные", en:"Hard & Soft Vowels" },
    introByLang:{ kk:"Қазақ тілінде дауысты дыбыстар жуан немесе жіңішке болады.", ru:"В казахском гласные бывают твёрдыми или мягкими.", en:"In Kazakh, vowels are either hard or soft." },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Жуан дауысты дыбыс қайсы?", ru:"Какой гласный твёрдый?", en:"Which vowel is hard?" },
        options:["ә","і","а","ү"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"Жіңішке дауысты дыбыс қайсы?", ru:"Какой гласный мягкий?", en:"Which vowel is soft?" },
        options:["а","о","ұ","ө"], answer:3 },
      { kind:"tap",
        promptByLang:{ kk:"Барлық жуан дыбыстарды тап", ru:"Найди все твёрдые гласные", en:"Tap all hard vowels" },
        words:["а","ә","о","ө","ұ","ү","ы","і"], correctIdxs:[0,2,4,6] },
      { kind:"match",
        promptByLang:{ kk:"Сөзді дұрыс топқа жатқыз", ru:"Соедини слово с группой", en:"Match each word to its group" },
        groupsByLang:{ kk:["Жуан","Жіңішке"], ru:["Твёрдые","Мягкие"], en:["Hard","Soft"] },
        items:[
          { text:"бала", group:0 },
          { text:"күн",  group:1 },
          { text:"тау",  group:0 },
          { text:"көл",  group:1 },
          { text:"қол",  group:0 },
          { text:"бөрі", group:1 },
        ] },
      { kind:"mc",
        promptByLang:{ kk:"Қай сөз жіңішке?", ru:"Какое слово мягкое?", en:"Which word is soft?" },
        options:["қалам","терезе","балапан","тау"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"Қай сөз жуан?", ru:"Какое слово твёрдое?", en:"Which word is hard?" },
        options:["сүт","піл","ат","іні"], answer:2 },
    ]
  },

  // ─── Kazakh · Lesson 5 — Build a word (Сөз құрастыру) ───
  "kaz-5": {
    id:"kaz-5", subjectId:"kaz",
    titleByLang:{ kk:"Сөз құрастыру", ru:"Составь слово", en:"Build a Word" },
    introByLang:{ kk:"Буындардан сөз құрастырайық!", ru:"Составим слова из слогов!", en:"Let's build words from syllables!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"«МЕК» + «ТЕП» = ?", ru:"«МЕК» + «ТЕП» = ?", en:"«МЕК» + «ТЕП» = ?" },
        options:["метеп","мектеп","меткеп","мектел"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"«А» + «НА» = ?", ru:"«А» + «НА» = ?", en:"«А» + «НА» = ?" },
        options:["ана","нан","ана","аан"], answer:0 },
      { kind:"tap",
        promptByLang:{ kk:"«БАЛА» сөзін беретін буындарды дұрыс ретпен тап", ru:"Найди слоги, из которых можно составить слово «БАЛА»", en:"Tap the syllables that form «БАЛА» in order" },
        words:["БА","КА","ЛА","ТА","НА","МА"], correctIdxs:[0,2] },
      { kind:"mc",
        promptByLang:{ kk:"«КА» + «ЛА» + «М» = ?", ru:"«КА» + «ЛА» + «М» = ?", en:"«КА» + «ЛА» + «М» = ?" },
        options:["қалам","калам","кәлам","қалем"], answer:0 },
      { kind:"type",
        promptByLang:{ kk:"«АПА» сөзіндегі буын санын жаз", ru:"Запиши количество слогов в слове «АПА»", en:"Write the number of syllables in «АПА»" },
        answer:2 },
      { kind:"word",
        storyByLang:{ kk:"Ұстаз тақтаға «_АР» жазды. Бос орынға қандай буын қойсаң, «ҚАР» сөзі шығады?", ru:"Учитель написал «_АР». Какой слог вставить, чтобы получилось «ҚАР»?", en:"The teacher wrote «_АР». What syllable gives us «ҚАР»?" },
        options:["БА","ТА","ҚА","ДА"], answer:2 },
    ]
  },

  // ─── Kazakh · Lesson 6 — Colors (Түстер) ───
  "kaz-6": {
    id:"kaz-6", subjectId:"kaz",
    titleByLang:{ kk:"Түстер", ru:"Цвета", en:"Colors" },
    introByLang:{ kk:"Түстердің қазақша атауларын үйренейік!", ru:"Выучим казахские названия цветов!", en:"Let's learn color names in Kazakh!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"«Қызыл» қандай түс?", ru:"Какой цвет означает «Қызыл»?", en:"What color is «Қызыл»?" },
        options:["Blue","Green","Red","Yellow"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Green» қазақша қалай?", ru:"Как по-казахски «зелёный»?", en:"How do you say 'green' in Kazakh?" },
        options:["сары","қызыл","жасыл","көк"], answer:2 },
      { kind:"match",
        promptByLang:{ kk:"Түсті оның қазақша атауымен жұптастыр", ru:"Сопоставь цвет с казахским названием", en:"Match the color to its Kazakh name" },
        groupsByLang:{ kk:["Жылы түстер","Салқын түстер"], ru:["Тёплые цвета","Холодные цвета"], en:["Warm colors","Cool colors"] },
        items:[
          { text:"қызыл (red)",  group:0 },
          { text:"көк (blue)",   group:1 },
          { text:"сары (yellow)",group:0 },
          { text:"жасыл (green)",group:1 },
          { text:"қызғылт (pink)",group:0 },
          { text:"күлгін (purple)",group:1 },
        ] },
      { kind:"tap",
        promptByLang:{ kk:"Табиғатта кездесетін түстердің қазақша атауларын тап", ru:"Найди казахские названия цветов, встречающихся в природе", en:"Tap Kazakh color words found in nature" },
        words:["жасыл","қара","сары","ақ","қызыл","алтын","көк","күміс"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc",
        promptByLang:{ kk:"Аспан қандай түс? Қазақша.", ru:"Какого цвета небо? По-казахски.", en:"What color is the sky? In Kazakh." },
        options:["жасыл","сары","қызыл","көк"], answer:3 },
      { kind:"word",
        storyByLang:{ kk:"Байрақта қызыл, сары және жасыл түстер бар. «Жасыл» ағылшынша қалай?", ru:"На флаге красный, жёлтый и зелёный. Как «жасыл» по-английски?", en:"A flag has red, yellow and green. What is «жасыл» in English?" },
        options:["Red","Yellow","Green","Blue"], answer:2 },
    ]
  },

  // ─── World Studies · Lesson 1 — Seasons (Жыл мезгілдері) ───
  "world-1": {
    id:"world-1", subjectId:"world",
    titleByLang:{ kk:"Жыл мезгілдері", ru:"Времена года", en:"Seasons of the Year" },
    introByLang:{ kk:"Жылдың 4 мезгілі бар. Олар қандай?", ru:"В году 4 сезона. Какие они?", en:"There are 4 seasons in a year. What are they?" },
    questions:[
      { kind:"mc", image:"🌸 ☀️ 🍂 ❄️",
        promptByLang:{ kk:"Жылдың нешінші мезгілі бар?", ru:"Сколько времён года?", en:"How many seasons are there in a year?" },
        options:["2","3","4","6"], answer:2 },
      { kind:"tap", image:"🗓️",
        promptByLang:{ kk:"Барлық жыл мезгілдерін тап", ru:"Найди все времена года", en:"Tap all four seasons" },
        words:["Көктем","Қар","Жаз","Жел","Күз","Жауын","Қыс","Ай"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"☀️🌊🏖️",
        promptByLang:{ kk:"«Жаздың» белгісі қандай?", ru:"Что характерно для лета («Жаз»)?", en:"What is a sign of summer («Жаз»)?" },
        options:["Қар жауады","Жапырақ түседі","Ыстық, күн ұзақ","Суық, жел соғады"], answer:2 },
      { kind:"match", image:"🌡️",
        promptByLang:{ kk:"Мезгілді оның белгісімен жұптастыр", ru:"Сопоставь сезон с его признаком", en:"Match each season to its sign" },
        groupsByLang:{ kk:["Жылы мезгілдер","Суық мезгілдер"], ru:["Тёплые сезоны","Холодные сезоны"], en:["Warm seasons","Cold seasons"] },
        items:[
          { text:"Жаз",   group:0 },
          { text:"Қыс",   group:1 },
          { text:"Көктем",group:0 },
          { text:"Күз",   group:1 },
        ] },
      { kind:"mc", image:"❄️⛄🌨️",
        promptByLang:{ kk:"Қыста не болады?", ru:"Что происходит зимой?", en:"What happens in winter?" },
        options:["Гүлдер өседі","Жапырақтар жасарады","Қар жауады","Жемістер піседі"], answer:2 },
      { kind:"word", image:"🌺🎊",
        storyByLang:{ kk:"Наурыз ай — Қазақстанда Жаңа жыл мерекесі. Ол қай мезгілде болады?", ru:"Наурыз — казахский Новый год. В каком сезоне он отмечается?", en:"Nauryz is Kazakhstan's New Year. In which season does it fall?" },
        options:["Қыс","Көктем","Жаз","Күз"], answer:1 },
    ]
  },

  // ─── World Studies · Lesson 2 — Wild Animals (Жабайы жануарлар) ───
  "world-2": {
    id:"world-2", subjectId:"world",
    titleByLang:{ kk:"Жабайы жануарлар", ru:"Дикие животные", en:"Wild Animals" },
    introByLang:{ kk:"Табиғаттағы жабайы жануарларды танып білейік!", ru:"Познакомимся с дикими животными!", en:"Let's discover wild animals in nature!" },
    questions:[
      { kind:"mc", image:"🌲🏔️🌿",
        promptByLang:{ kk:"Жабайы жануарлар қайда тұрады?", ru:"Где живут дикие животные?", en:"Where do wild animals live?" },
        options:["Үйде","Ормандарда, далада","Мектепте","Дүкенде"], answer:1 },
      { kind:"tap", image:"🐾",
        promptByLang:{ kk:"Жабайы жануарларды тап", ru:"Найди диких животных", en:"Tap the wild animals" },
        words:["бөрі","ит","аю","мысық","жолбарыс","сиыр","түлкі","қой"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"🐻",
        promptByLang:{ kk:"Қазақстанда орман патшасы деп аталатын жануар?", ru:"Какое животное называют королём леса в Казахстане?", en:"Which animal is called the king of the forest in Kazakhstan?" },
        options:["Аю","Түлкі","Бөрі","Жолбарыс"], answer:0 },
      { kind:"match", image:"🗺️",
        promptByLang:{ kk:"Жануарды оның тіршілік ортасымен жұптастыр", ru:"Сопоставь животное со средой обитания", en:"Match the animal to its habitat" },
        groupsByLang:{ kk:["Орман","Дала/Шөл"], ru:["Лес","Степь/Пустыня"], en:["Forest","Steppe/Desert"] },
        items:[
          { text:"аю",    group:0 },
          { text:"сайғақ",group:1 },
          { text:"бөрі",  group:0 },
          { text:"түйе",  group:1 },
        ] },
      { kind:"mc", image:"🐯",
        promptByLang:{ kk:"Жолбарыстың аяғы нешеу?", ru:"Сколько лап у тигра?", en:"How many legs does a tiger have?" },
        options:["2","4","6","8"], answer:1 },
      { kind:"word", image:"🦁🐻🐯",
        storyByLang:{ kk:"Мектепте зоопаркқа барды. Балалар аю мен жолбарысты көрді. Олар қандай жануарлар?", ru:"Класс поехал в зоопарк. Дети увидели аю и жолбарыс. Какие это животные?", en:"The class visited a zoo and saw аю and жолбарыс. What kind of animals are they?" },
        options:["Үй жануарлары","Жабайы жануарлар","Құстар","Балықтар"], answer:1 },
    ]
  },

  // ─── English · Lesson 1 — Numbers 1–10 ───
  "eng-1": {
    id:"eng-1", subjectId:"eng",
    titleByLang:{ kk:"Ағылшынша сандар · 1-10", ru:"Числа по-английски · 1–10", en:"Numbers in English · 1–10" },
    introByLang:{ kk:"Ағылшынша 1-ден 10-ға дейін санауды үйренейік!", ru:"Выучим счёт от 1 до 10 по-английски!", en:"Let's learn to count from 1 to 10 in English!" },
    questions:[
      { kind:"mc", image:"🔵🔵🔵",
        promptByLang:{ kk:"«Three» нешені білдіреді?", ru:"Что означает «Three»?", en:"What number is «Three»?" },
        options:["1","2","3","4"], answer:2 },
      { kind:"mc", image:"⭐⭐⭐⭐⭐⭐⭐",
        promptByLang:{ kk:"«7» ағылшынша қалай жазылады?", ru:"Как по-английски пишется «7»?", en:"How do you write «7» in English?" },
        options:["six","seven","eight","nine"], answer:1 },
      { kind:"tap", image:"🔢",
        promptByLang:{ kk:"1-ден 5-ке дейінгі сандарды ағылшынша тап", ru:"Найди числа от 1 до 5 по-английски", en:"Tap the English words for numbers 1–5" },
        words:["one","six","two","seven","three","eight","four","nine","five","ten"],
        correctIdxs:[0,2,4,6,8] },
      { kind:"match", image:"🔢",
        promptByLang:{ kk:"Санды оның ағылшынша атауымен жұптастыр", ru:"Сопоставь число с английским словом", en:"Match the number to its English word" },
        groupsByLang:{ kk:["1–5","6–10"], ru:["1–5","6–10"], en:["1–5","6–10"] },
        items:[
          { text:"one",   group:0 },
          { text:"eight", group:1 },
          { text:"four",  group:0 },
          { text:"ten",   group:1 },
          { text:"two",   group:0 },
          { text:"nine",  group:1 },
        ] },
      { kind:"mc", image:"🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵",
        promptByLang:{ kk:"«Ten» нешені білдіреді?", ru:"Что означает «Ten»?", en:"What number is «Ten»?" },
        options:["8","9","10","11"], answer:2 },
      { kind:"word", image:"🧮",
        storyByLang:{ kk:"Мұғалім 3+4 есебін берді. Жауап ағылшынша қандай?", ru:"Учитель дал задание 3+4. Как ответ по-английски?", en:"The teacher set the sum 3+4. What is the answer in English?" },
        options:["six","seven","eight","nine"], answer:1 },
    ]
  },

  // ─── English · Lesson 2 — Colors in English ───
  "eng-2": {
    id:"eng-2", subjectId:"eng",
    titleByLang:{ kk:"Ағылшынша түстер", ru:"Цвета по-английски", en:"Colors in English" },
    introByLang:{ kk:"Ағылшынша түстерді үйренейік!", ru:"Выучим названия цветов по-английски!", en:"Let's learn color names in English!" },
    questions:[
      { kind:"mc", image:"🟥",
        promptByLang:{ kk:"«Red» нені білдіреді?", ru:"Что означает «Red»?", en:"What does «Red» mean?" },
        options:["Жасыл / Green","Сары / Yellow","Қызыл / Red","Көк / Blue"], answer:2 },
      { kind:"mc", image:"🟩",
        promptByLang:{ kk:"«Жасыл» ағылшынша қалай?", ru:"Как «зелёный» по-английски?", en:"How do you say 'green' in English?" },
        options:["blue","red","yellow","green"], answer:3 },
      { kind:"tap", image:"🎨",
        promptByLang:{ kk:"Ағылшынша түс атауларын тап", ru:"Найди английские названия цветов", en:"Tap the English color words" },
        words:["red","gul","blue","qyzyl","green","kok","yellow","zhashyl"],
        correctIdxs:[0,2,4,6] },
      { kind:"match", image:"🌈",
        promptByLang:{ kk:"Ағылшынша түсті қазақшасымен жұптастыр", ru:"Сопоставь цвет на английском с казахским", en:"Match the English color to its Kazakh translation" },
        groupsByLang:{ kk:["Негізгі түстер","Қосымша түстер"], ru:["Основные цвета","Дополнительные цвета"], en:["Primary colors","Secondary colors"] },
        items:[
          { text:"red",    group:0 },
          { text:"orange", group:1 },
          { text:"blue",   group:0 },
          { text:"purple", group:1 },
          { text:"yellow", group:0 },
          { text:"green",  group:1 },
        ] },
      { kind:"mc", image:"🌤️",
        promptByLang:{ kk:"Аспан ағылшынша қандай түс?", ru:"Какого цвета небо по-английски?", en:"What color is the sky in English?" },
        options:["red","green","yellow","blue"], answer:3 },
      { kind:"word", image:"🟨",
        storyByLang:{ kk:"Астананың байрағы — зеңгір мен сары. «Сары» ағылшынша қалай?", ru:"Флаг Астаны — голубой и жёлтый. Как «сары» по-английски?", en:"Astana's flag is blue and yellow. What is «сары» in English?" },
        options:["blue","red","yellow","green"], answer:2 },
    ]
  },

  // ─── World Studies · Lesson 3 — Plants (Өсімдіктер) ───
  "world-3": {
    id:"world-3", subjectId:"world",
    titleByLang:{ kk:"Өсімдіктер", ru:"Растения", en:"Plants" },
    introByLang:{ kk:"Өсімдіктердің бөліктерін және олардың маңызын үйренейік!", ru:"Давайте изучим части растений и их значение!", en:"Let's learn about parts of plants and why they matter!" },
    questions:[
      { kind:"mc", image:"🌱",
        promptByLang:{ kk:"Өсімдіктің топырақ астындағы бөлігі не деп аталады?", ru:"Как называется подземная часть растения?", en:"What is the underground part of a plant called?" },
        options:["Жапырақ / Лист / Leaf","Тамыр / Корень / Root","Гүл / Цветок / Flower","Сабақ / Стебель / Stem"], answer:1 },
      { kind:"tap", image:"🌿",
        promptByLang:{ kk:"Өсімдіктің бөліктерін тап", ru:"Найди части растения", en:"Tap the parts of a plant" },
        words:["тамыр","бұлт","сабақ","тас","жапырақ","су","гүл","жел"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"☀️🌱💧",
        promptByLang:{ kk:"Фотосинтез дегеніміз не?", ru:"Что такое фотосинтез?", en:"What is photosynthesis?" },
        options:["Өсімдік ұйқысы / Сон растения","Тамырдан су тарту / Всасывание воды","Күн сәулесімен тамақ жасау / Приготовление пищи из солнечного света","Жапырақ түсіру / Сбрасывание листьев"], answer:2 },
      { kind:"match", image:"🌳🌿🌾",
        promptByLang:{ kk:"Өсімдік түрін дұрыс топқа жатқыз", ru:"Распредели растения по группам", en:"Sort the plants into the correct group" },
        groupsByLang:{ kk:["Ағаш","Шөп"], ru:["Дерево","Трава"], en:["Tree","Grass/Herb"] },
        items:[
          { text:"қарағай / сосна", group:0 },
          { text:"бидай / пшеница", group:1 },
          { text:"қайың / берёза",  group:0 },
          { text:"жоңышқа / клевер",group:1 },
        ] },
      { kind:"word", image:"🌻💧☀️",
        storyByLang:{ kk:"Айгүл гүл өсірмек болды. Гүлге не керек?", ru:"Айгуль решила вырастить цветок. Что нужно растению?", en:"Aigul decided to grow a flower. What does a plant need?" },
        options:["Тек су / Только вода","Жарық, су, топырақ / Свет, вода, почва","Тек жарық / Только свет","Тас пен жел / Камень и ветер"], answer:1 },
      { kind:"mc", image:"🌷🌸🌼",
        promptByLang:{ kk:"Гүл өсімдіктің қандай қызметін атқарады?", ru:"Какую роль выполняет цветок растения?", en:"What is the role of a flower in a plant?" },
        options:["Тамақ дайындайды / Готовит пищу","Су тартады / Всасывает воду","Тұқым жасайды / Образует семена","Фотосинтез жасайды / Осуществляет фотосинтез"], answer:2 },
      { kind:"type",
        promptByLang:{ kk:"Өсімдіктің неше негізгі бөлігі бар? (4 бөлік: тамыр, сабақ, жапырақ, гүл)", ru:"Сколько основных частей у растения? (4 части: корень, стебель, лист, цветок)", en:"How many main parts does a plant have? (root, stem, leaf, flower)" },
        answer:4 },
    ]
  },

  // ─── World Studies · Lesson 4 — Human Body (Адам денесі) ───
  "world-4": {
    id:"world-4", subjectId:"world",
    titleByLang:{ kk:"Адам денесі", ru:"Тело человека", en:"Human Body" },
    introByLang:{ kk:"Адам денесінің бөліктерін және олардың қызметін үйренейік!", ru:"Изучим части тела и их функции!", en:"Let's learn about body parts and their functions!" },
    questions:[
      { kind:"mc", image:"🫀",
        promptByLang:{ kk:"Жүрек не қызмет атқарады?", ru:"Какую функцию выполняет сердце?", en:"What does the heart do?" },
        options:["Тыныс алу / Дыхание","Қан айналымы / Перекачивает кровь","Тамақ қорыту / Переваривание пищи","Ойлау / Мышление"], answer:1 },
      { kind:"tap", image:"👂👀👃",
        promptByLang:{ kk:"5 сезім мүшесін тап", ru:"Найди 5 органов чувств", en:"Tap the 5 sense organs" },
        words:["Көз / Глаз","Жүрек / Сердце","Құлақ / Ухо","Өкпе / Лёгкие","Мұрын / Нос","Асқазан / Желудок","Тіл / Язык","Ми / Мозг"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"🦷💪",
        promptByLang:{ kk:"Сүйектер мен бұлшықеттердің негізгі қызметі не?", ru:"Какова основная функция костей и мышц?", en:"What is the main function of bones and muscles?" },
        options:["Тыныс алу / Дыхание","Қан тазарту / Очистка крови","Денені ұстап тұру және қозғалту / Поддержание тела и движение","Тамақ қорыту / Переваривание"], answer:2 },
      { kind:"mc", image:"🧠",
        promptByLang:{ kk:"Ми қандай қызмет атқарады?", ru:"Какую функцию выполняет мозг?", en:"What does the brain do?" },
        options:["Қан айналымы / Кровообращение","Барлық мүшені басқарады / Управляет всеми органами","Тыныс алу / Дыхание","Тамақ қорыту / Переваривание"], answer:1 },
      { kind:"tap", image:"🏃🥗🛌",
        promptByLang:{ kk:"Дені сау үшін пайдалы дағдыларды тап", ru:"Найди полезные для здоровья привычки", en:"Tap the healthy habits" },
        words:["Күнде жаттығу / Зарядка","Кеш ұйықтамау / Поздно спать","Жеміс-жидек жеу / Есть фрукты","Темекі тарту / Курить","Қол жуу / Мыть руки","Фастфуд жеу / Есть фастфуд"],
        correctIdxs:[0,2,4] },
      { kind:"word", image:"😷🩺",
        storyByLang:{ kk:"Болат суық тиіп қалды. Оның мұрыны тұрып, дыбысы шықты. Болат қандай мүшесін сезді?", ru:"Болат простудился. У него заложен нос. Какой орган чувств задействован?", en:"Bolat caught a cold. His nose is blocked. Which sense organ is affected?" },
        options:["Көру / Зрение","Есту / Слух","Иіс сезу / Обоняние","Дәм сезу / Вкус"], answer:2 },
      { kind:"type",
        promptByLang:{ kk:"Адамда неше сезім мүшесі бар?", ru:"Сколько органов чувств у человека?", en:"How many sense organs does a human have?" },
        answer:5 },
    ]
  },

  // ─── World Studies · Lesson 5 — Our City (Біздің қала) ───
  "world-5": {
    id:"world-5", subjectId:"world",
    titleByLang:{ kk:"Біздің қала", ru:"Наш город", en:"Our City" },
    introByLang:{ kk:"Қаладағы ғимараттар мен қызметтерді үйренейік!", ru:"Изучим здания и услуги города!", en:"Let's learn about city buildings and public services!" },
    questions:[
      { kind:"mc", image:"🏥",
        promptByLang:{ kk:"Ауру адамдарды қай жерде емдейді?", ru:"Где лечат больных людей?", en:"Where do people receive medical treatment?" },
        options:["Мектеп / Школа","Дүкен / Магазин","Аурухана / Больница","Кітапхана / Библиотека"], answer:2 },
      { kind:"tap", image:"🏙️",
        promptByLang:{ kk:"Қаладағы ғимараттарды тап", ru:"Найди городские здания", en:"Tap the city buildings" },
        words:["Мектеп","Орман","Аурухана","Тау","Дүкен","Дала","Кітапхана","Өзен"],
        correctIdxs:[0,2,4,6] },
      { kind:"match", image:"🚌🚗🚲",
        promptByLang:{ kk:"Көлік түрін дұрыс топқа жатқыз", ru:"Распредели транспорт по группам", en:"Sort the transport types" },
        groupsByLang:{ kk:["Жер көлігі","Су көлігі"], ru:["Наземный транспорт","Водный транспорт"], en:["Land transport","Water transport"] },
        items:[
          { text:"автобус / автобус", group:0 },
          { text:"кеме / корабль",    group:1 },
          { text:"трамвай / трамвай", group:0 },
          { text:"қайық / лодка",     group:1 },
        ] },
      { kind:"mc", image:"📮",
        promptByLang:{ kk:"Мекенжай не үшін қажет?", ru:"Для чего нужен адрес?", en:"What is an address used for?" },
        options:["Тамақ пісіру үшін / Для приготовления еды","Орынды табу үшін / Чтобы найти место","Ауа-райын білу үшін / Узнать погоду","Уақытты білу үшін / Узнать время"], answer:1 },
      { kind:"word", image:"🏫📚",
        storyByLang:{ kk:"Аружан кітап алғысы келді. Ол қайда бару керек?", ru:"Аружан хочет взять книгу. Куда ей нужно пойти?", en:"Aruzhan wants to borrow a book. Where should she go?" },
        options:["Аурухана / Больница","Кітапхана / Библиотека","Дүкен / Магазин","Мектеп / Школа"], answer:1 },
      { kind:"mc", image:"🚔🚑🚒",
        promptByLang:{ kk:"Өрт шыққанда қай қызметті шақырады?", ru:"Какую службу вызывают при пожаре?", en:"Which service do you call in case of a fire?" },
        options:["Жедел жәрдем / Скорая помощь","Полиция / Полиция","Өрт сөндіру / Пожарная служба","Байланыс / Связь"], answer:2 },
    ]
  },

  // ─── World Studies · Lesson 6 — Water (Су) ───
  "world-6": {
    id:"world-6", subjectId:"world",
    titleByLang:{ kk:"Су", ru:"Вода", en:"Water" },
    introByLang:{ kk:"Судың маңызы мен оның табиғаттағы айналымын үйренейік!", ru:"Изучим важность воды и её круговорот в природе!", en:"Let's learn about the importance of water and its cycle in nature!" },
    questions:[
      { kind:"mc", image:"🧊💧☁️",
        promptByLang:{ kk:"Судың үш күйі қандай?", ru:"Какие три состояния воды?", en:"What are the three states of water?" },
        options:["Ыстық, жылы, суық / Горячая, тёплая, холодная","Қатты, сұйық, газ / Твёрдое, жидкое, газ","Мөлдір, лайлы, тұзды / Прозрачная, мутная, солёная","Терең, таяз, жалпақ / Глубокая, мелкая, широкая"], answer:1 },
      { kind:"tap", image:"🌊🏔️🌧️",
        promptByLang:{ kk:"Судың қайнар көздерін тап", ru:"Найди источники воды", en:"Tap the sources of water" },
        words:["Өзен / Река","Тас / Камень","Көл / Озеро","Ағаш / Дерево","Жаңбыр / Дождь","Шөл / Пустыня","Теңіз / Море","Тау / Гора"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"☁️🌧️💧🌊",
        promptByLang:{ kk:"Су айналымы деген не?", ru:"Что такое круговорот воды?", en:"What is the water cycle?" },
        options:["Судың ағуы / Течение воды","Судың буланып, жауын болып қайту процесі / Процесс испарения и возвращения в виде осадков","Судың мұзға айналуы / Замерзание воды","Судың тазартылуы / Очистка воды"], answer:1 },
      { kind:"match", image:"💧🌿🏭",
        promptByLang:{ kk:"Суды үнемдеу жолдарын анықта", ru:"Определи способы экономии воды", en:"Identify ways to conserve water" },
        groupsByLang:{ kk:["Суды үнемдейді","Суды босқа жоғалтады"], ru:["Экономит воду","Тратит воду впустую"], en:["Saves water","Wastes water"] },
        items:[
          { text:"тістерді жуғанда кранды жабу / закрывать кран", group:0 },
          { text:"кранды ашық қалдыру / оставлять кран открытым", group:1 },
          { text:"душты қысқа ұстау / короткий душ",              group:0 },
          { text:"ванна толтыру / наполнять ванну",               group:1 },
        ] },
      { kind:"mc", image:"🧑‍🔬",
        promptByLang:{ kk:"Адам денесінің шамамен қанша пайызы судан тұрады?", ru:"Примерно какой процент тела человека составляет вода?", en:"Approximately what percentage of the human body is made up of water?" },
        options:["30%","50%","70%","90%"], answer:2 },
      { kind:"word", image:"🏭🌊",
        storyByLang:{ kk:"Зауыт тастандылықты өзенге төкті. Бұл судың тазалығына қалай әсер етеді?", ru:"Завод сбрасывает отходы в реку. Как это влияет на чистоту воды?", en:"A factory dumps waste into a river. How does this affect water quality?" },
        options:["Суды тазартады / Очищает воду","Суды ластайды / Загрязняет воду","Суды үнемдейді / Экономит воду","Суды жылытады / Нагревает воду"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"Судың неше күйі бар?", ru:"Сколько состояний у воды?", en:"How many states does water have?" },
        answer:3 },
    ]
  },

  // ─── World Studies · Lesson 7 — Solar System (Күн жүйесі) ───
  "world-7": {
    id:"world-7", subjectId:"world",
    titleByLang:{ kk:"Күн жүйесі", ru:"Солнечная система", en:"Solar System" },
    introByLang:{ kk:"Күн жүйесіндегі планеталарды үйренейік!", ru:"Изучим планеты Солнечной системы!", en:"Let's learn about the planets in our Solar System!" },
    questions:[
      { kind:"mc", image:"🪐",
        promptByLang:{ kk:"Күн жүйесінде неше планета бар?", ru:"Сколько планет в Солнечной системе?", en:"How many planets are in the Solar System?" },
        options:["6","7","8","9"], answer:2 },
      { kind:"tap", image:"🌍🌏🌎",
        promptByLang:{ kk:"Күннен алғашқы 4 планетаны тап", ru:"Найди первые 4 планеты от Солнца", en:"Tap the first 4 planets from the Sun" },
        words:["Меркурий","Юпитер","Венера","Сатурн","Жер","Уран","Марс","Нептун"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"🌍",
        promptByLang:{ kk:"Жер күннен нешінші орында орналасқан?", ru:"Какой по счёту Земля от Солнца?", en:"What position is Earth from the Sun?" },
        options:["2-ші / 2-я","3-ші / 3-я","4-ші / 4-я","5-ші / 5-я"], answer:1 },
      { kind:"mc", image:"🌙",
        promptByLang:{ kk:"Жердің неше табиғи серігі (айы) бар?", ru:"Сколько у Земли естественных спутников (лун)?", en:"How many natural moons does Earth have?" },
        options:["0","1","2","3"], answer:1 },
      { kind:"mc", image:"🌅🌃",
        promptByLang:{ kk:"Күн мен түннің ауысуы неден болады?", ru:"Из-за чего происходит смена дня и ночи?", en:"What causes day and night?" },
        options:["Күн айналуынан / Вращения Солнца","Айдың қозғалысынан / Движения Луны","Жердің өз осінде айналуынан / Вращения Земли вокруг оси","Жердің күнді айналуынан / Орбиты Земли"], answer:2 },
      { kind:"word", image:"🌸❄️🍂☀️",
        storyByLang:{ kk:"Жыл мезгілдерінің ауысуы неден болады?", ru:"Чем вызвана смена времён года?", en:"What causes the change of seasons?" },
        options:["Жердің өз осінде айналуынан / Вращение Земли вокруг оси","Жердің осінің еңкейуі мен күнді айналуынан / Наклон оси Земли и орбита","Күннің жылуынан / Тепло Солнца","Айдың фазаларынан / Фазы Луны"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"Күн жүйесіндегі планеталар санын жаз", ru:"Запиши количество планет в Солнечной системе", en:"Write the number of planets in the Solar System" },
        answer:8 },
    ]
  },

  // ─── World Studies · Lesson 8 — Kazakhstan (Қазақстан) ───
  "world-8": {
    id:"world-8", subjectId:"world",
    titleByLang:{ kk:"Қазақстан", ru:"Казахстан", en:"Kazakhstan" },
    introByLang:{ kk:"Өз Отанымыз — Қазақстан туралы үйренейік!", ru:"Узнаем больше о нашей Родине — Казахстане!", en:"Let's learn about our homeland — Kazakhstan!" },
    questions:[
      { kind:"mc", image:"🏛️",
        promptByLang:{ kk:"Қазақстанның астанасы қай қала?", ru:"Какой город является столицей Казахстана?", en:"What is the capital city of Kazakhstan?" },
        options:["Алматы / Алматы","Астана / Астана","Шымкент / Шымкент","Қарағанды / Караганда"], answer:1 },
      { kind:"mc", image:"🗺️",
        promptByLang:{ kk:"Қазақстан ауданы жөнінен дүниежүзінде нешінші орында тұрады?", ru:"Какое место по площади занимает Казахстан в мире?", en:"What rank does Kazakhstan hold by area in the world?" },
        options:["5-ші / 5-е","7-ші / 7-е","9-шы / 9-е","12-ші / 12-е"], answer:2 },
      { kind:"tap", image:"🤝🌏",
        promptByLang:{ kk:"Қазақстанның іргелес мемлекеттерін тап", ru:"Найди страны, граничащие с Казахстаном", en:"Tap the countries that border Kazakhstan" },
        words:["Ресей / Россия","Жапония / Япония","Қытай / Китай","Германия / Германия","Өзбекстан / Узбекистан","Бразилия / Бразилия","Қырғызстан / Кыргызстан","Австралия / Австралия"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc", image:"🇰🇿",
        promptByLang:{ kk:"Қазақстан туының негізгі түсі қандай?", ru:"Какой основной цвет флага Казахстана?", en:"What is the main color of Kazakhstan's flag?" },
        options:["Қызыл / Красный","Жасыл / Зелёный","Ашық көк / Голубой","Сары / Жёлтый"], answer:2 },
      { kind:"mc", image:"🦅",
        promptByLang:{ kk:"Қазақстан туының ортасында не бейнеленген?", ru:"Что изображено в центре флага Казахстана?", en:"What is depicted on Kazakhstan's flag?" },
        options:["Арыстан / Лев","Алтын қыран мен күн / Золотой орёл и солнце","Ат / Конь","Жұлдыз / Звезда"], answer:1 },
      { kind:"word", image:"🌸🎉",
        storyByLang:{ kk:"Наурыз мейрамы қашан тойланады?", ru:"Когда отмечается праздник Наурыз?", en:"When is the Nauryz holiday celebrated?" },
        options:["Қаңтар / Январь","Наурыз / Март (21-23)","Мамыр / Май","Желтоқсан / Декабрь"], answer:1 },
      { kind:"type",
        promptByLang:{ kk:"Қазақстан дүниежүзі бойынша ауданы жағынан нешінші орында? (9)", ru:"Какое место по площади занимает Казахстан? (9)", en:"What rank is Kazakhstan by area in the world? (9)" },
        answer:9 },
    ]
  },

  // ─── Kazakh · Lesson 7 — Noun (Зат есім) ───
  "kaz-7": {
    id:"kaz-7", subjectId:"kaz",
    titleByLang:{ kk:"Зат есім", ru:"Имя существительное", en:"Noun" },
    introByLang:{ kk:"Зат есім деген не екенін және оның белгілерін үйренейік!", ru:"Узнаем, что такое имя существительное и его признаки!", en:"Let's learn what a noun is and its features!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Зат есім нені білдіреді?", ru:"Что обозначает имя существительное?", en:"What does a noun denote?" },
        options:["Іс-әрекетті / Действие","Затты немесе тіршілік иесін / Предмет или живое существо","Белгіні / Признак","Санды / Количество"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"Зат есімге қандай сұрақ қойылады?", ru:"На какой вопрос отвечает имя существительное?", en:"What question does a noun answer?" },
        options:["Қандай? / Какой?","Не істейді? / Что делает?","Кім? немесе Не? / Кто? или Что?","Қашан? / Когда?"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"Зат есімдерді тап", ru:"Найди имена существительные", en:"Tap the nouns" },
        words:["мектеп","жүгіру","кітап","жасыл","бала","ұшу","қалам","үлкен"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc",
        promptByLang:{ kk:"«Мектеп» зат есімі қандай?", ru:"Какое существительное «мектеп»?", en:"What type is the noun «мектеп» (school)?" },
        options:["Жанды / Одушевлённое","Жансыз / Неодушевлённое","Жалқы есім / Собственное","Еш қайсысы / Ни одно"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"Зат есімнің көпше жалғауы қандай?", ru:"Какое окончание множественного числа у существительных?", en:"What is the plural suffix in Kazakh?" },
        options:["-ды/-ді","-лар/-лер","-ған/-ген","-па/-пе"], answer:1 },
      { kind:"word",
        storyByLang:{ kk:"«Болат мектепке барады» сөйлемінде зат есім қайсысы?", ru:"Какое слово является существительным в предложении «Болат мектепке барады»?", en:"Which word is the noun in 'Bolat goes to school'?" },
        options:["барады / идёт","мектепке / в школу (мектеп)","Болат / Болат (оба)","барлығы / все"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"Жанды зат есімдерді тап (тіршілік иелері)", ru:"Найди одушевлённые существительные (живые существа)", en:"Tap the animate nouns (living beings)" },
        words:["ит","үй","апа","тас","мұғалім","кітап","бала","орындық"],
        correctIdxs:[0,2,4,6] },
    ]
  },

  // ─── Kazakh · Lesson 8 — Adjective (Сын есім) ───
  "kaz-8": {
    id:"kaz-8", subjectId:"kaz",
    titleByLang:{ kk:"Сын есім", ru:"Имя прилагательное", en:"Adjective" },
    introByLang:{ kk:"Сын есімді және оның белгілерін үйренейік!", ru:"Изучим имя прилагательное и его признаки!", en:"Let's learn adjectives and their features!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Сын есім нені білдіреді?", ru:"Что обозначает имя прилагательное?", en:"What does an adjective denote?" },
        options:["Іс-әрекетті / Действие","Санды / Количество","Заттың белгісін / Признак предмета","Затты / Предмет"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"Сын есімге қандай сұрақ қойылады?", ru:"На какой вопрос отвечает прилагательное?", en:"What question does an adjective answer?" },
        options:["Кім? / Кто?","Қандай? / Какой?","Не істейді? / Что делает?","Неше? / Сколько?"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Сын есімдерді тап", ru:"Найди имена прилагательные", en:"Tap the adjectives" },
        words:["үлкен","бала","жасыл","жүгіру","әдемі","мектеп","кішкентай","апа"],
        correctIdxs:[0,2,4,6] },
      { kind:"match",
        promptByLang:{ kk:"Сын есімді дұрыс топқа жатқыз", ru:"Определи тип прилагательного", en:"Sort adjectives by type" },
        groupsByLang:{ kk:["Түс білдіреді","Көлем білдіреді"], ru:["Цвет","Размер"], en:["Color","Size"] },
        items:[
          { text:"қызыл / красный", group:0 },
          { text:"үлкен / большой", group:1 },
          { text:"көк / синий",     group:0 },
          { text:"кішкентай / маленький", group:1 },
        ] },
      { kind:"word",
        storyByLang:{ kk:"«Ақ қар жауды» сөйлемінде сын есім қайсысы?", ru:"Какое прилагательное в предложении «Ақ қар жауды»?", en:"Which word is the adjective in 'White snow fell'?" },
        options:["жауды / выпал","қар / снег","ақ / белый","жоқ / нет"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Биік тау» тіркесіндегі сын есім қайсысы?", ru:"Какое прилагательное в словосочетании «биік тау» (высокая гора)?", en:"Which word is the adjective in 'tall mountain'?" },
        options:["тау / гора","биік / высокая","оба / оба","none / нет"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Пішінді білдіретін сын есімдерді тап", ru:"Найди прилагательные, обозначающие форму", en:"Tap adjectives that describe shape" },
        words:["дөңгелек","жасыл","шаршы","биік","үшбұрышты","ыстық","тікбұрышты","жылдам"],
        correctIdxs:[0,2,4,6] },
    ]
  },

  // ─── Kazakh · Lesson 9 — Verb (Етістік) ───
  "kaz-9": {
    id:"kaz-9", subjectId:"kaz",
    titleByLang:{ kk:"Етістік", ru:"Глагол", en:"Verb" },
    introByLang:{ kk:"Етістік және оның белгілерін үйренейік!", ru:"Изучим глагол и его признаки!", en:"Let's learn verbs and their features!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Етістік нені білдіреді?", ru:"Что обозначает глагол?", en:"What does a verb denote?" },
        options:["Затты / Предмет","Заттың белгісін / Признак","Іс-әрекет немесе күйді / Действие или состояние","Санды / Количество"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"Етістікке қандай сұрақ қойылады?", ru:"На какой вопрос отвечает глагол?", en:"What question does a verb answer?" },
        options:["Кім? / Кто?","Не? / Что?","Не істейді? / Что делает?","Қандай? / Какой?"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"Етістіктерді тап", ru:"Найди глаголы", en:"Tap the verbs" },
        words:["жүгіреді","бала","оқиды","үлкен","жазады","кітап","ойнайды","жасыл"],
        correctIdxs:[0,2,4,6] },
      { kind:"mc",
        promptByLang:{ kk:"Өткен шақ жалғауы қандай?", ru:"Какой суффикс прошедшего времени?", en:"What is the past tense suffix in Kazakh?" },
        options:["-ды/-ді","-лар/-лер","-мақ/-мек","-ған/-ген"], answer:0 },
      { kind:"word",
        storyByLang:{ kk:"«Айгүл сурет салды» сөйлеміндегі етістік қайсысы?", ru:"Какой глагол в предложении «Айгүл сурет салды»?", en:"Which word is the verb in 'Aigul drew a picture'?" },
        options:["Айгүл / Айгул","сурет / картина","салды / нарисовала","жоқ / нет"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Барады» сөзі қай шақта тұр?", ru:"В каком времени стоит слово «барады» (идёт)?", en:"What tense is the word «барады» (goes)?" },
        options:["Өткен шақ / Прошедшее","Осы шақ / Настоящее","Келер шақ / Будущее","Бұйрық рай / Повелительное"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Өткен шақтағы етістіктерді тап (-ды/-ді жалғаулы)", ru:"Найди глаголы в прошедшем времени (с суффиксом -ды/-ді)", en:"Tap verbs in past tense (with -ды/-ді suffix)" },
        words:["барды","барады","жазды","жазады","оқыды","оқиды","ойнады","ойнайды"],
        correctIdxs:[0,2,4,6] },
    ]
  },

  // ─── Kazakh · Lesson 10 — Reading Comprehension (Мәтін оқу) ───
  "kaz-10": {
    id:"kaz-10", subjectId:"kaz",
    titleByLang:{ kk:"Мәтін оқу", ru:"Чтение текста", en:"Reading Comprehension" },
    introByLang:{ kk:"Қысқа мәтінді оқып, сұрақтарға жауап беруді үйренейік!", ru:"Читаем короткий текст и отвечаем на вопросы!", en:"Let's read a short text and answer comprehension questions!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Мәтінді оқы: «Көктемде күн жылынады. Қар ериді. Гүлдер өседі. Балалар далада ойнайды.» — Мәтін неде туралы?", ru:"Прочитай: «Весной теплеет. Снег тает. Цветы растут. Дети играют на улице.» — О чём текст?", en:"Read: 'In spring it gets warm. Snow melts. Flowers grow. Children play outside.' — What is the text about?" },
        options:["Қыс / Зима / Winter","Күз / Осень / Autumn","Көктем / Весна / Spring","Жаз / Лето / Summer"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"Жоғарыдағы мәтінде не болады?", ru:"Что происходит в тексте выше?", en:"What happens in the text above?" },
        options:["Қар жауады / Идёт снег","Гүлдер өседі / Цветы растут","Жапырақ түседі / Листья падают","Бұршақ жауады / Идёт град"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"Мәтін: «Асан мен Ұсан мектепке барды. Олар математика сабағында есеп шешті.» — Олар қай сабақта болды?", ru:"Текст: «Асан и Усан пошли в школу. Они решали задачи на уроке математики.» — На каком уроке они были?", en:"Text: 'Assan and Ussan went to school. They solved problems in maths class.' — Which class were they in?" },
        options:["Қазақ тілі / Казахский","Дүниетану / Окружающий мир","Математика / Математика","Ән / Пение"], answer:2 },
      { kind:"tap",
        promptByLang:{ kk:"Мәтіндегі зат есімдерді тап: «Апа нан пісірді. Бала сүт ішті.»", ru:"Найди существительные в тексте: «Апа нан пісірді. Бала сүт ішті.»", en:"Tap the nouns in: 'Apa baked bread. Child drank milk.'" },
        words:["апа","пісірді","нан","ішті","бала","сүт","жасады","берді"],
        correctIdxs:[0,2,4,5] },
      { kind:"word",
        storyByLang:{ kk:"«Жаз — ыстық мезгіл. Балалар өзенде жүзеді. Жемістер піседі.» — Мәтіннің негізгі ойы не?", ru:"«Лето — тёплое время года. Дети купаются в реке. Созревают фрукты.» — Главная мысль?", en:"'Summer is a hot season. Children swim in rivers. Fruits ripen.' — What is the main idea?" },
        options:["Балалар ойнайды / Дети играют","Жаз мезгілі туралы / О лете","Жемістер туралы / О фруктах","Өзен туралы / О реке"], answer:1 },
      { kind:"mc",
        promptByLang:{ kk:"Мәтін: «Нұрлан кітап оқиды. Ол математика кітабын алды.» — Нұрлан қандай кітап оқиды?", ru:"Текст: «Нурлан читает книгу. Он взял книгу по математике.» — Какую книгу читает Нурлан?", en:"Text: 'Nurlan reads a book. He took a maths book.' — What book is Nurlan reading?" },
        options:["Ертегі / Сказку","Математика / Математику","Тарих / Историю","Жаратылыстану / Природоведение"], answer:1 },
    ]
  },

  // ─── Kazakh · Lesson 11 — Days and Months (Күндер мен айлар) ───
  "kaz-11": {
    id:"kaz-11", subjectId:"kaz",
    titleByLang:{ kk:"Күндер мен айлар", ru:"Дни и месяцы", en:"Days and Months" },
    introByLang:{ kk:"Аптаның күндерін және жыл айларын қазақша үйренейік!", ru:"Учим дни недели и месяцы по-казахски!", en:"Let's learn days of the week and months in Kazakh!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Аптаның бірінші күні қайсысы?", ru:"Какой первый день недели?", en:"What is the first day of the week?" },
        options:["Жексенбі / Воскресенье","Дүйсенбі / Понедельник","Сейсенбі / Вторник","Сенбі / Суббота"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Жұмыс күндерін тап (дүйсенбіден жұмаға дейін)", ru:"Найди рабочие дни (с понедельника по пятницу)", en:"Tap the working days (Monday through Friday)" },
        words:["Дүйсенбі","Сенбі","Сейсенбі","Жексенбі","Сәрсенбі","Бейсенбі","Жұма","Демалыс"],
        correctIdxs:[0,2,4,5,6] },
      { kind:"mc",
        promptByLang:{ kk:"«Қаңтар» қай айдың атауы?", ru:"«Қаңтар» — название какого месяца?", en:"«Қаңтар» is the name of which month?" },
        options:["Ақпан / Февраль","Наурыз / Март","Қаңтар / Январь","Сәуір / Апрель"], answer:2 },
      { kind:"match",
        promptByLang:{ kk:"Айды жыл мезгіліне сәйкес жатқыз", ru:"Соотнеси месяц с временем года", en:"Match the month to its season" },
        groupsByLang:{ kk:["Қысқы айлар","Жазғы айлар"], ru:["Зимние месяцы","Летние месяцы"], en:["Winter months","Summer months"] },
        items:[
          { text:"Желтоқсан / Декабрь", group:0 },
          { text:"Маусым / Июнь",       group:1 },
          { text:"Қаңтар / Январь",     group:0 },
          { text:"Шілде / Июль",        group:1 },
        ] },
      { kind:"type",
        promptByLang:{ kk:"Аптада неше күн бар?", ru:"Сколько дней в неделе?", en:"How many days are in a week?" },
        answer:7 },
      { kind:"mc",
        promptByLang:{ kk:"«Ақпан» — бұл қандай ай?", ru:"«Ақпан» — какой это месяц?", en:"«Ақпан» is which month?" },
        options:["Қаңтар / Январь","Ақпан / Февраль","Наурыз / Март","Сәуір / Апрель"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Көктемгі айларды тап", ru:"Найди весенние месяцы", en:"Tap the spring months" },
        words:["Наурыз","Желтоқсан","Сәуір","Шілде","Мамыр","Қаңтар","Ақпан","Тамыз"],
        correctIdxs:[0,2,4] },
    ]
  },

  // ─── Kazakh · Lesson 12 — Sentence (Сөйлем) ───
  "kaz-12": {
    id:"kaz-12", subjectId:"kaz",
    titleByLang:{ kk:"Сөйлем", ru:"Предложение", en:"Sentence" },
    introByLang:{ kk:"Сөйлем түрлерін және оның мүшелерін үйренейік!", ru:"Изучим виды предложений и их члены!", en:"Let's learn sentence types and their members!" },
    questions:[
      { kind:"mc",
        promptByLang:{ kk:"Хабарлы сөйлемнің соңына қандай белгі қойылады?", ru:"Какой знак ставится в конце повествовательного предложения?", en:"What punctuation ends a declarative sentence?" },
        options:["!","?",".","…"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Сен кімсің?» — бұл қандай сөйлем?", ru:"«Сен кімсің?» (Кто ты?) — это какое предложение?", en:"'Who are you?' — what type of sentence is this?" },
        options:["Хабарлы / Повествовательное","Сұраулы / Вопросительное","Лепті / Восклицательное","Бұйрықты / Побудительное"], answer:1 },
      { kind:"tap",
        promptByLang:{ kk:"Сұраулы сөйлемдерді тап", ru:"Найди вопросительные предложения", en:"Tap the interrogative (question) sentences" },
        words:["Бала ойнайды.","Сен барасың ба?","Мектеп үлкен!","Қайда барасың?","Күн жылы.","Ол кімге жазды?","Балалар келді.","Анаң жақсы."],
        correctIdxs:[1,3,5] },
      { kind:"mc",
        promptByLang:{ kk:"Сөйлемнің негізгі мүшелері қайсылар?", ru:"Какие главные члены предложения?", en:"What are the main members of a sentence?" },
        options:["Зат есім мен сын есім / Существительное и прилагательное","Бастауыш пен баяндауыш / Подлежащее и сказуемое","Толықтауыш пен пысықтауыш / Дополнение и обстоятельство","Барлығы дұрыс / Все верно"], answer:1 },
      { kind:"word",
        storyByLang:{ kk:"«Болат кітап оқыды» сөйлемінде бастауыш қайсысы?", ru:"Какое подлежащее в предложении «Болат кітап оқыды»?", en:"What is the subject in 'Bolat read a book'?" },
        options:["кітап / книга","оқыды / читал","Болат / Болат","жоқ / нет"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"Қазақ тілінде сөйлемде баяндауыш қай жерде тұрады?", ru:"Где в казахском предложении стоит сказуемое?", en:"Where does the predicate usually stand in a Kazakh sentence?" },
        options:["Басында / В начале","Ортасында / В середине","Соңында / В конце","Кез келген жерде / В любом месте"], answer:2 },
      { kind:"mc",
        promptByLang:{ kk:"«Жарайсың!» — бұл қандай сөйлем?", ru:"«Жарайсың!» (Молодец!) — какое это предложение?", en:"'Well done!' — what type of sentence is this?" },
        options:["Хабарлы / Повествовательное","Сұраулы / Вопросительное","Лепті / Восклицательное","Бұйрықты / Побудительное"], answer:2 },
    ]
  },
};

// ────────────────────────────────────────────────────────────────────
// Clock Lesson Generator  (fresh random questions each session)
// ────────────────────────────────────────────────────────────────────

function generateClockLesson() {
  const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const fmt = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
  // minute → clock-face number the long hand points to
  const minPos = m => m === 0 ? 12 : m / 5;
  const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = ri(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Build 8 unique random clock questions
  const used = new Set();
  const clocks = [];
  while (clocks.length < 8) {
    const h = ri(1, 12);
    const m = MINS[ri(0, MINS.length - 1)];
    const key = `${h}:${m}`;
    if (used.has(key)) continue;
    used.add(key);

    const correctStr = fmt(h, m);
    const nextH = (h % 12) + 1;
    const pos = minPos(m);

    // 2 distractors: prefer same-hour/diff-minute and diff-hour/same-minute
    const dSet = new Set([correctStr]);
    for (const off of [15, -15, 30, 10, -10, 20, -20, 5, -5]) {
      if (dSet.size >= 3) break;
      const dm = ((m + off) % 60 + 60) % 60;
      if (MINS.includes(dm)) dSet.add(fmt(h, dm));
    }
    for (let dh = 1; dSet.size < 3; dh++) {
      dSet.add(fmt(((h - 1 + dh) % 12) + 1, m));
    }

    const opts = shuffle([...dSet]);
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
    });
  }

  // 2 time-fact MC questions inserted at positions 3 and 7
  const facts = [
    { kind:'mc', promptByLang:{ kk:'Бір сағатта қанша минут бар?', ru:'Сколько минут в одном часе?', en:'How many minutes are in one hour?' },
      options:['30','50','60','100'], answer:2,
      explainByLang:{ kk:'1 сағат = 60 минут ✓', ru:'1 час = 60 минут ✓', en:'1 hour = 60 minutes ✓' } },
    { kind:'mc', promptByLang:{ kk:'Тәулікте қанша сағат бар?', ru:'Сколько часов в сутках?', en:'How many hours are in a day?' },
      options:['12','20','24','48'], answer:2,
      explainByLang:{ kk:'Тәулік = 24 сағат ✓', ru:'Сутки = 24 часа ✓', en:'A day = 24 hours ✓' } },
    { kind:'word', image:'⏰',
      storyByLang:{ kk:'Сабақ сағат 8:00-де басталды және 45 минут жүрді. Қашан аяқталады?', ru:'Урок начался в 8:00 и длился 45 минут. Когда закончился?', en:'Class started at 8:00 and lasted 45 minutes. When did it end?' },
      options:['8:35','8:45','9:00','9:15'], answer:1 },
  ];
  shuffle(facts);
  clocks.splice(3, 0, facts[0]);
  clocks.splice(7, 0, facts[1]);

  return {
    id: 'math-time', subjectId: 'math',
    titleByLang: { kk:'Уақыт · сағат, минут', ru:'Время · часы и минуты', en:'Time · hours & minutes' },
    introByLang: { kk:'Аналогтік сағатты оқуды үйренеміз!', ru:'Учимся читать аналоговые часы!', en:"Let's learn to read analog clocks!" },
    questions: clocks,
  };
}

// Lessons that are generated fresh each session (factory functions)
const LESSON_FACTORIES = {
  'math-time': generateClockLesson,
};

// ────────────────────────────────────────────────────────────────────
// Math Practice Generator
// ────────────────────────────────────────────────────────────────────

function generateMathProblem(grade) {
  const r = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const ops = grade <= 1 ? ['+', '−']
             : grade <= 2 ? ['+', '−']
             : grade === 3 ? ['+', '−', '×']
             : ['+', '−', '×', '÷'];
  const op = ops[r(0, ops.length - 1)];

  let a, b, answer;
  if (op === '+') {
    const max = grade === 1 ? 9 : grade === 2 ? 50 : grade === 3 ? 500 : 5000;
    a = r(1, max); b = r(1, max);
    answer = a + b;
  } else if (op === '−') {
    const max = grade === 1 ? 9 : grade === 2 ? 99 : grade === 3 ? 999 : 9999;
    a = r(2, max); b = r(1, Math.max(1, a - 1));
    answer = a - b;
  } else if (op === '×') {
    a = r(2, grade >= 4 ? 99 : 12);
    b = r(2, grade >= 4 ? 12 : 9);
    answer = a * b;
  } else {
    b = r(2, 12);
    answer = r(1, grade >= 4 ? 99 : 12);
    a = b * answer;
  }

  const wrongs = new Set();
  const spread = Math.max(3, Math.ceil(answer * 0.15));
  for (let tries = 0; tries < 60 && wrongs.size < 3; tries++) {
    const w = answer + r(-spread, spread);
    if (w > 0 && w !== answer) wrongs.add(w);
  }
  for (let d = 1; wrongs.size < 3; d++) wrongs.add(answer + d);

  const options = [answer, ...[...wrongs].slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = r(0, i);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { kind: 'mc', big: true, prompt: `${a} ${op} ${b}`,
           options: options.map(String), answer: options.indexOf(answer) };
}

// ────────────────────────────────────────────────────────────────────
// Localization
// ────────────────────────────────────────────────────────────────────
const RT = {
  kk: {
    check:"Тексеру", continue:"Жалғастыру", next:"Келесі",
    skip:"Өткізу",
    correct:"Дұрыс!", wrong:"Қателестің", tryAgain:"Қайталап көр",
    rightAnswer:"Дұрыс жауап:",
    statCorrect:"Дұрыс", homeBtn:"Басты",
    typeHere:"Жауабыңды жаз",
    lessonComplete:"Сабақ аяқталды!",
    perfect:"Тамаша!", great:"Жарайсың!", good:"Жақсы!",
    xpEarned:"XP алдың", accuracy:"Дәлдік", time:"Уақыт",
    finish:"Аяқтау", retry:"Қайталау",
    quit:"Шығу", quitConfirm:"Шынымен шыққың келе ме? Прогресс жоғалады.",
    yes:"Иә", no:"Жоқ",
    matchPrompt:"Жұптарды тауып ал",
    streakBonus:"+10 күн қатарынан",
    startLesson:"Бастайық!", questions:"сұрақ",
  },
  ru: {
    check:"Проверить", continue:"Продолжить", next:"Дальше",
    skip:"Пропустить",
    correct:"Правильно!", wrong:"Неверно", tryAgain:"Попробуй ещё",
    rightAnswer:"Правильный ответ:",
    statCorrect:"Верно", homeBtn:"Домой",
    typeHere:"Введи ответ",
    lessonComplete:"Урок пройден!",
    perfect:"Идеально!", great:"Отлично!", good:"Молодец!",
    xpEarned:"XP получено", accuracy:"Точность", time:"Время",
    finish:"Завершить", retry:"Повторить",
    quit:"Выйти", quitConfirm:"Точно выйти? Прогресс пропадёт.",
    yes:"Да", no:"Нет",
    matchPrompt:"Найди пары",
    streakBonus:"+10 дней подряд",
    startLesson:"Начнём!", questions:"вопросов",
  },
  en: {
    check:"Check", continue:"Continue", next:"Next",
    skip:"Skip",
    correct:"Correct!", wrong:"Not quite", tryAgain:"Try again",
    rightAnswer:"Correct answer:",
    statCorrect:"Correct", homeBtn:"Home",
    typeHere:"Type your answer",
    lessonComplete:"Lesson complete!",
    perfect:"Perfect!", great:"Great work!", good:"Nice!",
    xpEarned:"XP earned", accuracy:"Accuracy", time:"Time",
    finish:"Finish", retry:"Try Again",
    quit:"Quit", quitConfirm:"Quit lesson? Progress will be lost.",
    yes:"Yes", no:"No",
    matchPrompt:"Find the pairs",
    streakBonus:"+10 day streak",
    startLesson:"Let's go!", questions:"questions",
  }
};

const pickLang = (obj, lang) => obj?.[lang] ?? obj?.en ?? Object.values(obj || {})[0];

// ────────────────────────────────────────────────────────────────────
// Question components
// ────────────────────────────────────────────────────────────────────

function BigMathPrompt({ text }) {
  const parts = text.split(/( [+−×÷] )/);
  return (
    <div className="big-prompt">
      {parts.map((p, i) =>
        /^ [+−×÷] $/.test(p)
          ? <span key={i} className="big-op">{p}</span>
          : p
      )}
    </div>
  );
}

function QMC({ q, lang, locked, picked, onPick }) {
  const prompt = q.promptByLang ? pickLang(q.promptByLang, lang) : q.prompt;
  return (
    <div className="qbody">
      {q.image && <div className="q-image">{q.image}</div>}
      {q.big ? <BigMathPrompt text={prompt} /> : <div className="text-prompt">{prompt}</div>}
      <div className={"opts " + (q.big ? "grid-2" : "stack")}>
        {q.options.map((o, i) => {
          let cls = "opt";
          if (locked) {
            if (i === q.answer) cls += " right";
            else if (i === picked) cls += " wrong";
            else cls += " dim";
          } else if (i === picked) cls += " sel";
          return (
            <button key={i} className={cls} onClick={()=>!locked && onPick(i)}>
              <span className="opt-key">{String.fromCharCode(65+i)}</span>
              <span className="opt-text">{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QType({ q, lang, locked, value, onChange, correct }) {
  const inputRef = useRef(null);
  const prompt = q.promptByLang ? pickLang(q.promptByLang, lang) : q.prompt;
  useEffect(()=>{ if (!locked) setTimeout(()=>inputRef.current?.focus(), 80); }, [q, locked]);
  return (
    <div className="qbody">
      {q.image && <div className="q-image">{q.image}</div>}
      <BigMathPrompt text={prompt} />
      <div className="type-wrap">
        <input
          ref={inputRef}
          className={"type-input " + (locked ? (correct ? "right" : "wrong") : "")}
          placeholder={pickLang(RT, lang).typeHere}
          value={value ?? ""}
          disabled={locked}
          onChange={(e)=>onChange(e.target.value.replace(/\D/g,''))}
          inputMode="numeric"
          pattern="[0-9]*"
        />
        {q.units && <span className="units">{q.units}</span>}
      </div>
    </div>
  );
}

function QTap({ q, lang, locked, picked, onToggle }) {
  const prompt = q.promptByLang ? pickLang(q.promptByLang, lang) : q.prompt;
  // Shuffle display order once per question mount so correct answers
  // aren't always at predictable even positions (0,2,4,6…)
  const shuffled = useMemo(() => {
    const arr = q.words.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr; // shuffled[displayPos] = originalIndex
  }, [q]);
  return (
    <div className="qbody">
      {q.image && <div className="q-image">{q.image}</div>}
      <div className="text-prompt">{prompt}</div>
      <div className="tap-grid">
        {shuffled.map((origIdx) => {
          const w = q.words[origIdx];
          const isCorrectAns = q.correctIdxs.includes(origIdx);
          const isPicked = picked.includes(origIdx);
          let cls = "tap-w";
          if (locked) {
            if (isCorrectAns && isPicked) cls += " right";
            else if (isCorrectAns && !isPicked) cls += " missed";
            else if (!isCorrectAns && isPicked) cls += " wrong";
            else cls += " dim";
          } else if (isPicked) cls += " sel";
          return <button key={origIdx} className={cls} onClick={()=>!locked && onToggle(origIdx)}>{w}</button>;
        })}
      </div>
    </div>
  );
}

function QWord({ q, lang, locked, picked, onPick }) {
  const story = pickLang(q.storyByLang, lang);
  return (
    <div className="qbody">
      {q.image && <div className="q-image">{q.image}</div>}
      <div className="story">
        <div className="story-ic">📖</div>
        <div className="story-text">{story}</div>
      </div>
      <div className="opts grid-2">
        {q.options.map((o, i) => {
          let cls = "opt";
          if (locked) {
            if (i === q.answer) cls += " right";
            else if (i === picked) cls += " wrong";
            else cls += " dim";
          } else if (i === picked) cls += " sel";
          return (
            <button key={i} className={cls} onClick={()=>!locked && onPick(i)}>
              <span className="opt-key">{String.fromCharCode(65+i)}</span>
              <span className="opt-text">{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QMatch({ q, lang, locked, state, setState }) {
  const prompt = q.promptByLang ? pickLang(q.promptByLang, lang) : q.prompt;
  const groups = pickLang(q.groupsByLang, lang);
  const pairs = state.pairs || {};
  const pending = state.pendingItem;

  const pickItem = (i) => {
    if (locked || pairs[i] !== undefined) return;
    setState({ ...state, pendingItem: pending === i ? null : i });
  };
  const pickGroup = (g) => {
    if (locked || pending === null || pending === undefined) return;
    setState({ pairs: { ...pairs, [pending]: g }, pendingItem: null });
  };

  return (
    <div className="qbody">
      <div className="text-prompt">{prompt}</div>
      <div className="match-wrap">
        <div className="match-items">
          {q.items.map((it, i)=>{
            const placed = pairs[i];
            let cls = "match-item";
            if (placed !== undefined) {
              cls += locked ? (placed === it.group ? " right" : " wrong") : " placed";
            } else if (pending === i) cls += " active";
            return (
              <button key={i} className={cls} onClick={()=>pickItem(i)}>
                <span>{it.text}</span>
                {placed !== undefined && <span className="badge">{groups[placed]}</span>}
              </button>
            );
          })}
        </div>
        <div className="match-groups">
          {groups.map((g, gi)=>(
            <button key={gi} className={"match-group " + (pending !== null && pending !== undefined ? "ready":"")} onClick={()=>pickGroup(gi)}>
              <span className="g-name">{g}</span>
              <span className="g-count">{Object.values(pairs).filter(v=>v===gi).length}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Analog clock SVG
// ────────────────────────────────────────────────────────────────────

function ClockFace({ h, m, size = 180 }) {
  const cx = 60, cy = 60, r = 50;
  const minAngle = (m / 60) * 360;
  const hrAngle  = ((h % 12) / 12) * 360 + (m / 60) * 30;
  const hand = (angle, len, w, color) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return <line x1={cx} y1={cy}
                 x2={cx + Math.cos(rad)*len} y2={cy + Math.sin(rad)*len}
                 stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a     = ((i * 30) - 90) * Math.PI / 180;
    const isMaj = i % 3 === 0;
    const inner = r - (isMaj ? 10 : 6);
    return <line key={i}
                 x1={cx + Math.cos(a)*(r-2)} y1={cy + Math.sin(a)*(r-2)}
                 x2={cx + Math.cos(a)*inner}  y2={cy + Math.sin(a)*inner}
                 stroke="#9CA3AF" strokeWidth={isMaj ? 2.5 : 1.2} strokeLinecap="round" />;
  });
  const nums = [12,3,6,9].map((num, i) => {
    const a = ((i * 90) - 90) * Math.PI / 180;
    return <text key={num}
                 x={cx + Math.cos(a)*(r-17)} y={cy + Math.sin(a)*(r-17) + 4}
                 textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">{num}</text>;
  });
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{display:'block'}}>
      <circle cx={cx} cy={cy} r={r+8} fill="white" stroke="#E5E7EB" strokeWidth="2"
              style={{filter:'drop-shadow(0 2px 8px rgba(0,0,0,.08))'}} />
      <circle cx={cx} cy={cy} r={r} fill="#FAFAFA" />
      {ticks}
      {nums}
      {hand(hrAngle, 24, 4.5, '#1F2937')}
      {hand(minAngle, 36, 3,   '#2563EB')}
      <circle cx={cx} cy={cy} r={4.5} fill="#F97316" />
    </svg>
  );
}

// Animated step-by-step hint (like Lovable's AIThinking — shows steps sequentially)
function StepHint({ steps }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(0);
    if (steps.length <= 1) return;
    const id = setInterval(() => setActive(i => i + 1 < steps.length ? i + 1 : i), 900);
    return () => clearInterval(id);
  }, [steps]);
  return (
    <div className="step-hint">
      {steps.map((s, i) => (
        <div key={i} className={'sh-step ' + (i < active ? 'past' : i === active ? 'current' : 'future')}>
          <span className={'sh-num ' + (i <= active ? 'lit' : '')}>{i + 1}</span>
          <span className="sh-text">{s}</span>
        </div>
      ))}
    </div>
  );
}

// Clock-reading multiple choice question
function QClock({ q, lang, locked, picked, onPick }) {
  const prompt = q.promptByLang ? pickLang(q.promptByLang, lang) : q.prompt;
  return (
    <div className="qbody">
      <div className="text-prompt" style={{fontSize:18, paddingBottom:4}}>{prompt}</div>
      <div className="clock-wrap">
        <ClockFace h={q.clockH} m={q.clockM} />
      </div>
      <div className="opts grid-3">
        {q.options.map((o, i) => {
          let cls = 'opt clock-time-opt';
          if (locked) {
            if (i === q.answer)  cls += ' right';
            else if (i === picked) cls += ' wrong';
            else                 cls += ' dim';
          } else if (i === picked) cls += ' sel';
          return (
            <button key={i} className={cls} onClick={() => !locked && onPick(i)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// LessonRunner
// ────────────────────────────────────────────────────────────────────

function IntroScreen({ lesson, lang, rt, total, onStart, onClose }) {
  const title = pickLang(lesson.titleByLang, lang);
  const intro = pickLang(lesson.introByLang, lang);
  return (
    <div className="lesson-shell">
      <div className="lesson-top">
        <button className="lt-close" onClick={onClose} aria-label="Quit">✕</button>
        <div className="lt-bar"><div className="lt-bar-fill" style={{width:'0%'}} /></div>
        <div style={{width:40}} />
      </div>
      <div className="lesson-intro">
        <div className="li-subject">{lesson.subjectId}</div>
        <div className="li-title">{title}</div>
        <div className="li-text">{intro}</div>
        <div className="li-meta">
          <div className="li-pill">📝 {total} {rt.questions}</div>
          <div className="li-pill">⏱ ~{Math.ceil(total * 0.5)} min</div>
        </div>
        <button className="li-start" onClick={onStart}>{rt.startLesson} →</button>
      </div>
    </div>
  );
}

function LessonRunner({ lessonId, lang, onClose, onComplete }) {
  const lesson = useMemo(() => {
    const factory = LESSON_FACTORIES[lessonId];
    return factory ? factory() : LESSONS[lessonId];
  }, [lessonId]);
  const rt = RT[lang] || RT.en;

  const resume = loadResume(lessonId);

  const [showIntro, setShowIntro] = useState(!resume && !!lesson.introByLang);
  const [idx, setIdx] = useState(resume?.idx ?? 0);
  const [answers, setAnswers] = useState(resume?.answers ?? {});
  const [matchState, setMatchState] = useState(resume?.matchState ?? {});
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const [startedAt] = useState(Date.now());
  const [correctCount, setCorrectCount] = useState(resume?.correctCount ?? 0);
  const [showQuit, setShowQuit] = useState(false);
  const [qKey, setQKey] = useState(0);

  // correctRef stays in sync with correctCount for use in advance()
  const correctRef = useRef(resume?.correctCount ?? 0);
  useEffect(() => { correctRef.current = correctCount; }, [correctCount]);

  const total = lesson.questions.length;
  const q = lesson.questions[idx];
  const progressPct = ((idx + (locked ? 1 : 0)) / total) * 100;

  const setAns = (v) => setAnswers(a => ({ ...a, [idx]: v }));
  const current = answers[idx];
  const currentMatch = matchState[idx] || { pairs:{}, pendingItem:null };
  const setCurrentMatch = (s) => setMatchState(m => ({ ...m, [idx]: s }));

  const canCheck = (() => {
    if (q.kind === 'mc' || q.kind === 'word') return current !== undefined && current !== null;
    if (q.kind === 'type') return current !== undefined && String(current).trim() !== "";
    if (q.kind === 'tap') return Array.isArray(current) && current.length > 0;
    if (q.kind === 'match') return Object.keys(currentMatch.pairs||{}).length === q.items.length;
    return false;
  })();

  const evaluate = () => {
    if (q.kind === 'mc' || q.kind === 'word') return current === q.answer;
    if (q.kind === 'type') return Number(current) === Number(q.answer);
    if (q.kind === 'tap') {
      const want = [...q.correctIdxs].sort();
      const have = [...current].sort();
      return want.length === have.length && want.every((v,i)=>v===have[i]);
    }
    if (q.kind === 'match') return q.items.every((it,i) => currentMatch.pairs[i] === it.group);
    return false;
  };

  const check = () => {
    const right = evaluate();
    setLocked(true);
    setFeedback(right ? 'right' : 'wrong');
    if (right) {
      soundCorrect();
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    } else {
      soundWrong();
    }
  };

  const pickAndCheck = (v) => {
    setAns(v);
    const right = (q.kind === 'mc' || q.kind === 'word' || q.kind === 'clock') ? v === q.answer : false;
    setLocked(true);
    setFeedback(right ? 'right' : 'wrong');
    if (right) {
      soundCorrect();
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    } else {
      soundWrong();
    }
  };

  const advance = () => {
    const finalCorrect = correctRef.current;
    const nextIdx = idx + 1;
    const finished = nextIdx >= total;

    if (finished) {
      clearResume();
      const stars = finalCorrect >= total ? 3 : finalCorrect >= total - 2 ? 2 : 1;
      const xp = 15 + finalCorrect * 5 + (stars === 3 ? 15 : stars === 2 ? 5 : 0);
      soundComplete();
      setDone(true);
      onComplete?.({ lessonId, correct: finalCorrect, total, stars, xp });
      return;
    }

    saveResume({ lessonId, idx: nextIdx, answers, matchState, correctCount: finalCorrect });
    setIdx(nextIdx);
    setLocked(false);
    setFeedback(null);
    setQKey(k => k + 1);
  };

  const retryQuestion = () => {
    setAns(undefined);
    setCurrentMatch({ pairs: {}, pendingItem: null });
    setLocked(false);
    setFeedback(null);
  };

  const retry = () => {
    clearResume();
    correctRef.current = 0;
    setIdx(0);
    setAnswers({});
    setMatchState({});
    setLocked(false);
    setFeedback(null);
    setCorrectCount(0);
    setDone(false);
    setQKey(k => k + 1);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Enter') {
        if (!locked && canCheck) check();
        else if (locked) advance();
      } else if (e.key === 'Escape') {
        setShowQuit(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  if (showIntro) {
    return (
      <IntroScreen
        lesson={lesson} lang={lang} rt={rt} total={total}
        onStart={() => setShowIntro(false)}
        onClose={onClose}
      />
    );
  }

  if (done) {
    const finalCorrect = correctRef.current;
    const accuracy = Math.round((finalCorrect / total) * 100);
    const stars = finalCorrect >= total ? 3 : finalCorrect >= total - 2 ? 2 : 1;
    const xp = 15 + finalCorrect * 5 + (stars === 3 ? 15 : stars === 2 ? 5 : 0);
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    const banner = stars === 3 ? rt.perfect : stars === 2 ? rt.great : rt.good;
    return (
      <CompleteScreen
        lesson={lesson} lang={lang} rt={rt}
        stars={stars} xp={xp} accuracy={accuracy}
        elapsed={elapsed} correct={finalCorrect} total={total}
        banner={banner}
        onFinish={onClose}
        onRetry={retry}
      />
    );
  }

  const title = pickLang(lesson.titleByLang, lang);

  return (
    <div className="lesson-shell">
      <div className="lesson-top">
        <button className="lt-close" onClick={()=>setShowQuit(true)} aria-label="Quit">✕</button>
        <div className="lt-bar">
          <div className="lt-bar-fill" style={{width: progressPct + '%'}} />
        </div>
      </div>

      <div className="lesson-stage">
        <div className="lesson-title-row">
          <div className="lt-eyebrow">{title}</div>
          <div className="lt-counter">{idx+1} / {total}</div>
        </div>

        <div key={qKey}>
          {q.kind === 'mc'   && <QMC   q={q} lang={lang} locked={locked} picked={current} onPick={pickAndCheck} />}
          {q.kind === 'word' && <QWord q={q} lang={lang} locked={locked} picked={current} onPick={pickAndCheck} />}
          {q.kind === 'type' && <QType q={q} lang={lang} locked={locked} value={current} onChange={setAns} correct={feedback==='right'} />}
          {q.kind === 'tap'  && <QTap  q={q} lang={lang} locked={locked}
            picked={current || []}
            onToggle={(i)=>{
              const arr = current ? [...current] : [];
              const at = arr.indexOf(i);
              if (at >= 0) arr.splice(at,1); else arr.push(i);
              setAns(arr);
            }} />}
          {q.kind === 'match' && <QMatch q={q} lang={lang} locked={locked}
            state={currentMatch} setState={setCurrentMatch} />}
          {q.kind === 'clock' && <QClock q={q} lang={lang} locked={locked} picked={current} onPick={pickAndCheck} />}
        </div>
      </div>

      <div className={"feedback " + (feedback || "")}>
        {feedback === 'right' && (
          <div className="fb-inner">
            <div className="fb-ic ok">✓</div>
            <div className="fb-msg">
              <div className="fb-title">{rt.correct}</div>
              <div className="fb-sub">+5 XP</div>
            </div>
            <button className="fb-btn" onClick={advance}>{rt.continue}</button>
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="fb-inner">
            <div className="fb-ic no">✕</div>
            <div className="fb-msg">
              <div className="fb-title">{rt.wrong}</div>
              <div className="fb-sub">
                <span className="fb-ans-label">{rt.rightAnswer}</span>
                <span className="fb-ans-value">{rightAnswerText(q, lang)}</span>
              </div>
              {q.stepsByLang
                ? <StepHint key={`${q.clockH}-${q.clockM}`} steps={pickLang(q.stepsByLang, lang)} />
                : (q.explain || q.explainByLang?.[lang]) &&
                  <div className="fb-explain">{q.explainByLang?.[lang] || q.explain}</div>
              }
            </div>
            <div className="fb-btns">
              <button className="fb-btn fb-btn-retry" onClick={retryQuestion}>{rt.tryAgain}</button>
              <button className="fb-btn fb-btn-wrong" onClick={advance}>{rt.next}</button>
            </div>
          </div>
        )}
        {!feedback && (
          <div className="fb-inner">
            <button className="fb-btn ghost" onClick={advance}>{rt.skip}</button>
            {(q.kind !== 'mc' && q.kind !== 'word') && (
              <button className={"fb-btn primary " + (canCheck ? "" : "disabled")} disabled={!canCheck} onClick={check}>
                {rt.check}
              </button>
            )}
          </div>
        )}
      </div>

      {showQuit && (
        <div className="qmodal-back" onClick={()=>setShowQuit(false)}>
          <div className="qmodal" onClick={(e)=>e.stopPropagation()}>
            <h3>{rt.quitConfirm}</h3>
            <div className="qmodal-foot">
              <button className="btn ghost" onClick={()=>setShowQuit(false)}>{rt.no}</button>
              <button className="btn prim" onClick={onClose}>{rt.yes}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rightAnswerText(q, lang) {
  if (q.kind === 'mc' || q.kind === 'word' || q.kind === 'clock') return String(q.options[q.answer]);
  if (q.kind === 'type') return String(q.answer);
  if (q.kind === 'tap') return q.correctIdxs.map(i=>q.words[i]).join(", ");
  if (q.kind === 'match') return "—";
  return "";
}

// ────────────────────────────────────────────────────────────────────
// CompleteScreen
// ────────────────────────────────────────────────────────────────────

function CompleteScreen({ lesson, lang, rt, stars, xp, accuracy, elapsed, correct, total, banner, onFinish, onRetry }) {
  return (
    <div className="lesson-shell complete">
      <div className="complete-card">
        <div className="comp-trophy">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H3.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h2.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
          </svg>
        </div>

        <div className="comp-banner">{banner}</div>
        <div className="comp-sub">{rt.lessonComplete}</div>

        <div className="comp-stats">
          <div className="cs">
            <div className="cs-v cs-green">{correct}/{total}</div>
            <div className="cs-l">{rt.statCorrect}</div>
          </div>
          <div className="cs">
            <div className="cs-v cs-blue">{accuracy}%</div>
            <div className="cs-l">{rt.accuracy}</div>
          </div>
          <div className="cs">
            <div className="cs-v cs-orange">+{xp}</div>
            <div className="cs-l">{rt.xpEarned}</div>
          </div>
        </div>

        <div className="comp-btns">
          {onRetry && <button className="btn ghost comp-ghost" onClick={onRetry}>↺ {rt.retry}</button>}
          <button className="btn prim comp-prim" onClick={onFinish}>🏠 {rt.homeBtn}</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// MathSprintMinute — 1-minute timed math sprint
// ────────────────────────────────────────────────────────────────────

const SPRINT_DURATION = 60;
const SPRINT_LABELS = {
  kk: {
    title:    'Математикалық спринт',
    desc:     '60 секундта мүмкіндігінше\nкөп мысал шеш!',
    start:    'Бастау →',
    record:   'Рекорд',
    newBest:  'Жаңа рекорд! 🎉',
    done:     (n) => `60 секундта ${n} мысал шешілді`,
    correct:  'дұрыс',
    attempted:'берілді',
  },
  ru: {
    title:    'Математический спринт',
    desc:     'Реши как можно больше примеров\nза 60 секунд!',
    start:    'Старт →',
    record:   'Рекорд',
    newBest:  'Новый рекорд! 🎉',
    done:     (n) => `${n} правильных за 60 секунд`,
    correct:  'верно',
    attempted:'предложено',
  },
  en: {
    title:    'Math Sprint',
    desc:     'Solve as many problems\nas you can in 60 seconds!',
    start:    'Start →',
    record:   'Best',
    newBest:  'New Record! 🎉',
    done:     (n) => `${n} correct in 60 seconds`,
    correct:  'correct',
    attempted:'total',
  },
};

function MathSprintMinute({ grade, lang, onClose }) {
  const rt  = RT[lang] || RT.en;
  const SL  = SPRINT_LABELS[lang] || SPRINT_LABELS.en;

  const [phase,      setPhase]      = useState('start');
  const [tLeft,      setTLeft]      = useState(SPRINT_DURATION);
  const [score,      setScore]      = useState(0);
  const [total,      setTotal]      = useState(0);
  const [idx,        setIdx]        = useState(0);
  const [questions,  setQuestions]  = useState(() =>
    Array.from({ length: 40 }, () => generateMathProblem(grade || 2))
  );
  const [chosen,     setChosen]     = useState(null);
  const [isNewBest,  setIsNewBest]  = useState(false);
  const [best,       setBest]       = useState(() => {
    try { return parseInt(localStorage.getItem('mektep_sprint1m_best') || '0'); } catch(e) { return 0; }
  });

  const scoreRef = useRef(0);
  const totalRef = useRef(0);
  const busyRef  = useRef(false);

  const q = questions[idx % questions.length];

  // Refill question pool when running low
  useEffect(() => {
    if (idx > questions.length - 15) {
      setQuestions(prev => [
        ...prev,
        ...Array.from({ length: 20 }, () => generateMathProblem(grade || 2)),
      ]);
    }
  }, [idx, grade]);

  // Global countdown
  useEffect(() => {
    if (phase !== 'play') return;
    if (tLeft <= 0) {
      const fs = scoreRef.current;
      soundComplete();
      const stored = parseInt(localStorage.getItem('mektep_sprint1m_best') || '0');
      if (fs > stored) {
        setIsNewBest(true);
        setBest(fs);
        try { localStorage.setItem('mektep_sprint1m_best', String(fs)); } catch(e) {}
      }
      setPhase('done');
      return;
    }
    if (tLeft <= 5) soundTick();
    const id = setTimeout(() => setTLeft(n => n - 1), 1000);
    return () => clearTimeout(id);
  }, [tLeft, phase]);

  const go = (picked) => {
    if (phase !== 'play' || busyRef.current) return;
    busyRef.current = true;
    document.activeElement?.blur();
    const ok = picked === q.answer;
    setChosen(picked);
    totalRef.current++;
    setTotal(n => n + 1);
    if (ok) { soundCorrect(); scoreRef.current++; setScore(n => n + 1); }
    else soundWrong();
    setTimeout(() => {
      setIdx(i => i + 1);
      setChosen(null);
      busyRef.current = false;
    }, ok ? 260 : 680);
  };

  const restart = () => {
    scoreRef.current = 0; totalRef.current = 0; busyRef.current = false;
    setScore(0); setTotal(0); setIdx(0); setChosen(null);
    setTLeft(SPRINT_DURATION); setIsNewBest(false);
    setQuestions(Array.from({ length: 40 }, () => generateMathProblem(grade || 2)));
    setPhase('start');
  };

  // ── Start screen ────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="sprint-shell">
        <button className="lt-close sprint-close" onClick={onClose}>✕</button>
        <div className="sprint-start">
          <div className="sprint-start-icon">⏱</div>
          <h2 className="sprint-title">{SL.title}</h2>
          <p className="sprint-desc">
            {SL.desc.split('\n').map((l, i) => <span key={i}>{l}{i===0?<br/>:''}</span>)}
          </p>
          <div className="sprint-big-num">60<span>s</span></div>
          {best > 0 && (
            <div className="sprint-best-chip">🏆 {SL.record}: {best}</div>
          )}
          <button className="sprint-start-btn" onClick={() => setPhase('play')}>
            {SL.start}
          </button>
        </div>
      </div>
    );
  }

  // ── Done screen ─────────────────────────────────────────────────
  if (phase === 'done') {
    const pct   = total > 0 ? Math.round(score / total * 100) : 0;
    const emoji = score >= 25 ? '🏆' : score >= 16 ? '⭐' : score >= 8 ? '👍' : '💪';
    return (
      <div className="sprint-shell">
        <div className="sprint-done">
          {isNewBest && score > 0 && (
            <div className="sprint-new-best">{SL.newBest}</div>
          )}
          <div className="sprint-done-emoji">{emoji}</div>

          {/* ── Two-stat card ── */}
          <div className="sprint-stat-card">
            <div className="sprint-stat">
              <div className="sprint-stat-num ok">{score}</div>
              <div className="sprint-stat-label">{SL.correct}</div>
            </div>
            <div className="sprint-stat-div" />
            <div className="sprint-stat">
              <div className="sprint-stat-num">{total}</div>
              <div className="sprint-stat-label">{SL.attempted}</div>
            </div>
          </div>

          <div className="sprint-done-sub">{SL.done(score)}</div>

          {total > 0 && (
            <div className="sprint-acc-wrap">
              <div className="sprint-acc-bar">
                <div className="sprint-acc-fill" style={{ width: pct + '%' }} />
              </div>
              <span className="sprint-acc-pct">{pct}%</span>
            </div>
          )}

          <div className="sprint-done-btns">
            <button className="btn ghost" onClick={onClose}>{rt.quit}</button>
            <button className="btn prim" onClick={restart}>{rt.retry} ↺</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Play screen ─────────────────────────────────────────────────
  const isLow    = tLeft <= 10;
  const timerPct = (tLeft / SPRINT_DURATION) * 100;

  return (
    <div className="sprint-shell">
      <div className="sprint-top">
        <div className={"sprint-timer" + (isLow ? " low" : "")}>{tLeft}</div>
        <div className="sprint-score-live">{score} <span>✓</span></div>
      </div>
      <div className="sprint-progress">
        <div className="sprint-progress-fill"
          style={{ width: timerPct + '%', background: isLow ? '#EF4444' : 'var(--brand)' }} />
      </div>
      <div className="sprint-body">
        <BigMathPrompt text={q.prompt} />
        <div className="sprint-opts">
          {q.options.map((opt, i) => {
            let cls = 'sprint-opt';
            if (chosen !== null) {
              if (i === q.answer)            cls += ' correct';
              else if (i === chosen)         cls += ' wrong';
              else                           cls += ' dim';
            }
            return (
              <button key={`${idx}-${i}`} className={cls}
                disabled={chosen !== null} onClick={() => go(i)}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Expose to sequential loader
Object.assign(window, { LessonRunner, MathSprintMinute, LESSONS, RT_LESSON: RT, pickLang,
  soundCorrect, soundWrong, soundComplete, soundTick });
