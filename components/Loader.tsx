'use client'

// The loading mark. A border-spinner belongs to no product — this one is a
// ten-frame filling up, the same manipulative the grade-1 trainers teach on
// (components/TenFrame.tsx), so waiting looks like counting. Pure CSS: ten dots
// with staggered delays, no timers, no state.
//
// Resting opacity is deliberately visible: prefers-reduced-motion kills the
// animation app-wide (see globals.css), and a frozen invisible dot would read
// as a broken screen. Reduced motion shows a still, dim frame instead.

export function LoaderMark({ dot = 14 }: { dot?: number }) {
  return (
    <div className="inline-grid grid-cols-5 gap-1.5 p-2.5 rounded-2xl"
      style={{ background: 'color-mix(in oklch, var(--muted) 60%, var(--card))' }} aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="mk-count-dot rounded-full"
          style={{ width: dot, height: dot, background: 'var(--gradient-gold)', animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  )
}

/** Full-screen page loader. */
export function Loader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--background)' }} role="status" aria-live="polite">
      <LoaderMark />
      {label && <p className="text-sm font-bold text-muted-foreground">{label}</p>}
    </div>
  )
}
