// Analog clock face (SVG) — shared by the clock game and lessons.
export function ClockFace({ h, m, size = 200 }: { h: number; m: number; size?: number }) {
  const cx = 60, cy = 60
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const hourAngle = ((h % 12) + m / 60) * 30
  const minAngle = m * 6
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="mx-auto select-none" aria-hidden>
      <circle cx={cx} cy={cy} r={56} fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
      {/* hour ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return <circle key={i} cx={cx + 50 * Math.cos(a)} cy={cy + 50 * Math.sin(a)} r="1.3" fill="#cbd5e1" />
      })}
      {/* numbers */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
        const a = (n * 30 - 90) * (Math.PI / 180)
        return (
          <text key={n} x={cx + 42 * Math.cos(a)} y={cy + 42 * Math.sin(a)}
            textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill="#334155">{n}</text>
        )
      })}
      {/* hour hand */}
      <line x1={cx} y1={cy} x2={cx + 26 * Math.cos(toRad(hourAngle))} y2={cy + 26 * Math.sin(toRad(hourAngle))}
        stroke="#1f2937" strokeWidth="4" strokeLinecap="round" />
      {/* minute hand */}
      <line x1={cx} y1={cy} x2={cx + 42 * Math.cos(toRad(minAngle))} y2={cy + 42 * Math.sin(toRad(minAngle))}
        stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3.2" fill="#1f2937" />
    </svg>
  )
}
