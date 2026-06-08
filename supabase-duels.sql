-- 1v1 Duel rooms — run this in the Supabase SQL Editor.
-- Safe to re-run (idempotent).

create table if not exists public.duels (
  id text primary key,                 -- 4-char room code (e.g. "K7QM")
  host_id uuid not null,
  host_name text not null default '',
  guest_id uuid,
  guest_name text,
  grade int not null default 2,
  seed bigint not null default 0,
  host_score int not null default 0,
  guest_score int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.duels enable row level security;

-- Both players (and someone joining by code) can read the room
drop policy if exists "duel select" on public.duels;
create policy "duel select" on public.duels
  for select to authenticated using (true);

-- Host creates the room (host_id must be the caller)
drop policy if exists "duel insert" on public.duels;
create policy "duel insert" on public.duels
  for insert to authenticated with check (auth.uid() = host_id);

-- Guest claims an open room; afterwards only host/guest may update scores
drop policy if exists "duel update" on public.duels;
create policy "duel update" on public.duels
  for update to authenticated
  using (guest_id is null or auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

-- Live opponent score + "guest joined" need Realtime on this table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'duels'
  ) then
    alter publication supabase_realtime add table public.duels;
  end if;
end $$;

-- Optional housekeeping (run occasionally): delete rooms older than a day
-- delete from public.duels where created_at < now() - interval '1 day';
