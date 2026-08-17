// Trilingual contract: a child switching to Kazakh must never hit a blank or a
// Russian string. Every key must carry kk/ru/en.

import { describe, it, expect } from 'vitest'
import { I18N, t, type Lang } from '@/lib/i18n'

const LANGS: Lang[] = ['kk', 'ru', 'en']

describe('i18n dictionary', () => {
  it('every key has a non-empty kk / ru / en string', () => {
    const missing: string[] = []
    for (const [key, entry] of Object.entries(I18N)) {
      for (const lang of LANGS) {
        const v = (entry as Record<string, string>)[lang]
        if (typeof v !== 'string' || v.trim() === '') missing.push(`${key}.${lang}`)
      }
    }
    expect(missing, `untranslated: ${missing.join(', ')}`).toEqual([])
  })

  it('t() falls back safely and never returns an empty label', () => {
    for (const key of Object.keys(I18N)) {
      for (const lang of LANGS) {
        expect(t(key as never, lang).trim().length, `${key} (${lang}) rendered empty`).toBeGreaterThan(0)
      }
    }
  })
})
