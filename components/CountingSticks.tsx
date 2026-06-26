'use client'

// Grade-1 concrete manipulative: a number shown as счётные палочки —
// bundles of ten (десятки, tied together) + loose ones, the way a teacher
// shows it at the board. `faded` = "taken away" (for subtraction).

type Tone = 'a' | 'b' | 'sum'

const TONE: Record<Tone, { from: string; to: string; tie: string }> = {
  a:   { from: '#f3bd79', to: '#cf8a34', tie: '#7a4a12' },  // warm amber
  b:   { from: '#86c8b6', to: '#3f8e7c', tie: '#1f4d42' },  // teal
  sum: { from: '#9bd39a', to: '#4f9e4d', tie: '#235a23' },  // green (the result)
}

function Stick({ tone }: { tone: Tone }) {
  const c = TONE[tone]
  return <span style={{ width: 5, height: 36, borderRadius: 3, background: `linear-gradient(180deg, ${c.from}, ${c.to})`, boxShadow: '0 1px 1.5px rgba(0,0,0,0.3)' }} />
}

function Bundle({ tone }: { tone: Tone }) {
  // ten sticks tied together = one десяток
  return (
    <span className="relative inline-flex gap-[2px] px-1 py-0.5 rounded-md">
      {Array.from({ length: 10 }).map((_, i) => <Stick key={i} tone={tone} />)}
      <span className="absolute left-1 right-1 h-[5px] rounded-full"
        style={{ top: '50%', transform: 'translateY(-50%)', background: TONE[tone].tie }} />
    </span>
  )
}

export function CountingSticks({ n, tone = 'a', faded = false }: { n: number; tone?: Tone; faded?: boolean }) {
  const bundles = Math.floor(n / 10)
  const ones = n % 10
  return (
    <span className="relative inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5"
      style={{ opacity: faded ? 0.4 : 1 }}>
      {Array.from({ length: bundles }).map((_, i) => <Bundle key={`b${i}`} tone={tone} />)}
      {ones > 0 && (
        <span className="inline-flex gap-[4px]">
          {Array.from({ length: ones }).map((_, i) => <Stick key={`o${i}`} tone={tone} />)}
        </span>
      )}
      {n === 0 && <span className="text-muted-foreground text-2xl font-black px-2">0</span>}
      {faded && (
        <span className="absolute inset-0 flex items-center pointer-events-none">
          <span className="w-full h-[3px] rounded-full" style={{ background: '#c0392b', transform: 'rotate(-7deg)' }} />
        </span>
      )}
    </span>
  )
}
