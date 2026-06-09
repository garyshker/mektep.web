// Supabase IO for the adaptive engine. Logs an addition attempt into
// user_skill_mastery (read-modify-write so existing progress isn't clobbered).
// Fire-and-forget: swallows errors (e.g. the table not migrated yet).

import { createClient } from './supabase'
import { additionSkillOf, diagnoseAddition, updateStat, type SkillStat } from './skills'

type SB = ReturnType<typeof createClient>

export async function logAdditionAttempt(supabase: SB, a: number, b: number, answered: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const skill = additionSkillOf(a, b)
    const correct = answered === a + b
    const errorTag = correct ? undefined : (diagnoseAddition(a, b, answered) ?? undefined)

    const { data } = await supabase.from('user_skill_mastery')
      .select('mastery_level, streak, recent_wrong, total_correct, total_attempts, last_error_tag')
      .eq('user_id', user.id).eq('skill_id', skill).maybeSingle()

    const prev: SkillStat | undefined = data ? {
      mastery: data.mastery_level ?? 0, streak: data.streak ?? 0, recentWrong: data.recent_wrong ?? 0,
      attempts: data.total_attempts ?? 0, correct: data.total_correct ?? 0, lastErrorTag: data.last_error_tag ?? undefined,
    } : undefined

    const st = updateStat(prev, correct, errorTag, Date.now())
    await supabase.from('user_skill_mastery').upsert({
      user_id: user.id, skill_id: skill, mastery_level: st.mastery, streak: st.streak,
      recent_wrong: st.recentWrong, total_correct: st.correct, total_attempts: st.attempts,
      last_error_tag: st.lastErrorTag ?? null,
      next_review_at: st.nextReviewAt ? new Date(st.nextReviewAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
  } catch { /* table may not be migrated yet — ignore */ }
}
