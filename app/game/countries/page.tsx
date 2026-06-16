'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { CSSProperties } from 'react'
import {
  ArrowLeft, X, Search, MapPin, ChevronDown, Users, Landmark, Maximize2,
  Coins, Languages, Building2, Bird, Music, Star, Palette, Mountain, Target, Globe,
  type LucideIcon,
} from 'lucide-react'

type ByLang = { ru: string; kk: string; en: string }
type Region = { name: ByLang; center: ByLang }
type TintKey = 'blue' | 'green' | 'amber' | 'purple' | 'sky' | 'pink'
type Sym = { icon: LucideIcon; tint: TintKey; label: ByLang; value: ByLang }
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
  symbols?: Sym[]       // Kazakhstan only — state symbols
}

// Palette (matches the approved design)
const BG = '#ECEBF7', TEXT = '#222A44', MUTED = '#8A8FA6'
const GRAD = 'linear-gradient(90deg, #5B6CE8 0%, #7E5BE6 100%)'
const ACCENT = '#6D5AE6'
const TINTS: Record<TintKey, { bg: string; fg: string }> = {
  blue:   { bg: '#E9EEFF', fg: '#4C6FE6' },
  green:  { bg: '#E6F6EE', fg: '#1FA971' },
  amber:  { bg: '#FFF1E0', fg: '#E08A00' },
  purple: { bg: '#EFEAFD', fg: '#7B5CBF' },
  sky:    { bg: '#E3F4FB', fg: '#0EA5C9' },
  pink:   { bg: '#FDE9F1', fg: '#E0418B' },
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
  { icon: Building2, tint: 'blue',   label: { kk: 'Ең үлкен қала', ru: 'Крупнейший город', en: 'Largest city' }, value: { kk: 'Алматы', ru: 'Алматы', en: 'Almaty' } },
  { icon: Bird,      tint: 'amber',  label: { kk: 'Тудағы құс', ru: 'Птица на флаге', en: 'Bird on the flag' }, value: { kk: 'Бүркіт', ru: 'Беркут', en: 'Golden eagle' } },
  { icon: Music,     tint: 'green',  label: { kk: 'Ұлттық аспап', ru: 'Нац. инструмент', en: 'National instrument' }, value: { kk: 'Домбыра', ru: 'Домбра', en: 'Dombyra' } },
  { icon: Star,      tint: 'purple', label: { kk: 'Елтаңба ортасы', ru: 'Центр герба', en: 'Center of emblem' }, value: { kk: 'Шаңырақ', ru: 'Шанырак', en: 'Shanyraq' } },
  { icon: Palette,   tint: 'sky',    label: { kk: 'Ту түсі', ru: 'Цвет флага', en: 'Flag color' }, value: { kk: 'Көк', ru: 'Голубой', en: 'Sky blue' } },
  { icon: Mountain,  tint: 'pink',   label: { kk: 'Ең биік шыңы', ru: 'Высшая точка', en: 'Highest peak' }, value: { kk: 'Хан Тәңірі', ru: 'Хан-Тенгри', en: 'Khan Tengri' } },
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
  const [search, setSearch] = useState('')
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
    return <CountryDetail c={selected} lang={lang} onBack={() => setSelected(null)} onQuiz={startQuiz} />
  }

  // ── Browse / learn ──
  if (phase === 'browse') {
    const s = search.trim().toLowerCase()
    const list = s ? COUNTRIES.filter(c => c.name[lang].toLowerCase().includes(s) || c.capital[lang].toLowerCase().includes(s)) : COUNTRIES
    return (
      <div className="min-h-screen pb-28" style={{ background: BG }}>
        <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0" style={{ color: MUTED }}>
            <X size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-black leading-tight flex items-center gap-2" style={{ color: TEXT }}>
              <Globe size={22} style={{ color: ACCENT }} /> {t('countries_title', lang)}
            </h1>
            <p className="text-xs" style={{ color: MUTED }}>{t('countries_more', lang)}</p>
          </div>
        </header>

        <main className="px-4 max-w-2xl mx-auto flex flex-col gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow-sm">
            <Search size={18} style={{ color: MUTED }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('countries_search', lang)}
              className="flex-1 bg-transparent outline-none text-base font-semibold" style={{ color: TEXT }} />
          </div>
          <p className="text-xs font-bold px-1" style={{ color: MUTED }}>{list.length} {t('countries_count', lang)}</p>

          <div className="grid grid-cols-2 gap-3">
            {list.map(c => (
              <button key={c.code} onClick={() => { playTap(); setSelected(c) }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden text-left active:scale-[0.98] transition-transform">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(c.code)} alt={c.name[lang]} className="w-full aspect-[3/2] object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="font-display font-black text-base leading-tight" style={{ color: TEXT }}>{c.name[lang]}</p>
                  <p className="text-sm mt-1 flex items-center gap-1" style={{ color: MUTED }}>
                    <MapPin size={14} style={{ color: ACCENT }} /> {c.capital[lang]}
                  </p>
                </div>
              </button>
            ))}
            {list.length === 0 && <p className="col-span-2 text-center py-10" style={{ color: MUTED }}>—</p>}
          </div>
        </main>

        <StickyCTA label={t('countries_start', lang)} onClick={startQuiz} />
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
        <h2 className="text-2xl font-display font-black mb-1" style={{ color: TEXT }}>{t('countries_result', lang)}</h2>
        <p className="mb-2" style={{ color: MUTED }}>{score} / {quiz.length} · {pct}%</p>
        <p className="font-display font-black text-xl mb-10" style={{ color: ACCENT }}>+{score * 3} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => setPhase('browse')}
            className="flex-1 py-3.5 rounded-2xl bg-white border-2 font-display font-black active:scale-95" style={{ color: TEXT, borderColor: '#E2E0F0' }}>
            {t('game_home', lang)}
          </button>
          <button onClick={startQuiz}
            className="flex-1 py-3.5 rounded-2xl text-white font-display font-black active:scale-95" style={{ background: GRAD }}>
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
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <header className="px-4 pt-5 pb-3 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <button onClick={() => setPhase('browse')}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0" style={{ color: MUTED }}>
            <X size={18} />
          </button>
          <div className="flex-1 flex gap-1">
            {quiz.map((_, i) => (
              <div key={i} className="h-2 flex-1 rounded-full" style={{ background: i < qi ? ACCENT : i === qi ? '#B9AEF0' : '#DAD7EC' }} />
            ))}
          </div>
          <span className="text-sm font-bold shrink-0" style={{ color: MUTED }}>{score}✓</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 max-w-md mx-auto w-full gap-4 pt-2">
        {/* Question card */}
        <div className="bg-white rounded-3xl px-5 py-6 shadow-sm flex flex-col items-center gap-3">
          <p className="text-[10px] font-black tracking-[0.15em] uppercase" style={{ color: MUTED }}>{t(QLABEL[q.type], lang)}</p>
          {q.type === 'flag' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={flagUrl(q.country.code)} alt="" className="w-44 h-28 object-contain rounded-2xl border border-gray-100 bg-gray-50 shadow p-2" />
          ) : q.type === 'capital' ? (
            <p className="text-2xl font-display font-black text-center" style={{ color: TEXT }}>{q.country.name[lang]}</p>
          ) : (
            <p className="text-2xl font-display font-black text-center" style={{ color: TEXT }}>{q.country.capital[lang]}</p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map(c => {
            const isCorrect = c.code === q.country.code
            const isPicked = picked === c.code
            let style: CSSProperties = { background: '#fff', color: TEXT, borderColor: '#E2E0F0' }
            if (picked) {
              if (isCorrect) style = { background: '#22C55E', color: '#fff', borderColor: '#22C55E' }
              else if (isPicked) style = { background: '#F87171', color: '#fff', borderColor: '#F87171' }
              else style = { background: '#fff', color: MUTED, borderColor: '#E2E0F0' }
            }
            return (
              <button key={c.code} onClick={() => { playTap(); pick(c) }} disabled={!!picked}
                className="rounded-2xl py-4 px-4 text-lg font-display font-bold text-left border-2 transition-all active:scale-[0.98] flex items-center gap-3" style={style}>
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

// ── Sticky bottom call-to-action ──
function StickyCTA({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 px-4 pb-5 pt-6"
      style={{ background: `linear-gradient(to top, ${BG} 55%, transparent)` }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={onClick}
          className="w-full py-4 rounded-2xl text-white font-display font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: GRAD, boxShadow: '0 8px 22px rgba(99,102,232,0.35)' }}>
          <Target size={20} /> {label}
        </button>
      </div>
    </div>
  )
}

// ── Icon chip ──
function Chip({ icon: Icon, tint, size = 'md' }: { icon: LucideIcon; tint: TintKey; size?: 'md' | 'sm' }) {
  const c = TINTS[tint]
  const dim = size === 'md' ? 'w-11 h-11' : 'w-10 h-10'
  return (
    <span className={`${dim} rounded-xl flex items-center justify-center shrink-0`} style={{ background: c.bg }}>
      <Icon size={size === 'md' ? 22 : 20} style={{ color: c.fg }} />
    </span>
  )
}

// ── Country detail dashboard ──
function CountryDetail({ c, lang, onBack, onQuiz }: { c: Country; lang: Lang; onBack: () => void; onQuiz: () => void }) {
  const [regionsOpen, setRegionsOpen] = useState(false)
  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>
      {/* Flag hero */}
      <div className="relative h-60 max-w-2xl mx-auto overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(c.code)} alt={c.name[lang]} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0.05) 45%, transparent)' }} />
        <button onClick={onBack}
          className="absolute top-5 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.22)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="absolute left-4 bottom-4 text-4xl font-display font-black text-white drop-shadow-md pr-4">{c.name[lang]}</h1>
      </div>

      {/* Content sheet */}
      <main className="relative -mt-6 rounded-t-[28px] px-4 pt-6 max-w-2xl mx-auto" style={{ background: BG }}>
        <p className="text-base leading-snug mb-4" style={{ color: '#5C617A' }}>{c.about[lang]}</p>

        {/* Key facts */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Landmark} tint="blue" label={t('countries_capital', lang)} value={c.capital[lang]} />
          <StatTile icon={Users} tint="green" label={t('countries_pop', lang)} value={fmtPop(c.pop, lang)} />
          <StatTile icon={Maximize2} tint="amber" label={t('countries_area', lang)} value={fmtArea(c.area, lang)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <InfoRow icon={Coins} tint="purple" label={t('countries_currency', lang)} value={c.currency[lang]} />
          <InfoRow icon={Languages} tint="sky" label={t('countries_language', lang)} value={c.language[lang]} />
        </div>

        {/* State symbols */}
        {c.symbols && (
          <>
            <SectionHeader label={t('kz_symbols_label', lang)} />
            <div className="grid grid-cols-2 gap-3">
              {c.symbols.map((s, i) => (
                <InfoRow key={i} icon={s.icon} tint={s.tint} label={s.label[lang]} value={s.value[lang]} />
              ))}
            </div>
          </>
        )}

        {/* Regions + centers */}
        {c.regions && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-5">
            <button onClick={() => setRegionsOpen(o => !o)} className="w-full flex items-center gap-2.5 px-4 py-4">
              <span className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
              <span className="font-display font-black text-sm tracking-wide uppercase" style={{ color: TEXT }}>{t('kz_regions_label', lang)}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: TINTS.purple.bg, color: TINTS.purple.fg }}>{c.regions.length}</span>
              <ChevronDown size={20} className="ml-auto transition-transform" style={{ color: MUTED, transform: regionsOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {regionsOpen ? (
              <div className="border-t" style={{ borderColor: '#EFEDF8' }}>
                {c.regions.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5" style={i ? { borderTop: '1px solid #F3F1FA' } : undefined}>
                    <span className="text-sm font-bold min-w-0 truncate" style={{ color: TEXT }}>{r.name[lang]}</span>
                    <span className="text-sm shrink-0" style={{ color: MUTED }}>{r.center[lang]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 pb-4 text-sm" style={{ color: MUTED }}>{t('kz_regions_tap', lang)}</p>
            )}
          </div>
        )}
      </main>

      <StickyCTA label={t('countries_test', lang)} onClick={onQuiz} />
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <span className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
      <span className="font-display font-black text-sm tracking-wide uppercase" style={{ color: TEXT }}>{label}</span>
    </div>
  )
}

function StatTile({ icon, tint, label, value }: { icon: LucideIcon; tint: TintKey; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2">
      <Chip icon={icon} tint={tint} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide leading-tight" style={{ color: MUTED }}>{label}</p>
        <p className="font-display font-black text-sm leading-tight mt-0.5" style={{ color: TEXT }}>{value}</p>
      </div>
    </div>
  )
}

function InfoRow({ icon, tint, label, value }: { icon: LucideIcon; tint: TintKey; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
      <Chip icon={icon} tint={tint} size="sm" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide leading-tight" style={{ color: MUTED }}>{label}</p>
        <p className="font-display font-black text-sm leading-tight mt-0.5 truncate" style={{ color: TEXT }}>{value}</p>
      </div>
    </div>
  )
}
