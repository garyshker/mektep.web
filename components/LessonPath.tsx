'use client'

// A guided path: a vertical chain of steps that the child walks in order.
// A step is DONE (>=1 crown), ACTIVE (the first not-yet-started), or LOCKED
// (after the active one). It turns a pile of trainers into a road with a next.
import { useRouter } from 'next/navigation'
import { Check, Lock, Star, Play } from 'lucide-react'

export type PathStep = { path: string; emoji: string; title: string; correct: number }

// Same thresholds as the crowns.
const crownsOf = (n: number) => (n >= 120 ? 3 : n >= 60 ? 2 : n >= 20 ? 1 : 0)

export function LessonPath({ steps, sideLabel }: { steps: PathStep[]; sideLabel: string }) {
  const router = useRouter()
  // The active step = first with 0 crowns; everything before it is unlocked.
  const activeIdx = (() => {
    const i = steps.findIndex(s => crownsOf(s.correct) === 0)
    return i === -1 ? steps.length : i   // all done → nothing active
  })()

  return (
    <div className="relative flex flex-col items-center gap-0 py-2">
      {steps.map((s, i) => {
        const crowns = crownsOf(s.correct)
        const done = crowns > 0
        const active = i === activeIdx
        const locked = i > activeIdx
        // gentle serpentine so the road feels like a journey, not a list
        const shift = [0, 46, 66, 46, 0, -46, -66, -46][i % 8]

        const bg = done ? 'var(--gradient-gold)'
          : active ? 'var(--gradient-hero)'
          : 'var(--muted)'
        const ring = active ? '0 0 0 6px color-mix(in oklch, var(--primary) 22%, transparent)' : 'none'

        return (
          <div key={s.path} className="flex flex-col items-center" style={{ transform: `translateX(${shift}px)` }}>
            {i > 0 && (
              <div className="w-1.5 h-6 rounded-full my-1"
                style={{ background: i <= activeIdx ? 'color-mix(in oklch, var(--accent) 45%, var(--card))' : 'var(--border)' }} />
            )}
            <button
              onClick={() => { if (!locked) router.push(s.path) }}
              disabled={locked}
              aria-label={s.title}
              className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl transition-transform ${active ? 'animate-mk-pop-in active:scale-95' : locked ? '' : 'active:scale-95'}`}
              style={{ background: bg, boxShadow: ring, opacity: locked ? 0.55 : 1, border: done ? '3px solid var(--accent-deep)' : 'none' }}>
              {locked ? <Lock size={24} className="text-muted-foreground" />
                : active ? <Play size={26} className="text-white ml-1" fill="currentColor" />
                : <span>{s.emoji}</span>}
              {done && (
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--success)' }}>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
            {/* label + crowns under the node */}
            <div className="flex flex-col items-center mt-1.5 max-w-[130px]">
              <span className={`text-[11px] font-display font-black text-center leading-tight ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>{s.title}</span>
              <span className="flex gap-0.5 mt-0.5">
                {[0, 1, 2].map(c => (
                  <Star key={c} size={11}
                    fill={c < crowns ? 'var(--accent)' : 'none'}
                    style={{ color: c < crowns ? 'var(--accent-deep)' : 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }} />
                ))}
              </span>
            </div>
          </div>
        )
      })}
      <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase mt-4">{sideLabel}</p>
    </div>
  )
}
