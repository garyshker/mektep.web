'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { BottomNav } from '@/components/BottomNav'
import { LessonPath, type PathStep } from '@/components/LessonPath'
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

  const totalFor = (match: (id: string) => boolean) =>
    mastery.filter(r => match(r.skill_id)).reduce((s, r) => s + (r.total_correct ?? 0), 0)
  const one = (skill: string) => totalFor(id => id === skill)
  const crownsOf = (n: number) => (n >= 120 ? 3 : n >= 60 ? 2 : n >= 20 ? 1 : 0)
  const inLadder = (l: readonly string[]) => (id: string) => l.includes(id)

  // The guided path — the grade's curriculum steps, in order.
  const g1Path: PathStep[] = [
    { path: '/train/count',   emoji: '🔢', title: t('train_count_title', lang),   correct: one('g1_count') },
    { path: '/train/compare', emoji: '⚖️', title: t('train_compare_title', lang), correct: one('g1_compare') },
    { path: '/train/bonds',   emoji: '🏠', title: t('train_bonds_title', lang),   correct: one('g1_bonds') },
    { path: '/train/add10',   emoji: '➕', title: t('train_add10_title', lang),   correct: one('g1_add10') },
    { path: '/train/sub10',   emoji: '➖', title: t('train_sub10_title', lang),   correct: one('g1_sub10') },
    { path: '/train/sticks',  emoji: '🪵', title: t('train_sticks_title', lang),  correct: one('g1_sticks') },
    { path: '/train/cross10', emoji: '🔟', title: t('train_cross10_title', lang), correct: one('g1_cross10') },
    { path: '/train/tasks',   emoji: '🐑', title: t('train_tasks_title', lang),   correct: one('g1_tasks') },
  ]
  const g2Path: PathStep[] = [
    { path: '/train/tens',       emoji: '🔟', title: t('train_tens_title', lang),       correct: one('g2_tens') },
    { path: '/train/compare100', emoji: '⚖️', title: t('train_compare100_title', lang), correct: one('g2_compare100') },
    { path: '/train/groups',     emoji: '✖️', title: t('train_groups_title', lang),     correct: one('g2_groups') },
    { path: '/train/share',      emoji: '➗', title: t('train_share_title', lang),       correct: one('g2_share') },
    { path: '/train/tasks2',     emoji: '🧩', title: t('train_tasks2_title', lang),     correct: one('g2_tasks2') },
  ]
  const g3Path: PathStep[] = [
    { path: '/train/fractions',  emoji: '🍕', title: t('train_fractions_title', lang),  correct: one('g3_fractions') },
  ]
  const g4Path: PathStep[] = [
    { path: '/train/bignum',     emoji: '🔢', title: t('train_bignum_title', lang),     correct: one('g4_bignum') },
    { path: '/train/colmul',     emoji: '✖️', title: t('train_colmul_title', lang),     correct: one('g4_colmul') },
  ]
  const path = grade <= 1 ? g1Path : grade === 2 ? g2Path : grade === 3 ? g3Path : g4Path

  // Free practice — endless adaptive/drill trainers, not part of the linear path.
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

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4">
        {/* ── The path ── */}
        <div className="bg-card rounded-[var(--radius-lg)] px-4 py-4 shadow-[var(--shadow-sm)] overflow-hidden">
          <LessonPath steps={path} sideLabel={`${grade} ${t('grade', lang)} · ${t('train_your_path', lang)}`} />
        </div>

        {/* ── Free practice ── */}
        <p className="text-xs font-black text-muted-foreground tracking-widest uppercase mt-6 mb-2">{t('train_free_practice', lang)}</p>
        <div className="grid grid-cols-2 gap-3">
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

          {/* Column add / subtract — grade 2+ */}
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
                  {t('train_eq', lang)} <Crowns n={crownsOf(one('eq'))} />
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
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

// Three crown slots — gold fills as the child racks up correct answers.
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
