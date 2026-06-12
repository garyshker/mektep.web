'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { PopButton } from '@/components/PopButton'
import { ChevronLeft, ArrowRight, Check } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import type { CSSProperties } from 'react'

const GRADES = [
  { n: 1, emoji: '🌱' },
  { n: 2, emoji: '⭐' },
  { n: 3, emoji: '🚀' },
  { n: 4, emoji: '🏆' },
]

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'kk', flag: '🇰🇿', label: 'Қазақша' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

const selStyle = (active: boolean): CSSProperties => active
  ? { borderColor: 'var(--primary)', background: 'color-mix(in oklch, var(--primary) 8%, var(--card))', color: 'var(--foreground)' }
  : { borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--foreground)' }

export default function SetupPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Pre-fill from the existing profile so editing (or just changing the
  // language) doesn't force re-typing the name and re-picking the grade.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('name, grade, language').eq('id', user.id).single()
      if (!data) return
      if (data.name) setName(data.name)
      if (data.grade) setGrade(data.grade)
      if (data.language) { setLang(data.language as Lang); saveLang(data.language as Lang) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickLang = (code: Lang) => { setLang(code); saveLang(code) }

  const save = async () => {
    if (!name.trim() || !grade) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    await supabase.from('profiles').upsert({ id: user.id, name: name.trim(), grade, language: lang })
    router.push('/')
  }

  const stepValid = step === 0 ? true : step === 1 ? name.trim().length > 0 : grade !== null
  const isLast = step === 2
  const advance = () => { if (!stepValid) return; isLast ? save() : setStep(s => s + 1) }

  const titles = [t('setup_language', lang), t('setup_your_name', lang), t('setup_your_grade', lang)]

  return (
    <div className="min-h-screen flex flex-col px-4 py-6" style={{ background: 'var(--background)' }}>

      {/* Progress + back */}
      <div className="flex items-center gap-3 max-w-sm mx-auto w-full mb-8">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0 disabled:opacity-0">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: i <= step ? 'var(--primary)' : 'var(--muted)' }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
        {step === 0 && <div className="text-5xl mb-3">👋</div>}
        <h1 className="text-2xl font-display font-black text-foreground mb-1">{titles[step]}</h1>
        <p className="text-muted-foreground text-sm mb-6">{step === 0 ? t('setup_subtitle', lang) : ''}</p>

        {/* Step 1 — language */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            {LANGS.map(l => {
              const active = lang === l.code
              return (
                <button key={l.code} onClick={() => pickLang(l.code)}
                  className="flex items-center gap-3 rounded-[var(--radius)] border-2 px-4 py-4 min-h-[64px] text-left font-bold transition-all active:scale-[0.98]"
                  style={selStyle(active)}>
                  <span className="text-2xl">{l.flag}</span>
                  <span className="flex-1 font-display">{l.label}</span>
                  {active && (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--primary)' }}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2 — name */}
        {step === 1 && (
          <div className="bg-card rounded-[var(--radius-lg)] px-5 py-4 shadow-[var(--shadow-sm)]">
            <input
              className="w-full text-2xl font-display font-black text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40"
              placeholder={t('setup_name_hint', lang)}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && stepValid && advance()}
              maxLength={30}
              autoFocus
            />
          </div>
        )}

        {/* Step 3 — grade */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {GRADES.map(g => {
              const active = grade === g.n
              return (
                <button key={g.n} onClick={() => setGrade(g.n)}
                  className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius)] border-2 py-6 transition-all active:scale-[0.97]"
                  style={selStyle(active)}>
                  <span className="text-3xl">{g.emoji}</span>
                  <span className="text-3xl font-display font-black leading-none tabular">{g.n}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{t('grade', lang)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="max-w-sm mx-auto w-full pt-6">
        <PopButton variant="primary" full onClick={advance} disabled={!stepValid || loading}>
          {loading ? t('setup_saving', lang) : isLast ? t('setup_start', lang) : t('next', lang)}
          {!loading && !isLast && <ArrowRight size={18} />}
        </PopButton>
      </div>
    </div>
  )
}
