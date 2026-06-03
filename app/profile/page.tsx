'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ALL_LESSONS } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { LangSwitch } from '@/components/LangSwitch'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SoundToggle } from '@/components/SoundToggle'
import { Zap, Flame, CheckCircle2, Globe, Pencil, LogOut, ChevronRight, Moon, Volume2 } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type Profile = {
  name: string
  grade: number
  xp: number
  streak: number
  language: string
}

type LessonProgress = {
  lesson_id: string
  stars: number
  xp_earned: number
}

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const letter = name?.[0]?.toUpperCase() ?? '?'
  const colors = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
  const color = colors[letter.charCodeAt(0) % colors.length]
  const dim = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-9 h-9 text-base'
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ background: color }}>
      {letter}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language').eq('id', user.id).single(),
        supabase.from('lesson_progress').select('lesson_id, stars, xp_earned').eq('user_id', user.id),
      ])

      if (prof) { setProfile(prof); if (prof.language) saveLang(prof.language as 'ru' | 'kk' | 'en') }
      if (prog) setProgress(prog)
      setLoading(false)
    }
    init()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const changeLang = async (l: Lang) => {
    setProfile(p => (p ? { ...p, language: l } : p))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ language: l }).eq('id', user.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
    </div>
  )

  const totalStars = progress.reduce((s, p) => s + (p.stars ?? 0), 0)
  const totalXP = profile?.xp ?? 0
  const completedCount = progress.length
  const totalLessons = ALL_LESSONS.filter(l => l.grade.includes(profile?.grade ?? 2)).length

  const LANG_LABELS: Record<string, string> = { ru: '🇷🇺 Русский', kk: '🇰🇿 Қазақша', en: '🇬🇧 English' }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 lg:pb-10 lg:pl-60">

      {/* Header */}
      <header className="px-4 pt-5 pb-4 border-b-2 border-border/50">
        <div className="max-w-lg lg:max-w-2xl mx-auto w-full">
          <h1 className="font-display font-black text-foreground text-xl">{t('nav_profile', lang)}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 flex flex-col gap-4 pt-4 pb-6 max-w-lg lg:max-w-2xl mx-auto w-full">

        {/* Profile card */}
        <div className="bg-card rounded-[var(--radius-lg)] px-5 py-5 shadow-[var(--shadow-sm)] flex items-center gap-4">
          <Avatar name={profile?.name ?? '?'} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-foreground text-xl leading-tight truncate">{profile?.name}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{profile?.grade} {t('grade', lang)} · {LANG_LABELS[profile?.language ?? 'ru']}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1">
            <Zap size={24} fill="currentColor" style={{ color: 'var(--xp)' }} />
            <span className="font-display font-black text-foreground text-xl tabular">{totalXP}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">XP</span>
          </div>
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1">
            <Flame size={24} fill="currentColor" style={{ color: 'var(--warning)' }} />
            <span className="font-display font-black text-foreground text-xl tabular">{profile?.streak ?? 0}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">{t('days_streak', lang)}</span>
          </div>
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1">
            <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
            <span className="font-display font-black text-foreground text-xl tabular">{completedCount}/{totalLessons}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">{t('lessons_count', lang)}</span>
          </div>
        </div>

        {/* Stars row */}
        {totalStars > 0 && (
          <div className="rounded-[var(--radius-lg)] px-5 py-4 shadow-[var(--shadow-sm)] flex items-center justify-between"
            style={{ background: 'var(--gradient-gold)' }}>
            <div>
              <p className="font-black text-foreground text-lg">{'⭐'.repeat(Math.min(totalStars, 5))}</p>
              <p className="text-foreground text-sm font-semibold mt-0.5 tabular">{t('stars_earned', lang)} {totalStars}</p>
            </div>
            <span className="text-4xl">🏆</span>
          </div>
        )}

        {/* Completed lessons */}
        {progress.length > 0 && (
          <div className="bg-card rounded-[var(--radius-lg)] px-5 py-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-black text-muted-foreground tracking-widest uppercase mb-3">{t('completed_lessons', lang)}</p>
            <div className="flex flex-col gap-3">
              {progress.map(p => {
                const lesson = ALL_LESSONS.find(l => l.id === p.lesson_id)
                if (!lesson) return null
                return (
                  <button
                    key={p.lesson_id}
                    onClick={() => router.push(`/lesson/${p.lesson_id}`)}
                    className="flex items-center gap-3 active:opacity-70 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                      {lesson.emoji ?? '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-black text-foreground text-sm truncate">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</p>
                      <p className="text-xs text-muted-foreground tabular">+{p.xp_earned} XP</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3].map(s => (
                        <span key={s} className={`text-sm ${s <= p.stars ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Language */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] px-5 py-4 flex items-center gap-3">
          <Globe size={20} className="text-muted-foreground" />
          <span className="font-semibold text-foreground text-sm flex-1">{t('setup_language', lang)}</span>
          <LangSwitch className="!shadow-none" onChange={changeLang} />
        </div>

        {/* Settings: theme + sound */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-border/40">
            <Moon size={20} className="text-muted-foreground" />
            <span className="font-semibold text-foreground text-sm flex-1">{t('theme_label', lang)}</span>
            <ThemeToggle />
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <Volume2 size={20} className="text-muted-foreground" />
            <span className="font-semibold text-foreground text-sm flex-1">{t('sound_label', lang)}</span>
            <SoundToggle />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          <button
            onClick={() => router.push('/setup')}
            className="w-full flex items-center gap-3 px-5 py-4 border-b border-border/50 active:bg-muted transition-colors">
            <Pencil size={18} className="text-muted-foreground" />
            <span className="font-semibold text-foreground text-sm flex-1 text-left">{t('edit_profile', lang)}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-5 py-4 active:bg-muted transition-colors">
            <LogOut size={18} style={{ color: 'var(--destructive)' }} />
            <span className="font-semibold text-sm flex-1 text-left" style={{ color: 'var(--destructive)' }}>{t('sign_out', lang)}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}
