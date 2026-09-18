-- Leaderboard v2: guests see only themselves. Run once in the Supabase SQL
-- editor, after supabase-privacy-fix.sql. Safe to re-run.
--
-- Why: a guest (anonymous sign-in) is one click away for anyone on the
-- internet, so "any signed-in user" was effectively "anyone". A guest now gets
-- exactly one row — their own — plus their place and the total, both computed
-- here. No other child's name or photo leaves the server for a guest.
--
-- Blurring the list on the client would NOT have been enough: the real rows
-- would still sit in the network response. The cut has to happen here.

drop function if exists public.get_leaderboard();   -- return type changes

create function public.get_leaderboard()
returns table (name text, grade int, xp int, streak int, avatar_url text,
               is_me boolean, place bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select p.name, p.grade, p.xp, p.streak, p.avatar_url,
           (p.id = auth.uid())                  as is_me,
           rank()   over (order by p.xp desc)   as place,   -- equal XP shares a place
           count(*) over ()                     as total
    from public.profiles p
  ),
  caller as (
    -- Missing claim is treated as a guest: for children's data, fail closed.
    select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) as is_guest
  )
  select r.name, r.grade, r.xp, r.streak, r.avatar_url, r.is_me, r.place, r.total
  from ranked r, caller c
  where (c.is_guest and r.is_me) or not c.is_guest
  order by r.place
  limit 50;
$$;

revoke all on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;
