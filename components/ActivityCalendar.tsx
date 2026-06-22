'use client'

// GitHub-style activity heatmap. Columns = weeks (oldest → newest), rows = Mon..Sun.
// Cell intensity = how many things were done that day. No chart library.
import { t, type Lang } from '@/lib/i18n'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MONTHS: Record<string, string[]> = {
  kk: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const LEVEL_BG = [
  'var(--muted)',
  'color-mix(in oklch, var(--accent) 35%, var(--card))',
  'color-mix(in oklch, var(--accent) 65%, var(--card))',
  'var(--accent)',
  'var(--primary)',
]
const level = (n: number) => (n <= 0 ? 0 : n >= 4 ? 4 : n)

export function ActivityCalendar({ data, lang, weeks = 17 }: { data: Record<string, number>; lang: Lang; weeks?: number }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1            // Mon=0
  const curMon = new Date(today); curMon.setDate(today.getDate() - todayDow)
  const start = new Date(curMon); start.setDate(curMon.getDate() - (weeks - 1) * 7)

  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start); date.setDate(start.getDate() + w * 7 + d)
      const key = ymd(date)
      return { key, count: data[key] ?? 0, future: date.getTime() > today.getTime(), isToday: date.getTime() === today.getTime() }
    }),
  )

  const months = MONTHS[lang] ?? MONTHS.ru
  let prevMonth = -1
  const colMonth = cols.map(col => {
    const m = new Date(col[0].key + 'T00:00:00').getMonth()
    if (m !== prevMonth) { prevMonth = m; return months[m] }
    return ''
  })

  const todayCount = data[ymd(today)] ?? 0
  const activeDays = Object.values(data).filter(n => n > 0).length

  return (
    <div className="bg-card rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{t('cal_title', lang)}</p>
        <p className="text-[11px] font-bold text-muted-foreground tabular">{activeDays} {t('cal_days', lang)}</p>
      </div>

      {/* month labels (overflow right over empty siblings, GitHub-style) */}
      <div className="flex gap-[3px] mb-1">
        {colMonth.map((m, i) => (
          <div key={i} className="flex-1 h-3 text-[8px] font-bold text-muted-foreground/70 leading-none whitespace-nowrap overflow-visible">{m}</div>
        ))}
      </div>

      {/* grid */}
      <div className="flex gap-[3px]">
        {cols.map((col, ci) => (
          <div key={ci} className="flex-1 flex flex-col gap-[3px]">
            {col.map((cell, ri) => (
              <div key={ri} className="w-full rounded-[3px]"
                style={{
                  aspectRatio: '1',
                  background: cell.future ? 'transparent' : LEVEL_BG[level(cell.count)],
                  boxShadow: cell.isToday ? '0 0 0 2px var(--primary)' : 'none',
                }}
                title={cell.future ? undefined : `${cell.key} · ${cell.count}`} />
            ))}
          </div>
        ))}
      </div>

      {/* today status + legend */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-xs font-bold" style={{ color: todayCount > 0 ? 'var(--success)' : 'var(--primary)' }}>
          {todayCount > 0 ? t('cal_today_done', lang) : t('cal_today_empty', lang)}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-muted-foreground">{t('cal_less', lang)}</span>
          {[0, 1, 2, 3, 4].map(l => (
            <span key={l} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: LEVEL_BG[l] }} />
          ))}
          <span className="text-[9px] text-muted-foreground">{t('cal_more', lang)}</span>
        </div>
      </div>
    </div>
  )
}
