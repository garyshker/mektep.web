-- Adaptive engine: per-skill mastery (aggregated, not per-attempt).
-- Run this in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.user_skill_mastery (
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill_id text not null,                       -- e.g. 'add_2d_carry'
  mastery_level double precision not null default 0,  -- 0.0 … 1.0
  streak int not null default 0,                -- consecutive correct (resets on error)
  recent_wrong int not null default 0,          -- consecutive wrong (drives the fuse)
  total_correct int not null default 0,
  total_attempts int not null default 0,
  last_error_tag text,                          -- type of the last mistake
  next_review_at timestamptz,                   -- light spaced repetition
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

alter table public.user_skill_mastery enable row level security;

-- Mastery is the child's own learning signal → own-row access is enough
drop policy if exists "skill_mastery select own" on public.user_skill_mastery;
create policy "skill_mastery select own" on public.user_skill_mastery
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "skill_mastery insert own" on public.user_skill_mastery;
create policy "skill_mastery insert own" on public.user_skill_mastery
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "skill_mastery update own" on public.user_skill_mastery;
create policy "skill_mastery update own" on public.user_skill_mastery
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
