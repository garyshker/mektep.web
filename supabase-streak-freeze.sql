-- Streak freeze ("shield"): a forgiving day so one missed day doesn't reset the
-- streak. Each user starts with 1; earns +1 every 7-day streak (capped in code).
-- Run once in the Supabase SQL Editor.

alter table public.profiles add column if not exists freeze_count int not null default 1;
