'use client'

import type { ButtonHTMLAttributes, CSSProperties } from 'react'

type Variant = 'primary' | 'accent' | 'success' | 'brand' | 'neutral'

// bg / text / pop-shadow (the darker "depth" colour) per variant
const VARIANTS: Record<Variant, { bg: string; fg: string; shadow: string }> = {
  primary: { bg: 'var(--gradient-hero)',    fg: 'var(--primary-foreground)', shadow: 'var(--primary-deep)' },
  accent:  { bg: 'var(--gradient-gold)',    fg: 'var(--accent-foreground)',  shadow: 'var(--accent-deep)' },
  success: { bg: 'var(--gradient-success)', fg: 'var(--success-foreground)', shadow: 'var(--brand-deep)' },
  brand:   { bg: 'var(--brand)',            fg: 'var(--brand-foreground)',   shadow: 'var(--brand-deep)' },
  neutral: { bg: 'var(--card)',             fg: 'var(--foreground)',         shadow: 'var(--border)' },
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  full?: boolean
}

/** Duolingo-style "3D" button: solid bottom shadow that compresses on press. */
export function PopButton({ variant = 'primary', full, className = '', children, style, ...props }: Props) {
  const v = VARIANTS[variant]
  const merged: CSSProperties = {
    background: v.bg,
    color: v.fg,
    ['--pop-shadow' as string]: v.shadow,
    ...style,
  }
  return (
    <button
      {...props}
      style={merged}
      className={`pop-btn font-display inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-5 py-3.5 text-base font-extrabold
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        disabled:opacity-50 disabled:active:translate-y-0 ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
