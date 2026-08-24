// Analog clock face (SVG) — shared by the clock game and the clock trainer.
//
// The hands are colour-coded on purpose: the SHORT hand is amber (hours), the
// LONG one turquoise (minutes). Swapping the two is the classic first mistake,
// and the hints refer to the hands by colour, so the colours have to mean
// something. Everything reads from tokens — the face used to be hardcoded
// white/grey/blue and stayed white in dark mode.
export function ClockFace({ h, m, size = 200 }: { h: number; m: number; size?: number }) {
  const cx = 60, cy = 60
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const hourAngle = ((h % 12) + m / 60) * 30
  const minAngle = m * 6
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="mx-auto select-none" aria-hidden>
      <circle cx={cx} cy={cy} r={56} fill="var(--card)" stroke="var(--border)" strokeWidth="3" />
      {/* minute ticks — the fives a child counts by */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={cx + 50 * Math.cos(a)} cy={cy + 50 * Math.sin(a)} r="1.6"
          fill="color-mix(in oklch, var(--brand) 45%, var(--border))" />
      })}
      {/* hour numbers */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
        const a = (n * 30 - 90) * (Math.PI / 180)
        return (
          <text key={n} x={cx + 42 * Math.cos(a)} y={cy + 42 * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="800"
            fill="var(--foreground)">{n}</text>
        )
      })}
      {/* hour hand — short and thick, amber */}
      <line x1={cx} y1={cy} x2={cx + 25 * Math.cos(toRad(hourAngle))} y2={cy + 25 * Math.sin(toRad(hourAngle))}
        stroke="var(--primary)" strokeWidth="5.5" strokeLinecap="round" />
      {/* minute hand — long and thin, turquoise */}
      <line x1={cx} y1={cy} x2={cx + 43 * Math.cos(toRad(minAngle))} y2={cy + 43 * Math.sin(toRad(minAngle))}
        stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3.4" fill="var(--foreground)" />
    </svg>
  )
}
