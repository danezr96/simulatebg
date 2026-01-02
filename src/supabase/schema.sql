-- ============================================================
-- SIMULATEBG — FULL SUPABASE SCHEMA (FINAL)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Cleanup (safe reruns)
-- ============================================================

drop trigger if exists trg_player_friends_updated on public.player_friends;
drop trigger if exists trg_player_settings_updated on public.player_settings;
drop trigger if exists trg_holding_policies_updated on public.holding_policies;
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'acquisition_offers'
  ) then
    execute 'drop trigger if exists trg_acquisition_offers_updated on public.acquisition_offers';
  end if;
end $$;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- WORLDS & TIME
-- ============================================================

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null default 'NORMAL',
  status text not null default 'ACTIVE',
  base_round_interval_seconds int not null default 600,
  season_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.world_economy_state (
  world_id uuid primary key references public.worlds(id) on delete cascade,
  current_year int not null default 1,
  current_week int not null default 1,
  base_interest_rate numeric(6,3) not null default 0.020,
  inflation_rate numeric(6,3) not null default 0.020,
  base_wage_index numeric(10,4) not null default 1.0,
  macro_modifiers jsonb not null default '{}'::jsonb,
  is_ticking boolean not null default false,
  last_tick_started_at timestamptz,
  last_tick_at timestamptz
);

-- Patch existing tables (safe reruns)
alter table if exists public.world_economy_state
  add column if not exists is_ticking boolean not null default false;
alter table if exists public.world_economy_state
  add column if not exists last_tick_started_at timestamptz;
alter table if exists public.world_economy_state
  add column if not exists last_tick_at timestamptz;

create table if not exists public.world_rounds (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  year int not null,
  week int not null,
  engine_version text not null,
  random_seed text not null,
  status text not null default 'COMPLETED',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists uq_world_rounds on public.world_rounds(world_id, year, week);

-- ============================================================
-- PLAYERS
-- ============================================================

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  avatar_url text,
  bio text,
  play_style text,
  focus_area text,
  base_currency text not null default 'EUR',

  brand_rep_level int not null default 1,
  brand_rep_xp numeric(18,2) not null default 0,
  credit_rep_level int not null default 1,
  credit_rep_xp numeric(18,2) not null default 0,

  prestige_level int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_user on public.players(user_id);

alter table if exists public.players
  add column if not exists bio text;
alter table if exists public.players
  add column if not exists play_style text;
alter table if exists public.players
  add column if not exists focus_area text;

create table if not exists public.player_world_presence (
  player_id uuid not null references public.players(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (player_id, world_id)
);

create index if not exists idx_presence_world on public.player_world_presence(world_id);

create table if not exists public.player_friends (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  friend_id uuid not null references public.players(id) on delete cascade,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_player_friends_not_self check (player_id <> friend_id)
);

create unique index if not exists uq_player_friends_pair
on public.player_friends(player_id, friend_id);

create index if not exists idx_player_friends_player
on public.player_friends(player_id);

create index if not exists idx_player_friends_friend
on public.player_friends(friend_id);

create trigger trg_player_friends_updated
before update on public.player_friends
for each row execute function public.set_updated_at();

create table if not exists public.player_settings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null unique references public.players(id) on delete cascade,

  theme text not null default 'JAPANDI_LIGHT',
  accent text not null default 'BLUE',
  ui_density text not null default 'COMFORTABLE',
  reduce_motion boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_player_settings_updated
before update on public.player_settings
for each row execute function public.set_updated_at();

-- ============================================================
-- HOLDINGS
-- ============================================================

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,

  name text not null,
  base_currency text not null default 'EUR',
  status text not null default 'ACTIVE',

  cash_balance numeric(18,2) not null default 0,
  total_equity numeric(18,2) not null default 0,
  total_debt numeric(18,2) not null default 0,

  created_at timestamptz not null default now()
);

create unique index if not exists uq_holdings_player_world
on public.holdings(player_id, world_id);

create table if not exists public.holding_policies (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null unique references public.holdings(id) on delete cascade,

  max_leverage_ratio numeric(10,4) not null default 2.5,
  dividend_preference text not null default 'REINVEST',
  risk_appetite text not null default 'MEDIUM',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_holding_policies_updated
before update on public.holding_policies
for each row execute function public.set_updated_at();

-- ============================================================
-- SECTORS & NICHES
-- ============================================================

create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  startup_cost_min_eur numeric(14,2),
  startup_cost_max_eur numeric(14,2),
  startup_cost_avg_eur numeric(14,2),
  startup_cost_median_eur numeric(14,2),
  created_at timestamptz not null default now()
);

alter table if exists public.sectors
  add column if not exists startup_cost_min_eur numeric(14,2),
  add column if not exists startup_cost_max_eur numeric(14,2),
  add column if not exists startup_cost_avg_eur numeric(14,2),
  add column if not exists startup_cost_median_eur numeric(14,2);

create table if not exists public.niches (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.sectors(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  config jsonb not null,
  startup_cost_eur numeric(14,2),
  roi_pct numeric(5,2),
  payback_years numeric(6,2),
  risk text,
  capex text,
  margin_pct_min numeric(5,2),
  margin_pct_max numeric(5,2),
  base_demand_index int,
  ticket_level text,
  competition text,
  decision_profile text,
  upgrade_profile text,
  pricing_model text,
  volume_baseline_week_min numeric(14,2),
  volume_baseline_week_max numeric(14,2),
  volume_unit text,
  fixed_costs_month_min_eur numeric(14,2),
  fixed_costs_month_max_eur numeric(14,2),
  working_capital_days jsonb,
  maintenance_pct_of_capex_per_year_min numeric(5,2),
  maintenance_pct_of_capex_per_year_max numeric(5,2),
  created_at timestamptz not null default now()
);

alter table if exists public.niches
  add column if not exists startup_cost_eur numeric(14,2),
  add column if not exists roi_pct numeric(5,2),
  add column if not exists payback_years numeric(6,2),
  add column if not exists risk text,
  add column if not exists capex text,
  add column if not exists margin_pct_min numeric(5,2),
  add column if not exists margin_pct_max numeric(5,2),
  add column if not exists base_demand_index int,
  add column if not exists ticket_level text,
  add column if not exists competition text,
  add column if not exists decision_profile text,
  add column if not exists upgrade_profile text,
  add column if not exists pricing_model text,
  add column if not exists volume_baseline_week_min numeric(14,2),
  add column if not exists volume_baseline_week_max numeric(14,2),
  add column if not exists volume_unit text,
  add column if not exists fixed_costs_month_min_eur numeric(14,2),
  add column if not exists fixed_costs_month_max_eur numeric(14,2),
  add column if not exists working_capital_days jsonb,
  add column if not exists maintenance_pct_of_capex_per_year_min numeric(5,2),
  add column if not exists maintenance_pct_of_capex_per_year_max numeric(5,2);

create unique index if not exists uq_niches_sector_code
on public.niches(sector_id, code);

create table if not exists public.catalog_meta (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null,
  assumptions jsonb not null,
  upgrade_templates jsonb not null
);

create table if not exists public.niche_products (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete cascade,
  sku text not null,
  name text not null,
  unit text not null,
  price_min_eur numeric(14,2) not null,
  price_max_eur numeric(14,2) not null,
  cogs_pct_min numeric(5,2) not null,
  cogs_pct_max numeric(5,2) not null,
  capacity_driver text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.world_sector_state (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  sector_id uuid not null references public.sectors(id),
  current_demand numeric(18,2) not null default 0,
  trend_factor numeric(10,4) not null default 1,
  volatility numeric(10,4) not null default 0.1,
  last_round_metrics jsonb not null default '{}'::jsonb
);

create unique index if not exists uq_world_sector
on public.world_sector_state(world_id, sector_id);

-- ============================================================
-- COMPANIES
-- ============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  sector_id uuid not null references public.sectors(id),
  niche_id uuid not null references public.niches(id),

  name text not null,
  region text not null,
  founded_year int not null,
  status text not null default 'ACTIVE',

  created_at timestamptz not null default now()
);

create table if not exists public.company_state (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  year int not null,
  week int not null,

    price_level numeric(18,4) not null default 1,
    capacity numeric(18,4) not null default 0,
    quality_score numeric(10,4) not null default 1,
    marketing_level numeric(18,4) not null default 0,
    awareness_score numeric(10,4) not null default 20,
    employees int not null default 0,

  fixed_costs numeric(18,2) not null default 0,
    variable_cost_per_unit numeric(18,4) not null default 0,

    brand_score numeric(10,4) not null default 0.5,
    operational_efficiency_score numeric(10,4) not null default 50,
    utilisation_rate numeric(10,4) not null default 0,

  created_at timestamptz not null default now()
);

create unique index if not exists uq_company_state
on public.company_state(company_id, year, week);

create table if not exists public.company_financials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  year int not null,
  week int not null,

  revenue numeric(18,2) not null default 0,
  cogs numeric(18,2) not null default 0,
  opex numeric(18,2) not null default 0,
  interest_cost numeric(18,2) not null default 0,
  tax_expense numeric(18,2) not null default 0,

  net_profit numeric(18,2) not null default 0,
  cash_change numeric(18,2) not null default 0,

  assets numeric(18,2) not null default 0,
  liabilities numeric(18,2) not null default 0,
  equity numeric(18,2) not null default 0,

  created_at timestamptz not null default now()
);

create unique index if not exists uq_company_financials
on public.company_financials(company_id, year, week);

-- ============================================================
-- DECISIONS
-- ============================================================

create table if not exists public.company_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  year int not null,
  week int not null,
  source text not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.holding_decisions (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  year int not null,
  week int not null,
  source text not null,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACQUISITIONS
-- ============================================================

create table if not exists public.acquisition_offers (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  buyer_holding_id uuid not null references public.holdings(id) on delete cascade,
  seller_holding_id uuid not null references public.holdings(id) on delete cascade,

  status text not null default 'OPEN',
  offer_price numeric(18,2) not null,
  currency text not null default 'EUR',
  message text,

  turn text not null default 'SELLER',
  last_action text not null default 'BUYER',
  counter_count int not null default 0,

  expires_year int,
  expires_week int,
  history jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_acquisition_offers_world on public.acquisition_offers(world_id);
create index if not exists idx_acquisition_offers_company on public.acquisition_offers(company_id);
create index if not exists idx_acquisition_offers_buyer on public.acquisition_offers(buyer_holding_id);
create index if not exists idx_acquisition_offers_seller on public.acquisition_offers(seller_holding_id);

create trigger trg_acquisition_offers_updated
before update on public.acquisition_offers
for each row execute function public.set_updated_at();

-- ============================================================
-- PROGRAMS & UPGRADES
-- ============================================================

create table if not exists public.company_programs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,

  program_type text not null,
  payload jsonb not null default '{}'::jsonb,

  start_year int not null,
  start_week int not null,
  duration_weeks int not null default 1,
  status text not null default 'ACTIVE',

  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index if not exists uq_company_programs_unique
on public.company_programs(company_id, start_year, start_week, program_type);

create index if not exists idx_company_programs_world
on public.company_programs(world_id, status);

create table if not exists public.niche_upgrades (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete cascade,
  code text not null,
  tree_key text not null,
  name text not null,
  description text,
  tier int not null default 1,
  cost numeric(18,2) not null default 0,
  duration_weeks int not null default 0,
  effects jsonb not null default '{}'::jsonb,
  capex_pct_min numeric(6,4),
  capex_pct_max numeric(6,4),
  opex_pct_min numeric(6,4),
  opex_pct_max numeric(6,4),
  capex_formula text,
  opex_formula text,
  delay_weeks_min int,
  delay_weeks_max int,
  risk jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.niche_upgrades
  add column if not exists capex_pct_min numeric(6,4),
  add column if not exists capex_pct_max numeric(6,4),
  add column if not exists opex_pct_min numeric(6,4),
  add column if not exists opex_pct_max numeric(6,4),
  add column if not exists capex_formula text,
  add column if not exists opex_formula text,
  add column if not exists delay_weeks_min int,
  add column if not exists delay_weeks_max int,
  add column if not exists risk jsonb;

create unique index if not exists uq_niche_upgrades_code
on public.niche_upgrades(niche_id, code);

create table if not exists public.company_upgrades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  upgrade_id uuid not null references public.niche_upgrades(id) on delete cascade,
  purchased_year int not null,
  purchased_week int not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create unique index if not exists uq_company_upgrades_unique
on public.company_upgrades(company_id, upgrade_id);

create index if not exists idx_company_upgrades_world
on public.company_upgrades(world_id);

-- ============================================================
-- FINANCE
-- ============================================================

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,

  principal numeric(18,2) not null,
  outstanding_balance numeric(18,2) not null,
  interest_rate numeric(10,4) not null,
  term_weeks int not null,
  remaining_weeks int not null,

  lender_name text not null,
  type text not null,
  status text not null default 'ACTIVE',

  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  holding_id uuid references public.holdings(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,

  type text not null,
  location text not null,
  purchase_price numeric(18,2) not null,
  market_value numeric(18,2) not null,

  rental_income_week numeric(18,2) not null default 0,
  maintenance_cost_week numeric(18,2) not null default 0,

  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  holding_id uuid not null references public.holdings(id) on delete cascade,

  type text not null,
  name text not null,
  current_value numeric(18,2) not null,
  cost_basis numeric(18,2) not null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- ============================================================
-- EVENTS
-- ============================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  sector_id uuid references public.sectors(id),
  company_id uuid references public.companies(id),
  holding_id uuid references public.holdings(id),

  scope text not null,
  type text not null,
  severity numeric(10,4) not null default 1,
  payload jsonb not null default '{}'::jsonb,

  year int not null,
  week int not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- BOTS
-- ============================================================

create table if not exists public.bot_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archetype text not null,
  behavior_config jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  bot_profile_id uuid not null references public.bot_profiles(id),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PROGRESSION
-- ============================================================

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  tree text not null,
  name text not null,
  description text,
  tier int not null,
  effects jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_skills (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  unlocked_at timestamptz not null default now()
);

create unique index if not exists uq_player_skills
on public.player_skills(player_id, skill_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  conditions jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now()
);

create unique index if not exists uq_player_achievements
on public.player_achievements(player_id, achievement_id);

-- ============================================================
-- END
-- ============================================================
