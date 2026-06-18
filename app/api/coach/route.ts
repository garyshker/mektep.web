// POST /api/coach — thin endpoint so the Gemini key stays server-side.
// Body = CoachInput (see lib/tutor.ts). Returns { dialogue_text, source }.

import { NextResponse } from 'next/server'
import { coach, type CoachInput } from '@/lib/tutor'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: Partial<CoachInput>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body?.lang || !body.task?.question || body.task.expected_answer == null
      || body.student_input == null || !body.attempt_number) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await coach(body as CoachInput)
  return NextResponse.json(result)
}
