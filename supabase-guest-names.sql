-- Readable, ordered guest names: "17JN01" = 17 June, 1st guest that day.
-- An atomic per-day counter (RLS blocks reading other profiles, so we can't
-- count guests client-side — this function does it race-free). Run once.

create table if not exists public.guest_counters (
  day text primary key,        -- e.g. '17JN'
  n   int  not null default 0
);

alter table public.guest_counters enable row level security;
-- No direct row access; everything goes through next_guest_seq() below.

-- Returns the next sequence number for a given day code, atomically.
create or replace function public.next_guest_seq(p_day text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  insert into public.guest_counters(day, n) values (p_day, 1)
  on conflict (day) do update set n = guest_counters.n + 1
  returning n into v;
  return v;
end;
$$;

grant execute on function public.next_guest_seq(text) to anon, authenticated;
