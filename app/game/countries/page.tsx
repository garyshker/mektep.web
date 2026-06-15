'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

type ByLang = { ru: string; kk: string; en: string }
type Country = { code: string; name: ByLang; capital: ByLang; pop: number }

// CIS countries (test set)
const COUNTRIES: Country[] = [
  { code: 'kz', name: { ru: 'Казахстан', kk: 'Қазақстан', en: 'Kazakhstan' }, capital: { ru: 'Астана', kk: 'Астана', en: 'Astana' }, pop: 20_000_000 },
  { code: 'ru', name: { ru: 'Россия', kk: 'Ресей', en: 'Russia' }, capital: { ru: 'Москва', kk: 'Мәскеу', en: 'Moscow' }, pop: 146_000_000 },
  { code: 'by', name: { ru: 'Беларусь', kk: 'Беларусь', en: 'Belarus' }, capital: { ru: 'Минск', kk: 'Минск', en: 'Minsk' }, pop: 9_200_000 },
  { code: 'kg', name: { ru: 'Кыргызстан', kk: 'Қырғызстан', en: 'Kyrgyzstan' }, capital: { ru: 'Бишкек', kk: 'Бішкек', en: 'Bishkek' }, pop: 7_000_000 },
  { code: 'tj', name: { ru: 'Таджикистан', kk: 'Тәжікстан', en: 'Tajikistan' }, capital: { ru: 'Душанбе', kk: 'Душанбе', en: 'Dushanbe' }, pop: 10_000_000 },
  { code: 'uz', name: { ru: 'Узбекистан', kk: 'Өзбекстан', en: 'Uzbekistan' }, capital: { ru: 'Ташкент', kk: 'Ташкент', en: 'Tashkent' }, pop: 36_000_000 },
  { code: 'tm', name: { ru: 'Туркменистан', kk: 'Түрікменстан', en: 'Turkmenistan' }, capital: { ru: 'Ашхабад', kk: 'Ашхабад', en: 'Ashgabat' }, pop: 7_000_000 },
  { code: 'am', name: { ru: 'Армения', kk: 'Армения', en: 'Armenia' }, capital: { ru: 'Ереван', kk: 'Ереван', en: 'Yerevan' }, pop: 3_000_000 },
  { code: 'az', name: { ru: 'Азербайджан', kk: 'Әзірбайжан', en: 'Azerbaijan' }, capital: { ru: 'Баку', kk: 'Баку', en: 'Baku' }, pop: 10_100_000 },
  { code: 'md', name: { ru: 'Молдова', kk: 'Молдова', en: 'Moldova' }, capital: { ru: 'Кишинёв', kk: 'Кишинёв', en: 'Chișinău' }, pop: 2_600_000 },
]

const flagUrl = (code: string) => `https://flagcdn.com/w320/${code}.png`

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[r[i], r[j]] = [r[j], r[i]] }
  return r
}
const fmtPop = (n: number, lang: Lang) => `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)} ${t('countries_mln', lang)}`

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

  // ── Browse / learn ──
  if (phase === 'browse') {
    return (
      <div className="min-h-screen pb-8" style={{ background: '#EDE8F8' }}>
        <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">✕</button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900 leading-tight">🌍 {t('countries_title', lang)}</h1>
            <p className="text-xs text-gray-400">{t('countries_subtitle', lang)}</p>
          </div>
        </header>

        <main className="px-4 max-w-2xl mx-auto flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {COUNTRIES.map(c => (
              <div key={c.code} className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(c.code)} alt={c.name[lang]} className="w-full h-20 object-contain rounded-xl border border-gray-100 bg-gray-50 p-1" loading="lazy" />
                <div>
                  <p className="font-black text-gray-900 text-sm leading-tight">{c.name[lang]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('countries_capital', lang)}: {c.capital[lang]}</p>
                  <p className="text-xs text-gray-400">{t('countries_pop', lang)}: {fmtPop(c.pop, lang)}</p>
                </div>
              </div>
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
