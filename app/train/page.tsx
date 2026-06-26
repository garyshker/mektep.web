'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { TRAINERS } from '@/lib/trainers'
import { ChevronRight, Infinity as InfinityIcon } from 'lucide-react'

export default function TrainPage() {
  const router = useRouter()
  const lang = useLang()
  const supabase = createClient()
  const [grade, setGrade] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      setGrade(data?.grade ?? 1)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (grade === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const isG1 = grade === 1

  // Grade-1 children get the within-20 foundation trainers; grade 2+ get the
  // adaptive engine, column, equations etc. Each grade stays in its own grade.
  const g1Cards = [
    { path: '/train/count',   title: t('train_count_title', lang),   sub: t('train_count_sub', lang),   emoji: '🔢' },
    { path: '/train/compare', title: t('train_compare_title', lang), sub: t('train_compare_sub', lang), emoji: '⚖️' },
    { path: '/train/sticks',  title: t('train_sticks_title', lang),  sub: t('train_sticks_sub', lang),  emoji: '🪵' },
  ]

  const smart = [
    { path: '/train/smart-add', key: 'train_smart_add' as const, emoji: '🧠' },
    { path: '/train/smart-sub', key: 'train_smart_sub' as const, emoji: '🧠' },
    ...(isG1 ? [] : [
      { path: '/train/smart-mul', key: 'train_smart_mul' as const, emoji: '🧠' },
      { path: '/train/smart-div', key: 'train_smart_div' as const, emoji: '🧠' },
    ]),
    { path: '/train/kazakh', key: 'train_kazakh' as const, emoji: '📖' },
  ]

  return (
    <div className="min-h-screen pb-24 lg:pb-10 lg:pl-60" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 max-w-lg lg:max-w-2xl mx-auto">
        <h1 className="font-display font-black text-foreground text-xl">🎯 {t('train_title', lang)}</h1>
        <p className="text-xs text-muted-foreground">{t('train_pick', lang)}</p>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 grid grid-cols-2 gap-3">
        {/* Grade 1 — concrete foundation trainers (only for first grade) */}
        {isG1 && g1Cards.map(c => (
          <button key={c.path} onClick={() => router.push(c.path)}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--accent) 12%, var(--card))', borderColor: 'color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)' }}>{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base">{c.title}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {c.sub}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        ))}

        {/* Smart math — adaptive engine + mastery */}
        {smart.map(s => (
          <button key={s.path} onClick={() => router.push(s.path)}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left shadow-[var(--shadow-md)] active:translate-y-[-2px] transition-transform"
            style={{ background: 'var(--gradient-hero)' }}>
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-white text-base">{t(s.key, lang)}</p>
              <p className="text-white/75 text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('sm_adaptive', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0 text-white">
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        ))}

        {/* Column add / subtract — grade 2+ (carry & borrow) */}
        {!isG1 && ([
          { path: '/train/column',     title: 'column_add_title' as const, sub: 'column_subtitle' as const },
          { path: '/train/column-sub', title: 'column_sub_title' as const, sub: 'column_sub_subtitle' as const },
        ]).map(c => (
          <button key={c.path} onClick={() => router.push(c.path)}
            className="rounded-[var(--radius)] p-4 flex flex-col gap-2 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--warning) 10%, var(--card))', borderColor: 'color-mix(in oklch, var(--warning) 30%, var(--card))' }}>
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'color-mix(in oklch, var(--warning) 20%, transparent)' }}>🦉</span>
            <div>
              <p className="font-display font-black text-foreground text-sm">{t(c.title, lang)}</p>
              <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                <InfinityIcon size={12} /> {t(c.sub, lang)}
              </p>
            </div>
            <span className="text-[11px] font-black flex items-center gap-0.5 self-start" style={{ color: 'var(--warning)' }}>
              {t('game_go', lang)} <ChevronRight size={13} />
            </span>
          </button>
        ))}

        {/* Equations — grade 2+ */}
        {!isG1 && (
          <button onClick={() => router.push('/train/equations')}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--primary) 10%, var(--card))', borderColor: 'color-mix(in oklch, var(--primary) 28%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--primary) 18%, transparent)' }}>🟰</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base">{t('train_eq', lang)}</p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_subtitle', lang)} · x
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--primary)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* Generic drill trainers — grade 2+ */}
        {!isG1 && TRAINERS.map(tr => (
          <button key={tr.id} onClick={() => router.push(`/train/${tr.id}`)}
            className="rounded-[var(--radius)] p-4 flex flex-col gap-2 text-left border active:translate-y-[-2px] transition-transform"
            style={{ background: tr.color, borderColor: tr.border }}>
            <span className="text-3xl">{tr.emoji}</span>
            <div>
              <p className="font-display font-black text-foreground text-sm">{t(tr.titleKey, lang)}</p>
              <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_subtitle', lang)}
              </p>
            </div>
            <span className="text-[11px] font-black flex items-center gap-0.5 self-start" style={{ color: 'var(--primary)' }}>
              {t('game_go', lang)} <ChevronRight size={13} />
            </span>
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
