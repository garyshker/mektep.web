'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { speak } from '@/lib/speak'
import { pickSkill, updateStat, type SkillStat } from '@/lib/skills'
import {
  VOCAB_THEMES, skillIdOf, meaningOf, buildVocabQuestion,
  type VocabTheme, type VocabQuestion,
} from '@/lib/kazakh-vocab'
import { X, Volume2, Flame, Square } from 'lucide-react'

const MASTERED = 0.8

export function KazakhTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()
  const userIdRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, SkillStat>>({})
  const statsRef = useRef<Record<string, SkillStat>>({}) // kept in sync explicitly in init() + pick()

  const [theme, setTheme] = useState<VocabTheme | null>(null)
  const [cur, setCur] = useState<VocabQuestion | null>(null)
  const curSkill = useRef<string>('')
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userIdRef.current = user.id
      const { data } = await supabase.from('user_skill_mastery')
        .select('skill_id, mastery_level, streak, recent_wrong, total_correct, total_attempts, next_review_at')
        .eq('user_id', user.id).like('skill_id', 'kaz:%')
      const map: Record<string, SkillStat> = {}
      for (const r of data ?? []) {
        map[r.skill_id] = {
          mastery: r.mastery_level ?? 0, streak: r.streak ?? 0, recentWrong: r.recent_wrong ?? 0,
          attempts: r.total_attempts ?? 0, correct: r.total_correct ?? 0,
          nextReviewAt: r.next_review_at ? new Date(r.next_review_at).getTime() : undefined,
        }
      }
      statsRef.current = map
      setStats(map)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (skill: string, st: SkillStat) => {
    const uid = userIdRef.current
    if (!uid) return
    supabase.from('user_skill_mastery').upsert({
      user_id: uid, skill_id: skill, mastery_level: st.mastery, streak: st.streak,
      recent_wrong: st.recentWrong, total_correct: st.correct, total_attempts: st.attempts,
      next_review_at: st.nextReviewAt ? new Date(st.nextReviewAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).then(() => {}, () => {})
  }

  const nextProblem = (th: VocabTheme) => {
    const ladder = th.words.map(w => skillIdOf(th.id, w.id))
    const skill = pickSkill(statsRef.current, ladder)
    const word = th.words.find(w => skillIdOf(th.id, w.id) === skill) ?? th.words[0]
    curSkill.current = skillIdOf(th.id, word.id)
    setCur(buildVocabQuestion(th, word, statsRef.current[curSkill.current]?.mastery ?? 0, lang))
    setPicked(null)
  }

  // Auto-play the word in listening mode (best-effort; the Listen button is the reliable path)
  useEffect(() => {
    if (cur?.mode === 'listening' && !picked) {
      const id = window.setTimeout(() => speak(cur.word.kk), 250)
      return () => clearTimeout(id)
    }
  }, [cur, picked])

  const start = (th: VocabTheme) => {
    setTheme(th); setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    nextProblem(th)
  }

  const pick = (opt: string) => {
    if (picked !== null || !cur || !theme) return
    playTap()
    const ok = opt === cur.answer
    setPicked(opt)
    setTotal(n => n + 1)
    const updated = updateStat(statsRef.current[curSkill.current], ok, undefined, Date.now())
    const next = { ...statsRef.current, [curSkill.current]: updated }
    statsRef.current = next
    setStats(next)
    persist(curSkill.current, updated)
    if (ok) {
      setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
    } else {
      setStreak(0); playWrong()
      speak(cur.word.kk) // hear the right answer
    }
    setTimeout(() => nextProblem(theme), ok ? 750 : 1500)
  }

  const stop = async () => {
    setEnded(true)
    const xp = correct * 2
    if (xp > 0 && userIdRef.current) {
      const { data } = await supabase.from('profiles').select('xp').eq('id', userIdRef.current).single()
      await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + xp }).eq('id', userIdRef.current)
    }
  }

  const themeProgress = (th: VocabTheme) => {
    const ids = th.words.map(w => skillIdOf(th.id, w.id))
    const mastered = ids.filter(id => (stats[id]?.mastery ?? 0) >= MASTERED).length
    return { mastered, total: ids.length }
  }

  if (loading) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  // ── Ended summary ──
  if (ended && theme) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const { mastered, total: words } = themeProgress(theme)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '📖'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{theme.name[lang]}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-1" style={{ color: 'var(--success)' }}>{mastered} / {words} {t('kaz_mastered', lang)}</p>
        <p className="font-black text-xl mt-2 mb-10 tabular" style={{ color: 'var(--primary)' }}>+{correct * 2} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => setTheme(null)}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
            style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
            {t('kaz_pick_theme', lang)}
          </button>
          <button onClick={() => start(theme)}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black"
            style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  // ── Theme picker ──
  if (!theme) {
    return (
      <div className="min-h-screen pb-24 lg:pb-10" style={{ background: 'var(--background)' }}>
        <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-lg mx-auto w-full">
          <button onClick={() => router.push('/train')} aria-label="Exit"
            className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
            <X size={18} />
          </button>
          <div>
            <h1 className="font-display font-black text-foreground text-xl leading-tight">📖 {t('train_kazakh', lang)}</h1>
            <p className="text-xs text-muted-foreground">{t('kaz_pick_theme', lang)}</p>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 grid grid-cols-2 gap-3">
          {VOCAB_THEMES.map(th => {
            const { mastered, total: words } = themeProgress(th)
            const pct = Math.round((mastered / words) * 100)
            return (
              <button key={th.id} onClick={() => { playTap(); start(th) }}
                className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col gap-2 text-left active:scale-[0.98] transition-transform">
                <span className="text-3xl">{th.emoji}</span>
                <p className="font-display font-black text-foreground text-sm leading-tight">{th.name[lang]}</p>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--success)' : 'var(--primary)' }} />
                </div>
                <p className="text-[11px] text-muted-foreground tabular">{words} {t('kaz_words_count', lang)} · {pct}%</p>
              </button>
            )
          })}
        </main>
      </div>
    )
  }

  if (!cur) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const { mastered, total: words } = themeProgress(theme)
  const qLabel = cur.mode === 'recognition' ? 'kaz_q_recognition' : cur.mode === 'production' ? 'kaz_q_production' : 'kaz_q_listening'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => setTheme(null)} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-black text-foreground text-base leading-tight truncate">{theme.emoji} {theme.name[lang]}</h1>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((mastered / words) * 100)}%`, background: 'var(--success)' }} />
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1 shrink-0" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        {/* Prompt card */}
        <div className="bg-card rounded-3xl px-5 py-7 shadow-[var(--shadow-md)] flex flex-col items-center gap-3 min-h-[150px] justify-center">
          <p className="text-[10px] font-black text-muted-foreground tracking-[0.15em] uppercase">{t(qLabel, lang)}</p>
          {cur.mode === 'listening' ? (
            <button onClick={() => speak(cur.word.kk)}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
              style={{ background: 'var(--gradient-hero)' }} aria-label={t('kaz_listen', lang)}>
              <Volume2 size={34} />
            </button>
          ) : cur.mode === 'recognition' ? (
            <button onClick={() => speak(cur.word.kk)} className="flex items-center gap-2 active:scale-95 transition-transform">
              <span className="text-4xl font-display font-black text-foreground">{cur.word.kk}</span>
              <Volume2 size={22} style={{ color: 'var(--primary)' }} />
            </button>
          ) : (
            <span className="text-3xl font-display font-black text-center" style={{ color: 'var(--foreground)' }}>{meaningOf(cur.word, lang)}</span>
          )}
          {/* Reinforcement after answering */}
          {picked !== null && (
            <p className="text-sm font-bold text-muted-foreground animate-mk-pop-in">
              {cur.word.emoji} {cur.word.kk} — {meaningOf(cur.word, lang)}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {cur.options.map(opt => {
            const isSel = picked === opt
            const isRight = opt === cur.answer
            let style: CSSProperties = { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', ['--pop-shadow' as string]: 'var(--border)' }
            let anim = ''
            if (picked !== null) {
              if (isRight) { style = { background: 'var(--success)', color: 'white', borderColor: 'var(--success)', ['--pop-shadow' as string]: 'var(--brand-deep)' }; anim = isSel ? 'animate-mk-pop' : '' }
              else if (isSel) { style = { background: 'var(--destructive)', color: 'white', borderColor: 'var(--destructive)', ['--pop-shadow' as string]: 'oklch(0.45 0.2 25)' }; anim = 'animate-mk-shake' }
            }
            return (
              <button key={opt} disabled={picked !== null} onClick={() => pick(opt)}
                className={`pop-btn rounded-[var(--radius)] py-5 px-3 text-xl font-display font-black border-2 min-h-[68px] ${anim}`}
                style={style}>
                {opt}
              </button>
            )
          })}
        </div>
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
