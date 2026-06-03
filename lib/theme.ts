'use client'

import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'mektep_theme'

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function saveTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: theme }))
}

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem(KEY) as Theme) || 'light'
  })
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === KEY) setTheme((e.newValue as Theme) || 'light') }
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])
  return theme
}
