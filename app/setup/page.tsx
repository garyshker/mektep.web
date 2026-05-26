'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GRADES = [
  { n: 1, emoji: '🌱', label: '1 класс', color: '#22C55E' },
  { n: 2, emoji: '⭐', label: '2 класс', color: '#F59E0B' },
  { n: 3, emoji: '🚀', label: '3 класс', color: '#3B82F6' },
  { n: 4, emoji: '🏆', label: '4 класс', color: '#8B5CF6' },
]

const LANGS = [
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'kk', flag: '🇰🇿', label: 'Қазақша' },
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
    if (!user) { setLoading(false); return }
    await supabase.from('profiles').upsert({ id: user.id, name: name.trim(), grade, language: lang })
    router.push('/')
  }

  const ready = name.trim().length > 0 && grade !== null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#F5F4F0' }}>

      {/* Hero */}
      <div className="text-6xl mb-3">👋</div>
      <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Добро пожаловать!</h1>
      <p className="text-gray-400 text-sm mb-8 text-center">Расскажи немного о себе, чтобы начать</p>

      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Name */}
        <div className="bg-white rounded-3xl px-5 py-4 shadow-sm">
          <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Твоё имя</p>
          <input
            className="w-full text-xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
            placeholder="Введи имя..."
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            autoFocus
          />
        </div>

        {/* Grade */}
        <div className="bg-white rounded-3xl px-5 py-4 shadow-sm">
          <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Твой класс</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(g => (
              <button
                key={g.n}
                onClick={() => setGrade(g.n)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3.5 transition-all active:scale-95"
                style={
                  grade === g.n
                    ? { background: g.color, borderColor: g.color, color: 'white' }
                    : { background: '#F8F7F4', borderColor: '#e5e7eb', color: '#374151' }
                }
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-xs font-black">{g.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-3xl px-5 py-4 shadow-sm">
          <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Язык</p>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={
                  lang === l.code
                    ? { background: '#1f2937', borderColor: '#1f2937', color: 'white' }
                    : { background: '#F8F7F4', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={save}
          disabled={!ready || loading}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 disabled:opacity-30"
          style={{ background: ready ? '#1f2937' : '#9ca3af', color: 'white' }}
        >
          {loading ? 'Сохраняем...' : 'Начать учиться →'}
        </button>

      </div>
    </div>
  )
}
