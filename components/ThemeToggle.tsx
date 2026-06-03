'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme, saveTheme } from '@/lib/theme'

export function ThemeToggle() {
  const theme = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={() => saveTheme(dark ? 'light' : 'dark')}
      aria-label="Theme"
      className="relative w-14 h-8 rounded-full transition-colors shrink-0"
      style={{ background: dark ? 'var(--primary)' : 'var(--border)' }}
    >
      <span
        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-transform shadow-sm"
        style={{ transform: dark ? 'translateX(24px)' : 'translateX(0)' }}
      >
        {dark
          ? <Moon size={13} style={{ color: 'var(--primary)' }} />
          : <Sun size={13} className="text-amber-500" />}
      </span>
    </button>
  )
}
