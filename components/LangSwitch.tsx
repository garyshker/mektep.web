'use client'

import { useLang, saveLang } from '@/lib/useLang'
import type { Lang } from '@/lib/i18n'

const LANGS: { code: Lang; flag: string; short: string }[] = [
  { code: 'kk', flag: '🇰🇿', short: 'ҚАЗ' },
  { code: 'ru', flag: '🇷🇺', short: 'РУС' },
  { code: 'en', flag: '🇬🇧', short: 'ENG' },
]

export function LangSwitch({ className = '', onChange }: { className?: string; onChange?: (l: Lang) => void }) {
  const lang = useLang()
  return (
    <div className={`inline-flex items-center gap-1 bg-white rounded-full p-1 shadow-sm ${className}`}>
      {LANGS.map(l => {
        const active = lang === l.code
        return (
          <button
            key={l.code}
            onClick={() => { saveLang(l.code); onChange?.(l.code) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95"
            style={active
              ? { background: '#E8943A', color: 'white' }
              : { color: '#9ca3af' }}
          >
            <span className="text-sm leading-none">{l.flag}</span>
            <span>{l.short}</span>
          </button>
        )
      })}
    </div>
  )
}
