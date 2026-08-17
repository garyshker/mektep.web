'use client'

// The games hub. These twelve used to live in a cramped horizontal carousel on
// the home screen, where 144px cards with 12px labels made a child scroll to
// find anything. Here they get a full grid, big touch targets, and colours
// drawn from the --cat-* tokens instead of twelve hardcoded pastels.

import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { GAME_ICONS } from '@/components/GameIcons'
import { ChevronRight } from 'lucide-react'

type L3 = { kk: string; ru: string; en: string }
type Game = { icon: string; name: L3; sub: L3; cat: string; path: string }

export const GAMES: Game[] = [
  { icon: '⚡', name: { kk: 'Жылдам ойын', ru: 'Быстрый счёт', en: 'Quick math' }, sub: { kk: '× ÷ жылдамдық', ru: '× ÷ на скорость', en: '× ÷ speed' }, cat: 'var(--cat-spark)', path: '/game/quick' },
  { icon: '⚔️', name: { kk: '1v1 Дуэль', ru: '1v1 Дуэль', en: '1v1 Duel' }, sub: { kk: 'Достарыңмен', ru: 'С друзьями', en: 'With friends' }, cat: 'var(--cat-rose)', path: '/game/duel' },
  { icon: '🐍', name: { kk: 'Сандық жылан', ru: 'Змейка', en: 'Snake' }, sub: { kk: 'Сандарды жина', ru: 'Собери числа', en: 'Collect numbers' }, cat: 'var(--cat-sea)', path: '/game/snake' },
  { icon: '🔢', name: { kk: '2048', ru: '2048', en: '2048' }, sub: { kk: 'Сандарды біріктір', ru: 'Объединяй числа', en: 'Merge numbers' }, cat: 'var(--cat-gold)', path: '/game/2048' },
  { icon: '🔴', name: { kk: 'Дойбы', ru: 'Шашки', en: 'Checkers' }, sub: { kk: 'Орыс дойбысы', ru: 'Русские шашки', en: 'Russian checkers' }, cat: 'var(--cat-rose)', path: '/game/checkers' },
  { icon: '🧩', name: { kk: 'Судоку', ru: 'Судоку', en: 'Sudoku' }, sub: { kk: 'Логикалық', ru: 'Логика', en: 'Logic' }, cat: 'var(--cat-violet)', path: '/game/sudoku' },
  { icon: '🕐', name: { kk: 'Сағат', ru: 'Часы', en: 'Clock' }, sub: { kk: 'Уақытты тану', ru: 'Определяй время', en: 'Tell the time' }, cat: 'var(--cat-sea)', path: '/game/clock' },
  { icon: '⭕', name: { kk: 'Айқыш-дөңгелек', ru: 'Крестики-нолики', en: 'Tic-Tac-Toe' }, sub: { kk: 'Үшеуін қатарға', ru: 'Три в ряд', en: 'Three in a row' }, cat: 'var(--cat-sky)', path: '/game/tictactoe' },
  { icon: '🎯', name: { kk: 'Рефлекс', ru: 'Реакция', en: 'Reflex' }, sub: { kk: 'Ұшқыш сынағы', ru: 'Тест пилота', en: 'Pilot test' }, cat: 'var(--cat-rose)', path: '/game/reflex' },
  { icon: '🎵', name: { kk: 'Саймон', ru: 'Саймон', en: 'Simon' }, sub: { kk: 'Түстерді қайтала', ru: 'Повтори цвета', en: 'Repeat colors' }, cat: 'var(--cat-violet)', path: '/game/simon' },
  { icon: '🪨', name: { kk: 'Тоғыз құмалақ', ru: 'Тоғыз құмалақ', en: 'Togyz Kumalak' }, sub: { kk: 'Ұлттық ойын', ru: 'Нац. игра', en: 'National game' }, cat: 'var(--cat-gold)', path: '/game/togyz' },
  { icon: '🌍', name: { kk: 'Елдер', ru: 'Страны', en: 'Countries' }, sub: { kk: 'Бұрынғы КСРО елдері', ru: 'Постсоветские страны', en: 'Post-Soviet countries' }, cat: 'var(--cat-sky)', path: '/game/countries' },
]

export default function GamesPage() {
  const router = useRouter()
  const lang = useLang()

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-60 lg:pt-8"
      style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-6 pb-4 max-w-lg lg:max-w-2xl mx-auto">
        <h1 className="font-display font-black text-foreground text-2xl leading-tight">🎮 {t('games_title', lang)}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('games_subtitle', lang)}</p>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {GAMES.map((g, i) => {
            const custom = GAME_ICONS[g.path]
            return (
              <button key={g.path} onClick={() => router.push(g.path)}
                className="animate-mk-pop-in rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 text-left border-2 active:translate-y-[2px] transition-transform min-h-[148px]"
                style={{
                  background: `color-mix(in oklch, ${g.cat} 10%, var(--card))`,
                  borderColor: `color-mix(in oklch, ${g.cat} 26%, var(--card))`,
                  animationDelay: `${i * 25}ms`,
                }}>
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in oklch, ${g.cat} 20%, transparent)`, color: g.cat }}>
                  {custom ? <custom.Comp size={34} /> : <span className="text-3xl">{g.icon}</span>}
                </span>
                <div className="flex-1">
                  <p className="font-display font-black text-foreground text-base leading-tight">{g.name[lang]}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 leading-snug">{g.sub[lang]}</p>
                </div>
                <span className="text-sm font-black flex items-center gap-0.5" style={{ color: g.cat }}>
                  {t('play_label', lang)} <ChevronRight size={15} />
                </span>
              </button>
            )
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
