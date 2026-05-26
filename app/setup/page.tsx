'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GRADES = [
  { n: 1, emoji: '🌱', label: '1 класс', color: '#22C55E', bg: '#F0FDF4' },
  { n: 2, emoji: '⭐', label: '2 класс', color: '#F59E0B', bg: '#FFFBEB' },
  { n: 3, emoji: '🚀', label: '3 класс', color: '#3B82F6', bg: '#EFF6FF' },
  { n: 4, emoji: '🏆', label: '4 класс', color: '#8B5CF6', bg: '#F5F3FF' },
]

const LANGS = [
  { code: 'kk', flag: '🇰🇿', label: 'Қазақша' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

export default function SetupPage() {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [lang, setLang] = useState('ru')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const save = async () => {
    if (!name.trim() || !grade) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({
      id: user.id,
      name: name.trim(),
      grade,
      language: lang,
    })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4 py-8">
      <img src="/otter.png" alt="Otti" className="w-20 h-20 rounded-full mb-3" />
      <h1 className="text-2xl font-bold text-emerald-700 mb-1">Добро пожаловать!</h1>
      <p className="text-gray-500 text-sm mb-6">Расскажи немного о себе</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Name */}
        <input
          className="border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-gray-700"
          placeholder="Твоё имя"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={30}
          autoFocus
        />

        {/* Grade */}
        <div>
          <p className="text-sm text-gray-500 mb-2 font-medium">Класс</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(g => (
              <button
                key={g.n}
                onClick={() => setGrade(g.n)}
                className="flex flex-col items-center gap-1 rounded-2xl border-2 py-3 transition-all"
                style={grade === g.n
                  ? { background: g.color, borderColor: g.color, color: 'white' }
                  : { background: g.bg, borderColor: g.color + '40' }
                }
              >
                <span className="text-xl">{g.emoji}</span>
                <span className="text-xs font-bold">{g.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <p className="text-sm text-gray-500 mb-2 font-medium">Язык</p>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex-1 flex items-center justify-center gap-1 rounded-2xl border-2 py-2 text-sm font-medium transition-all ${
                  lang === l.code
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={!name.trim() || !grade || loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-2xl py-4 transition-all active:scale-95 mt-2"
        >
          {loading ? 'Сохраняем...' : 'Начать учиться →'}
        </button>
      </div>
    </div>
  )
}
