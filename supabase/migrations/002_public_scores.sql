-- Public scores table — no auth required, just name + stats
create table if not exists scores (
  id serial primary key,
  player_name text not null,
  net_worth bigint not null,
  rank_name text,
  difficulty text default 'standard',
  rep int default 0,
  territories int default 0,
  milestones int default 0,
  trades int default 0,
  best_trade bigint default 0,
  fingers int default 10,
  days_survived int default 30,
  won boolean default false,
  played_at timestamptz default now()
);

-- Public read + insert (no auth needed for PWA)
alter table scores enable row level security;
create policy "Anyone can read scores" on scores for select using (true);
create policy "Anyone can submit scores" on scores for insert with check (true);

-- Leaderboard index
create index idx_scores_net_worth on scores (net_worth desc);
create index idx_scores_played_at on scores (played_at desc);
