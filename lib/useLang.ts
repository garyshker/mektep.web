'use client'

import { useState, useEffect } from 'react'
import type { Lang } from './i18n'

const KEY = 'imektep_lang'

export function saveLang(lang: Lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, lang)
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: lang }))
  }
}

export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    return (localStorage.getItem(KEY) as Lang) || 'en'
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setLang((e.newValue as Lang) || 'en')
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return lang
}
