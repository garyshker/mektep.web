// Reusable realtime 1v1 rooms over the `rooms` table (see supabase-rooms.sql).
// State is an opaque JSON blob the game serializes/deserializes itself.
// Sync = Supabase Realtime (postgres_changes) + a 2s polling fallback.

import type { SupabaseClient } from '@supabase/supabase-js'

export type RoomRow<S = unknown> = {
  id: string
  game: string
  host_id: string
  host_name: string
  guest_id: string | null
  guest_name: string | null
  state: S
  turn: string
  winner: string | null
}

// 4-digit numeric code — easy for kids to read aloud and type.
const genCode = () => String(Math.floor(1000 + Math.random() * 9000))

export async function createRoom(
  sb: SupabaseClient, game: string, hostId: string, hostName: string, state: unknown, turn: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode()
    const { error } = await sb.from('rooms').insert({ id: code, game, host_id: hostId, host_name: hostName, state, turn })
    if (!error) return code
  }
  return null
}

// Claim an open room. Returns the room on success (or if we're already in it), else null.
export async function joinRoom(
  sb: SupabaseClient, code: string, guestId: string, guestName: string,
): Promise<RoomRow | null> {
  const { data } = await sb.from('rooms')
    .update({ guest_id: guestId, guest_name: guestName })
    .eq('id', code).is('guest_id', null)
    .select().single()
  if (data) return data as RoomRow
  // Room not open (full / wrong code / we're already a member) — fetch to decide.
  const existing = await fetchRoom(sb, code)
  if (existing && (existing.host_id === guestId || existing.guest_id === guestId)) return existing
  return null
}

export async function fetchRoom(sb: SupabaseClient, code: string): Promise<RoomRow | null> {
  const { data } = await sb.from('rooms').select('*').eq('id', code).single()
  return (data as RoomRow) ?? null
}

export async function pushRoom(
  sb: SupabaseClient, code: string, patch: { state?: unknown; turn?: string; winner?: string | null },
): Promise<void> {
  await sb.from('rooms').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', code)
}

// Subscribe to a room's changes; returns an unsubscribe fn. Combines a realtime
// channel with a polling fallback so it still works if websockets are blocked.
// Pass `presenceKey` to also track who's connected — `onPresence(count)` fires
// with the number of present members (used to detect an opponent leaving).
export function subscribeRoom(
  sb: SupabaseClient, code: string, onChange: (room: RoomRow) => void,
  opts?: { presenceKey?: string; onPresence?: (count: number) => void },
): () => void {
  const channel = sb.channel(`room-${code}`,
    opts?.presenceKey ? { config: { presence: { key: opts.presenceKey } } } : undefined)
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${code}` },
    payload => onChange(payload.new as RoomRow))
  if (opts?.onPresence) {
    channel.on('presence', { event: 'sync' }, () => {
      opts.onPresence!(Object.keys(channel.presenceState()).length)
    })
  }
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED' && opts?.presenceKey) channel.track({ at: Date.now() })
  })
  const iv = setInterval(async () => { const r = await fetchRoom(sb, code); if (r) onChange(r) }, 2000)
  return () => { try { channel.unsubscribe() } catch { /* ignore */ } clearInterval(iv) }
}
