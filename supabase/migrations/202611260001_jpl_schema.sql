create extension if not exists pgcrypto;

create table if not exists public.jpl_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  favorite_team text not null default 'CSK' check (favorite_team in ('CSK','MI','RCB','KKR','SRH','RR','PBKS','DC','GT','LSG')),
  created_at timestamptz not null default now()
);

create table if not exists public.jpl_matches (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  stadium text not null,
  home_team text not null,
  away_team text not null,
  home_runs integer not null default 0 check (home_runs >= 0),
  home_wickets integer not null default 0 check (home_wickets between 0 and 10),
  away_runs integer not null default 0 check (away_runs >= 0),
  away_wickets integer not null default 0 check (away_wickets between 0 and 10),
  result text,
  completed_at timestamptz not null default now()
);

alter table public.jpl_profiles enable row level security;
alter table public.jpl_matches enable row level security;

create policy "Players can read profiles" on public.jpl_profiles for select to authenticated using (true);
create policy "Players can create their profile" on public.jpl_profiles for insert to authenticated with check (auth.uid() = id);
create policy "Players can update their profile" on public.jpl_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Anyone can read completed match cards" on public.jpl_matches for select to anon, authenticated using (true);
create policy "Authenticated players can record match cards" on public.jpl_matches for insert to authenticated with check (true);

-- Realtime broadcast is used for ephemeral lobby and in-match snapshots. Do not
-- publish client-controlled score updates to this table as authoritative data.

