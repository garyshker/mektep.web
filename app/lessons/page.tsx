'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ALL_LESSONS, SUBJECTS, UPCOMING_SUBJECTS, subjectLabel, subjectDesc } from '@/lib/lessons'
import { BottomNav } from '@/components/BottomNav'
import { useLang, saveLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ChevronRight, ChevronLeft, Lock } from 'lucide-react'
import type { Lesson } from '@/lib/lessons'
import type { CSSProperties } from 'react'

// ── helpers ──────────────────────────────────────────────────────────────────

function StarDots({ stars, color }: { stars: number; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(s => (
        <div key={s} className="w-2 h-2 rounded-full"
          style={{ background: s <= stars ? color : 'var(--border)' }} />
      ))}
    </div>
  )
}


// ── countdown timer for upcoming subjects ─────────────────────────────────────

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    function calc() {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('ЖАҚЫНДА'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${d}к ${h}с ${m}м`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

// ── subject grid view ─────────────────────────────────────────────────────────

function SubjectGrid({ grade, starsMap, lang, router }: {
  grade: number
  starsMap: Record<string, number>
  lang: 'ru' | 'kk' | 'en'
  router: ReturnType<typeof useRouter>
}) {
  // Upcoming countdown: 5 days from now (hardcoded relative)
  const target = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  const countdown = useCountdown(target)

  return (
    <div className="flex flex-col gap-5">

      {/* Active subjects */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {SUBJECTS.filter(s => s.id !== 'russian').map(subj => {
            const lessons = ALL_LESSONS.filter(l => l.subjectId === subj.id && l.grade.includes(grade))
            const done    = lessons.filter(l => (starsMap[l.id] ?? 0) > 0).length
            const pct     = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0
            const nextL   = lessons.find(l => (starsMap[l.id] ?? 0) === 0)

            return (
              <button key={subj.id}
                onClick={() => router.push(`/lessons?subject=${subj.id}`)}
                className="bg-card rounded-[var(--radius-lg)] p-4 text-left flex flex-col gap-3 shadow-[var(--shadow-sm)] active:scale-[0.97] transition-all border-2 border-transparent">
                {/* Icon */}
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ background: subj.bg }}>
                  {subj.emoji}
                </div>
                {/* Name + desc */}
                <div>
                  <p className="font-display font-black text-foreground text-sm">{subjectLabel(subj, lang)}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{subjectDesc(subj, lang)}</p>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: subj.color }} />
                </div>
                {/* Next lesson row */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[80%]">
                    {nextL
                      ? `${t('next_lesson_label', lang)} ${nextL.titleByLang[lang] ?? nextL.titleByLang.ru}`
                      : `${pct}% ${t('pct_done', lang)}`}
                  </span>
                  <ChevronRight size={15} style={{ color: 'var(--primary)' }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Coming soon subjects */}
      <div>
        <p className="text-xs font-black text-muted-foreground tracking-widest uppercase mb-2">{t('soon_label', lang)}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {UPCOMING_SUBJECTS.map(subj => (
            <div key={subj.id}
              className="bg-card rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 border-2 border-dashed border-border opacity-75">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-muted">
                  {subj.emoji}
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ background: subj.color }}>
                  {t('soon_label', lang).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-display font-black text-foreground text-sm">{subjectLabel(subj, lang)}</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">{subjectDesc(subj, lang)}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground tabular">{countdown}</span>
                <button className="text-[10px] font-black rounded-full px-2.5 py-1"
                  style={{ background: 'color-mix(in oklch, var(--primary) 12%, white)', color: 'var(--primary)' }}
                  onClick={e => e.stopPropagation()}>
                  {t('notify_me', lang)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── lesson list view ──────────────────────────────────────────────────────────

function LessonList({ subjectId, grade, starsMap, lang, router }: {
  subjectId: string
  grade: number
  starsMap: Record<string, number>
  lang: 'ru' | 'kk' | 'en'
  router: ReturnType<typeof useRouter>
}) {
  const subj     = SUBJECTS.find(s => s.id === subjectId)
  const unlocked = ALL_LESSONS.filter(l => l.subjectId === subjectId && l.grade.includes(grade))
  const locked   = ALL_LESSONS.filter(l => l.subjectId === subjectId && !l.grade.includes(grade)).slice(0, 6)
  const completed = unlocked.filter(l => (starsMap[l.id] ?? 0) > 0).length
  const pct = unlocked.length > 0 ? Math.round((completed / unlocked.length) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Subject header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/lessons')}
          className="w-9 h-9 rounded-xl bg-card flex items-center justify-center shadow-[var(--shadow-sm)]"
          style={{ color: 'var(--primary)' }}>
          <ChevronLeft size={20} />
        </button>
        {subj && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
              style={{ background: subj.bg }}>
              {subj.emoji}
            </div>
            <div>
              <p className="font-display font-black text-foreground text-base">{subjectLabel(subj, lang)}</p>
              <p className="text-muted-foreground text-[10px]">{subjectDesc(subj, lang)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {unlocked.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-card rounded-full overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'var(--success)' }} />
          </div>
          <span className="text-xs font-black text-muted-foreground tabular shrink-0">{completed}/{unlocked.length}</span>
        </div>
      )}

      {/* Lesson path (Duolingo-style winding stack) */}
      {unlocked.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🚧</div>
          <p className="font-semibold">{t('coming_soon_tmpl', lang).replace('[N]', String(grade))}</p>
        </div>
      ) : (
        <LessonPath unlocked={unlocked} locked={locked} starsMap={starsMap} lang={lang}
          onOpen={id => router.push(`/lesson/${id}`)} />
      )}
    </div>
  )
}

type NodeState = 'done' | 'current' | 'open' | 'locked'

function LessonPath({ unlocked, locked, starsMap, lang, onOpen }: {
  unlocked: Lesson[]; locked: Lesson[]; starsMap: Record<string, number>
  lang: 'ru' | 'kk' | 'en'; onOpen: (id: string) => void
}) {
  const currentId = unlocked.find(l => (starsMap[l.id] ?? 0) === 0)?.id
  const seq: { lesson: Lesson; stars: number; state: NodeState }[] = [
    ...unlocked.map(l => {
      const s = starsMap[l.id] ?? 0
      return { lesson: l, stars: s, state: (s > 0 ? 'done' : l.id === currentId ? 'current' : 'open') as NodeState }
    }),
    ...locked.map(l => ({ lesson: l, stars: 0, state: 'locked' as NodeState })),
  ]

  return (
    <div className="relative flex flex-col items-center gap-7 py-4 mx-auto w-full" style={{ maxWidth: 340 }}>
      {/* central dotted path line */}
      <div className="absolute top-6 bottom-6 w-1 rounded-full"
        style={{ left: '50%', transform: 'translateX(-50%)', background: 'repeating-linear-gradient(var(--border) 0 6px, transparent 6px 14px)' }} />

      {seq.map((n, i) => {
        const offset = Math.round(Math.sin(i * 0.9) * 54)
        const isCurrent = n.state === 'current'
        const isLocked = n.state === 'locked'
        const size = isCurrent ? 76 : 64
        const bg = n.state === 'done' ? 'var(--gradient-success)'
          : isCurrent ? 'var(--gradient-hero)'
          : isLocked ? 'var(--muted)' : 'var(--card)'
        const popShadow = n.state === 'done' ? 'var(--brand-deep)' : isCurrent ? 'var(--primary-deep)' : 'var(--border)'
        return (
          <div key={n.lesson.id} className="relative z-10 flex flex-col items-center gap-1.5"
            style={{ transform: `translateX(${offset}px)` }}>
            {isCurrent && (
              <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: 'var(--primary)' }}>
                {t('start', lang)}
              </span>
            )}
            <button disabled={isLocked} onClick={() => onOpen(n.lesson.id)}
              className={`pop-btn rounded-full flex items-center justify-center ${isCurrent ? 'animate-pulse' : ''}`}
              style={{ width: size, height: size, fontSize: 28, background: bg,
                ['--pop-shadow' as string]: popShadow, opacity: isLocked ? 0.55 : 1,
                cursor: isLocked ? 'default' : 'pointer' } as CSSProperties}>
              {isLocked ? <Lock size={22} style={{ color: 'var(--muted-foreground)' }} /> : <span>{n.lesson.emoji ?? '📚'}</span>}
            </button>
            {n.state === 'done' && <StarDots stars={n.stars} color="var(--accent)" />}
            <span className={`text-[11px] font-bold text-center leading-tight line-clamp-2 max-w-[130px] ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
              {n.lesson.titleByLang[lang] ?? n.lesson.titleByLang.ru}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

function LessonsContent() {
  const [grade, setGrade]       = useState(2)
  const [starsMap, setStarsMap] = useState<Record<string, number>>({})
  const [loaded, setLoaded]     = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const lang = useLang()

  const subjectParam = params.get('subject')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('grade, language').eq('id', user.id).single()
      if (profile?.grade) setGrade(profile.grade)
      if (profile?.language) saveLang(profile.language as 'ru' | 'kk' | 'en')
      const { data: progress } = await supabase.from('lesson_progress').select('lesson_id, stars').eq('user_id', user.id)
      if (progress) {
        const map: Record<string, number> = {}
        progress.forEach((p: { lesson_id: string; stars: number }) => { map[p.lesson_id] = p.stars })
        setStarsMap(map)
      }
      setLoaded(true)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen pb-24 lg:pb-10 lg:pl-60" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <header className="px-4 pt-5 pb-3 sticky top-0 z-10" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl lg:max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="font-display font-black text-foreground text-xl">
            {subjectParam
              ? (() => { const s = SUBJECTS.find(x => x.id === subjectParam); return s ? subjectLabel(s, lang) : t('lessons', lang) })()
              : t('subjects_title', lang)}
          </h1>
          <span className="text-sm font-bold text-muted-foreground tabular">{grade} {t('grade', lang)}</span>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-2">
        {subjectParam ? (
          <LessonList
            subjectId={subjectParam}
            grade={grade}
            starsMap={starsMap}
            lang={lang}
            router={router}
          />
        ) : (
          <SubjectGrid
            grade={grade}
            starsMap={starsMap}
            lang={lang}
            router={router}
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default function LessonsPage() {
  return <Suspense><LessonsContent /></Suspense>
}
