'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ALL_LESSONS } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { Loader } from '@/components/Loader'
import { LangSwitch } from '@/components/LangSwitch'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SoundToggle } from '@/components/SoundToggle'
import { SUBJECT_ICONS } from '@/components/GameIcons'
import { AvatarCropper } from '@/components/AvatarCropper'
import { Zap, Flame, CheckCircle2, Globe, Pencil, LogOut, ChevronRight, Moon, Volume2, Star, UserPlus, LineChart, Camera } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type Profile = {
  name: string
  grade: number
  xp: number
  streak: number
  language: string
  avatar_url: string | null
}

type LessonProgress = {
  lesson_id: string
  stars: number
  xp_earned: number
}

function Avatar({ name, src, size = 'lg' }: { name: string; src?: string | null; size?: 'sm' | 'lg' }) {
  const letter = name?.[0]?.toUpperCase() ?? '?'
  const colors = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
  const color = colors[letter.charCodeAt(0) % colors.length]
  const dim = size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-9 h-9 text-base'
  const ring = `0 0 0 ${size === 'lg' ? 5 : 3}px color-mix(in oklch, ${color} 20%, transparent)`
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={`${dim} rounded-full object-cover shrink-0`} style={{ boxShadow: ring }} />
    )
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-display font-black text-white shrink-0`}
      style={{ background: color, boxShadow: ring }}>
      {letter}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const lang = useLang()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setIsGuest(user.is_anonymous ?? false)

      const [{ data: prof }, { data: prog }] = await Promise.all([
        supabase.from('profiles').select('name, grade, xp, streak, language, avatar_url').eq('id', user.id).single(),
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

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert(t('photo_too_big', lang)); return }
    setCropFile(file) // open the cropper; upload happens on confirm
  }

  const uploadBlob = async (blob: Blob) => {
    setCropFile(null)
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const path = `${user.id}/avatar.jpg` // cropper always exports JPEG
      const { error: upErr } = await supabase.storage.from('avatars')
        .upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?v=${Date.now()}` // bust browser cache on re-upload
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile(p => (p ? { ...p, avatar_url: url } : p))
    } catch {
      // ignore — avatar simply stays as-is
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async () => {
    if (!window.confirm(t('confirm_remove_photo', lang))) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: files } = await supabase.storage.from('avatars').list(user.id)
      if (files?.length) {
        await supabase.storage.from('avatars').remove(files.map(f => `${user.id}/${f.name}`))
      }
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
      setProfile(p => (p ? { ...p, avatar_url: null } : p))
    } catch {
      // ignore
    } finally {
      setUploading(false)
    }
  }

  const changeLang = async (l: Lang) => {
    setProfile(p => (p ? { ...p, language: l } : p))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ language: l }).eq('id', user.id)
  }

  if (loading) return (
    <Loader />
  )

  const totalStars = progress.reduce((s, p) => s + (p.stars ?? 0), 0)
  const totalXP = profile?.xp ?? 0
  const completedCount = progress.length
  const totalLessons = ALL_LESSONS.filter(l => l.grade.includes(profile?.grade ?? 2)).length
  const maxStars = Math.max(completedCount * 3, 1)
  const starsPct = Math.round((totalStars / maxStars) * 100)

  const LANG_LABELS: Record<string, string> = { ru: 'Русский', kk: 'Қазақша', en: 'English' }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 lg:pb-10 lg:pl-60">

      {/* Header */}
      <header className="px-4 pt-5 pb-4 border-b-2 border-border/50">
        <div className="max-w-lg lg:max-w-2xl mx-auto w-full">
          <h1 className="font-display font-black text-foreground text-xl">{t('nav_profile', lang)}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 flex flex-col gap-4 pt-4 pb-6 max-w-lg lg:max-w-2xl mx-auto w-full">

        {/* Guest — save-progress nudge */}
        {isGuest && (
          <div className="rounded-[var(--radius-lg)] p-4 flex items-center gap-3 animate-mk-pop-in"
            style={{ background: 'color-mix(in oklch, var(--warning) 14%, var(--card))' }}>
            <p className="flex-1 text-xs font-semibold leading-snug text-foreground/80">{t('guest_banner', lang)}</p>
            <button onClick={() => router.push('/login')}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] text-white font-display font-black text-xs active:scale-95 transition-transform"
              style={{ background: 'var(--primary)' }}>
              <UserPlus size={14} /> {t('btn_register', lang)}
            </button>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-card rounded-[var(--radius-lg)] px-5 py-5 shadow-[var(--shadow-sm)] flex items-center gap-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t('change_photo', lang)}
            className="relative shrink-0 rounded-full active:scale-95 transition-transform disabled:opacity-70">
            <Avatar name={profile?.name ?? '?'} src={profile?.avatar_url} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-[var(--shadow-sm)] ring-2 ring-card"
              style={{ background: 'var(--primary)' }}>
              {uploading
                ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Camera size={14} />}
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-foreground text-xl leading-tight truncate">{profile?.name}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{profile?.grade} {t('grade', lang)} · {LANG_LABELS[profile?.language ?? 'en']}</p>
            {profile?.avatar_url && (
              <button onClick={removePhoto} disabled={uploading}
                className="mt-1.5 text-xs font-bold active:opacity-60 transition-opacity disabled:opacity-50"
                style={{ color: 'var(--destructive)' }}>
                {t('remove_photo', lang)}
              </button>
            )}
          </div>
        </div>

        {cropFile && (
          <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={uploadBlob} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1.5">
            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--xp) 16%, transparent)' }}>
              <Zap size={22} fill="currentColor" style={{ color: 'var(--xp)' }} />
            </span>
            <span className="font-display font-black text-foreground text-xl tabular">{totalXP}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">XP</span>
          </div>
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1.5">
            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--warning) 16%, transparent)' }}>
              <Flame size={22} fill="currentColor" style={{ color: 'var(--warning)' }} />
            </span>
            <span className="font-display font-black text-foreground text-xl tabular">{profile?.streak ?? 0}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">{t('days_streak', lang)}</span>
          </div>
          <div className="bg-card rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] flex flex-col items-center gap-1.5">
            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklch, var(--success) 16%, transparent)' }}>
              <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
            </span>
            <span className="font-display font-black text-foreground text-xl tabular">{completedCount}/{totalLessons}</span>
            <span className="text-[11px] text-muted-foreground font-semibold">{t('lessons_count', lang)}</span>
          </div>
        </div>

        {/* Stars / trophy — earned vs possible */}
        {totalStars > 0 && (
          <div className="rounded-[var(--radius-lg)] px-5 py-4 shadow-[var(--shadow-sm)] flex items-center gap-4"
            style={{ background: 'var(--gradient-gold)' }}>
            <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-3xl shrink-0">🏆</div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-lg leading-tight">{t('stars_label', lang)}</p>
              <p className="text-foreground/75 text-sm font-bold tabular mt-0.5">{totalStars} / {maxStars}</p>
              <div className="mt-2 h-2 rounded-full bg-white/35 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${starsPct}%` }} />
              </div>
            </div>
            <p className="font-display font-black text-foreground text-3xl tabular shrink-0">{totalStars}</p>
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
                const subj = SUBJECT_ICONS[lesson.subjectId]
                return (
                  <button
                    key={p.lesson_id}
                    onClick={() => router.push(`/lesson/${p.lesson_id}`)}
                    className="flex items-center gap-3 active:opacity-70 transition-opacity text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: subj ? `color-mix(in oklch, ${subj.color} 14%, transparent)` : 'var(--muted)' }}>
                      {subj
                        ? <span style={{ color: subj.color }}><subj.Comp size={22} /></span>
                        : <span className="text-xl">{lesson.emoji ?? '📚'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-black text-foreground text-sm truncate">{lesson.titleByLang[lang] ?? lesson.titleByLang.ru}</p>
                      <p className="text-xs text-muted-foreground tabular">+{p.xp_earned} XP</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3].map(s => (
                        <Star key={s} size={15} fill="currentColor"
                          style={{ color: s <= p.stars ? 'var(--xp)' : 'var(--border)' }} />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Parent progress dashboard */}
        <button onClick={() => router.push('/progress')}
          className="rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] px-5 py-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          style={{ background: 'color-mix(in oklch, var(--primary) 10%, var(--card))' }}>
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in oklch, var(--primary) 18%, transparent)', color: 'var(--primary)' }}>
            <LineChart size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-foreground text-sm">{t('dash_open', lang)}</p>
            <p className="text-muted-foreground text-xs">{t('dash_radar', lang)}</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </button>

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
