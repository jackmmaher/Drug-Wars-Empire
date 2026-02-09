-- Migration 003: Secure score submission
-- Removes direct insert, adds validated RPC + rate limiting + input constraints

-- ── Add ip_hash column first ─────────────────────────────
alter table scores add column if not exists ip_hash text;

-- ── Clamp existing data to valid ranges before adding constraints ──
update scores set player_name = left(regexp_replace(trim(player_name), '[<>"'';&\\]', '', 'g'), 20)
  where player_name is not null;
update scores set player_name = 'Unknown' where player_name is null or trim(player_name) = '';
update scores set net_worth = least(greatest(net_worth, -1000000), 100000000);
update scores set rep = least(greatest(rep, 0), 1000) where rep is not null;
update scores set rep = 0 where rep is null;
update scores set territories = least(greatest(territories, 0), 30) where territories is not null;
update scores set territories = 0 where territories is null;
update scores set milestones = least(greatest(milestones, 0), 50) where milestones is not null;
update scores set milestones = 0 where milestones is null;
update scores set trades = least(greatest(trades, 0), 10000) where trades is not null;
update scores set trades = 0 where trades is null;
update scores set best_trade = least(greatest(best_trade, 0), 100000000) where best_trade is not null;
update scores set best_trade = 0 where best_trade is null;
update scores set fingers = least(greatest(fingers, 0), 10) where fingers is not null;
update scores set fingers = 10 where fingers is null;
update scores set days_survived = least(greatest(days_survived, 1), 90) where days_survived is not null;
update scores set days_survived = 30 where days_survived is null;
update scores set difficulty = 'standard' where difficulty is null or difficulty not in ('conservative', 'standard', 'highroller');

-- ── Now add constraints (existing data is clean) ─────────
alter table scores
  add constraint chk_player_name check (
    length(trim(player_name)) between 1 and 20
  ),
  add constraint chk_net_worth check (net_worth between -1000000 and 100000000),
  add constraint chk_rep check (rep between 0 and 1000),
  add constraint chk_territories check (territories between 0 and 30),
  add constraint chk_milestones check (milestones between 0 and 50),
  add constraint chk_trades check (trades between 0 and 10000),
  add constraint chk_best_trade check (best_trade between 0 and 100000000),
  add constraint chk_fingers check (fingers between 0 and 10),
  add constraint chk_days_survived check (days_survived between 1 and 90),
  add constraint chk_difficulty check (difficulty in ('conservative', 'standard', 'highroller'));

-- ── Drop the wide-open insert policy ──────────────────────
drop policy if exists "Anyone can submit scores" on scores;

-- ── Rate-limiting + validated insert via RPC ──────────────
create or replace function submit_score(
  p_player_name text,
  p_net_worth bigint,
  p_rank_name text default null,
  p_difficulty text default 'standard',
  p_rep int default 0,
  p_territories int default 0,
  p_milestones int default 0,
  p_trades int default 0,
  p_best_trade bigint default 0,
  p_fingers int default 10,
  p_days_survived int default 30,
  p_won boolean default false
) returns json as $$
declare
  clean_name text;
  recent_count int;
  client_ip text;
  ip_hashed text;
begin
  -- Sanitize player name: trim, collapse spaces, strip dangerous chars
  clean_name := regexp_replace(trim(p_player_name), '\s+', ' ', 'g');
  clean_name := regexp_replace(clean_name, '[<>"'';&\\]', '', 'g');

  if length(clean_name) < 1 or length(clean_name) > 20 then
    return json_build_object('ok', false, 'error', 'Invalid player name');
  end if;

  -- Validate numeric ranges
  if p_net_worth < -1000000 or p_net_worth > 100000000 then
    return json_build_object('ok', false, 'error', 'Invalid score');
  end if;
  if p_rep < 0 or p_rep > 1000 then
    return json_build_object('ok', false, 'error', 'Invalid rep');
  end if;
  if p_trades < 0 or p_trades > 10000 then
    return json_build_object('ok', false, 'error', 'Invalid trades');
  end if;
  if p_fingers < 0 or p_fingers > 10 then
    return json_build_object('ok', false, 'error', 'Invalid fingers');
  end if;
  if p_days_survived < 1 or p_days_survived > 90 then
    return json_build_object('ok', false, 'error', 'Invalid days');
  end if;

  -- Cross-validate: best_trade shouldn't exceed net_worth by absurd margin
  if p_best_trade > p_net_worth * 5 and p_best_trade > 500000 then
    return json_build_object('ok', false, 'error', 'Invalid score data');
  end if;

  -- Rate limit: max 10 submissions per IP per hour
  client_ip := coalesce(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'x-real-ip',
    'unknown'
  );
  ip_hashed := encode(sha256(client_ip::bytea), 'hex');

  select count(*) into recent_count
  from scores
  where ip_hash = ip_hashed
    and played_at > now() - interval '1 hour';

  if recent_count >= 10 then
    return json_build_object('ok', false, 'error', 'Rate limited');
  end if;

  -- Insert validated score
  insert into scores (
    player_name, net_worth, rank_name, difficulty,
    rep, territories, milestones, trades, best_trade,
    fingers, days_survived, won, ip_hash
  ) values (
    clean_name, p_net_worth, p_rank_name, coalesce(p_difficulty, 'standard'),
    p_rep, p_territories, p_milestones, p_trades, p_best_trade,
    p_fingers, p_days_survived, p_won, ip_hashed
  );

  return json_build_object('ok', true);
end;
$$ language plpgsql security definer;

-- ── Ensure ip_hash is not exposed in reads ────────────────
drop policy if exists "Anyone can read scores" on scores;
create policy "Anyone can read scores" on scores
  for select using (true);

-- ── Create view that hides ip_hash from clients ──────────
create or replace view public_scores as
  select id, player_name, net_worth, rank_name, difficulty,
         rep, territories, milestones, trades, best_trade,
         fingers, days_survived, won, played_at
  from scores
  order by net_worth desc;

-- ── Index for rate limiting lookups ──────────────────────
create index if not exists idx_scores_ip_played on scores (ip_hash, played_at desc);
