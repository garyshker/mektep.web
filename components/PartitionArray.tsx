'use client'

// The array-to-grid representation (NCETM Spine 2.14): a 2-digit × 1-digit
// product drawn as `rows` rows of base-ten blocks — ten-rods then unit cubes.
// `split` opens a gap between the tens part and the ones part, so the
// distributive law is literally visible: one rectangle = two rectangles.
// Labels sit directly under their own group (spatial contiguity).

type HL = 'none' | 'tens' | 'ones'

export function PartitionArray({ tens, ones, rows, split = false, highlight = 'none', tensLabel, onesLabel }: {
  tens: number; ones: number; rows: number
  split?: boolean; highlight?: HL
  tensLabel?: string; onesLabel?: string
}) {
  const on = (part: 'tens' | 'ones') => highlight === 'none' || highlight === part
  const fade = (part: 'tens' | 'ones') => ({ opacity: on(part) ? 1 : 0.28, transition: 'opacity .35s ease' })

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-start" style={{ gap: split ? 22 : 5, transition: 'gap .45s cubic-bezier(.4,.1,.3,1)' }}>
        {/* tens block */}
        <div className="flex flex-col items-center gap-1.5" style={fade('tens')}>
          <div className="flex flex-col gap-[3px] p-1.5 rounded-lg"
            style={{ background: on('tens') && highlight === 'tens' ? 'color-mix(in oklch, var(--accent) 22%, transparent)' : 'transparent', transition: 'background .35s ease' }}>
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex gap-[3px]">
                {Array.from({ length: tens }).map((_, i) => (
                  <span key={i} style={{ width: 11, height: 24, borderRadius: 3, background: '#5bb3a0',
                    backgroundImage: 'repeating-linear-gradient(rgba(20,80,65,.42) 0 1px, transparent 1px 2.4px)',
                    border: '1.5px solid #2f7a68' }} />
                ))}
              </div>
            ))}
          </div>
          {split && tensLabel && (
            <span className="font-display font-black text-sm tabular-nums animate-mk-pop-in" style={{ color: '#2f7a68' }}>{tensLabel}</span>
          )}
        </div>

        {/* ones block */}
        {ones > 0 && (
          <div className="flex flex-col items-center gap-1.5" style={fade('ones')}>
            <div className="flex flex-col gap-[3px] p-1.5 rounded-lg"
              style={{ background: on('ones') && highlight === 'ones' ? 'color-mix(in oklch, var(--accent) 22%, transparent)' : 'transparent', transition: 'background .35s ease' }}>
              {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-[3px]">
                  {Array.from({ length: ones }).map((_, i) => (
                    <span key={i} style={{ width: 11, height: 24, borderRadius: 3, background: '#efb14a', border: '1.5px solid #a9702a' }} />
                  ))}
                </div>
              ))}
            </div>
            {split && onesLabel && (
              <span className="font-display font-black text-sm tabular-nums animate-mk-pop-in" style={{ color: '#a9702a' }}>{onesLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
