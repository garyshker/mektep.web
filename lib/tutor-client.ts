// Client-side helper: ask Сова for a line. Safe to import in 'use client'
// components — only the CoachInput *type* crosses over, never the Gemini key.

import type { CoachInput } from './tutor'

export type { CoachInput, Lang } from './tutor'

// Returns Сова's dialogue text. Never throws — on network failure returns ''
// so the UI can simply skip the speech bubble.
export async function askCoach(input: CoachInput): Promise<string> {
  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return ''
    const json = await res.json() as { dialogue_text?: string }
    return json.dialogue_text ?? ''
  } catch {
    return ''
  }
}
