// Hand-authored SVG icons (flat, two-tone, themeable via currentColor).
import type { FC } from 'react'

type IconProps = { size?: number }

// ── Games ────────────────────────────────────────────────────────────────────

// Тоғыз құмалақ — mancala board: two kazans at the ends + rows of holes
export const TogyzIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="4" y="15" width="40" height="18" rx="7" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="2.5" />
    <ellipse cx="10.5" cy="24" rx="2.4" ry="5" fill="currentColor" />
    <ellipse cx="37.5" cy="24" rx="2.4" ry="5" fill="currentColor" />
    <circle cx="18" cy="20" r="1.8" fill="currentColor" /><circle cx="24" cy="20" r="1.8" fill="currentColor" /><circle cx="30" cy="20" r="1.8" fill="currentColor" />
    <circle cx="18" cy="28" r="1.8" fill="currentColor" /><circle cx="24" cy="28" r="1.8" fill="currentColor" /><circle cx="30" cy="28" r="1.8" fill="currentColor" />
  </svg>
)

// Шашки — checkerboard squares with a grooved piece
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

// Быстрый счёт — lightning bolt + operator marks
export const QuickMathIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M25 4 L11 25 H21 L18 44 L37 20 H26 L29 4 Z" fill="currentColor" />
    <path d="M37 9 h6 M40 6 v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M5 37 h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

// 1v1 Дуэль — crossed swords
export const DuelIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M13 35 L31 17" /><path d="M35 35 L17 17" />
    </g>
    <path d="M31 17 l4 -4 0 6 -6 0 Z" fill="currentColor" />
    <path d="M17 17 l-4 -4 0 6 6 0 Z" fill="currentColor" />
    <path d="M9 33 l5 5 M39 33 l-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="11.5" cy="36.5" r="2.2" fill="currentColor" /><circle cx="36.5" cy="36.5" r="2.2" fill="currentColor" />
  </svg>
)

// Сандық жылан — snake
export const SnakeIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M10 33 q 5 -13 11 -7 q 6 6 11 -3" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
    <circle cx="33" cy="22" r="4.6" fill="currentColor" />
    <circle cx="34.6" cy="20.6" r="1" fill="#fff" />
    <path d="M37 22 l4 -2 m-4 2 l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

// 2048 — merging tiles
export const Tile2048Icon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="8" y="8" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.22" />
    <rect x="26" y="8" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.13" />
    <rect x="8" y="26" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.13" />
    <rect x="26" y="26" width="14" height="14" rx="3.5" fill="currentColor" />
  </svg>
)

// Судоку — 3×3 grid with filled cells
export const SudokuIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="8" y="8" width="32" height="32" rx="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" />
    <g stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55"><path d="M18.7 8 V40 M29.3 8 V40 M8 18.7 H40 M8 29.3 H40" /></g>
    <g fill="currentColor">
      <circle cx="13.3" cy="13.3" r="1.7" /><circle cx="34.7" cy="13.3" r="1.7" /><circle cx="24" cy="24" r="1.7" /><circle cx="13.3" cy="34.7" r="1.7" /><circle cx="34.7" cy="34.7" r="1.7" />
    </g>
  </svg>
)

// Елдер / Дүниетану — globe
export const GlobeIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <circle cx="24" cy="24" r="15" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" />
    <g stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.6" fill="none">
      <path d="M9.5 20 H38.5 M9.5 28 H38.5 M24 9 V39" /><ellipse cx="24" cy="24" rx="6.5" ry="15" />
    </g>
  </svg>
)

// ── Subjects ───────────────────────────────────────────────────────────────

// Математика — operators in a soft frame
export const MathIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="7" y="7" width="34" height="34" rx="9" fill="currentColor" fillOpacity="0.12" />
    <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M11.5 16 H20.5 M16 11.5 V20.5" />
      <path d="M27.5 16 H36.5" />
      <path d="M12.5 28.5 L19.5 35.5 M19.5 28.5 L12.5 35.5" />
      <path d="M27.5 32 H36.5" />
    </g>
    <circle cx="32" cy="28.5" r="1.4" fill="currentColor" /><circle cx="32" cy="35.5" r="1.4" fill="currentColor" />
  </svg>
)

// Часы — clock face with hands
export const ClockGameIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="2.6" fill="none" />
    <path d="M24 14 V24 L31 28" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="24" r="1.8" fill="currentColor" />
  </svg>
)

// Саймон — four quadrant pads around a hub
export const SimonIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="7"  y="7"  width="15" height="15" rx="6" fill="currentColor" fillOpacity="0.95" />
    <rect x="26" y="7"  width="15" height="15" rx="6" fill="currentColor" fillOpacity="0.45" />
    <rect x="7"  y="26" width="15" height="15" rx="6" fill="currentColor" fillOpacity="0.45" />
    <rect x="26" y="26" width="15" height="15" rx="6" fill="currentColor" fillOpacity="0.95" />
    <circle cx="24" cy="24" r="3.4" fill="currentColor" />
  </svg>
)

// Реакция — arena with a player square dodging shapes
export const ReflexIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <rect x="6" y="6" width="36" height="36" rx="8" stroke="currentColor" strokeWidth="2.6" fill="none" strokeOpacity="0.5" />
    <rect x="20" y="20" width="9" height="9" rx="2" fill="currentColor" />
    <rect x="12" y="12" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.65" />
    <rect x="30" y="31" width="6" height="6" rx="1.5" fill="currentColor" fillOpacity="0.65" />
  </svg>
)

// Крестики-нолики — grid with an X and an O
export const TicTacToeIcon: FC<IconProps> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M19 7 V41 M29 7 V41 M7 19 H41 M7 29 H41" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.5" strokeLinecap="round" />
    <path d="M9.5 9.5 L16.5 16.5 M16.5 9.5 L9.5 16.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <circle cx="37" cy="37" r="3.8" fill="none" stroke="currentColor" strokeWidth="3" />
  </svg>
)

const Book: FC<IconProps & { letter: string }> = ({ size = 30, letter }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
    <path d="M24 13 C 18 10, 11 10, 7 12 V36 C 11 34, 18 34, 24 37 C 30 34, 37 34, 41 36 V12 C 37 10, 30 10, 24 13 Z"
      fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M24 13 V37" stroke="currentColor" strokeWidth="2" />
    <text x="15.5" y="25.5" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="800" fill="currentColor">{letter}</text>
  </svg>
)

// Қазақ тілі — book with Ә
export const KazakhIcon: FC<IconProps> = (p) => <Book {...p} letter="Ә" />
// Русский — book with Я
export const RussianIcon: FC<IconProps> = (p) => <Book {...p} letter="Я" />
// English — book with A
export const EnglishIcon: FC<IconProps> = (p) => <Book {...p} letter="A" />

// ── Maps ───────────────────────────────────────────────────────────────────

export const GAME_ICONS: Record<string, { Comp: FC<IconProps>; color: string }> = {
  '/game/quick':    { Comp: QuickMathIcon, color: '#E8943A' },
  '/game/duel':     { Comp: DuelIcon,      color: '#D6536A' },
  '/game/snake':    { Comp: SnakeIcon,     color: '#2FA37A' },
  '/game/2048':     { Comp: Tile2048Icon,  color: '#D9A21E' },
  '/game/checkers': { Comp: CheckersIcon,  color: '#9A6B3A' },
  '/game/sudoku':   { Comp: SudokuIcon,    color: '#7B5CBF' },
  '/game/togyz':    { Comp: TogyzIcon,     color: '#8E5E30' },
  '/game/countries':{ Comp: GlobeIcon,     color: '#3B82F6' },
  '/game/tictactoe':{ Comp: TicTacToeIcon, color: '#5B8DEF' },
  '/game/reflex':   { Comp: ReflexIcon,    color: '#E0457B' },
  '/game/simon':    { Comp: SimonIcon,     color: '#8B5CF6' },
  '/game/clock':    { Comp: ClockGameIcon, color: '#0EA5A0' },
}

export const SUBJECT_ICONS: Record<string, { Comp: FC<IconProps>; color: string }> = {
  math:    { Comp: MathIcon,    color: '#1FA34B' },
  kazakh:  { Comp: KazakhIcon,  color: '#D98A1E' },
  russian: { Comp: RussianIcon, color: '#3B82F6' },
  world:   { Comp: GlobeIcon,   color: '#10B981' },
  english: { Comp: EnglishIcon, color: '#6366F1' },
}
