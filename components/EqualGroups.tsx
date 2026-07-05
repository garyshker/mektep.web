'use client'

// Grade-2 multiplication as a concept: `groups` equal groups of `each` dots.
// This is what "3 × 4" MEANS — three groups of four — and why it equals
// 4 + 4 + 4. Rendered as tidy dot-cards so the child can count and see it.

export function EqualGroups({ groups, each, tone = 'a' }: { groups: number; each: number; tone?: 'a' | 'b' }) {
  const dot = tone === 'a'
    ? 'radial-gradient(circle at 34% 30%, #ffd591, #f0a23a 55%, #c9772a)'
    : 'radial-gradient(circle at 34% 30%, #9fe0cf, #4aa38e 55%, #2f7a68)'
  const cols = each <= 3 ? each : each <= 4 ? 2 : each <= 6 ? 3 : each <= 9 ? 3 : 4
  return (
    <div className="flex flex-wrap items-start justify-center gap-2.5">
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="rounded-2xl p-2 animate-mk-pop-in"
          style={{ background: 'color-mix(in oklch, var(--muted) 55%, var(--card))', border: '2px solid var(--border)' }}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: each }).map((_, i) => (
              <span key={i} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                style={{ background: dot, boxShadow: 'inset -1px -1px 1.5px rgba(90,60,20,0.35), 0 1px 1.5px rgba(0,0,0,0.25)' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
