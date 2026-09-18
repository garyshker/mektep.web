-- Run this in Supabase SQL Editor

-- Profiles table (one per user)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  grade int not null default 1 check (grade between 1 and 4),
  language text not null default 'kk' check (language in ('kk', 'ru', 'en')),
  xp int not null default 0,
  streak int not null default 0,
  last_active date,
  created_at timestamptz not null default now()
);

-- Lesson progress
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  lesson_id text not null,
  subject_id text not null,
  stars int not null default 0,
  xp_earned int not null default 0,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;

-- Policies: users can only read/write their own data
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own progress" on public.lesson_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own progress" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own progress" on public.lesson_progress
  for update using (auth.uid() = user_id);

-- Leaderboard: NOT a view. A view runs with its owner's rights, bypasses RLS,
-- and exposed children's names to anyone with the public key. It is the
-- function public.get_leaderboard() — see supabase-privacy-fix.sql.

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Ученик'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
