'use client'

// The array-to-grid representation (NCETM Spine 2.14): a 2-digit × 1-digit
// product drawn as `rows` rows of base-ten blocks — ten-rods then unit cubes.
// `split` opens a gap between the tens part and the ones part, so the
// distributive law is literally visible: one rectangle = two rectangles.
// A ten is a tall SEGMENTED rod, a one is a small cube — the size difference
// is the whole point, so a child can see 10-of-those in one of these.

type HL = 'none' | 'tens' | 'ones'

const ROD_W = 12, ROD_H = 30, CUBE = 12, CELL_GAP = 3

function Rod() {
  return <span style={{
    width: ROD_W, height: ROD_H, borderRadius: 3, background: '#5bb3a0',
    backgroundImage: 'repeating-linear-gradient(rgba(20,80,65,.45) 0 1px, transparent 1px 3px)',
    border: '1.5px solid #2f7a68', flexShrink: 0,
  }} />
}
function Cube() {
  return <span style={{
    width: CUBE, height: CUBE, borderRadius: 2.5, background: '#efb14a',
    border: '1.5px solid #a9702a', flexShrink: 0,
  }} />
}

export function PartitionArray({ tens, ones, rows, split = false, highlight = 'none', tensLabel, onesLabel }: {
  tens: number; ones: number; rows: number
  split?: boolean; highlight?: HL
  tensLabel?: string; onesLabel?: string
}) {
  const lit = (part: 'tens' | 'ones') => highlight === part
  const dimmed = (part: 'tens' | 'ones') => highlight !== 'none' && !lit(part)

  const group = (part: 'tens' | 'ones', render: () => React.ReactNode, label?: string) => (
    <div className="flex flex-col items-center"
      style={{ opacity: dimmed(part) ? 0.25 : 1, transition: 'opacity .35s ease' }}>
      <div className="rounded-xl"
        style={{
          padding: 6,
          display: 'flex', flexDirection: 'column', gap: CELL_GAP,
          background: lit(part) ? 'color-mix(in oklch, var(--accent) 24%, transparent)' : 'transparent',
          transition: 'background .35s ease',
        }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-end" style={{ gap: CELL_GAP, height: ROD_H }}>
            {render()}
          </div>
        ))}
      </div>
      {/* label slot is always reserved, so revealing it never shifts the layout */}
      <span className="font-display font-black text-sm tabular-nums text-center"
        style={{ minHeight: 20, color: part === 'tens' ? '#2f7a68' : '#a9702a',
          opacity: split && label ? 1 : 0, transition: 'opacity .3s ease .15s' }}>
        {label || ' '}
      </span>
    </div>
  )

  return (
    <div className="w-full overflow-x-auto py-1">
      <div className="flex items-start justify-center mx-auto w-max"
        style={{ gap: split ? 20 : 4, transition: 'gap .45s cubic-bezier(.4,.1,.3,1)' }}>
        {group('tens', () => Array.from({ length: tens }).map((_, i) => <Rod key={i} />), tensLabel)}
        {ones > 0 && group('ones', () => Array.from({ length: ones }).map((_, i) => <Cube key={i} />), onesLabel)}
      </div>
    </div>
  )
}
