-- Drug Wars Empire — Initial Database Schema
-- Run this in your Supabase SQL editor

-- ── Profiles ───────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  subscriber_tier text default 'free' check (subscriber_tier in ('free', 'quarterly', 'annual')),
  subscriber_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Game Saves ─────────────────────────────────────────────
-- Stores the full player state as JSONB for maximum flexibility
create table if not exists game_saves (
  user_id uuid references profiles(id) on delete cascade primary key,
  state jsonb not null,
  season int default 1,
  updated_at timestamptz default now()
);

alter table game_saves enable row level security;

create policy "Users can read own saves"
  on game_saves for select using (auth.uid() = user_id);

create policy "Users can upsert own saves"
  on game_saves for insert with check (auth.uid() = user_id);

create policy "Users can update own saves"
  on game_saves for update using (auth.uid() = user_id);

-- ── Seasons ────────────────────────────────────────────────
create table if not exists seasons (
  id serial primary key,
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  tier text not null default 'free' check (tier in ('free', 'quarterly', 'annual')),
  duration_days int not null default 30
);

-- ── Leaderboards ───────────────────────────────────────────
create table if not exists leaderboard_entries (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade,
  season_id int references seasons(id),
  net_worth bigint default 0,
  rep int default 0,
  rank_name text,
  territories int default 0,
  milestones int default 0,
  trades int default 0,
  best_trade bigint default 0,
  submitted_at timestamptz default now(),
  unique (user_id, season_id)
);

alter table leaderboard_entries enable row level security;

create policy "Anyone can read leaderboard"
  on leaderboard_entries for select using (true);

create policy "Users can insert own entries"
  on leaderboard_entries for insert with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on leaderboard_entries for update using (auth.uid() = user_id);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists idx_leaderboard_net_worth on leaderboard_entries (season_id, net_worth desc);
create index if not exists idx_leaderboard_rep on leaderboard_entries (season_id, rep desc);
