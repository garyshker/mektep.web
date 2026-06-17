-- Generic realtime 1v1 rooms (checkers first; reusable for togyz, tic-tac-toe…).
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.rooms (
  id text primary key,                 -- 4-char room code (e.g. "K7QM")
  game text not null,                  -- 'checkers', 'togyz', …
  host_id uuid not null,
  host_name text not null default '',
  guest_id uuid,
  guest_name text,
  state jsonb not null default '{}'::jsonb,  -- serialized game state (board, …)
  turn text not null default '',             -- whose move (game-specific token, e.g. 'w'/'b')
  winner text,                               -- null until decided
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Anyone signed in can read a room (needed to join by code + watch moves)
drop policy if exists "rooms select" on public.rooms;
create policy "rooms select" on public.rooms
  for select to authenticated using (true);

-- Host creates the room (host_id must be the caller)
drop policy if exists "rooms insert" on public.rooms;
create policy "rooms insert" on public.rooms
  for insert to authenticated with check (auth.uid() = host_id);

-- A guest may claim an open room; afterwards only host/guest may update
drop policy if exists "rooms update" on public.rooms;
create policy "rooms update" on public.rooms
  for update to authenticated
  using (guest_id is null or auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

-- Live move sync needs Realtime on this table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- Optional housekeeping (run occasionally): delete rooms older than a day
-- delete from public.rooms where created_at < now() - interval '1 day';
