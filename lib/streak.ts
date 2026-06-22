// Daily streak engine — one source of truth shared by lessons, trainers and the
// daily quests. "Practiced today" rolls the streak forward; a freeze forgives one
// missed day. Idempotent per day: calling it again the same day is a no-op.

import type { SupabaseClient } from '@supabase/supabase-js'

export type StreakInfo = { streak: number; streakUp: boolean; streakSaved: boolean }

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Record that the user practiced today and advance the streak. Returns the new
// streak (and whether it went up / a freeze saved it) for completion screens.
export async function touchStreak(sb: SupabaseClient): Promise<StreakInfo | null> {
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const today = new Date()
    const yest = new Date(today); yest.setDate(today.getDate() - 1)
    const twoAgo = new Date(today); twoAgo.setDate(today.getDate() - 2)
    const tStr = ymd(today), yStr = ymd(yest), twoStr = ymd(twoAgo)

    // Dated footprint so the weekly strip lights up for ANY activity, not just lessons.
    sb.from('daily_quests')
      .upsert({ user_id: user.id, quest_date: tStr, quest_id: 'active' },
        { onConflict: 'user_id,quest_date,quest_id', ignoreDuplicates: true })
      .then(() => {}, () => {})

    const { data: prof } = await sb.from('profiles')
      .select('streak, last_active, freeze_count').eq('id', user.id).single()
    if (prof?.last_active === tStr) {
      return { streak: prof.streak ?? 0, streakUp: false, streakSaved: false }   // already counted today
    }
    let streak = prof?.streak ?? 0
    let freezes = prof?.freeze_count ?? 0
    let streakSaved = false
    if (prof?.last_active === yStr) streak += 1                                   // consecutive day
    else if (prof?.last_active === twoStr && freezes > 0) { streak += 1; freezes -= 1; streakSaved = true }  // freeze saves it
    else streak = 1                                                              // streak (re)starts
    if (streak % 7 === 0) freezes = Math.min(3, freezes + 1)                     // earn a freeze each week
    await sb.from('profiles')
      .update({ streak, last_active: tStr, freeze_count: freezes }).eq('id', user.id)
    return { streak, streakUp: true, streakSaved }
  } catch { return null }
}

// Which days of the current week (Mon..Sun) had any activity — for the home strip.
export async function fetchWeekActivity(sb: SupabaseClient, weekStart: Date): Promise<boolean[]> {
  const week = Array(7).fill(false)
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return week
    const dayIndex = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1)   // Mon=0 … Sun=6
    const [{ data: quests }, { data: lessons }] = await Promise.all([
      sb.from('daily_quests').select('quest_date').eq('user_id', user.id).gte('quest_date', ymd(weekStart)),
      sb.from('lesson_progress').select('completed_at').eq('user_id', user.id).gte('completed_at', weekStart.toISOString()),
    ])
    ;(quests ?? []).forEach((r: { quest_date: string }) => {
      const i = dayIndex(new Date(r.quest_date + 'T00:00:00'))
      if (i >= 0 && i < 7) week[i] = true
    })
    ;(lessons ?? []).forEach((r: { completed_at: string }) => {
      const d = new Date(r.completed_at)
      if (d >= weekStart) week[dayIndex(d)] = true
    })
  } catch { /* ignore — strip just stays empty */ }
  return week
}

// Activity count per day (YYYY-MM-DD → how many things done) for a GitHub-style
// heatmap. Counts daily_quests rows (incl. the 'active' footprint) + lessons.
export async function fetchActivityCalendar(sb: SupabaseClient, sinceDays = 119): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return out
    const since = new Date(); since.setDate(since.getDate() - sinceDays)
    const [{ data: quests }, { data: lessons }] = await Promise.all([
      sb.from('daily_quests').select('quest_date').eq('user_id', user.id).gte('quest_date', ymd(since)),
      sb.from('lesson_progress').select('completed_at').eq('user_id', user.id).gte('completed_at', since.toISOString()),
    ])
    ;(quests ?? []).forEach((r: { quest_date: string }) => { out[r.quest_date] = (out[r.quest_date] ?? 0) + 1 })
    ;(lessons ?? []).forEach((r: { completed_at: string }) => {
      const d = ymd(new Date(r.completed_at)); out[d] = (out[d] ?? 0) + 1
    })
  } catch { /* ignore — calendar just stays empty */ }
  return out
}

