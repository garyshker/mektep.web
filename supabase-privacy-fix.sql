-- Close two holes that exposed children's data. Run once in the Supabase SQL
-- editor. Safe to re-run.
--
-- 1. View public.leaderboard: views run with their OWNER's rights, so it
--    bypassed RLS and let anyone holding the public anon key (i.e. anyone on
--    the internet, no login) read name + grade + xp + streak of the top 50.
--    Nothing in the app reads it.
--
-- 2. Policy profiles_read_all: SELECT on EVERY column of EVERY profile for any
--    signed-in user — and a guest sign-in is one click. That includes
--    avatar_url, which points into a public bucket, so names came with photos.
--    The only screen that needs other children's rows is /leaderboard.
--
-- The replacement is a function that returns only what the leaderboard shows,
-- only the top 50, only to signed-in users — and never another child's id:
-- the caller's own row is flagged server-side with is_me.

create or replace function public.get_leaderboard()
returns table (name text, grade int, xp int, streak int, avatar_url text, is_me boolean)
language sql
stable
security definer
set search_path = public          -- pinned, so the definer rights cannot be hijacked
as $$
  select p.name, p.grade, p.xp, p.streak, p.avatar_url, (p.id = auth.uid())
  from public.profiles p
  order by p.xp desc
  limit 50;
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;

drop policy if exists "profiles_read_all" on public.profiles;
drop view if exists public.leaderboard;

-- After this, profiles is readable only through "Users can view own profile"
-- (own row) and through get_leaderboard() — which matches supabase-schema.sql.
