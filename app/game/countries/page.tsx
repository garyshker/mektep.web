'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

type ByLang = { ru: string; kk: string; en: string }
type Region = { name: ByLang; center: ByLang }
type Sym = { emoji: string; label: ByLang; value: ByLang }
type Country = {
  code: string
  name: ByLang
  capital: ByLang
  pop: number
  area: number          // km²
  currency: ByLang
  language: ByLang
  about: ByLang
  regions?: Region[]    // Kazakhstan only — the 17 oblysy + centers
  symbols?: Sym[]    // Kazakhstan only — state symbols
}

// 17 regions of Kazakhstan + administrative centers
const KZ_REGIONS: Region[] = [
  { name: { kk: 'Ақмола обл.', ru: 'Акмолинская', en: 'Akmola' }, center: { kk: 'Көкшетау', ru: 'Кокшетау', en: 'Kokshetau' } },
  { name: { kk: 'Ақтөбе обл.', ru: 'Актюбинская', en: 'Aktobe' }, center: { kk: 'Ақтөбе', ru: 'Актобе', en: 'Aktobe' } },
  { name: { kk: 'Алматы обл.', ru: 'Алматинская', en: 'Almaty' }, center: { kk: 'Қонаев', ru: 'Конаев', en: 'Qonaev' } },
  { name: { kk: 'Атырау обл.', ru: 'Атырауская', en: 'Atyrau' }, center: { kk: 'Атырау', ru: 'Атырау', en: 'Atyrau' } },
  { name: { kk: 'Шығыс Қазақстан', ru: 'Восточно-Казахстанская', en: 'East Kazakhstan' }, center: { kk: 'Өскемен', ru: 'Усть-Каменогорск', en: 'Oskemen' } },
  { name: { kk: 'Жамбыл обл.', ru: 'Жамбылская', en: 'Jambyl' }, center: { kk: 'Тараз', ru: 'Тараз', en: 'Taraz' } },
  { name: { kk: 'Батыс Қазақстан', ru: 'Западно-Казахстанская', en: 'West Kazakhstan' }, center: { kk: 'Орал', ru: 'Уральск', en: 'Oral' } },
  { name: { kk: 'Қарағанды обл.', ru: 'Карагандинская', en: 'Karaganda' }, center: { kk: 'Қарағанды', ru: 'Караганда', en: 'Karaganda' } },
  { name: { kk: 'Қостанай обл.', ru: 'Костанайская', en: 'Kostanay' }, center: { kk: 'Қостанай', ru: 'Костанай', en: 'Kostanay' } },
  { name: { kk: 'Қызылорда обл.', ru: 'Кызылординская', en: 'Kyzylorda' }, center: { kk: 'Қызылорда', ru: 'Кызылорда', en: 'Kyzylorda' } },
  { name: { kk: 'Маңғыстау обл.', ru: 'Мангистауская', en: 'Mangystau' }, center: { kk: 'Ақтау', ru: 'Актау', en: 'Aktau' } },
  { name: { kk: 'Павлодар обл.', ru: 'Павлодарская', en: 'Pavlodar' }, center: { kk: 'Павлодар', ru: 'Павлодар', en: 'Pavlodar' } },
  { name: { kk: 'Солтүстік Қазақстан', ru: 'Северо-Казахстанская', en: 'North Kazakhstan' }, center: { kk: 'Петропавл', ru: 'Петропавловск', en: 'Petropavl' } },
  { name: { kk: 'Түркістан обл.', ru: 'Туркестанская', en: 'Turkistan' }, center: { kk: 'Түркістан', ru: 'Туркестан', en: 'Turkistan' } },
  { name: { kk: 'Абай обл.', ru: 'Абайская', en: 'Abai' }, center: { kk: 'Семей', ru: 'Семей', en: 'Semey' } },
  { name: { kk: 'Жетісу обл.', ru: 'Жетысуская', en: 'Jetisu' }, center: { kk: 'Талдықорған', ru: 'Талдыкорган', en: 'Taldykorgan' } },
  { name: { kk: 'Ұлытау обл.', ru: 'Улытауская', en: 'Ulytau' }, center: { kk: 'Жезқазған', ru: 'Жезказган', en: 'Jezkazgan' } },
]

const KZ_SYMBOLS: Sym[] = [
  { emoji: '🏙️', label: { kk: 'Ең үлкен қала', ru: 'Крупнейший город', en: 'Largest city' }, value: { kk: 'Алматы', ru: 'Алматы', en: 'Almaty' } },
  { emoji: '🦅', label: { kk: 'Тудағы құс', ru: 'Птица на флаге', en: 'Bird on the flag' }, value: { kk: 'Бүркіт', ru: 'Беркут', en: 'Golden eagle' } },
  { emoji: '🎵', label: { kk: 'Ұлттық аспап', ru: 'Нац. инструмент', en: 'National instrument' }, value: { kk: 'Домбыра', ru: 'Домбра', en: 'Dombyra' } },
  { emoji: '⚪', label: { kk: 'Елтаңба ортасы', ru: 'Центр герба', en: 'Center of the emblem' }, value: { kk: 'Шаңырақ', ru: 'Шанырак', en: 'Shanyraq' } },
  { emoji: '🔵', label: { kk: 'Ту түсі', ru: 'Цвет флага', en: 'Flag color' }, value: { kk: 'Көк', ru: 'Голубой', en: 'Sky blue' } },
  { emoji: '🏔️', label: { kk: 'Ең биік шыңы', ru: 'Высшая точка', en: 'Highest peak' }, value: { kk: 'Хан Тәңірі', ru: 'Хан-Тенгри', en: 'Khan Tengri' } },
]

const COUNTRIES: Country[] = [
  {
    code: 'kz', name: { ru: 'Казахстан', kk: 'Қазақстан', en: 'Kazakhstan' }, capital: { ru: 'Астана', kk: 'Астана', en: 'Astana' },
    pop: 20_000_000, area: 2_724_900, currency: { ru: 'Тенге (₸)', kk: 'Теңге (₸)', en: 'Tenge (₸)' }, language: { ru: 'Казахский, русский', kk: 'Қазақ, орыс тілдері', en: 'Kazakh, Russian' },
    about: { ru: 'Крупнейшая страна Центральной Азии и 9-я по площади в мире. 17 областей и 3 города республиканского значения.', kk: 'Орталық Азиядағы ең үлкен ел, әлемде ауданы бойынша 9-шы. 17 облыс және 3 республикалық маңызы бар қала.', en: 'The largest country in Central Asia and 9th largest in the world. 17 regions and 3 cities of republican significance.' },
    regions: KZ_REGIONS, symbols: KZ_SYMBOLS,
  },
  {
    code: 'ru', name: { ru: 'Россия', kk: 'Ресей', en: 'Russia' }, capital: { ru: 'Москва', kk: 'Мәскеу', en: 'Moscow' },
    pop: 146_000_000, area: 17_098_246, currency: { ru: 'Рубль (₽)', kk: 'Рубль (₽)', en: 'Ruble (₽)' }, language: { ru: 'Русский', kk: 'Орыс тілі', en: 'Russian' },
    about: { ru: 'Самая большая страна мира по площади, охватывает 11 часовых поясов.', kk: 'Әлемдегі ауданы бойынша ең үлкен ел, 11 уақыт белдеуін қамтиды.', en: 'The largest country in the world by area, spanning 11 time zones.' },
  },
  {
    code: 'by', name: { ru: 'Беларусь', kk: 'Беларусь', en: 'Belarus' }, capital: { ru: 'Минск', kk: 'Минск', en: 'Minsk' },
    pop: 9_200_000, area: 207_600, currency: { ru: 'Бел. рубль', kk: 'Бел. рубль', en: 'Belarusian ruble' }, language: { ru: 'Белорусский', kk: 'Беларус тілі', en: 'Belarusian' },
    about: { ru: 'Страна в Восточной Европе с тысячами озёр и древними замками.', kk: 'Шығыс Еуропадағы мыңдаған көлдер мен ежелгі қамалдар елі.', en: 'An Eastern European country of thousands of lakes and old castles.' },
  },
  {
    code: 'kg', name: { ru: 'Кыргызстан', kk: 'Қырғызстан', en: 'Kyrgyzstan' }, capital: { ru: 'Бишкек', kk: 'Бішкек', en: 'Bishkek' },
    pop: 7_000_000, area: 199_951, currency: { ru: 'Сом', kk: 'Сом', en: 'Som' }, language: { ru: 'Киргизский', kk: 'Қырғыз тілі', en: 'Kyrgyz' },
    about: { ru: 'Горная страна Тянь-Шаня с озером Иссык-Куль.', kk: 'Ыстықкөл көлі бар Тянь-Шань тауларының елі.', en: 'A mountainous Tian Shan country, home to Lake Issyk-Kul.' },
  },
  {
    code: 'tj', name: { ru: 'Таджикистан', kk: 'Тәжікстан', en: 'Tajikistan' }, capital: { ru: 'Душанбе', kk: 'Душанбе', en: 'Dushanbe' },
    pop: 10_000_000, area: 143_100, currency: { ru: 'Сомони', kk: 'Сомони', en: 'Somoni' }, language: { ru: 'Таджикский', kk: 'Тәжік тілі', en: 'Tajik' },
    about: { ru: 'Самая гористая страна региона — более 90% территории горы.', kk: 'Аймақтағы ең таулы ел — аумағының 90%-дан астамы тау.', en: 'The most mountainous country in the region — over 90% mountains.' },
  },
  {
    code: 'uz', name: { ru: 'Узбекистан', kk: 'Өзбекстан', en: 'Uzbekistan' }, capital: { ru: 'Ташкент', kk: 'Ташкент', en: 'Tashkent' },
    pop: 36_000_000, area: 448_978, currency: { ru: 'Сум', kk: 'Сум', en: 'So‘m' }, language: { ru: 'Узбекский', kk: 'Өзбек тілі', en: 'Uzbek' },
    about: { ru: 'Самая населённая страна Центральной Азии, города Великого шёлкового пути.', kk: 'Орталық Азиядағы ең көп халықты ел, Ұлы Жібек жолының қалалары.', en: 'The most populous country in Central Asia, with Silk Road cities.' },
  },
  {
    code: 'tm', name: { ru: 'Туркменистан', kk: 'Түрікменстан', en: 'Turkmenistan' }, capital: { ru: 'Ашхабад', kk: 'Ашхабад', en: 'Ashgabat' },
    pop: 7_000_000, area: 491_210, currency: { ru: 'Манат', kk: 'Манат', en: 'Manat' }, language: { ru: 'Туркменский', kk: 'Түрікмен тілі', en: 'Turkmen' },
    about: { ru: 'Страна пустыни Каракумы и горящего газового кратера «Врата ада».', kk: 'Қарақұм шөлі мен жанып тұрған газ кратерінің елі.', en: 'Land of the Karakum desert and a burning gas crater.' },
  },
  {
    code: 'am', name: { ru: 'Армения', kk: 'Армения', en: 'Armenia' }, capital: { ru: 'Ереван', kk: 'Ереван', en: 'Yerevan' },
    pop: 3_000_000, area: 29_743, currency: { ru: 'Драм (֏)', kk: 'Драм (֏)', en: 'Dram (֏)' }, language: { ru: 'Армянский', kk: 'Армян тілі', en: 'Armenian' },
    about: { ru: 'Одно из древнейших государств, первым принявшее христианство.', kk: 'Христиан дінін бірінші қабылдаған ежелгі мемлекеттердің бірі.', en: 'One of the oldest states, the first to adopt Christianity.' },
  },
  {
    code: 'az', name: { ru: 'Азербайджан', kk: 'Әзірбайжан', en: 'Azerbaijan' }, capital: { ru: 'Баку', kk: 'Баку', en: 'Baku' },
    pop: 10_100_000, area: 86_600, currency: { ru: 'Манат (₼)', kk: 'Манат (₼)', en: 'Manat (₼)' }, language: { ru: 'Азербайджанский', kk: 'Әзірбайжан тілі', en: 'Azerbaijani' },
    about: { ru: 'Страна у Каспийского моря, богатая нефтью; «Земля огней».', kk: 'Каспий теңізі жағасындағы мұнайға бай ел, «От елі».', en: 'A Caspian, oil-rich country — the “Land of Fire”.' },
  },
  {
    code: 'md', name: { ru: 'Молдова', kk: 'Молдова', en: 'Moldova' }, capital: { ru: 'Кишинёв', kk: 'Кишинёв', en: 'Chișinău' },
    pop: 2_600_000, area: 33_846, currency: { ru: 'Лей', kk: 'Лей', en: 'Leu' }, language: { ru: 'Румынский', kk: 'Румын тілі', en: 'Romanian' },
    about: { ru: 'Небольшая страна Восточной Европы, знаменита виноделием.', kk: 'Шығыс Еуропадағы шағын ел, шарап жасауымен әйгілі.', en: 'A small Eastern European country famous for winemaking.' },
  },
]

const flagUrl = (code: string) => `https://flagcdn.com/w320/${code}.png`

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
}
const fmtPop = (n: number, lang: Lang) => `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} ${t('countries_mln', lang)}`
const fmtArea = (n: number, lang: Lang) => `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${t('countries_km2', lang)}`

type QType = 'flag' | 'capital' | 'whose'
type Question = { type: QType; country: Country; options: Country[] }

function buildQuiz(count: number): Question[] {
  const types: QType[] = ['flag', 'capital', 'whose']
  const order = shuffle([...COUNTRIES])
  return order.slice(0, count).map((country, i) => {
    const type = types[i % types.length]
    const distractors = shuffle(COUNTRIES.filter(c => c.code !== country.code)).slice(0, 3)
    return { type, country, options: shuffle([country, ...distractors]) }
  })
}

const QLABEL: Record<QType, 'countries_q_flag' | 'countries_q_capital' | 'countries_q_whose'> = {
  flag: 'countries_q_flag', capital: 'countries_q_capital', whose: 'countries_q_whose',
}

export default function CountriesPage() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [phase, setPhase] = useState<'browse' | 'quiz' | 'done'>('browse')
  const [selected, setSelected] = useState<Country | null>(null)
  const [quiz, setQuiz] = useState<Question[]>([])
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  const startQuiz = () => { setQuiz(buildQuiz(10)); setQi(0); setPicked(null); setScore(0); setPhase('quiz') }

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

  const pick = (c: Country) => {
    if (picked) return
    const q = quiz[qi]
    const correct = c.code === q.country.code
    setPicked(c.code)
    if (correct) { setScore(s => s + 1); playCorrect() } else playWrong()
    setTimeout(() => {
      if (qi + 1 >= quiz.length) setPhase('done')
      else { setQi(qi + 1); setPicked(null) }
    }, correct ? 650 : 1100)
  }

  // ── Country detail dashboard ──
  if (phase === 'browse' && selected) {
    return <CountryDetail c={selected} lang={lang} onBack={() => setSelected(null)} />
  }

  // ── Browse / learn ──
  if (phase === 'browse') {
    return (
      <div className="min-h-screen pb-8" style={{ background: '#EDE8F8' }}>
        <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 leading-tight">🌍 {t('countries_title', lang)}</h1>
            <p className="text-xs text-gray-400">{t('countries_more', lang)}</p>
          </div>
        </header>

        <main className="px-4 max-w-2xl mx-auto flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => { playTap(); setSelected(c) }}
                className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2 text-left active:scale-[0.98] transition-transform">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(c.code)} alt={c.name[lang]} className="w-full h-20 object-contain rounded-xl border border-gray-100 bg-gray-50 p-1" loading="lazy" />
                <div>
                  <p className="font-black text-gray-900 text-sm leading-tight">{c.name[lang]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('countries_capital', lang)}: {c.capital[lang]}</p>
                </div>
              </button>
            ))}
          </div>

          <button onClick={startQuiz}
            className="w-full mt-2 py-4 rounded-2xl font-black text-white text-base active:scale-[0.98] transition-all shadow-sm"
            style={{ background: 'linear-gradient(180deg, #8B6FD4 0%, #7B5CBF 100%)' }}>
            🎯 {t('countries_start', lang)}
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#EDE8F8' }}>
        <div className="text-6xl mb-4">{medal}</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">{t('countries_result', lang)}</h2>
        <p className="text-gray-500 mb-2">{score} / {quiz.length} · {pct}%</p>
        <p className="text-[#7B5CBF] font-black text-xl mb-10">+{score * 3} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => setPhase('browse')}
            className="flex-1 py-3.5 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold active:scale-95">
            {t('game_home', lang)}
          </button>
          <button onClick={startQuiz}
            className="flex-1 py-3.5 rounded-2xl text-white font-black active:scale-95"
            style={{ background: '#7B5CBF' }}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── Quiz ──
  const q = quiz[qi]
  const optionLabel = (c: Country) => (q.type === 'capital' ? c.capital[lang] : c.name[lang])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EDE8F8' }}>
      {/* progress */}
      <header className="px-4 pt-5 pb-3 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={() => setPhase('browse')}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
          <div className="flex-1 flex gap-1">
            {quiz.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < qi ? 'bg-[#7B5CBF]' : i === qi ? 'bg-[#B39DDB]' : 'bg-gray-200'}`} />
            ))}
          </div>
          <span className="text-sm font-bold text-gray-500 shrink-0">{score}✓</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 max-w-md mx-auto w-full gap-4 pt-2">
        {/* Question card */}
        <div className="bg-white rounded-3xl px-5 py-6 shadow-sm flex flex-col items-center gap-3">
          <p className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase">{t(QLABEL[q.type], lang)}</p>
          {q.type === 'flag' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={flagUrl(q.country.code)} alt="" className="w-44 h-28 object-contain rounded-2xl border border-gray-100 bg-gray-50 shadow p-2" />
          ) : q.type === 'capital' ? (
            <p className="text-2xl font-black text-gray-900 text-center">{q.country.name[lang]}</p>
          ) : (
            <p className="text-2xl font-black text-gray-900 text-center">{q.country.capital[lang]}</p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map(c => {
            const isCorrect = c.code === q.country.code
            const isPicked = picked === c.code
            let cls = 'bg-white border-2 border-gray-200 text-gray-800'
            if (picked) {
              if (isCorrect) cls = 'bg-emerald-500 border-emerald-500 text-white'
              else if (isPicked) cls = 'bg-red-400 border-red-400 text-white'
              else cls = 'bg-white border-gray-200 text-gray-400'
            }
            return (
              <button key={c.code} onClick={() => { playTap(); pick(c) }} disabled={!!picked}
                className={`${cls} rounded-2xl py-4 px-4 text-lg font-bold text-left transition-all active:scale-[0.98] flex items-center gap-3`}>
                {q.type === 'whose' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={flagUrl(c.code)} alt="" className="w-9 h-6 object-contain rounded shrink-0 border border-black/10 bg-gray-50" />
                )}
                <span>{optionLabel(c)}</span>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}

// ── Country detail dashboard ──
function CountryDetail({ c, lang, onBack }: { c: Country; lang: Lang; onBack: () => void }) {
  return (
    <div className="min-h-screen pb-10" style={{ background: '#EDE8F8' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-600 font-black text-lg shrink-0">←</button>
        <h1 className="text-xl font-black text-gray-900 flex-1 truncate">{c.name[lang]}</h1>
      </header>

      <main className="px-4 max-w-2xl mx-auto flex flex-col gap-4">
        {/* Flag hero + about */}
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(c.code)} alt={c.name[lang]} className="w-48 h-32 object-contain rounded-2xl border border-gray-100 bg-gray-50 p-2 shadow" />
          <p className="text-2xl font-black text-gray-900 text-center">{c.name[lang]}</p>
          <p className="text-sm text-gray-500 text-center leading-snug">{c.about[lang]}</p>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon="🏛️" label={t('countries_capital', lang)} value={c.capital[lang]} />
          <Stat icon="👥" label={t('countries_pop', lang)} value={fmtPop(c.pop, lang)} />
          <Stat icon="📐" label={t('countries_area', lang)} value={fmtArea(c.area, lang)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon="💰" label={t('countries_currency', lang)} value={c.currency[lang]} />
          <Stat icon="🗣️" label={t('countries_language', lang)} value={c.language[lang]} />
        </div>

        {/* State symbols (Kazakhstan) */}
        {c.symbols && (
          <>
            <p className="text-[11px] font-black text-gray-400 tracking-[0.12em] uppercase mt-1">{t('kz_symbols_label', lang)}</p>
            <div className="grid grid-cols-2 gap-3">
              {c.symbols.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <span className="text-2xl shrink-0">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 leading-tight">{s.label[lang]}</p>
                    <p className="font-black text-gray-900 text-sm leading-tight truncate">{s.value[lang]}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Regions + centers (Kazakhstan) */}
        {c.regions && (
          <>
            <p className="text-[11px] font-black text-gray-400 tracking-[0.12em] uppercase mt-1">
              {t('kz_regions_label', lang)} · {c.regions.length}
            </p>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {c.regions.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm font-bold text-gray-800 min-w-0 truncate">{r.name[lang]}</span>
                  <span className="text-sm text-gray-500 shrink-0">{r.center[lang]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-1">
      <span className="text-lg leading-none">{icon}</span>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
      <p className="font-black text-gray-900 text-sm leading-tight">{value}</p>
    </div>
  )
}
