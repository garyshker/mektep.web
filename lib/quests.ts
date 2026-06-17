// Daily quests (see supabase-quests.sql). A quest is completed once per day and
// awards a bonus XP on top of whatever the activity itself gives. The unique
// (user, day, quest) row is the once-per-day guard — XP is only awarded when a
// row is actually inserted.

import type { SupabaseClient } from '@supabase/supabase-js'

export const QUEST_XP: Record<string, number> = { lesson: 10, words: 15, game: 20, duel: 25 }

function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mark a quest done for today. Returns true if it was newly completed (XP
// awarded), false if it was already done, no user, or the table isn't migrated.
export async function completeQuest(sb: SupabaseClient, questId: string): Promise<boolean> {
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    const { data } = await sb.from('daily_quests')
      .upsert({ user_id: user.id, quest_date: todayDate(), quest_id: questId },
        { onConflict: 'user_id,quest_date,quest_id', ignoreDuplicates: true })
      .select()
    if (!data || data.length === 0) return false   // already done today
    const xp = QUEST_XP[questId] ?? 0
    if (xp > 0) {
      const { data: prof } = await sb.from('profiles').select('xp').eq('id', user.id).single()
      await sb.from('profiles').update({ xp: (prof?.xp ?? 0) + xp }).eq('id', user.id)
    }
    return true
  } catch { return false }
}

export async function fetchTodayQuests(sb: SupabaseClient): Promise<Set<string>> {
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return new Set()
    const { data } = await sb.from('daily_quests').select('quest_id')
      .eq('user_id', user.id).eq('quest_date', todayDate())
    return new Set((data ?? []).map((r: { quest_id: string }) => r.quest_id))
  } catch { return new Set() }
}
