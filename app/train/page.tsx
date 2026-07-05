'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { TRAINERS } from '@/lib/trainers'
import { ADD_LADDER, SUB_LADDER, MUL_LADDER, DIV_LADDER } from '@/lib/skills'
import { ChevronRight, Crown, Infinity as InfinityIcon } from 'lucide-react'

export default function TrainPage() {
  const router = useRouter()
  const lang = useLang()
  const supabase = createClient()
  const [grade, setGrade] = useState<number | null>(null)
  const [mastery, setMastery] = useState<{ skill_id: string; total_correct: number }[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('grade').eq('id', user.id).single(),
        supabase.from('user_skill_mastery').select('skill_id, total_correct').eq('user_id', user.id),
      ])
      setMastery((rows ?? []) as { skill_id: string; total_correct: number }[])
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

  // Crowns: earned by cumulative correct answers on that trainer's skills
  // (0 → 20 → 60 → 120 correct = 0..3 crowns).
  const totalFor = (match: (id: string) => boolean) =>
    mastery.filter(r => match(r.skill_id)).reduce((s, r) => s + (r.total_correct ?? 0), 0)
  const crownsOf = (n: number) => (n >= 120 ? 3 : n >= 60 ? 2 : n >= 20 ? 1 : 0)
  const inLadder = (l: readonly string[]) => (id: string) => l.includes(id)

  // Grade-1 children get the within-20 foundation trainers; grade 2+ get the
  // adaptive engine, column, equations etc. Each grade stays in its own grade.
  const g1Cards = [
    { path: '/train/count',   title: t('train_count_title', lang),   sub: t('train_count_sub', lang),   emoji: '🔢', skill: 'g1_count' },
    { path: '/train/compare', title: t('train_compare_title', lang), sub: t('train_compare_sub', lang), emoji: '⚖️', skill: 'g1_compare' },
    { path: '/train/bonds',   title: t('train_bonds_title', lang),   sub: t('train_bonds_sub', lang),   emoji: '🏠', skill: 'g1_bonds' },
    { path: '/train/add10',   title: t('train_add10_title', lang),   sub: t('train_within10_sub', lang), emoji: '➕', skill: 'g1_add10' },
    { path: '/train/sub10',   title: t('train_sub10_title', lang),   sub: t('train_within10_sub', lang), emoji: '➖', skill: 'g1_sub10' },
    { path: '/train/sticks',  title: t('train_sticks_title', lang),  sub: t('train_sticks_sub', lang),  emoji: '🪵', skill: 'g1_sticks' },
    { path: '/train/cross10', title: t('train_cross10_title', lang), sub: t('train_cross10_sub', lang), emoji: '🔟', skill: 'g1_cross10' },
    { path: '/train/tasks',   title: t('train_tasks_title', lang),   sub: t('train_tasks_sub', lang),   emoji: '🐑', skill: 'g1_tasks' },
  ]

  const smart = [
    { path: '/train/smart-add', key: 'train_smart_add' as const, emoji: '🧠', match: inLadder(ADD_LADDER) },
    { path: '/train/smart-sub', key: 'train_smart_sub' as const, emoji: '🧠', match: inLadder(SUB_LADDER) },
    ...(isG1 ? [] : [
      { path: '/train/smart-mul', key: 'train_smart_mul' as const, emoji: '🧠', match: inLadder(MUL_LADDER) },
      { path: '/train/smart-div', key: 'train_smart_div' as const, emoji: '🧠', match: inLadder(DIV_LADDER) },
    ]),
    { path: '/train/kazakh', key: 'train_kazakh' as const, emoji: '📖', match: (id: string) => id.startsWith('kaz:') },
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
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {c.title} <Crowns n={crownsOf(totalFor(id => id === c.skill))} />
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {c.sub}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        ))}

        {/* Grade 2 — place-value foundation (tens & ones) */}
        {!isG1 && (
          <button onClick={() => router.push('/train/tens')}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--accent) 12%, var(--card))', borderColor: 'color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)' }}>🔟</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {t('train_tens_title', lang)} <Crowns n={crownsOf(totalFor(id => id === 'g2_tens'))} />
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_tens_sub', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* Grade 2 — multiplication as equal groups (concept before the table) */}
        {!isG1 && (
          <button onClick={() => router.push('/train/groups')}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--accent) 12%, var(--card))', borderColor: 'color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)' }}>✖️</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {t('train_groups_title', lang)} <Crowns n={crownsOf(totalFor(id => id === 'g2_groups'))} />
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_groups_sub', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* Grade 2 — division as sharing (inverse of equal groups) */}
        {!isG1 && (
          <button onClick={() => router.push('/train/share')}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--accent) 12%, var(--card))', borderColor: 'color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)' }}>➗</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {t('train_share_title', lang)} <Crowns n={crownsOf(totalFor(id => id === 'g2_share'))} />
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_share_sub', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* Grade 2 — compare to 100 */}
        {!isG1 && (
          <button onClick={() => router.push('/train/compare100')}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--accent) 12%, var(--card))', borderColor: 'color-mix(in oklch, var(--accent) 32%, var(--card))' }}>
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'color-mix(in oklch, var(--accent) 22%, transparent)' }}>⚖️</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {t('train_compare100_title', lang)} <Crowns n={crownsOf(totalFor(id => id === 'g2_compare100'))} />
              </p>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_compare100_sub', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--accent-deep)' }}>
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* Smart math — adaptive engine + mastery */}
        {smart.map(s => (
          <button key={s.path} onClick={() => router.push(s.path)}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left shadow-[var(--shadow-md)] active:translate-y-[-2px] transition-transform"
            style={{ background: 'var(--gradient-hero)' }}>
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-white text-base flex items-center gap-1.5">
                {t(s.key, lang)} <Crowns n={crownsOf(totalFor(s.match))} light />
              </p>
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
          { path: '/train/column',     title: 'column_add_title' as const, sub: 'column_subtitle' as const, match: inLadder(['add_2d_no_carry', 'add_2d_carry']) },
          { path: '/train/column-sub', title: 'column_sub_title' as const, sub: 'column_sub_subtitle' as const, match: inLadder(['sub_2d_no_borrow', 'sub_2d_borrow']) },
        ]).map(c => (
          <button key={c.path} onClick={() => router.push(c.path)}
            className="rounded-[var(--radius)] p-4 flex flex-col gap-2 text-left border-2 active:translate-y-[-2px] transition-transform"
            style={{ background: 'color-mix(in oklch, var(--warning) 10%, var(--card))', borderColor: 'color-mix(in oklch, var(--warning) 30%, var(--card))' }}>
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'color-mix(in oklch, var(--warning) 20%, transparent)' }}>🦉</span>
            <div>
              <p className="font-display font-black text-foreground text-sm flex items-center gap-1.5">
                {t(c.title, lang)} <Crowns n={crownsOf(totalFor(c.match))} />
              </p>
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
              <p className="font-display font-black text-foreground text-base flex items-center gap-1.5">
                {t('train_eq', lang)} <Crowns n={crownsOf(totalFor(id => id === 'eq'))} />
              </p>
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

// Three crown slots — gold fills as the child racks up correct answers.
// Empty slots are visible on purpose: something to earn.
function Crowns({ n, light = false }: { n: number; light?: boolean }) {
  return (
    <span className="inline-flex gap-0.5 shrink-0">
      {[0, 1, 2].map(i => (
        <Crown key={i} size={13}
          fill={i < n ? (light ? '#fff' : 'var(--accent)') : 'none'}
          style={{ color: i < n
            ? (light ? '#fff' : 'var(--accent-deep)')
            : light ? 'rgba(255,255,255,0.4)' : 'color-mix(in oklch, var(--muted-foreground) 45%, transparent)' }} />
      ))}
    </span>
  )
}
