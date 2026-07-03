'use client'

// Ten-frame (числовой квадрат / "десятка") — the world-standard grade-1
// manipulative for number sense: counters fill a 2×5 grid so a 6-year-old SEES
// that 7 is "5 and 2 more" and "3 short of 10". Fills the top row first, then
// the bottom — the conventional order.

const COUNTER = 'radial-gradient(circle at 35% 30%, #ffd591, #f0a23a 55%, #c9772a)'
const COUNTER_B = 'radial-gradient(circle at 35% 30%, #9fe0cf, #4aa38e 55%, #2f7a68)'

// `split` paints the first `split` counters amber and the rest teal — the
// part-part-whole picture for number bonds. `pending` shows the second part
// as dashed "?" slots until the child answers.
export function TenFrame({ n, split, pending }: { n: number; split?: number; pending?: boolean }) {
  const filled = Math.max(0, Math.min(10, n))
  const amber = split === undefined ? filled : Math.max(0, Math.min(filled, split))
  return (
    <div className="inline-grid grid-cols-5 gap-1.5 p-2 rounded-2xl"
      style={{ background: 'color-mix(in oklch, var(--muted) 55%, var(--card))' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--card)', border: '2px solid var(--border)' }}>
          {i < amber && (
            <span className="w-[74%] h-[74%] rounded-full animate-mk-pop-in"
              style={{ background: COUNTER, boxShadow: 'inset -1px -1.5px 2px rgba(120,80,20,0.4), 0 1px 2px rgba(0,0,0,0.25)' }} />
          )}
          {i >= amber && i < filled && (pending ? (
            <span className="w-[74%] h-[74%] rounded-full flex items-center justify-center font-black text-muted-foreground/70"
              style={{ border: '2px dashed var(--border)' }}>?</span>
          ) : (
            <span className="w-[74%] h-[74%] rounded-full animate-mk-pop-in"
              style={{ background: COUNTER_B, boxShadow: 'inset -1px -1.5px 2px rgba(20,80,65,0.4), 0 1px 2px rgba(0,0,0,0.25)' }} />
          ))}
        </div>
      ))}
    </div>
  )
}
