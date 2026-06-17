-- Daily quests: one row per (user, day, quest) when completed. Run once.
-- The bonus XP is awarded client-side only when a row is first inserted,
-- so the unique row is the once-per-day guard.

create table if not exists public.daily_quests (
  user_id uuid not null references auth.users on delete cascade,
  quest_date date not null,
  quest_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_date, quest_id)
);

alter table public.daily_quests enable row level security;

drop policy if exists "quests select own" on public.daily_quests;
create policy "quests select own" on public.daily_quests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "quests insert own" on public.daily_quests;
create policy "quests insert own" on public.daily_quests
  for insert to authenticated with check (auth.uid() = user_id);
