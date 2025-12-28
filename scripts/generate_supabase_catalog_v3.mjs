import fs from "fs";
import path from "path";

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog_v3.json"), "utf8"));
const legacy = JSON.parse(fs.readFileSync(path.join(root, "docs", "niche-catalog.json"), "utf8"));

const legacyByKey = new Map();
for (const entry of legacy.niches ?? []) {
  const key = normalizeKey(entry.niche?.name ?? "");
  if (!key) continue;
  const existing = legacyByKey.get(key) ?? [];
  existing.push(entry);
  legacyByKey.set(key, existing);
}

const branchMeta = new Map();
for (const [profileCode, profile] of Object.entries(catalog.upgrade_profiles ?? {})) {
  for (const branch of profile.branches ?? []) {
    branchMeta.set(`${profileCode}:${branch.branch_code}`, branch);
  }
}

const sql = [];

sql.push("-- ============================================================");
sql.push("-- CATALOG V3 PATCH (schema add-ons + data)\n");

sql.push("-- Schema add-ons");
sql.push("alter table if exists public.sectors");
sql.push("  add column if not exists startup_cost_min_eur numeric(14,2),");
sql.push("  add column if not exists startup_cost_max_eur numeric(14,2),");
sql.push("  add column if not exists startup_cost_avg_eur numeric(14,2),");
sql.push("  add column if not exists startup_cost_median_eur numeric(14,2);");

sql.push("alter table if exists public.niches");
sql.push("  add column if not exists startup_cost_eur numeric(14,2),");
sql.push("  add column if not exists roi_pct numeric(5,2),");
sql.push("  add column if not exists payback_years numeric(6,2),");
sql.push("  add column if not exists risk text,");
sql.push("  add column if not exists capex text,");
sql.push("  add column if not exists margin_pct_min numeric(5,2),");
sql.push("  add column if not exists margin_pct_max numeric(5,2),");
sql.push("  add column if not exists base_demand_index int,");
sql.push("  add column if not exists ticket_level text,");
sql.push("  add column if not exists competition text,");
sql.push("  add column if not exists decision_profile text,");
sql.push("  add column if not exists upgrade_profile text,");
sql.push("  add column if not exists pricing_model text,");
sql.push("  add column if not exists volume_baseline_week_min numeric(14,2),");
sql.push("  add column if not exists volume_baseline_week_max numeric(14,2),");
sql.push("  add column if not exists volume_unit text,");
sql.push("  add column if not exists fixed_costs_month_min_eur numeric(14,2),");
sql.push("  add column if not exists fixed_costs_month_max_eur numeric(14,2),");
sql.push("  add column if not exists working_capital_days jsonb,");
sql.push("  add column if not exists maintenance_pct_of_capex_per_year_min numeric(5,2),");
sql.push("  add column if not exists maintenance_pct_of_capex_per_year_max numeric(5,2);");

sql.push("alter table if exists public.niche_upgrades");
sql.push("  add column if not exists capex_pct_min numeric(6,4),");
sql.push("  add column if not exists capex_pct_max numeric(6,4),");
sql.push("  add column if not exists opex_pct_min numeric(6,4),");
sql.push("  add column if not exists opex_pct_max numeric(6,4),");
sql.push("  add column if not exists capex_formula text,");
sql.push("  add column if not exists opex_formula text,");
sql.push("  add column if not exists delay_weeks_min int,");
sql.push("  add column if not exists delay_weeks_max int,");
sql.push("  add column if not exists risk jsonb;");

sql.push("create table if not exists public.catalog_meta (");
sql.push("  id uuid primary key default gen_random_uuid(),");
sql.push("  generated_at timestamptz not null,");
sql.push("  assumptions jsonb not null,");
sql.push("  upgrade_templates jsonb not null");
sql.push(");");

sql.push("create table if not exists public.niche_products (");
sql.push("  id uuid primary key default gen_random_uuid(),");
sql.push("  niche_id uuid not null references public.niches(id) on delete cascade,");
sql.push("  sku text not null,");
sql.push("  name text not null,");
sql.push("  unit text not null,");
sql.push("  price_min_eur numeric(14,2) not null,");
sql.push("  price_max_eur numeric(14,2) not null,");
sql.push("  cogs_pct_min numeric(5,2) not null,");
sql.push("  cogs_pct_max numeric(5,2) not null,");
sql.push("  capacity_driver text not null,");
sql.push("  notes text not null,");
sql.push("  created_at timestamptz not null default now()");
sql.push(");\n");

sql.push("-- Catalog meta");
const metaId = "00000000-0000-0000-0000-00000000c0a1";
sql.push(
  `insert into public.catalog_meta (id, generated_at, assumptions, upgrade_templates) values (${sqlString(
    metaId,
  )}, ${sqlString(catalog.generated_at)}, ${sqlJson(catalog.assumptions)}, ${sqlJson(
    catalog.upgrade_templates,
  )}) on conflict (id) do update set generated_at = excluded.generated_at, assumptions = excluded.assumptions, upgrade_templates = excluded.upgrade_templates;`
);

sql.push("\n-- Sector stats");
for (const sector of catalog.sectors ?? []) {
  sql.push(
    `update public.sectors set name = ${sqlString(sector.name)}, description = ${sqlString(
      sector.description,
    )}, startup_cost_min_eur = ${sqlNumber(sector.startup_cost_stats.min)}, startup_cost_max_eur = ${sqlNumber(
      sector.startup_cost_stats.max,
    )}, startup_cost_avg_eur = ${sqlNumber(sector.startup_cost_stats.avg)}, startup_cost_median_eur = ${sqlNumber(
      sector.startup_cost_stats.median,
    )} where code = ${sqlString(sector.sector_code)};`
  );
}

sql.push("\n-- Niches");
const nicheRows = [];
for (const sector of catalog.sectors ?? []) {
  for (const niche of sector.niches ?? []) {
    const legacyEntry = pickLegacyEntry(legacyByKey.get(normalizeKey(niche.niche_code)) ?? [], sector.sector_code);
    const legacyConfig = legacyEntry?.niche?.config ?? null;
    const config = buildConfig(niche, legacyConfig, legacyEntry);
    const code = legacyEntry?.niche?.code ?? `${sector.sector_code}_${slugify(niche.niche_code).toUpperCase()}`;
    const name = legacyEntry?.niche?.name ?? niche.niche_code;
    const description = legacyEntry?.niche?.description ?? null;

    nicheRows.push({
      sector_code: sector.sector_code,
      code,
      name,
      description,
      config,
      startup_cost_eur: niche.startup_cost,
      roi_pct: niche.roi_pct,
      payback_years: niche.payback_years,
      risk: niche.risk,
      capex: niche.capex,
      margin_pct_min: niche.margin_pct_range?.[0],
      margin_pct_max: niche.margin_pct_range?.[1],
      base_demand_index: niche.base_demand_index,
      ticket_level: niche.ticket_level,
      competition: niche.competition,
      decision_profile: niche.decision_profile,
      upgrade_profile: niche.upgrade_profile,
      pricing_model: niche.pricing_model,
      volume_baseline_week_min: niche.volume_baseline_week?.min,
      volume_baseline_week_max: niche.volume_baseline_week?.max,
      volume_unit: niche.volume_baseline_week?.unit,
      fixed_costs_month_min_eur: niche.fixed_costs_month_eur_range?.[0],
      fixed_costs_month_max_eur: niche.fixed_costs_month_eur_range?.[1],
      working_capital_days: niche.working_capital_days,
      maintenance_pct_of_capex_per_year_min: niche.maintenance_pct_of_capex_per_year?.[0],
      maintenance_pct_of_capex_per_year_max: niche.maintenance_pct_of_capex_per_year?.[1],
    });
  }
}

sql.push("with sector_ids as (select id, code from public.sectors),");
sql.push("niches_seed as (");
sql.push(
  "  select * from (values\n" +
    nicheRows
      .map((row) =>
        `    (${sqlString(row.sector_code)}, ${sqlString(row.code)}, ${sqlString(row.name)}, ${sqlNullableString(
          row.description,
        )}, ${sqlJson(row.config)}, ${sqlNumber(row.startup_cost_eur)}, ${sqlNumber(row.roi_pct)}, ${sqlNumber(
          row.payback_years,
        )}, ${sqlNullableString(row.risk)}, ${sqlNullableString(row.capex)}, ${sqlNumber(row.margin_pct_min)}, ${sqlNumber(
          row.margin_pct_max,
        )}, ${sqlNumber(row.base_demand_index)}, ${sqlNullableString(row.ticket_level)}, ${sqlNullableString(
          row.competition,
        )}, ${sqlNullableString(row.decision_profile)}, ${sqlNullableString(row.upgrade_profile)}, ${sqlNullableString(
          row.pricing_model,
        )}, ${sqlNumber(row.volume_baseline_week_min)}, ${sqlNumber(row.volume_baseline_week_max)}, ${sqlNullableString(
          row.volume_unit,
        )}, ${sqlNumber(row.fixed_costs_month_min_eur)}, ${sqlNumber(row.fixed_costs_month_max_eur)}, ${sqlJson(
          row.working_capital_days,
        )}, ${sqlNumber(row.maintenance_pct_of_capex_per_year_min)}, ${sqlNumber(row.maintenance_pct_of_capex_per_year_max)})`
      )
      .join(",\n") +
    "\n  ) as t(sector_code, code, name, description, config, startup_cost_eur, roi_pct, payback_years, risk, capex, margin_pct_min, margin_pct_max, base_demand_index, ticket_level, competition, decision_profile, upgrade_profile, pricing_model, volume_baseline_week_min, volume_baseline_week_max, volume_unit, fixed_costs_month_min_eur, fixed_costs_month_max_eur, working_capital_days, maintenance_pct_of_capex_per_year_min, maintenance_pct_of_capex_per_year_max)\n)");

sql.push("insert into public.niches (sector_id, code, name, description, config, startup_cost_eur, roi_pct, payback_years, risk, capex, margin_pct_min, margin_pct_max, base_demand_index, ticket_level, competition, decision_profile, upgrade_profile, pricing_model, volume_baseline_week_min, volume_baseline_week_max, volume_unit, fixed_costs_month_min_eur, fixed_costs_month_max_eur, working_capital_days, maintenance_pct_of_capex_per_year_min, maintenance_pct_of_capex_per_year_max)");
sql.push("select s.id, t.code, t.name, t.description, t.config, t.startup_cost_eur, t.roi_pct, t.payback_years, t.risk, t.capex, t.margin_pct_min, t.margin_pct_max, t.base_demand_index, t.ticket_level, t.competition, t.decision_profile, t.upgrade_profile, t.pricing_model, t.volume_baseline_week_min, t.volume_baseline_week_max, t.volume_unit, t.fixed_costs_month_min_eur, t.fixed_costs_month_max_eur, t.working_capital_days, t.maintenance_pct_of_capex_per_year_min, t.maintenance_pct_of_capex_per_year_max");
sql.push("from niches_seed t join sector_ids s on s.code = t.sector_code");
sql.push("on conflict (sector_id, code) do update set");
sql.push("  name = excluded.name,");
sql.push("  description = excluded.description,");
sql.push("  config = excluded.config,");
sql.push("  startup_cost_eur = excluded.startup_cost_eur,");
sql.push("  roi_pct = excluded.roi_pct,");
sql.push("  payback_years = excluded.payback_years,");
sql.push("  risk = excluded.risk,");
sql.push("  capex = excluded.capex,");
sql.push("  margin_pct_min = excluded.margin_pct_min,");
sql.push("  margin_pct_max = excluded.margin_pct_max,");
sql.push("  base_demand_index = excluded.base_demand_index,");
sql.push("  ticket_level = excluded.ticket_level,");
sql.push("  competition = excluded.competition,");
sql.push("  decision_profile = excluded.decision_profile,");
sql.push("  upgrade_profile = excluded.upgrade_profile,");
sql.push("  pricing_model = excluded.pricing_model,");
sql.push("  volume_baseline_week_min = excluded.volume_baseline_week_min,");
sql.push("  volume_baseline_week_max = excluded.volume_baseline_week_max,");
sql.push("  volume_unit = excluded.volume_unit,");
sql.push("  fixed_costs_month_min_eur = excluded.fixed_costs_month_min_eur,");
sql.push("  fixed_costs_month_max_eur = excluded.fixed_costs_month_max_eur,");
sql.push("  working_capital_days = excluded.working_capital_days,");
sql.push("  maintenance_pct_of_capex_per_year_min = excluded.maintenance_pct_of_capex_per_year_min,");
sql.push("  maintenance_pct_of_capex_per_year_max = excluded.maintenance_pct_of_capex_per_year_max;\n");

sql.push("-- Niche products");
const productRows = [];
for (const sector of catalog.sectors ?? []) {
  for (const niche of sector.niches ?? []) {
    const legacyEntry = pickLegacyEntry(legacyByKey.get(normalizeKey(niche.niche_code)) ?? [], sector.sector_code);
    const nicheCode = legacyEntry?.niche?.code ?? `${sector.sector_code}_${slugify(niche.niche_code).toUpperCase()}`;
    for (const product of niche.products ?? []) {
      productRows.push({
        niche_code: nicheCode,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        price_min_eur: product.price_eur_range?.[0],
        price_max_eur: product.price_eur_range?.[1],
        cogs_pct_min: product.cogs_pct_range?.[0],
        cogs_pct_max: product.cogs_pct_range?.[1],
        capacity_driver: product.capacity_driver,
        notes: product.notes ?? "",
      });
    }
  }
}

sql.push("with niche_lookup as (select id, code from public.niches),");
sql.push("product_seed as (");
sql.push(
  "  select * from (values\n" +
    productRows
      .map((row) =>
        `    (${sqlString(row.niche_code)}, ${sqlString(row.sku)}, ${sqlString(row.name)}, ${sqlString(row.unit)}, ${sqlNumber(
          row.price_min_eur,
        )}, ${sqlNumber(row.price_max_eur)}, ${sqlNumber(row.cogs_pct_min)}, ${sqlNumber(row.cogs_pct_max)}, ${sqlString(
          row.capacity_driver,
        )}, ${sqlString(row.notes)})`
      )
      .join(",\n") +
    "\n  ) as t(niche_code, sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)\n)");

sql.push("insert into public.niche_products (niche_id, sku, name, unit, price_min_eur, price_max_eur, cogs_pct_min, cogs_pct_max, capacity_driver, notes)");
sql.push("select n.id, t.sku, t.name, t.unit, t.price_min_eur, t.price_max_eur, t.cogs_pct_min, t.cogs_pct_max, t.capacity_driver, t.notes");
sql.push("from product_seed t join niche_lookup n on n.code = t.niche_code");
sql.push("on conflict do nothing;\n");

sql.push("-- Niche upgrades (investment programs)");
const upgradeRows = [];
for (const sector of catalog.sectors ?? []) {
  for (const niche of sector.niches ?? []) {
    const legacyEntry = pickLegacyEntry(legacyByKey.get(normalizeKey(niche.niche_code)) ?? [], sector.sector_code);
    const nicheCode = legacyEntry?.niche?.code ?? `${sector.sector_code}_${slugify(niche.niche_code).toUpperCase()}`;
    for (const program of niche.investment_programs ?? []) {
      const tierNum = tierToNumber(program.tier);
      const branchCode = String(program.program_code ?? "").replace(`${niche.upgrade_profile}_`, "");
      const branch = branchMeta.get(`${niche.upgrade_profile}:${branchCode}`) ?? {};
      const template = catalog.upgrade_templates?.[program.tier] ?? {};
      upgradeRows.push({
        niche_code: nicheCode,
        code: `${branchCode}_T${tierNum}`,
        tree_key: branchCode,
        name: `${branch.name ?? titleCase(branchCode)} T${tierNum}`,
        description: branch.description ?? "Investment program",
        tier: tierNum,
        cost: 0,
        duration_weeks: 0,
        effects: program.effects ?? [],
        capex_pct_min: template.capex_pct_of_startup_cost?.[0],
        capex_pct_max: template.capex_pct_of_startup_cost?.[1],
        opex_pct_min: template.opex_pct_of_monthly_revenue?.[0],
        opex_pct_max: template.opex_pct_of_monthly_revenue?.[1],
        capex_formula: program.capex_formula ?? "startup_cost * pct",
        opex_formula: program.opex_formula ?? "revenueMonthly * pct",
        delay_weeks_min: program.delayWeeks?.min,
        delay_weeks_max: program.delayWeeks?.max,
        risk: program.risk ?? {},
      });
    }
  }
}

sql.push("with niche_lookup as (select id, code from public.niches),");
sql.push("upgrade_seed as (");
sql.push(
  "  select * from (values\n" +
    upgradeRows
      .map((row) =>
        `    (${sqlString(row.niche_code)}, ${sqlString(row.code)}, ${sqlString(row.tree_key)}, ${sqlString(
          row.name,
        )}, ${sqlString(row.description)}, ${sqlNumber(row.tier)}, ${sqlNumber(row.cost)}, ${sqlNumber(
          row.duration_weeks,
        )}, ${sqlJson(row.effects)}, ${sqlNumber(row.capex_pct_min, 4)}, ${sqlNumber(row.capex_pct_max, 4)}, ${sqlNumber(
          row.opex_pct_min,
          4,
        )}, ${sqlNumber(row.opex_pct_max, 4)}, ${sqlString(row.capex_formula)}, ${sqlString(row.opex_formula)}, ${sqlNumber(
          row.delay_weeks_min,
          0,
        )}, ${sqlNumber(row.delay_weeks_max, 0)}, ${sqlJson(row.risk)})`
      )
      .join(",\n") +
    "\n  ) as t(niche_code, code, tree_key, name, description, tier, cost, duration_weeks, effects, capex_pct_min, capex_pct_max, opex_pct_min, opex_pct_max, capex_formula, opex_formula, delay_weeks_min, delay_weeks_max, risk)\n)");

sql.push("insert into public.niche_upgrades (niche_id, code, tree_key, name, description, tier, cost, duration_weeks, effects, capex_pct_min, capex_pct_max, opex_pct_min, opex_pct_max, capex_formula, opex_formula, delay_weeks_min, delay_weeks_max, risk)");
sql.push("select n.id, t.code, t.tree_key, t.name, t.description, t.tier, t.cost, t.duration_weeks, t.effects, t.capex_pct_min, t.capex_pct_max, t.opex_pct_min, t.opex_pct_max, t.capex_formula, t.opex_formula, t.delay_weeks_min, t.delay_weeks_max, t.risk");
sql.push("from upgrade_seed t join niche_lookup n on n.code = t.niche_code");
sql.push("on conflict (niche_id, code) do update set");
sql.push("  name = excluded.name,");
sql.push("  description = excluded.description,");
sql.push("  tier = excluded.tier,");
sql.push("  cost = excluded.cost,");
sql.push("  duration_weeks = excluded.duration_weeks,");
sql.push("  effects = excluded.effects,");
sql.push("  capex_pct_min = excluded.capex_pct_min,");
sql.push("  capex_pct_max = excluded.capex_pct_max,");
sql.push("  opex_pct_min = excluded.opex_pct_min,");
sql.push("  opex_pct_max = excluded.opex_pct_max,");
sql.push("  capex_formula = excluded.capex_formula,");
sql.push("  opex_formula = excluded.opex_formula,");
sql.push("  delay_weeks_min = excluded.delay_weeks_min,");
sql.push("  delay_weeks_max = excluded.delay_weeks_max,");
sql.push("  risk = excluded.risk;\n");

fs.writeFileSync(path.join(root, "src", "supabase", "catalog_v3.sql"), sql.join("\n"));

function buildConfig(niche, legacyConfig, legacyEntry) {
  const config = { ...(legacyConfig ?? {}) };
  config.capexIntensity = niche.capex ?? config.capexIntensity;
  config.marginRange = {
    min: (niche.margin_pct_range?.[0] ?? 0) / 100,
    max: (niche.margin_pct_range?.[1] ?? 0) / 100,
  };
  config.baseDemandLevel = niche.base_demand_index ?? config.baseDemandLevel ?? 1;
  config.ticketSize = niche.ticket_level ?? config.ticketSize ?? "MEDIUM";
  config.competitionType = niche.competition ?? config.competitionType ?? "FRAGMENTED";
  config.decisionProfile = niche.decision_profile ?? legacyEntry?.decisionProfile ?? config.decisionProfile;
  config.upgradeProfile = niche.upgrade_profile ?? legacyEntry?.upgradeProfile ?? config.upgradeProfile;
  config.seasonalityPattern = config.seasonalityPattern ?? {
    monthlyFactors: new Array(12).fill(1),
  };
  return config;
}

function pickLegacyEntry(entries, sectorCode) {
  if (!entries.length) return null;
  const match = entries.find((e) => e.sector?.code === sectorCode);
  return match ?? entries[0];
}

function tierToNumber(tier) {
  if (tier === "T1") return 1;
  if (tier === "T2") return 2;
  if (tier === "T3") return 3;
  return Number(tier) || 1;
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(value) {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeKey(value) {
  return sanitizeText(value).toLowerCase();
}

function sanitizeText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNullableString(value) {
  if (value == null || value === "") return "NULL";
  return sqlString(value);
}

function sqlNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return "NULL";
  const num = Number(value);
  if (Number.isInteger(num)) return `${num}`;
  return num.toFixed(decimals);
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}
