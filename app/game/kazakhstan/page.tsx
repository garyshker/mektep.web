'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

type ByLang = { ru: string; kk: string; en: string }
type Region = { id: string; name: ByLang; center: ByLang }
type Sym = { id: string; emoji: string; q: ByLang; answer: ByLang; distractors: ByLang[] }

// 17 regions of Kazakhstan + their administrative centers
const REGIONS: Region[] = [
  { id: 'akmola',  name: { kk: 'Ақмола облысы', ru: 'Акмолинская', en: 'Akmola' }, center: { kk: 'Көкшетау', ru: 'Кокшетау', en: 'Kokshetau' } },
  { id: 'aktobe',  name: { kk: 'Ақтөбе облысы', ru: 'Актюбинская', en: 'Aktobe' }, center: { kk: 'Ақтөбе', ru: 'Актобе', en: 'Aktobe' } },
  { id: 'almaty',  name: { kk: 'Алматы облысы', ru: 'Алматинская', en: 'Almaty region' }, center: { kk: 'Қонаев', ru: 'Конаев', en: 'Qonaev' } },
  { id: 'atyrau',  name: { kk: 'Атырау облысы', ru: 'Атырауская', en: 'Atyrau' }, center: { kk: 'Атырау', ru: 'Атырау', en: 'Atyrau' } },
  { id: 'east',    name: { kk: 'Шығыс Қазақстан', ru: 'Восточно-Казахстанская', en: 'East Kazakhstan' }, center: { kk: 'Өскемен', ru: 'Усть-Каменогорск', en: 'Oskemen' } },
  { id: 'jambyl',  name: { kk: 'Жамбыл облысы', ru: 'Жамбылская', en: 'Jambyl' }, center: { kk: 'Тараз', ru: 'Тараз', en: 'Taraz' } },
  { id: 'west',    name: { kk: 'Батыс Қазақстан', ru: 'Западно-Казахстанская', en: 'West Kazakhstan' }, center: { kk: 'Орал', ru: 'Уральск', en: 'Oral' } },
  { id: 'karaganda', name: { kk: 'Қарағанды облысы', ru: 'Карагандинская', en: 'Karaganda' }, center: { kk: 'Қарағанды', ru: 'Караганда', en: 'Karaganda' } },
  { id: 'kostanay', name: { kk: 'Қостанай облысы', ru: 'Костанайская', en: 'Kostanay' }, center: { kk: 'Қостанай', ru: 'Костанай', en: 'Kostanay' } },
  { id: 'kyzylorda', name: { kk: 'Қызылорда облысы', ru: 'Кызылординская', en: 'Kyzylorda' }, center: { kk: 'Қызылорда', ru: 'Кызылорда', en: 'Kyzylorda' } },
  { id: 'mangystau', name: { kk: 'Маңғыстау облысы', ru: 'Мангистауская', en: 'Mangystau' }, center: { kk: 'Ақтау', ru: 'Актау', en: 'Aktau' } },
  { id: 'pavlodar', name: { kk: 'Павлодар облысы', ru: 'Павлодарская', en: 'Pavlodar' }, center: { kk: 'Павлодар', ru: 'Павлодар', en: 'Pavlodar' } },
  { id: 'north',   name: { kk: 'Солтүстік Қазақстан', ru: 'Северо-Казахстанская', en: 'North Kazakhstan' }, center: { kk: 'Петропавл', ru: 'Петропавловск', en: 'Petropavl' } },
  { id: 'turkistan', name: { kk: 'Түркістан облысы', ru: 'Туркестанская', en: 'Turkistan' }, center: { kk: 'Түркістан', ru: 'Туркестан', en: 'Turkistan' } },
  { id: 'abai',    name: { kk: 'Абай облысы', ru: 'Абайская', en: 'Abai' }, center: { kk: 'Семей', ru: 'Семей', en: 'Semey' } },
  { id: 'jetisu',  name: { kk: 'Жетісу облысы', ru: 'Жетысуская', en: 'Jetisu' }, center: { kk: 'Талдықорған', ru: 'Талдыкорган', en: 'Taldykorgan' } },
  { id: 'ulytau',  name: { kk: 'Ұлытау облысы', ru: 'Улытауская', en: 'Ulytau' }, center: { kk: 'Жезқазған', ru: 'Жезказган', en: 'Jezkazgan' } },
]

// State symbols & facts
const SYMBOLS: Sym[] = [
  { id: 'capital', emoji: '🏛️', q: { kk: 'Астанасы', ru: 'Столица страны', en: 'Capital' }, answer: { kk: 'Астана', ru: 'Астана', en: 'Astana' }, distractors: [{ kk: 'Алматы', ru: 'Алматы', en: 'Almaty' }, { kk: 'Шымкент', ru: 'Шымкент', en: 'Shymkent' }, { kk: 'Қарағанды', ru: 'Караганда', en: 'Karaganda' }] },
  { id: 'currency', emoji: '💰', q: { kk: 'Ұлттық валюта', ru: 'Валюта', en: 'Currency' }, answer: { kk: 'Теңге (₸)', ru: 'Тенге (₸)', en: 'Tenge (₸)' }, distractors: [{ kk: 'Рубль', ru: 'Рубль', en: 'Ruble' }, { kk: 'Сом', ru: 'Сом', en: 'Som' }, { kk: 'Доллар', ru: 'Доллар', en: 'Dollar' }] },
  { id: 'bird', emoji: '🦅', q: { kk: 'Тудағы құс', ru: 'Птица на флаге', en: 'Bird on the flag' }, answer: { kk: 'Бүркіт', ru: 'Беркут', en: 'Golden eagle' }, distractors: [{ kk: 'Сұңқар', ru: 'Сокол', en: 'Falcon' }, { kk: 'Қаршыға', ru: 'Ястреб', en: 'Hawk' }, { kk: 'Тырна', ru: 'Журавль', en: 'Crane' }] },
  { id: 'instrument', emoji: '🎵', q: { kk: 'Ұлттық аспап', ru: 'Нац. инструмент', en: 'National instrument' }, answer: { kk: 'Домбыра', ru: 'Домбра', en: 'Dombyra' }, distractors: [{ kk: 'Гитара', ru: 'Гитара', en: 'Guitar' }, { kk: 'Скрипка', ru: 'Скрипка', en: 'Violin' }, { kk: 'Баян', ru: 'Баян', en: 'Bayan' }] },
  { id: 'biggest', emoji: '🏙️', q: { kk: 'Ең үлкен қала', ru: 'Самый большой город', en: 'Largest city' }, answer: { kk: 'Алматы', ru: 'Алматы', en: 'Almaty' }, distractors: [{ kk: 'Астана', ru: 'Астана', en: 'Astana' }, { kk: 'Шымкент', ru: 'Шымкент', en: 'Shymkent' }, { kk: 'Тараз', ru: 'Тараз', en: 'Taraz' }] },
  { id: 'flagcolor', emoji: '🔵', q: { kk: 'Ту түсі', ru: 'Цвет флага', en: 'Flag color' }, answer: { kk: 'Көк', ru: 'Голубой', en: 'Sky blue' }, distractors: [{ kk: 'Жасыл', ru: 'Зелёный', en: 'Green' }, { kk: 'Қызыл', ru: 'Красный', en: 'Red' }, { kk: 'Сары', ru: 'Жёлтый', en: 'Yellow' }] },
  { id: 'language', emoji: '🗣️', q: { kk: 'Мемлекеттік тіл', ru: 'Гос. язык', en: 'State language' }, answer: { kk: 'Қазақ тілі', ru: 'Казахский', en: 'Kazakh' }, distractors: [{ kk: 'Орыс тілі', ru: 'Русский', en: 'Russian' }, { kk: 'Ағылшын тілі', ru: 'Английский', en: 'English' }, { kk: 'Өзбек тілі', ru: 'Узбекский', en: 'Uzbek' }] },
  { id: 'emblem', emoji: '⚪', q: { kk: 'Елтаңба ортасында', ru: 'В центре герба', en: 'Center of the emblem' }, answer: { kk: 'Шаңырақ', ru: 'Шанырак', en: 'Shanyraq' }, distractors: [{ kk: 'Жұлдыз', ru: 'Звезда', en: 'Star' }, { kk: 'Күн', ru: 'Солнце', en: 'Sun' }, { kk: 'Ай', ru: 'Луна', en: 'Moon' }] },
]

// Kazakhstan flag palette
const BG = '#E4F2F7', BLUE = '#1797B8', BLUE_DEEP = '#0E7E9B'

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
}

type RegionQuestion = { kind: 'center' | 'region'; region: Region; options: Region[] }
type SymbolQuestion = { kind: 'symbol'; symbol: Sym; options: ByLang[] }
type Question = RegionQuestion | SymbolQuestion

function regionQ(kind: 'center' | 'region', region: Region): RegionQuestion {
  const distractors = shuffle(REGIONS.filter(r => r.id !== region.id)).slice(0, 3)
  return { kind, region, options: shuffle([region, ...distractors]) }
}
function symbolQ(s: Sym): SymbolQuestion {
  return { kind: 'symbol', symbol: s, options: shuffle([s.answer, ...s.distractors]) }
}

function buildQuiz(): Question[] {
  const regs = shuffle(REGIONS)
  const out: Question[] = [
    ...regs.slice(0, 4).map(r => regionQ('center', r)),
    ...regs.slice(4, 7).map(r => regionQ('region', r)),
    ...shuffle(SYMBOLS).slice(0, 3).map(symbolQ),
  ]
  return shuffle(out)
}

const QLABEL = { center: 'kz_q_center', region: 'kz_q_region', symbol: 'kz_q_symbol' } as const

export default function KazakhstanPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [phase, setPhase] = useState<'browse' | 'quiz' | 'done'>('browse')
  const [quiz, setQuiz] = useState<Question[]>([])
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)

  const startQuiz = () => { setQuiz(buildQuiz()); setQi(0); setPicked(null); setScore(0); setPhase('quiz') }

  // save XP at the end
  useEffect(() => {
    if (phase !== 'done') return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const xp = score * 3
      const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', user.id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const pick = (idx: number, correct: boolean) => {
    if (picked !== null) return
    setPicked(idx)
    if (correct) { setScore(s => s + 1); playCorrect() } else playWrong()
    setTimeout(() => {
      if (qi + 1 >= quiz.length) setPhase('done')
      else { setQi(qi + 1); setPicked(null) }
    }, correct ? 650 : 1100)
  }

  // ── Browse / learn ──
  if (phase === 'browse') {
    return (
      <div className="min-h-screen pb-8" style={{ background: BG }}>
        <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 leading-tight">🇰🇿 {t('kz_title', lang)}</h1>
            <p className="text-xs text-gray-400">{t('kz_subtitle', lang)}</p>
          </div>
        </header>

        <main className="px-4 max-w-2xl mx-auto flex flex-col gap-3">
          {/* State symbols */}
          <p className="text-[11px] font-black text-gray-400 tracking-[0.12em] uppercase mt-1">{t('kz_symbols_label', lang)}</p>
          <div className="grid grid-cols-2 gap-3">
            {SYMBOLS.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                <span className="text-2xl shrink-0">{s.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 leading-tight">{s.q[lang]}</p>
                  <p className="font-black text-gray-900 text-sm leading-tight truncate">{s.answer[lang]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Regions + centers */}
          <p className="text-[11px] font-black text-gray-400 tracking-[0.12em] uppercase mt-2">{t('kz_regions_label', lang)}</p>
          <div className="grid grid-cols-2 gap-3">
            {REGIONS.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="font-black text-gray-900 text-sm leading-tight">{r.name[lang]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('kz_center', lang)}: {r.center[lang]}</p>
              </div>
            ))}
          </div>

          <button onClick={startQuiz}
            className="w-full mt-2 py-4 rounded-2xl font-black text-white text-base active:scale-[0.98] transition-all shadow-sm"
            style={{ background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)` }}>
            🎯 {t('kz_start', lang)}
          </button>
        </main>
      </div>
    )
  }

  // ── Done ──
  if (phase === 'done') {
    const pct = Math.round((score / quiz.length) * 100)
    const medal = pct >= 90 ? '🥇' : pct >= 60 ? '🥈' : pct >= 30 ? '🥉' : '🎯'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: BG }}>
        <div className="text-6xl mb-4">{medal}</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">{t('kz_result', lang)}</h2>
        <p className="text-gray-500 mb-2">{score} / {quiz.length} · {pct}%</p>
        <p className="font-black text-xl mb-10" style={{ color: BLUE_DEEP }}>+{score * 3} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => setPhase('browse')}
            className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold active:scale-95">
            {t('game_home', lang)}
          </button>
          <button onClick={startQuiz}
            className="flex-1 py-3.5 rounded-2xl text-white font-black active:scale-95"
            style={{ background: BLUE_DEEP }}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── Quiz ──
  const q = quiz[qi]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* progress */}
      <header className="px-4 pt-5 pb-3 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={() => setPhase('browse')}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
          <div className="flex-1 flex gap-1">
            {quiz.map((_, i) => (
              <div key={i} className="h-2 flex-1 rounded-full"
                style={{ background: i < qi ? BLUE_DEEP : i === qi ? '#8FD0E0' : '#D9E7EC' }} />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-500 shrink-0">{score}✓</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 max-w-md mx-auto w-full gap-4 pt-2">
        {/* Question card */}
        <div className="bg-white rounded-3xl px-5 py-7 shadow-sm flex flex-col items-center gap-3">
          <p className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase">{t(QLABEL[q.kind], lang)}</p>
          {q.kind === 'symbol' ? (
            <>
              <span className="text-5xl">{q.symbol.emoji}</span>
              <p className="text-xl font-black text-gray-900 text-center">{q.symbol.q[lang]}</p>
            </>
          ) : (
            <p className="text-2xl font-black text-gray-900 text-center">
              {q.kind === 'center' ? q.region.name[lang] : q.region.center[lang]}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {q.kind === 'symbol'
            ? q.options.map((opt, i) => {
              const correct = opt === q.symbol.answer
              return <OptionButton key={i} label={opt[lang]} idx={i} picked={picked} correct={correct} onPick={() => { playTap(); pick(i, correct) }} />
            })
            : q.options.map((opt, i) => {
              const correct = opt.id === q.region.id
              const label = q.kind === 'center' ? opt.center[lang] : opt.name[lang]
              return <OptionButton key={opt.id} label={label} idx={i} picked={picked} correct={correct} onPick={() => { playTap(); pick(i, correct) }} />
            })}
        </div>
      </main>
    </div>
  )
}

function OptionButton({ label, idx, picked, correct, onPick }: {
  label: string; idx: number; picked: number | null; correct: boolean; onPick: () => void
}) {
  let cls = 'bg-white border-2 border-gray-200 text-gray-800'
  if (picked !== null) {
    if (correct) cls = 'bg-emerald-500 border-emerald-500 text-white'
    else if (picked === idx) cls = 'bg-red-400 border-red-400 text-white'
    else cls = 'bg-white border-gray-200 text-gray-400'
  }
  return (
    <button onClick={onPick} disabled={picked !== null}
      className={`${cls} rounded-2xl py-4 px-4 text-lg font-bold text-left transition-all active:scale-[0.98]`}>
      {label}
    </button>
  )
}
