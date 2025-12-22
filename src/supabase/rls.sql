-- ============================================================
-- SIMULATEBG — ROW LEVEL SECURITY (FINAL)
-- ============================================================

-- ============================================================
-- Helper view: user → player → holding → company
-- ============================================================

create or replace view public.v_user_holdings as
select
  p.user_id,
  h.id as holding_id
from public.players p
join public.holdings h on h.player_id = p.id;

create or replace view public.v_user_companies as
select
  p.user_id,
  c.id as company_id
from public.players p
join public.holdings h on h.player_id = p.id
join public.companies c on c.holding_id = h.id;

-- ============================================================
-- Enable RLS everywhere
-- ============================================================

alter table players enable row level security;
alter table player_settings enable row level security;

alter table player_friends enable row level security;

alter table holdings enable row level security;
alter table holding_policies enable row level security;

alter table companies enable row level security;
alter table company_state enable row level security;
alter table company_financials enable row level security;

alter table company_decisions enable row level security;
alter table holding_decisions enable row level security;

alter table company_programs enable row level security;
alter table niche_upgrades enable row level security;
alter table company_upgrades enable row level security;

alter table loans enable row level security;
alter table properties enable row level security;
alter table investments enable row level security;

alter table events enable row level security;

alter table worlds enable row level security;
alter table world_economy_state enable row level security;
alter table world_rounds enable row level security;

alter table sectors enable row level security;
alter table niches enable row level security;
alter table world_sector_state enable row level security;

alter table bot_profiles enable row level security;
alter table bots enable row level security;

alter table skills enable row level security;
alter table player_skills enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;

-- ============================================================
-- PUBLIC READ (world / static data)
-- ============================================================

create policy "read_worlds"
on worlds for select
to authenticated
using (true);

create policy "read_world_economy"
on world_economy_state for select
to authenticated
using (true);

create policy "read_world_rounds"
on world_rounds for select
to authenticated
using (true);

create policy "read_sectors"
on sectors for select
to authenticated
using (true);

create policy "read_niches"
on niches for select
to authenticated
using (true);

create policy "read_world_sector_state"
on world_sector_state for select
to authenticated
using (true);

create policy "read_bot_profiles"
on bot_profiles for select
to authenticated
using (true);

create policy "read_niche_upgrades"
on niche_upgrades for select
to authenticated
using (true);

create policy "read_skills"
on skills for select
to authenticated
using (true);

create policy "read_achievements"
on achievements for select
to authenticated
using (true);

-- ============================================================
-- PLAYERS (owner = auth.uid)
-- ============================================================

create policy "player_owner_read"
on players for select
to authenticated
using (user_id = auth.uid());

create policy "player_owner_insert"
on players for insert
to authenticated
with check (user_id = auth.uid());

create policy "player_owner_update"
on players for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "player_read_world_presence"
on players for select
to authenticated
using (
  exists (
    select 1
    from players me
    join player_world_presence pwp on pwp.player_id = me.id
    join holdings h on h.world_id = pwp.world_id
    where me.user_id = auth.uid()
      and h.player_id = players.id
  )
);
-- ============================================================
-- PLAYER SETTINGS
-- ============================================================

create policy "player_settings_owner"
on player_settings for all
to authenticated
using (
  exists (
    select 1 from players p
    where p.id = player_settings.player_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from players p
    where p.id = player_settings.player_id
      and p.user_id = auth.uid()
  )
);

-- ============================================================
-- FRIENDS
-- ============================================================

create policy "friends_read"
on player_friends for select
to authenticated
using (
  exists (
    select 1 from players p
    where p.user_id = auth.uid()
      and (p.id = player_friends.player_id or p.id = player_friends.friend_id)
  )
);

create policy "friends_insert"
on player_friends for insert
to authenticated
with check (
  exists (
    select 1 from players p
    where p.user_id = auth.uid()
      and p.id = player_friends.player_id
  )
);

create policy "friends_update"
on player_friends for update
to authenticated
using (
  exists (
    select 1 from players p
    where p.user_id = auth.uid()
      and (p.id = player_friends.player_id or p.id = player_friends.friend_id)
  )
)
with check (
  exists (
    select 1 from players p
    where p.user_id = auth.uid()
      and (p.id = player_friends.player_id or p.id = player_friends.friend_id)
  )
);

create policy "friends_delete"
on player_friends for delete
to authenticated
using (
  exists (
    select 1 from players p
    where p.user_id = auth.uid()
      and (p.id = player_friends.player_id or p.id = player_friends.friend_id)
  )
);
-- ============================================================
-- HOLDINGS
-- ============================================================

create policy "holding_owner"
on holdings for all
to authenticated
using (
  exists (
    select 1 from players p
    where p.id = holdings.player_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from players p
    where p.id = holdings.player_id
      and p.user_id = auth.uid()
  )
);

create policy "holding_read_world_presence"
on holdings for select
to authenticated
using (
  exists (
    select 1 from players p
    join player_world_presence pwp on pwp.player_id = p.id
    where p.user_id = auth.uid()
      and pwp.world_id = holdings.world_id
  )
);

create policy "holding_read_friend"
on holdings for select
to authenticated
using (
  exists (
    select 1 from players me
    join player_friends f on f.status = 'ACCEPTED'
      and (
        (f.player_id = me.id and f.friend_id = holdings.player_id)
        or (f.friend_id = me.id and f.player_id = holdings.player_id)
      )
    where me.user_id = auth.uid()
  )
);
create policy "holding_policy_owner"
on holding_policies for all
to authenticated
using (
  exists (
    select 1
    from holdings h
    join players p on p.id = h.player_id
    where h.id = holding_policies.holding_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from holdings h
    join players p on p.id = h.player_id
    where h.id = holding_policies.holding_id
      and p.user_id = auth.uid()
  )
);

-- ============================================================
-- COMPANIES
-- ============================================================

create policy "company_owner"
on companies for all
to authenticated
using (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = companies.holding_id
      and vh.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = companies.holding_id
      and vh.user_id = auth.uid()
  )
);

create policy "company_read_world_presence"
on companies for select
to authenticated
using (
  exists (
    select 1 from players p
    join player_world_presence pwp on pwp.player_id = p.id
    where p.user_id = auth.uid()
      and pwp.world_id = companies.world_id
  )
);
-- ============================================================
-- COMPANY STATE & FINANCIALS (READ ONLY for players)
-- ============================================================

create policy "company_state_read_owner"
on company_state for select
to authenticated
using (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_state.company_id
      and vc.user_id = auth.uid()
  )
);

create policy "company_financials_read_owner"
on company_financials for select
to authenticated
using (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_financials.company_id
      and vc.user_id = auth.uid()
  )
);

create policy "company_financials_read_world_presence"
on company_financials for select
to authenticated
using (
  exists (
    select 1 from players p
    join player_world_presence pwp on pwp.player_id = p.id
    where p.user_id = auth.uid()
      and pwp.world_id = company_financials.world_id
  )
);

-- ❌ NO INSERT / UPDATE / DELETE for users
-- ✔ Engine writes using service_role

-- ============================================================
-- DECISIONS (player intent)
-- ============================================================

create policy "company_decisions_owner"
on company_decisions for all
to authenticated
using (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_decisions.company_id
      and vc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_decisions.company_id
      and vc.user_id = auth.uid()
  )
);

create policy "holding_decisions_owner"
on holding_decisions for all
to authenticated
using (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = holding_decisions.holding_id
      and vh.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = holding_decisions.holding_id
      and vh.user_id = auth.uid()
  )
);

-- ============================================================
-- PROGRAMS & UPGRADES
-- ============================================================

create policy "company_programs_owner"
on company_programs for all
to authenticated
using (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_programs.company_id
      and vc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_programs.company_id
      and vc.user_id = auth.uid()
  )
);

create policy "company_upgrades_owner"
on company_upgrades for all
to authenticated
using (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_upgrades.company_id
      and vc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from v_user_companies vc
    where vc.company_id = company_upgrades.company_id
      and vc.user_id = auth.uid()
  )
);

-- ============================================================
-- FINANCE OBJECTS (READ ONLY)
-- ============================================================

create policy "loans_read_owner"
on loans for select
to authenticated
using (
  (holding_id is not null and exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = loans.holding_id
      and vh.user_id = auth.uid()
  ))
  or
  (company_id is not null and exists (
    select 1 from v_user_companies vc
    where vc.company_id = loans.company_id
      and vc.user_id = auth.uid()
  ))
);

create policy "properties_read_owner"
on properties for select
to authenticated
using (
  (holding_id is not null and exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = properties.holding_id
      and vh.user_id = auth.uid()
  ))
  or
  (company_id is not null and exists (
    select 1 from v_user_companies vc
    where vc.company_id = properties.company_id
      and vc.user_id = auth.uid()
  ))
);

create policy "investments_read_owner"
on investments for select
to authenticated
using (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = investments.holding_id
      and vh.user_id = auth.uid()
  )
);

-- ============================================================
-- EVENTS (WORLD + OWNED ASSETS)
-- ============================================================

create policy "events_read"
on events for select
to authenticated
using (
  scope = 'WORLD'
  or
  (holding_id is not null and exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = events.holding_id
      and vh.user_id = auth.uid()
  ))
  or
  (company_id is not null and exists (
    select 1 from v_user_companies vc
    where vc.company_id = events.company_id
      and vc.user_id = auth.uid()
  ))
);

-- ============================================================
-- BOTS (read only, only own holdings)
-- ============================================================

create policy "bots_read_owner"
on bots for select
to authenticated
using (
  exists (
    select 1 from v_user_holdings vh
    where vh.holding_id = bots.holding_id
      and vh.user_id = auth.uid()
  )
);

-- ============================================================
-- PROGRESSION
-- ============================================================

create policy "player_skills_owner"
on player_skills for select
to authenticated
using (
  exists (
    select 1 from players p
    where p.id = player_skills.player_id
      and p.user_id = auth.uid()
  )
);

create policy "player_achievements_owner"
on player_achievements for select
to authenticated
using (
  exists (
    select 1 from players p
    where p.id = player_achievements.player_id
      and p.user_id = auth.uid()
  )
);

-- ============================================================
-- END
-- ============================================================
