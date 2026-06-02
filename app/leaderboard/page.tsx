'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { BottomNav } from '@/components/BottomNav'

interface Entry {
  id: string
  name: string
  grade: number
  xp: number
  streak: number
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
        .select('id, name, grade, xp, streak')
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#58CC02] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-white pb-24 lg:pb-10 lg:pl-60">

      {/* Header */}
      <header className="px-4 pt-5 pb-4 border-b-2 border-gray-50 flex items-center gap-3 lg:max-w-2xl lg:mx-auto lg:w-full">
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900 leading-tight">{t('nav_leaderboard', lang)}</h1>
          <p className="text-xs text-gray-400">{t('top_by_xp', lang)}</p>
        </div>
        {myRank && (
          <div className="bg-[#58CC02]/10 rounded-2xl px-3 py-1.5">
            <p className="text-xs text-[#58CC02] leading-none font-semibold">{t('your_rank', lang)}</p>
            <p className="text-lg font-black text-[#58CC02] leading-none">#{myRank}</p>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-4 lg:max-w-2xl lg:mx-auto lg:w-full">

        {/* Podium — top 3 */}
        {top3.length > 0 && (
          <div className="bg-white rounded-3xl px-4 pt-5 pb-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-5 text-center">
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
                  bg="bg-gray-100"
                />
              )}
              {/* 1st place */}
              <PodiumCard
                entry={top3[0]}
                rank={1}
                isMe={top3[0].id === myId}
                height="h-32"
                medal="🥇"
                bg="bg-amber-100"
              />
              {/* 3rd place */}
              {top3[2] && (
                <PodiumCard
                  entry={top3[2]}
                  rank={3}
                  isMe={top3[2].id === myId}
                  height="h-20"
                  medal="🥉"
                  bg="bg-orange-100"
                />
              )}
            </div>
          </div>
        )}

        {/* Rest of list */}
        {rest.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {rest.map((entry, i) => {
              const rank = i + 4
              const isMe = entry.id === myId
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 ${isMe ? 'bg-[#58CC02]/5' : ''}`}>
                  <span className="w-7 text-center text-sm font-black text-gray-400">{rank}</span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
                    style={{ background: avatarColor(entry.name) }}>
                    {entry.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-[#58CC02]' : 'text-gray-900'}`}>
                      {entry.name}{isMe ? ` (${lang === 'kk' ? 'сен' : 'ты'})` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{entry.grade} {t('grade', lang)} · 🔥 {entry.streak}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-gray-900 text-sm">{entry.xp}</p>
                    <p className="text-[10px] text-gray-400">XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {rows.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-gray-400 text-sm">{t('no_users', lang)}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

function PodiumCard({
  entry, rank, isMe, height, medal, bg,
}: {
  entry: Entry; rank: number; isMe: boolean; height: string; medal: string; bg: string
}) {
  const AVATAR_COLORS = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899']
  const l = entry.name?.[0]?.toUpperCase() ?? 'A'
  const color = AVATAR_COLORS[l.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[100px]">
      <span className="text-xl">{medal}</span>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-lg shrink-0 ring-2 ring-white"
        style={{ background: color }}>
        {entry.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <p className="text-xs font-bold text-gray-800 text-center truncate w-full px-1">
        {isMe ? 'Ты' : entry.name}
      </p>
      <div className={`w-full ${height} ${bg} rounded-2xl flex flex-col items-center justify-center`}>
        <p className="font-black text-gray-900 text-base leading-none">{entry.xp}</p>
        <p className="text-[10px] text-gray-500">XP</p>
      </div>
    </div>
  )
}
