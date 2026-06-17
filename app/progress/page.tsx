'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t, type I18NKey } from '@/lib/i18n'
import { SKILL_LADDERS, ALL_SKILL_IDS, SKILL_LABEL_ALL, trainerPathForSkill, ERROR_TAG_LABEL, type SkillStat } from '@/lib/skills'
import type { ByLang } from '@/lib/lessons/types'
import { ChevronLeft, Zap, Target, Flame, Lightbulb, ArrowRight } from 'lucide-react'

type Row = { skill_id: string; mastery_level: number; total_correct: number; total_attempts: number; last_error_tag: string | null }

const ALL_SKILLS = ALL_SKILL_IDS

export default function ProgressDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState<Record<string, SkillStat>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: prof }, { data: rows }] = await Promise.all([
        supabase.from('profiles').select('name, streak').eq('id', user.id).single(),
        supabase.from('user_skill_mastery').select('skill_id, mastery_level, total_correct, total_attempts, last_error_tag').eq('user_id', user.id),
      ])
      if (prof) { setName(prof.name ?? ''); setStreak(prof.streak ?? 0) }
      const map: Record<string, SkillStat> = {}
      for (const r of (rows ?? []) as Row[]) {
        map[r.skill_id] = {
          mastery: r.mastery_level ?? 0, streak: 0, recentWrong: 0,
          attempts: r.total_attempts ?? 0, correct: r.total_correct ?? 0,
          lastErrorTag: r.last_error_tag ?? undefined,
        }
      }
      setStats(map)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  const attempted = ALL_SKILLS.filter(s => (stats[s]?.attempts ?? 0) > 0)
  const hasData = attempted.length > 0
  const solved = ALL_SKILLS.reduce((n, s) => n + (stats[s]?.correct ?? 0), 0)
  const attempts = ALL_SKILLS.reduce((n, s) => n + (stats[s]?.attempts ?? 0), 0)
  const accuracy = attempts > 0 ? Math.round((solved / attempts) * 100) : 0

  // skills the child hasn't mastered yet — the "where they struggle" list
  const troubleSpots = attempted
    .filter(s => stats[s]!.mastery < 0.8)
    .sort((x, y) => stats[x]!.mastery - stats[y]!.mastery)
    .slice(0, 6)
  const allMastered = hasData && troubleSpots.length === 0
  // only show a radar for an operation the child has actually practised
  const activeLadders = SKILL_LADDERS.filter(l => l.ladder.some(s => (stats[s]?.attempts ?? 0) > 0))

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="px-4 pt-5 pb-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={() => router.push('/profile')} aria-label="back"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display font-black text-foreground text-xl leading-tight">{t('dash_title', lang)}</h1>
          {name && <p className="text-xs text-muted-foreground">{name}</p>}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 flex flex-col gap-4">
        {!hasData ? (
          <div className="bg-card rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl" style={{ background: 'var(--gradient-hero)' }}>🧠</div>
            <p className="text-muted-foreground text-sm leading-relaxed">{t('dash_empty', lang)}</p>
            <button onClick={() => router.push('/train/smart-add')}
              className="px-5 py-3 rounded-[var(--radius)] font-display font-black text-white active:scale-95 transition-transform flex items-center gap-2"
              style={{ background: 'var(--primary)' }}>
              {t('dash_try', lang)} <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Stat icon={<Target size={20} style={{ color: 'var(--brand)' }} />} value={String(solved)} label={t('dash_stat_solved', lang)} tint="var(--brand)" />
              <Stat icon={<Zap size={20} fill="currentColor" style={{ color: 'var(--xp)' }} />} value={`${accuracy}%`} label={t('dash_stat_acc', lang)} tint="var(--xp)" />
              <Stat icon={<Flame size={20} fill="currentColor" style={{ color: 'var(--warning)' }} />} value={String(streak)} label={t('dash_stat_streak', lang)} tint="var(--warning)" />
            </div>

            {/* Skill radars — one per practised operation (new ladders appear automatically) */}
            {activeLadders.map(l => (
              <RadarCard key={l.id} titleKey={l.titleKey} ladder={l.ladder} label={l.label} stats={stats} lang={lang} />
            ))}

            {/* Where the child struggles — specific weak topics + the mistake */}
            <div className="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={18} style={{ color: 'var(--primary)' }} />
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">
                  {allMastered ? t('dash_focus', lang) : t('dash_trouble', lang)}
                </p>
              </div>
              {allMastered ? (
                <p className="text-foreground font-semibold leading-relaxed">{t('dash_focus_good', lang)}</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {troubleSpots.map(s => {
                    const m = Math.round(stats[s]!.mastery * 100)
                    const color = m >= 40 ? 'var(--accent)' : 'var(--destructive)'
                    const tag = stats[s]!.lastErrorTag
                    const desc = tag && ERROR_TAG_LABEL[tag] ? ERROR_TAG_LABEL[tag][lang] : null
                    return (
                      <button key={s} onClick={() => router.push(trainerPathForSkill(s))}
                        className="w-full flex items-start gap-3 rounded-[var(--radius)] p-3 text-left active:scale-[0.99] transition-transform"
                        style={{ background: 'color-mix(in oklch, var(--primary) 6%, var(--card))' }}>
                        <span className="shrink-0 mt-0.5 w-12 text-center px-2 py-0.5 rounded-full text-[11px] font-black text-white tabular" style={{ background: color }}>{m}%</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-black text-foreground text-sm leading-tight">{SKILL_LABEL_ALL[s][lang]}</p>
                          {desc && <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>}
                        </div>
                        <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-1.5" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ icon, value, label, tint }: { icon: React.ReactNode; value: string; label: string; tint: string }) {
  return (
    <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1.5">
      <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: `color-mix(in oklch, ${tint} 16%, transparent)` }}>{icon}</span>
      <span className="font-display font-black text-foreground text-xl tabular">{value}</span>
      <span className="text-[11px] text-muted-foreground font-semibold text-center leading-tight">{label}</span>
    </div>
  )
}

// A radar card for one operation (title + 3-axis radar + numbered legend)
function RadarCard({ titleKey, ladder, label, stats, lang }: {
  titleKey: I18NKey; ladder: string[]; label: Record<string, ByLang>; stats: Record<string, SkillStat>; lang: 'kk' | 'ru' | 'en'
}) {
  return (
    <div className="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]">
      <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">{t('dash_radar', lang)} · {t(titleKey, lang)}</p>
      <SkillRadar stats={stats} ladder={ladder} />
      <div className="flex flex-col gap-1.5 mt-3">
        {ladder.map((s, i) => {
          const m = Math.round((stats[s]?.mastery ?? 0) * 100)
          const color = m >= 80 ? 'var(--success)' : m >= 40 ? 'var(--accent)' : 'var(--primary)'
          return (
            <div key={s} className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ background: color }}>{i + 1}</span>
              <span className="flex-1 text-foreground font-semibold">{label[s][lang]}</span>
              <span className="font-black tabular" style={{ color }}>{m}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Custom SVG radar (N axes) — no chart library, theme-token colours.
function SkillRadar({ stats, ladder }: { stats: Record<string, SkillStat>; ladder: string[] }) {
  const cx = 110, cy = 96, R = 74
  const n = ladder.length
  const angles = ladder.map((_, i) => (-90 + i * (360 / n)) * (Math.PI / 180))
  const pt = (i: number, r: number) => [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])] as const
  const poly = (r: number) => ladder.map((_, i) => pt(i, r).join(',')).join(' ')
  const valuePts = ladder.map((s, i) => pt(i, Math.max(0.06, stats[s]?.mastery ?? 0) * R))

  return (
    <svg viewBox="0 0 220 200" className="w-full select-none" aria-hidden>
      {[1, 0.66, 0.33].map((f, k) => (
        <polygon key={k} points={poly(R * f)} fill="none" strokeWidth="1.5" style={{ stroke: 'var(--border)' }} />
      ))}
      {ladder.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} strokeWidth="1.5" style={{ stroke: 'var(--border)' }} />
      })}
      <polygon points={valuePts.map(p => p.join(',')).join(' ')}
        strokeWidth="2.5" style={{ fill: 'color-mix(in oklch, var(--primary) 22%, transparent)', stroke: 'var(--primary)' }} />
      {valuePts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4" style={{ fill: 'var(--primary)' }} />
      ))}
      {ladder.map((s, i) => {
        const [x, y] = pt(i, R + 15)
        const m = Math.round((stats[s]?.mastery ?? 0) * 100)
        const color = m >= 80 ? 'var(--success)' : m >= 40 ? 'var(--accent)' : 'var(--primary)'
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="9" style={{ fill: color }} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="900" fill="#fff">{i + 1}</text>
          </g>
        )
      })}
    </svg>
  )
}
