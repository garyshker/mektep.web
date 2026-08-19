'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { BottomNav } from '@/components/BottomNav'
import { Loader } from '@/components/Loader'
import { Trophy } from 'lucide-react'

interface Entry {
  id: string
  name: string
  grade: number
  xp: number
  streak: number
  avatar_url: string | null
}

const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
function avatarColor(name: string) {
  const l = name?.[0]?.toUpperCase() ?? 'A'
  return AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]
}

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [rows, setRows] = useState<Entry[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const lang = useLang()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('id, name, grade, xp, streak, avatar_url')
        .order('xp', { ascending: false })
        .limit(50)

      if (data) {
        setRows(data)
        const rank = data.findIndex(r => r.id === user.id)
        setMyRank(rank >= 0 ? rank + 1 : null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  if (loading) return (
    <Loader />
  )

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 lg:pb-10 lg:pl-60">

      {/* Header */}
      <header className="px-4 pt-5 pb-4 border-b-2 border-border/50 flex items-center gap-3 lg:max-w-2xl lg:mx-auto lg:w-full">
        <div className="flex-1">
          <h1 className="text-xl font-display font-black text-foreground leading-tight flex items-center gap-2">
            <Trophy size={20} style={{ color: 'var(--accent)' }} />
            {t('nav_leaderboard', lang)}
          </h1>
          <p className="text-xs text-muted-foreground">{t('top_by_xp', lang)}</p>
        </div>
        {myRank && (
          <div className="rounded-2xl px-3 py-1.5" style={{ background: 'color-mix(in oklch, var(--primary) 14%, var(--card))' }}>
            <p className="text-xs leading-none font-semibold" style={{ color: 'var(--primary)' }}>{t('your_rank', lang)}</p>
            <p className="text-lg font-black tabular leading-none" style={{ color: 'var(--primary)' }}>#{myRank}</p>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-4 lg:max-w-2xl lg:mx-auto lg:w-full">

        {/* Podium — top 3 */}
        {top3.length > 0 && (
          <div className="bg-card rounded-[var(--radius-lg)] px-4 pt-5 pb-6 shadow-[var(--shadow-sm)]">
            <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mb-5 text-center">
              {t('top3', lang)}
            </p>
            <div className="flex items-end justify-center gap-3">
              {/* 2nd place */}
              {top3[1] && (
                <PodiumCard
                  entry={top3[1]}
                  rank={2}
                  isMe={top3[1].id === myId}
                  height="h-24"
                  medal="🥈"
                  ped="color-mix(in oklch, var(--muted-foreground) 16%, var(--card))"
                  lang={lang}
                />
              )}
              {/* 1st place */}
              <PodiumCard
                entry={top3[0]}
                rank={1}
                isMe={top3[0].id === myId}
                height="h-32"
                medal="🥇"
                ped="var(--gradient-gold)"
                lang={lang}
              />
              {/* 3rd place */}
              {top3[2] && (
                <PodiumCard
                  entry={top3[2]}
                  rank={3}
                  isMe={top3[2].id === myId}
                  height="h-20"
                  medal="🥉"
                  ped="color-mix(in oklch, var(--accent) 20%, var(--card))"
                  lang={lang}
                />
              )}
            </div>
          </div>
        )}

        {/* Rest of list */}
        {rest.length > 0 && (
          <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
            {rest.map((entry, i) => {
              const rank = i + 4
              const isMe = entry.id === myId
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0"
                  style={isMe ? { background: 'color-mix(in oklch, var(--primary) 9%, var(--card))' } : undefined}>
                  <span className="w-7 text-center text-sm font-black tabular text-muted-foreground">{rank}</span>
                  {entry.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.avatar_url} alt={entry.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                      style={{ boxShadow: `0 0 0 3px color-mix(in oklch, ${avatarColor(entry.name)} 20%, transparent)` }} />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-white text-sm shrink-0"
                      style={{ background: avatarColor(entry.name), boxShadow: `0 0 0 3px color-mix(in oklch, ${avatarColor(entry.name)} 20%, transparent)` }}>
                      {entry.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate text-foreground"
                      style={isMe ? { color: 'var(--primary)' } : undefined}>
                      {entry.name}{isMe ? ` (${lang === 'kk' ? 'сен' : 'ты'})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.grade} {t('grade', lang)} · 🔥 {entry.streak}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-foreground text-sm tabular">{entry.xp}</p>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {rows.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-muted-foreground text-sm">{t('no_users', lang)}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

function PodiumCard({
  entry, rank, isMe, height, medal, ped, lang,
}: {
  entry: Entry; rank: number; isMe: boolean; height: string; medal: string; ped: string; lang: 'ru' | 'kk' | 'en'
}) {
  const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
  const l = entry.name?.[0]?.toUpperCase() ?? 'A'
  const color = AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]
  const you = lang === 'kk' ? 'Сен' : lang === 'en' ? 'You' : 'Ты'
  const big = rank === 1

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
      {big && <span className="text-lg leading-none -mb-1">👑</span>}
      <span className="text-xl">{medal}</span>
      {entry.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.avatar_url} alt={entry.name}
          className={`${big ? 'w-14 h-14' : 'w-11 h-11'} rounded-full object-cover shrink-0`}
          style={{ boxShadow: `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)` }} />
      ) : (
        <div
          className={`${big ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-lg'} rounded-full flex items-center justify-center font-display font-black text-white shrink-0`}
          style={{ background: color, boxShadow: `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)` }}>
          {entry.name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <p className="text-xs font-bold text-foreground text-center truncate w-full px-1">
        {isMe ? you : entry.name}
      </p>
      <div className={`w-full ${height} rounded-2xl flex flex-col items-center justify-center`} style={{ background: ped }}>
        <p className="font-display font-black text-foreground text-base tabular leading-none">{entry.xp}</p>
        <p className="text-[10px] text-foreground/60">XP</p>
      </div>
    </div>
  )
}
