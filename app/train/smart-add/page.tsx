'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { NumberLineSolver } from '@/components/NumberLineSolver'
import {
  ADD_LADDER, ADD_SKILL_LABEL, additionOptions, genAddition, pickSkill, updateStat,
  type AddSkill, type SkillStat, type TaggedOption,
} from '@/lib/skills'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

type Current = { skill: AddSkill; a: number; b: number; options: TaggedOption[] }

export default function SmartAddTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [stats, setStats] = useState<Record<string, SkillStat>>({})
  const statsRef = useRef<Record<string, SkillStat>>({})
  statsRef.current = stats
  const userIdRef = useRef<string | null>(null)

  const [cur, setCur] = useState<Current | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const nextProblem = () => {
    const skill = pickSkill(statsRef.current)
    const { a, b } = genAddition(skill)
    setCur({ skill, a, b, options: additionOptions(a, b) })
    setPicked(null); setShowHelp(false)
  }

  // Load existing mastery, then start
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userIdRef.current = user.id
      const { data } = await supabase.from('user_skill_mastery')
        .select('skill_id, mastery_level, streak, recent_wrong, total_correct, total_attempts, last_error_tag, next_review_at')
        .eq('user_id', user.id)
      const map: Record<string, SkillStat> = {}
      for (const r of data ?? []) {
        map[r.skill_id] = {
          mastery: r.mastery_level ?? 0, streak: r.streak ?? 0, recentWrong: r.recent_wrong ?? 0,
          attempts: r.total_attempts ?? 0, correct: r.total_correct ?? 0,
          lastErrorTag: r.last_error_tag ?? undefined,
          nextReviewAt: r.next_review_at ? new Date(r.next_review_at).getTime() : undefined,
        }
      }
      statsRef.current = map
      setStats(map)
      nextProblem()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (skill: AddSkill, st: SkillStat) => {
    const uid = userIdRef.current
    if (!uid) return
    supabase.from('user_skill_mastery').upsert({
      user_id: uid, skill_id: skill, mastery_level: st.mastery, streak: st.streak,
      recent_wrong: st.recentWrong, total_correct: st.correct, total_attempts: st.attempts,
      last_error_tag: st.lastErrorTag ?? null,
      next_review_at: st.nextReviewAt ? new Date(st.nextReviewAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).then(() => {}, () => {})
  }

  const pick = (opt: TaggedOption) => {
    if (picked !== null || !cur) return
    playTap()
    const ok = opt.tag === 'correct'
    setPicked(opt.value)
    setTotal(n => n + 1)
    const updated = updateStat(statsRef.current[cur.skill], ok, ok ? undefined : opt.tag, Date.now())
    const nextStats = { ...statsRef.current, [cur.skill]: updated }
    statsRef.current = nextStats
    setStats(nextStats)
    persist(cur.skill, updated)

    if (ok) {
      setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(nextProblem, 650)
    } else {
      setStreak(0)
      playWrong()
      // The diagnostic payoff: a carry mistake → show how to carry, on the number line
      if (cur.skill === 'add_2d_carry' || opt.tag === 'forgot_carry') setShowHelp(true)
    }
  }

  const stop = async () => {
    setEnded(true)
    const xp = correct * 2
    if (xp > 0 && userIdRef.current) {
      const { data } = await supabase.from('profiles').select('xp').eq('id', userIdRef.current).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', userIdRef.current)
    }
  }
  const restart = () => { setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false); nextProblem() }

  // ── Ended summary ──
  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🧠'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_smart_add', lang)}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-3" style={{ color: 'var(--warning)' }}>🔥 {t('train_best', lang)}: {best}</p>
        <MasteryPanel stats={stats} lang={lang} />
        <p className="font-black text-xl mt-3 mb-10 tabular" style={{ color: 'var(--primary)' }}>+{correct * 2} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/train')}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
            style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
            {t('game_home', lang)}
          </button>
          <button onClick={restart}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black"
            style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  if (!cur) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🧠 {t('train_smart_add', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total} · {ADD_SKILL_LABEL[cur.skill][lang]}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        {/* Mastery panel — the adaptive state, visible (great for the demo) */}
        <MasteryPanel stats={stats} lang={lang} current={cur.skill} />

        {/* Problem / help */}
        {showHelp ? (
          <div className="bg-card rounded-3xl px-5 py-5 shadow-[var(--shadow-md)] flex flex-col gap-3">
            <p className="text-sm font-bold text-foreground text-center">{t('sm_help_carry', lang)}</p>
            <NumberLineSolver a={cur.a} op="+" b={cur.b} />
          </div>
        ) : (
          <div className="bg-card rounded-3xl px-5 py-7 shadow-[var(--shadow-md)]">
            <p className="text-5xl font-display font-black text-center tabular-nums leading-none">
              <span className="text-foreground">{cur.a}</span>
              <span className="mx-2" style={{ color: 'var(--accent)' }}>+</span>
              <span className="text-foreground">{cur.b}</span>
            </p>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {cur.options.map(opt => {
            const isSel = picked === opt.value
            const isRight = opt.tag === 'correct'
            let style: CSSProperties = { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', ['--pop-shadow' as string]: 'var(--border)' }
            let anim = ''
            if (picked) {
              if (isSel && isRight) { style = { background: 'var(--success)', color: 'white', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'var(--brand-deep)' }; anim = 'animate-mk-pop' }
              else if (isSel) { style = { background: 'var(--destructive)', color: 'white', borderColor: 'var(--destructive)', ['--pop-shadow' as string]: 'oklch(0.45 0.2 25)' }; anim = 'animate-mk-shake' }
              else if (isRight) { style = { background: 'color-mix(in oklch, var(--success) 16%, var(--card))', color: 'var(--success)', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'color-mix(in oklch, var(--success) 28%, var(--card))' } }
            }
            return (
              <button key={opt.value} disabled={!!picked} onClick={() => pick(opt)}
                className={`pop-btn rounded-[var(--radius)] py-6 text-2xl font-display font-black border-2 min-h-[72px] ${anim}`}
                style={style}>
                {opt.value}
              </button>
            )
          })}
        </div>

        {/* Continue after a wrong answer */}
        {picked && cur.options.find(o => o.value === picked)?.tag !== 'correct' && (
          <button onClick={nextProblem}
            className="pop-btn w-full font-display text-white font-black text-xl rounded-[var(--radius)] py-4 flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('next', lang)} <ArrowRight size={20} />
          </button>
        )}
      </main>

      {/* Stop */}
      <div className="px-4 pb-8 pt-4 max-w-md mx-auto w-full">
        <button onClick={stop}
          className="w-full py-3.5 rounded-[var(--radius)] font-display font-black flex items-center justify-center gap-2 border-2"
          style={{ background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
          <Square size={15} fill="currentColor" /> {t('train_stop', lang)}
        </button>
      </div>
    </div>
  )
}

function MasteryPanel({ stats, lang, current }: { stats: Record<string, SkillStat>; lang: 'kk' | 'ru' | 'en'; current?: AddSkill }) {
  return (
    <div className="bg-card rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-sm)] w-full max-w-md mx-auto">
      <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-2">{t('sm_mastery', lang)}</p>
      <div className="flex flex-col gap-2">
        {ADD_LADDER.map(skill => {
          const m = Math.round((stats[skill]?.mastery ?? 0) * 100)
          const isCur = current === skill
          const color = m >= 80 ? 'var(--success)' : m >= 40 ? 'var(--accent)' : 'var(--primary)'
          return (
            <div key={skill} className="flex items-center gap-2">
              <span className={`text-[11px] w-32 shrink-0 truncate ${isCur ? 'font-black text-foreground' : 'font-semibold text-muted-foreground'}`}>
                {isCur ? '▶ ' : ''}{ADD_SKILL_LABEL[skill][lang]}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m}%`, background: color }} />
              </div>
              <span className="text-[11px] font-black tabular w-9 text-right" style={{ color }}>{m}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
