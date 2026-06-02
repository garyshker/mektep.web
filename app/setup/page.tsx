'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

const ORANGE = '#E8943A'

const GRADES = [1, 2, 3, 4]

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'kk', flag: '🇰🇿', label: 'Қазақша' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

export default function SetupPage() {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('ru')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const pickLang = (code: Lang) => {
    setLang(code)
    saveLang(code) // Switch UI immediately
  }

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#FAF6EF' }}>

      <div className="text-6xl mb-3">👋</div>
      <h1 className="text-2xl font-black mb-1 text-center" style={{ color: '#2D2A26' }}>{t('setup_welcome', lang)}</h1>
      <p className="text-gray-400 text-sm mb-8 text-center">{t('setup_subtitle', lang)}</p>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Name */}
        <div className="bg-white rounded-[28px] px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3">{t('setup_your_name', lang)}</p>
          <input
            className="w-full text-xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
            placeholder={t('setup_name_hint', lang)}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            autoFocus
          />
        </div>

        {/* Grade */}
        <div className="bg-white rounded-[28px] px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3">{t('setup_your_grade', lang)}</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(n => (
              <button
                key={n}
                onClick={() => setGrade(n)}
                className="flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all active:scale-95"
                style={
                  grade === n
                    ? { background: ORANGE, borderColor: ORANGE, color: 'white' }
                    : { background: '#F5F2EC', borderColor: 'transparent', color: '#374151' }
                }
              >
                <span className="text-3xl font-black leading-none">{n}</span>
                <span className="text-[10px] font-semibold opacity-70">{t('grade', lang)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-[28px] px-5 py-4 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3">{t('setup_language', lang)}</p>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => pickLang(l.code)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 text-sm font-bold transition-all active:scale-95"
                style={
                  lang === l.code
                    ? { background: ORANGE, borderColor: ORANGE, color: 'white' }
                    : { background: '#F5F2EC', borderColor: 'transparent', color: '#6b7280' }
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
          className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm"
          style={{ background: ready ? 'linear-gradient(180deg, #F5BE4A 0%, #ED9F34 100%)' : '#cbb89a' }}
        >
          {loading ? t('setup_saving', lang) : t('setup_start', lang)}
        </button>

      </div>
    </div>
  )
}
