// Hand-authored SVG game icons (flat, two-tone, themeable via currentColor).
import type { FC } from 'react'

type IconProps = { size?: number }

// Тоғыз құмалақ — mancala board: two kazans at the ends + rows of holes
export const TogyzIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="4" y="15" width="40" height="18" rx="7" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="2.5" />
    <ellipse cx="10.5" cy="24" rx="2.4" ry="5" fill="currentColor" />
    <ellipse cx="37.5" cy="24" rx="2.4" ry="5" fill="currentColor" />
    <circle cx="18" cy="20" r="1.8" fill="currentColor" />
    <circle cx="24" cy="20" r="1.8" fill="currentColor" />
    <circle cx="30" cy="20" r="1.8" fill="currentColor" />
    <circle cx="18" cy="28" r="1.8" fill="currentColor" />
    <circle cx="24" cy="28" r="1.8" fill="currentColor" />
    <circle cx="30" cy="28" r="1.8" fill="currentColor" />
  </svg>
)

// Шашки — checkerboard squares with a grooved piece on top
export const CheckersIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="8.5" y="8.5" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.24" />
    <rect x="25.5" y="25.5" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.24" />
    <rect x="25.5" y="8.5" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.10" />
    <rect x="8.5" y="25.5" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.10" />
    <circle cx="16" cy="32" r="7" fill="currentColor" />
    <circle cx="16" cy="32" r="3.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.65" />
  </svg>
)

// Быстрый счёт — lightning bolt + math operator marks
export const QuickMathIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M25 4 L11 25 H21 L18 44 L37 20 H26 L29 4 Z" fill="currentColor" />
    <path d="M37 9 h6 M40 6 v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M5 37 h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

// path → { component, accent colour }
export const GAME_ICONS: Record<string, { Comp: FC<IconProps>; color: string }> = {
  '/game/togyz':    { Comp: TogyzIcon,     color: '#8E5E30' },
  '/game/checkers': { Comp: CheckersIcon,  color: '#9A6B3A' },
  '/game/quick':    { Comp: QuickMathIcon, color: '#E8943A' },
}
