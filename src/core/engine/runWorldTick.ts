// src/core/engine/runWorldTick.ts
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];


import type {
  Company,
  CompanyDecision,
  CompanyDecisionPayload,
  CompanyFinancials,
  CompanyState,
  CompanyProgram,
  CompanyUpgrade,
  NicheUpgrade,
  CompanyEffectModifiers,
  GameEvent,
  Holding,
  HoldingDecision,
  Loan,
  Niche,
  Player,
  Sector,
  WorldEconomyState,
  WorldId,
  WorldRound,
  WorldSectorState,
  // branded primitives come from your domain barrel
  CompanyId,
  HoldingId,
  Year,
  WeekNumber,
  Timestamp,
} from "../domain";

import { supabase } from "../persistence/supabaseClient";

import { worldRepo } from "../persistence/worldRepo";
import { sectorRepo } from "../persistence/sectorRepo";
import { decisionRepo } from "../persistence/decisionRepo";
import { financeRepo } from "../persistence/financeRepo";
import { playerRepo } from "../persistence/playerRepo";
import { programRepo } from "../persistence/programRepo";
import { upgradeRepo } from "../persistence/upgradeRepo";

import { macroEngine } from "./macroEngine";
import { sectorEngine } from "./sectorEngine";
import { companyEngine } from "./companyEngine";
import { financeEngine } from "./financeEngine";
import { eventsEngine } from "./eventsEngine";
import { progressionEngine } from "./progressionEngine";
import { botMarketEngine } from "./botMarketEngine";

type SeasonLike =
  | {
      macroModifiers?: unknown;
      sectorModifiers?: unknown;
      eventProbabilities?: unknown;
    }
  | null;

type RunWorldTickResult = {
  worldRound: WorldRound;
  nextEconomy: WorldEconomyState;

  sectorStates: WorldSectorState[];
  companies: Company[];

  nextStates: Record<string, CompanyState>;
  nextFinancials: Record<string, CompanyFinancials>;

  createdEvents: GameEvent[];
};

type DbWorldRoundRow = {
  id: string;
  world_id: string;
  year: number;
  week: number;
  engine_version: string;
  random_seed: string;
  status: string;
  started_at: string;
  finished_at: string | null;
};

type DbHoldingRow = {
  id: string;
  player_id: string;
  world_id: string;
  name: string;
  base_currency: string;
  status: string;
  cash_balance: number;
  total_equity: number;
  total_debt: number;
  prestige_level: number | null;
  created_at: string;
};

type DbCompanyRow = {
  id: string;
  holding_id: string;
  world_id: string;
  sector_id: string;
  niche_id: string;
  name: string;
  region: string;
  founded_year: number;
  status: string;
  created_at: string;
};

type DbEventRow = {
  id: string;
  world_id: string;
  sector_id: string | null;
  company_id: string | null;
  holding_id: string | null;

  scope: string;
  type: string;
  severity: number;
  payload: unknown;

  year: number;
  week: number;
  created_at: string;
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function safeNumber(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

const WEEKS_PER_MONTH = 52 / 12;

function pickRange(seedKey: string, min: unknown, max: unknown, fallback = 0): number {
  const lo = safeNumber(min, NaN);
  const hi = safeNumber(max, NaN);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return fallback;
  if (lo === hi) return lo;
  const rng = mulberry32(fnv1a32(seedKey));
  return lo + (hi - lo) * rng();
}

function pickIntRange(seedKey: string, min: unknown, max: unknown, fallback = 0): number {
  const lo = Math.floor(safeNumber(min, NaN));
  const hi = Math.floor(safeNumber(max, NaN));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return fallback;
  if (lo >= hi) return lo;
  const rng = mulberry32(fnv1a32(seedKey));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function weekIndex(year: number, week: number): number {
  return (year - 1) * 52 + week;
}

function isProgramActive(program: CompanyProgram, year: number, week: number): boolean {
  const start = weekIndex(Number(program.startYear), Number(program.startWeek));
  const current = weekIndex(year, week);
  const duration = Math.max(1, Number(program.durationWeeks ?? 1));
  return current >= start && current < start + duration && program.status === "ACTIVE";
}

function mergeModifiers(target: CompanyEffectModifiers, add?: CompanyEffectModifiers | null) {
  if (!add) return;

  const addDelta = (value?: number) =>
    Number(target.marketingLevelDelta ?? 0) + Number(value ?? 0);

  const addExtra = (value?: number) =>
    Number(target.extraOpex ?? 0) + Number(value ?? 0);

  const mul = (current?: number, value?: number) =>
    Number(current ?? 1) * Number(value ?? 1);

  if (add.marketingLevelDelta != null) target.marketingLevelDelta = addDelta(add.marketingLevelDelta) as any;
  if (add.extraOpex != null) target.extraOpex = addExtra(add.extraOpex) as any;

  if (add.marketingMultiplier != null) target.marketingMultiplier = mul(target.marketingMultiplier, add.marketingMultiplier) as any;
  if (add.reputationMultiplier != null) target.reputationMultiplier = mul(target.reputationMultiplier, add.reputationMultiplier) as any;
  if (add.qualityMultiplier != null) target.qualityMultiplier = mul(target.qualityMultiplier, add.qualityMultiplier) as any;
  if (add.priceLevelMultiplier != null) target.priceLevelMultiplier = mul(target.priceLevelMultiplier, add.priceLevelMultiplier) as any;
  if (add.capacityMultiplier != null) target.capacityMultiplier = mul(target.capacityMultiplier, add.capacityMultiplier) as any;
  if (add.variableCostMultiplier != null) target.variableCostMultiplier = mul(target.variableCostMultiplier, add.variableCostMultiplier) as any;
  if (add.labourCostMultiplier != null) target.labourCostMultiplier = mul(target.labourCostMultiplier, add.labourCostMultiplier) as any;
}

function computeUpgradeCapex(upgrade: NicheUpgrade, startupCost: number, seedKey: string): number {
  const min = (upgrade as any)?.capexPctRange?.min;
  const max = (upgrade as any)?.capexPctRange?.max;
  if (Number.isFinite(startupCost) && startupCost > 0 && min != null && max != null) {
    const pct = pickRange(`${seedKey}:capex`, min, max, min);
    return startupCost * pct;
  }
  return safeNumber((upgrade as any)?.cost, 0);
}

function computeUpgradeOpexWeekly(upgrade: NicheUpgrade, monthlyRevenue: number, seedKey: string): number {
  const min = (upgrade as any)?.opexPctRange?.min;
  const max = (upgrade as any)?.opexPctRange?.max;
  if (!Number.isFinite(monthlyRevenue) || monthlyRevenue <= 0) return 0;
  if (min == null || max == null) return 0;
  const pct = pickRange(`${seedKey}:opex`, min, max, min);
  return (monthlyRevenue * pct) / WEEKS_PER_MONTH;
}

function resolveUpgradeDelayWeeks(upgrade: NicheUpgrade, seedKey: string): number {
  const delay = (upgrade as any)?.delayWeeks;
  if (!delay || delay.min == null || delay.max == null) return 0;
  return pickIntRange(`${seedKey}:delay`, delay.min, delay.max, 0);
}

function applyUpgradeEffect(params: {
  effect: any;
  seedKey: string;
  state?: CompanyState | null;
  financials?: CompanyFinancials | null;
  modifiers: CompanyEffectModifiers;
}): number {
  const { effect, seedKey, state, financials, modifiers } = params;
  const variable = String(effect?.variable ?? "");
  if (!variable) return 0;
  const op = String(effect?.op ?? "mul");
  const range = Array.isArray(effect?.range) ? effect.range : [];
  const value = pickRange(`${seedKey}:${variable}`, range[0], range[1], 0);
  if (!Number.isFinite(value)) return 0;

  const applyMultiplier = (key: keyof CompanyEffectModifiers, mult: number) => {
    if (!Number.isFinite(mult)) return;
    const current = Number((modifiers as any)[key] ?? 1);
    (modifiers as any)[key] = (current * mult) as any;
  };

  const fixedCosts = safeNumber(state?.fixedCosts, 0);
  const baseOpex = safeNumber(financials?.opex, fixedCosts);
  const baseCapacity = safeNumber(state?.capacity, 0);

  // Approximate catalog effect variables onto engine modifiers.
  switch (variable) {
    case "capacity": {
      if (op === "add" && baseCapacity > 0) {
        applyMultiplier("capacityMultiplier", (baseCapacity + value) / baseCapacity);
      } else if (op === "mul") {
        applyMultiplier("capacityMultiplier", value);
      }
      return 0;
    }
    case "errorRate":
    case "unitCost":
      applyMultiplier("variableCostMultiplier", value);
      return 0;
    case "incidentRate":
    case "insuranceCost":
    case "supportTicketsPerCustomer":
      applyMultiplier("labourCostMultiplier", value);
      return 0;
    case "avgTicket":
      applyMultiplier("priceLevelMultiplier", value);
      return 0;
    case "conversionRate":
    case "baseDemand":
      applyMultiplier("marketingMultiplier", value);
      return 0;
    case "repeatRate":
      applyMultiplier("reputationMultiplier", value);
      return 0;
    case "churnRate": {
      const boost = 1 + (1 - value) * 0.5;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "downtimeRate": {
      const boost = 1 + (1 - value) * 0.5;
      applyMultiplier("capacityMultiplier", boost);
      return 0;
    }
    case "fineChance": {
      const boost = 1 + (1 - value) * 0.1;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "reputation": {
      const boost = op === "add" ? 1 + value / 100 : value;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "fixedCosts": {
      if (op === "mul") {
        return fixedCosts * (value - 1);
      }
      return 0;
    }
    case "opex": {
      if (op === "mul") {
        return baseOpex * (value - 1);
      }
      return 0;
    }
    default:
      return 0;
  }
}

function nowIso(): Timestamp {
  return new Date().toISOString() as unknown as Timestamp;
}

async function listHoldingsByWorld(worldId: WorldId): Promise<Holding[]> {
  const { data, error } = await supabase
    .from("holdings")
    .select(
      "id, player_id, world_id, name, base_currency, status, cash_balance, total_equity, total_debt, prestige_level, created_at"
    )
    .eq("world_id", String(worldId));

  if (error) throw new Error(`Failed to load holdings: ${error.message}`);

  const rows = (data ?? []) as DbHoldingRow[];
  return rows
    .filter((r) => !!r.id)
    .map(
      (r) =>
        ({
          id: r.id as unknown as HoldingId,
          playerId: r.player_id as unknown as Holding["playerId"],
          worldId: r.world_id as unknown as WorldId,
          name: r.name,
          baseCurrency: r.base_currency as unknown as Holding["baseCurrency"],
          status: r.status as Holding["status"],
          cashBalance: r.cash_balance as unknown as Holding["cashBalance"],
          totalEquity: r.total_equity as unknown as Holding["totalEquity"],
          totalDebt: r.total_debt as unknown as Holding["totalDebt"],
          prestigeLevel: r.prestige_level ?? 0,
          createdAt: r.created_at as unknown as Timestamp,
        }) as Holding
    );
}

async function listCompaniesByWorld(worldId: WorldId): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, holding_id, world_id, sector_id, niche_id, name, region, founded_year, status, created_at")
    .eq("world_id", String(worldId));

  if (error) throw new Error(`Failed to load companies: ${error.message}`);

  const rows = (data ?? []) as DbCompanyRow[];
  return rows
    .filter((r) => !!r.id && !!r.holding_id)
    .map(
      (r) =>
        ({
          id: r.id as unknown as CompanyId,
          holdingId: r.holding_id as unknown as HoldingId,
          worldId: r.world_id as unknown as WorldId,
          sectorId: r.sector_id as unknown as Company["sectorId"],
          nicheId: r.niche_id as unknown as Company["nicheId"],
          name: r.name,
          region: r.region as unknown as Company["region"],
          foundedYear: r.founded_year as unknown as Year,
          status: r.status as Company["status"],
          createdAt: r.created_at as unknown as Timestamp,
        }) as Company
    );
}

async function insertWorldRound(params: {
  worldId: WorldId;
  year: number;
  week: number;
  engineVersion: string;
  seed: string;
}): Promise<WorldRound> {
  const startedAt = new Date().toISOString();

  // ✅ insert always array
  // ✅ select includes all fields expected by DbWorldRoundRow
  const { data, error } = await supabase
    .from("world_rounds")
    .insert([
      {
        world_id: String(params.worldId),
        year: params.year,
        week: params.week,
        engine_version: params.engineVersion,
        random_seed: params.seed,
        status: "RUNNING",
        started_at: startedAt,
      },
    ])
    .select("id, world_id, year, week, engine_version, random_seed, status, started_at, finished_at")
    .single();

  if (error) throw new Error(`Failed to insert world_rounds: ${error.message}`);
  if (!data) throw new Error("Failed to insert world_rounds: no row returned");

  const row = data as DbWorldRoundRow;

  return {
    id: row.id as unknown as WorldRound["id"],
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    status: row.status as WorldRound["status"],
    startedAt: row.started_at as unknown as Timestamp,
  };
}

async function getWorldRoundForWeek(
  worldId: WorldId,
  year: number,
  week: number
): Promise<WorldRound | null> {
  const { data, error } = await supabase
    .from("world_rounds")
    .select("id, world_id, year, week, status, started_at, finished_at")
    .eq("world_id", String(worldId))
    .eq("year", year)
    .eq("week", week)
    .maybeSingle();

  if (error) throw new Error(`Failed to load world_rounds: ${error.message}`);
  if (!data) return null;

  const row = data as DbWorldRoundRow;

  return {
    id: row.id as unknown as WorldRound["id"],
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    status: row.status as WorldRound["status"],
    startedAt: row.started_at as unknown as Timestamp,
    finishedAt: row.finished_at ? (row.finished_at as unknown as Timestamp) : undefined,
  };
}

async function markWorldRoundRunning(roundId: WorldRound["id"]): Promise<void> {
  const { error } = await supabase
    .from("world_rounds")
    .update({ status: "RUNNING", finished_at: null })
    .eq("id", String(roundId));

  if (error) throw new Error(`Failed to update world_rounds: ${error.message}`);
}

async function finishWorldRound(roundId: WorldRound["id"]): Promise<void> {
  const { error } = await supabase
    .from("world_rounds")
    .update({ status: "COMPLETED", finished_at: new Date().toISOString() })
    .eq("id", String(roundId));

  if (error) throw new Error(`Failed to finalize world_rounds: ${error.message}`);
}

async function upsertCompanyStates(worldId: WorldId, states: CompanyState[]): Promise<void> {
  if (states.length === 0) return;

  const rows = states.map((s) => ({
    world_id: String(worldId),
    company_id: String(s.companyId),
    year: Number(s.year),
    week: Number(s.week),
    price_level: s.priceLevel,
    capacity: s.capacity,
    quality_score: s.qualityScore,
    marketing_level: s.marketingLevel,
    employees: s.employees,
    fixed_costs: s.fixedCosts,
    variable_cost_per_unit: s.variableCostPerUnit,
    // DB column is brand_score (legacy), domain is reputationScore
    brand_score: s.reputationScore,
    utilisation_rate: s.utilisationRate,
  }));

  const { error } = await supabase.from("company_state").upsert(rows, { onConflict: "company_id,year,week" });
  if (error) throw new Error(`Failed to upsert company_state: ${error.message}`);
}

async function upsertCompanyFinancials(worldId: WorldId, fin: CompanyFinancials[]): Promise<void> {
  if (fin.length === 0) return;

  const rows = fin.map((f) => ({
    world_id: String(worldId),
    company_id: String((f as unknown as { companyId: CompanyId }).companyId),
    year: Number((f as unknown as { year: Year }).year),
    week: Number((f as unknown as { week: WeekNumber }).week),
    revenue: (f as any).revenue,
    cogs: (f as any).cogs,
    opex: (f as any).opex,
    interest_cost: (f as any).interestCost,
    tax_expense: (f as any).taxExpense,
    net_profit: (f as any).netProfit,
    cash_change: (f as any).cashChange,
    assets: (f as any).assets,
    liabilities: (f as any).liabilities,
    equity: (f as any).equity,
  }));

  const { error } = await supabase.from("company_financials").upsert(rows, { onConflict: "company_id,year,week" });
  if (error) throw new Error(`Failed to upsert company_financials: ${error.message}`);
}

async function insertEvents(events: unknown[]): Promise<GameEvent[]> {
  if (events.length === 0) return [];

  const payloadRows = events.map((e) => {
    const ev = e as {
      worldId: string;
      sectorId?: string | null;
      companyId?: string | null;
      holdingId?: string | null;
      scope: string;
      type: string;
      severity: number;
      payload: unknown;
      year: number;
      week: number;
    };

    return {
      world_id: ev.worldId,
      sector_id: ev.sectorId ?? null,
      company_id: ev.companyId ?? null,
      holding_id: ev.holdingId ?? null,
      scope: ev.scope,
      type: ev.type,
      severity: ev.severity,
      payload: (ev.payload ?? {}) as Json,
      year: ev.year,
      week: ev.week,
    };
  });

  // ✅ bulk insert -> allowed to .select()
  const { data, error } = await supabase
    .from("events")
    .insert(payloadRows)
    .select("id, world_id, sector_id, company_id, holding_id, scope, type, severity, payload, year, week, created_at");

  if (error) throw new Error(`Failed to insert events: ${error.message}`);

  const rows = (data ?? []) as DbEventRow[];
  return rows.map(
    (r) =>
      ({
        id: r.id,
        worldId: r.world_id,
        sectorId: r.sector_id,
        companyId: r.company_id,
        holdingId: r.holding_id,
        scope: r.scope,
        type: r.type,
        severity: r.severity,
        payload: r.payload,
        year: r.year,
        week: r.week,
        createdAt: r.created_at,
      }) as unknown as GameEvent
  );
}

async function deleteEventsForWeek(worldId: WorldId, year: number, week: number): Promise<void> {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("world_id", String(worldId))
    .eq("year", year)
    .eq("week", week);

  if (error) throw new Error(`Failed to delete events: ${error.message}`);
}

async function getLatestCompanyState(companyId: CompanyId): Promise<CompanyState | null> {
  const rows = await supabase
    .from("company_state")
    .select(
      // ✅ include created_at because CompanyState requires it
      "company_id, world_id, year, week, price_level, capacity, quality_score, marketing_level, employees, fixed_costs, variable_cost_per_unit, brand_score, utilisation_rate, created_at"
    )
    .eq("company_id", String(companyId))
    .order("year", { ascending: false })
    .order("week", { ascending: false })
    .limit(1);

  if (rows.error) throw new Error(`Failed to load company_state: ${rows.error.message}`);

  const row = (rows.data?.[0] ?? null) as
    | {
        company_id: string;
        world_id: string;
        year: number;
        week: number;
        price_level: number;
        capacity: number;
        quality_score: number;
        marketing_level: number;
        employees: number;
        fixed_costs: number;
        variable_cost_per_unit: number;
        brand_score: number;
        utilisation_rate: number;
        created_at: string;
      }
    | null;

  if (!row) return null;

  return {
    id: "db",
    companyId: row.company_id as unknown as CompanyId,
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    priceLevel: row.price_level as any,
    capacity: row.capacity as any,
    qualityScore: row.quality_score as any,
    marketingLevel: row.marketing_level as any,
    employees: row.employees,
    fixedCosts: row.fixed_costs as any,
    variableCostPerUnit: row.variable_cost_per_unit as any,
    reputationScore: row.brand_score as any, // DB brand_score -> domain reputationScore
    utilisationRate: row.utilisation_rate as any,
    createdAt: row.created_at as unknown as Timestamp,
  } as CompanyState;
}

async function getCompanyDecisionsForWeek(
  worldId: WorldId,
  companyId: CompanyId,
  year: number,
  week: number,
  createdBefore?: Timestamp
) {
  return decisionRepo.listCompanyDecisionsForWeek({
    worldId,
    companyId,
    year,
    week,
    createdBefore,
  });
}

async function getHoldingDecisionsForWeek(
  worldId: WorldId,
  holdingId: HoldingId,
  year: number,
  week: number,
  createdBefore?: Timestamp
): Promise<HoldingDecision[]> {
  return decisionRepo.listHoldingDecisionsForWeek({
    worldId,
    holdingId,
    year,
    week,
    createdBefore,
  });
}

export async function runWorldTick(worldId: WorldId): Promise<void> {
  const lockedEconomy = await worldRepo.tryLockEconomyTick(worldId);
  if (!lockedEconomy) {
    const existingEconomy = await worldRepo.getEconomyState(worldId);
    if (!existingEconomy) throw new Error(`World economy state missing for worldId=${String(worldId)}`);
    return;
  }
  const tickStartAt = lockedEconomy.lastTickStartedAt ?? nowIso();

  try {
    await runWorldTickInternal(worldId, lockedEconomy, tickStartAt);
  } finally {
    await worldRepo.unlockEconomyTick(worldId);
  }
}

async function runWorldTickInternal(
  worldId: WorldId,
  economy: WorldEconomyState,
  tickStartAt: Timestamp
): Promise<RunWorldTickResult> {
  // 1) Load world + economy
  const world = await worldRepo.getById(worldId);
  if (!world) throw new Error(`World not found: ${String(worldId)}`);

  const yearNum = Number((economy as unknown as { currentYear: number }).currentYear);
  const weekNum = Number((economy as unknown as { currentWeek: number }).currentWeek);

  const year = yearNum as unknown as Year;
  const week = weekNum as unknown as WeekNumber;

  const season: SeasonLike = null;

  // deterministic seed
  const seedStr = `${String(worldId)}:${yearNum}:${weekNum}`;
  const rng = mulberry32(fnv1a32(seedStr));

  // 2) Create or reuse world round
  const existingRound = await getWorldRoundForWeek(worldId, yearNum, weekNum);
  let worldRound = existingRound;

  if (worldRound) {
    if (worldRound.status !== "RUNNING") {
      await markWorldRoundRunning(worldRound.id);
      worldRound = { ...worldRound, status: "RUNNING" as WorldRound["status"], finishedAt: undefined };
    }
  } else {
    worldRound = await insertWorldRound({
      worldId,
      year: yearNum,
      week: weekNum,
      engineVersion: "engine-v1",
      seed: seedStr,
    });
  }

  // 3) Load holdings + companies
  const holdings = await listHoldingsByWorld(worldId);
  const companies = await listCompaniesByWorld(worldId);

  const holdingById: Record<string, Holding> = {};
  for (const holding of holdings) {
    if (!holding.id) continue;
    holdingById[String(holding.id)] = holding;
  }

  const companyById: Record<string, Company> = {};
  for (const company of companies) {
    if (!company.id) continue;
    companyById[String(company.id)] = company;
  }

  // 4) Load sectors + niches
  const sectors = await sectorRepo.listSectors();
  const allNiches = await sectorRepo.listAllNiches();

  const nicheById: Record<string, Niche> = {};
  for (const n of allNiches) {
    const id = String((n as unknown as { id: string }).id);
    if (id) nicheById[id] = n;
  }

  // 5) Load world sector states
  const prevWorldSectorStates = await sectorRepo.listWorldSectorStates(worldId);
  const prevSectorStateBySectorId: Record<string, WorldSectorState | null> = {};
  for (const ss of prevWorldSectorStates) {
    const sectorId = String((ss as unknown as { sectorId: string }).sectorId);
    if (sectorId) prevSectorStateBySectorId[sectorId] = ss;
  }

  // 6) Load latest company states + decisions
  const latestStateByCompanyId: Record<string, CompanyState | null> = {};
  const latestFinancialsByCompanyId: Record<string, CompanyFinancials | null> = {};
  const decisionsByCompanyId: Record<string, CompanyDecision[]> = {};
  const decisionsByHoldingId: Record<string, HoldingDecision[]> = {};

  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);

    latestStateByCompanyId[cid] = await getLatestCompanyState(c.id);
    latestFinancialsByCompanyId[cid] = await financeRepo.getLatestCompanyFinancials(c.id);
    decisionsByCompanyId[cid] = await getCompanyDecisionsForWeek(worldId, c.id, yearNum, weekNum, tickStartAt);
  }

  for (const holding of holdings) {
    if (!holding.id) continue;
    const hid = String(holding.id);
    decisionsByHoldingId[hid] = await getHoldingDecisionsForWeek(worldId, holding.id, yearNum, weekNum, tickStartAt);
  }

  const activePrograms = (await programRepo.listByWorld({ worldId, status: "ACTIVE" })).filter((p) =>
    isProgramActive(p, yearNum, weekNum)
  );

  const programsByCompanyId: Record<string, CompanyProgram[]> = {};
  for (const p of activePrograms) {
    const cid = String(p.companyId);
    if (!cid) continue;
    const arr = programsByCompanyId[cid] ?? [];
    arr.push(p);
    programsByCompanyId[cid] = arr;
  }

  const allUpgrades = await upgradeRepo.listAllNicheUpgrades();
  const upgradeById: Record<string, NicheUpgrade> = {};
  for (const u of allUpgrades) {
    upgradeById[String(u.id)] = u;
  }

  const companyUpgrades = await upgradeRepo.listCompanyUpgradesByWorld(worldId);
  const upgradesByCompanyId: Record<string, CompanyUpgrade[]> = {};
  const ownedUpgradeIdsByCompanyId: Record<string, Set<string>> = {};

  for (const cu of companyUpgrades) {
    const cid = String(cu.companyId);
    if (!cid) continue;
    const arr = upgradesByCompanyId[cid] ?? [];
    arr.push(cu);
    upgradesByCompanyId[cid] = arr;

    const set = ownedUpgradeIdsByCompanyId[cid] ?? new Set<string>();
    set.add(String(cu.upgradeId));
    ownedUpgradeIdsByCompanyId[cid] = set;
  }

  const oneTimeOpexByCompanyId: Record<string, number> = {};

  // 7) Apply decisions -> preSimStates (switch on payload.type)
  const preSimStates: Record<string, CompanyState> = {};

  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);

    const prev = latestStateByCompanyId[cid];

    const base: CompanyState =
      prev ??
      ({
        id: "db",
        companyId: c.id,
        worldId,
        year,
        week,
        priceLevel: 1 as any,
        capacity: 100 as any,
        qualityScore: 1 as any,
        marketingLevel: 0 as any,
        employees: 3,
        fixedCosts: 500 as any,
        variableCostPerUnit: 2 as any,
        reputationScore: 0.5 as any,
        utilisationRate: 0 as any,
        createdAt: nowIso(),
      } as CompanyState);

    const decisions = decisionsByCompanyId[cid] ?? [];
    const next: CompanyState = { ...base, createdAt: base.createdAt ?? nowIso() };

    for (const d of decisions) {
      const payload = (d as unknown as { payload: CompanyDecisionPayload }).payload;

      switch (payload.type) {
        case "SET_PRICE":
          next.priceLevel = safeNumber(payload.priceLevel, safeNumber(next.priceLevel, 1)) as any;
          break;

        case "SET_MARKETING":
          next.marketingLevel = safeNumber(payload.marketingLevel, safeNumber(next.marketingLevel, 0)) as any;
          break;

        case "SET_STAFFING":
          next.employees = Math.max(0, Math.floor(safeNumber(payload.targetEmployees, next.employees)));
          break;

        case "INVEST_CAPACITY":
          next.capacity = (safeNumber(next.capacity, 0) + safeNumber(payload.addCapacity, 0)) as any;
          break;

        case "INVEST_QUALITY": {
          const current = safeNumber(next.qualityScore, 1);
          const delta = safeNumber(payload.addQuality, 0);
          const nextQuality = Math.max(0.2, Math.min(3, current + delta));
          next.qualityScore = nextQuality as any;
          break;
        }

        case "START_PROGRAM": {
          const programType = String((payload as any)?.programType ?? "");
          if (!programType) break;

          const durationWeeks = Math.max(1, Math.floor(safeNumber((payload as any)?.durationWeeks, 1)));
          const program = await programRepo.upsertProgram({
            companyId: c.id,
            worldId,
            programType,
            payload,
            startYear: yearNum,
            startWeek: weekNum,
            durationWeeks,
            status: "ACTIVE",
          });

          if (isProgramActive(program, yearNum, weekNum)) {
            const arr = programsByCompanyId[cid] ?? [];
            arr.push(program);
            programsByCompanyId[cid] = arr;
          }
          break;
        }

        case "CANCEL_PROGRAM": {
          const programId = String((payload as any)?.programId ?? "");
          if (!programId) break;
          await programRepo.cancelProgram({ programId });
          const arr = programsByCompanyId[cid] ?? [];
          programsByCompanyId[cid] = arr.filter((p) => String(p.id) !== programId);
          break;
        }

        case "BUY_UPGRADE": {
          const upgradeId = String((payload as any)?.upgradeId ?? "");
          if (!upgradeId) break;

          const owned = ownedUpgradeIdsByCompanyId[cid] ?? new Set<string>();
          if (owned.has(upgradeId)) break;

          const upgrade = upgradeById[upgradeId];
          if (!upgrade) break;

          const inserted = await upgradeRepo.upsertCompanyUpgrade({
            companyId: c.id,
            worldId,
            upgradeId,
            purchasedYear: yearNum,
            purchasedWeek: weekNum,
            status: "ACTIVE",
          });

          const arr = upgradesByCompanyId[cid] ?? [];
          arr.push(inserted);
          upgradesByCompanyId[cid] = arr;

          owned.add(upgradeId);
          ownedUpgradeIdsByCompanyId[cid] = owned;

          const niche = nicheById[String((c as any)?.nicheId ?? "")];
          const startupCost = safeNumber((niche as any)?.startupCostEur, safeNumber((niche as any)?.startup_cost_eur, 0));
          const seedKey = `${cid}:${upgradeId}`;
          const capex = computeUpgradeCapex(upgrade, startupCost, seedKey);
          oneTimeOpexByCompanyId[cid] = (oneTimeOpexByCompanyId[cid] ?? 0) + capex;
          break;
        }

        default:
          break;
      }
    }

    // normalize time
    next.year = year;
    next.week = week;

    preSimStates[cid] = next;
  }

  const modifiersByCompanyId: Record<string, CompanyEffectModifiers> = {};
  const extraOpexByCompanyId: Record<string, number> = { ...oneTimeOpexByCompanyId };

  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);
    const mods: CompanyEffectModifiers = {};

    const activeCompanyPrograms = programsByCompanyId[cid] ?? [];
    for (const p of activeCompanyPrograms) {
      if (!isProgramActive(p, yearNum, weekNum)) continue;
      const payload = (p as any)?.payload ?? {};
      const effects = (payload as any)?.effects ?? null;
      mergeModifiers(mods, effects);

      const weeklyCost = safeNumber((payload as any)?.weeklyCost, safeNumber((effects as any)?.extraOpex, 0));
      if (weeklyCost) {
        extraOpexByCompanyId[cid] = (extraOpexByCompanyId[cid] ?? 0) + weeklyCost;
      }
    }

    const companyUpgradesForCompany = upgradesByCompanyId[cid] ?? [];
    for (const cu of companyUpgradesForCompany) {
      const upgrade = upgradeById[String(cu.upgradeId)];
      if (!upgrade) continue;
      const seedKey = `${cid}:${String(cu.upgradeId)}`;
      const delayWeeks = resolveUpgradeDelayWeeks(upgrade, seedKey);
      const purchaseIdx = weekIndex(Number(cu.purchasedYear), Number(cu.purchasedWeek));
      const effectsActive = weekIndex(yearNum, weekNum) >= purchaseIdx + delayWeeks;
      if (effectsActive) {
        const effectsPayload = upgrade.effects;
        if (Array.isArray(effectsPayload)) {
          for (const effect of effectsPayload) {
            const extraOpexDelta = applyUpgradeEffect({
              effect,
              seedKey,
              state: latestStateByCompanyId[cid],
              financials: latestFinancialsByCompanyId[cid],
              modifiers: mods,
            });
            if (extraOpexDelta) {
              extraOpexByCompanyId[cid] = (extraOpexByCompanyId[cid] ?? 0) + extraOpexDelta;
            }
          }
        } else if (effectsPayload && typeof effectsPayload === "object") {
          mergeModifiers(mods, effectsPayload as any);
          const recurring = safeNumber((effectsPayload as any)?.extraOpex, 0);
          if (recurring) {
            extraOpexByCompanyId[cid] = (extraOpexByCompanyId[cid] ?? 0) + recurring;
          }
        }
      }

      const weeklyRevenue = safeNumber(latestFinancialsByCompanyId[cid]?.revenue, 0);
      const monthlyRevenue = weeklyRevenue * WEEKS_PER_MONTH;
      const recurring = computeUpgradeOpexWeekly(upgrade, monthlyRevenue, seedKey);
      if (recurring) {
        extraOpexByCompanyId[cid] = (extraOpexByCompanyId[cid] ?? 0) + recurring;
      }
    }

    if (Object.keys(mods).length > 0) {
      modifiersByCompanyId[cid] = mods;
    }
  }

  // 8) Macro tick
  const macroTick = macroEngine.tick({ world, economy, season });
  const macroEconomy = macroTick.nextEconomy as WorldEconomyState;

  // 9) Sector tick
  const nextWorldSectorStates: WorldSectorState[] = [];
  const sectorDemandBySectorId: Record<string, number> = {};

  for (const s of sectors) {
    const sid = String((s as unknown as { id: string }).id ?? "");
    if (!sid) continue;

    const sectorNiches = allNiches.filter((n) => String((n as any)?.sectorId ?? "") === sid);

    const prevState = prevSectorStateBySectorId[sid] ?? null;
    const tick = sectorEngine.tick({
      worldId,
      year,
      week,
      economy: macroEconomy,
      season,
      sector: s as Sector,
      niches: sectorNiches as Niche[],
      prevState,
      rng,
    } as unknown as Parameters<typeof sectorEngine.tick>[0]);

    const prevDemand = Number((prevState as any)?.currentDemand ?? 0);
    const demand = Number(tick.demand ?? 0);
    const demandDelta = demand - prevDemand;
    const demandDeltaPct = prevDemand > 0 ? demandDelta / prevDemand : 0;

    (tick.nextState as any).lastRoundMetrics = {
      year,
      week,
      demandDelta,
      demandDeltaPct,
      volatilityShock: tick.volatilityShock,
    };

    nextWorldSectorStates.push(tick.nextState);
    sectorDemandBySectorId[sid] = tick.demand;
  }

  for (const ss of nextWorldSectorStates) {
    await sectorRepo.upsertWorldSectorState(ss);
  }

  const sectorStatesById: Record<string, WorldSectorState | null> = {};
  for (const ss of nextWorldSectorStates) {
    const sid = String((ss as any)?.sectorId ?? "");
    if (!sid) continue;
    sectorStatesById[sid] = ss;
  }

  // 10) Company sim per segment
  const nextStates: Record<string, CompanyState> = {};
  const nextFinancials: Record<string, CompanyFinancials> = {};

  const companiesBySegment = new Map<string, Company[]>();
  for (const c of companies) {
    if (!c.id) continue;

    const sectorId = String((c as any)?.sectorId ?? "");
    const nicheId = String((c as any)?.nicheId ?? "");
    if (!sectorId || !nicheId) continue;

    const key = `${sectorId}|${nicheId}`;
    const arr = companiesBySegment.get(key) ?? [];
    arr.push(c);
    companiesBySegment.set(key, arr);
  }

  for (const [key, segCompanies] of companiesBySegment.entries()) {
    const [sectorId, nicheId] = key.split("|");
    const niche = nicheById[nicheId];
    if (!niche) continue;

    const demand = sectorDemandBySectorId[sectorId] ?? 0;

    const sectorState = sectorStatesById[sectorId] ?? null;
    const botPressure = botMarketEngine.tick({
      worldId,
      year,
      week,
      economy: macroEconomy,
      niche,
      sectorVolatility: Number((sectorState as any)?.volatility ?? 0),
    } as unknown as Parameters<typeof botMarketEngine.tick>[0]);

    const sim = companyEngine.simulate({
      worldId,
      year,
      week,
      economy: macroEconomy,
      season,
      niche,
      companies: segCompanies,
      statesByCompanyId: preSimStates,
      sectorDemand: demand,
      botPressure,
      modifiersByCompanyId,
      extraOpexByCompanyId,
      rng,
    } as unknown as Parameters<typeof companyEngine.simulate>[0]);

    Object.assign(nextStates, sim.nextStates);
    Object.assign(nextFinancials, sim.financials);
  }

  // 10.5) Apply holding decisions (loans + acquisitions)
  for (const holding of holdings) {
    if (!holding.id) continue;
    const hid = String(holding.id);
    const decisions = decisionsByHoldingId[hid] ?? [];

    for (const decision of decisions) {
      const payload = (decision as any)?.payload ?? {};

      switch (payload.type) {
        case "REPAY_HOLDING_LOAN": {
          const loanId = String(payload.loanId ?? "");
          const requested = safeNumber(payload.amount, 0);
          if (!loanId || requested <= 0) break;

          const loan = await financeRepo.getLoanById(loanId as any);
          if (!loan || String(loan.holdingId ?? "") !== hid) break;
          if (String(loan.status ?? "") !== "ACTIVE") break;

          const availableCash = safeNumber(holding.cashBalance, 0);
          if (availableCash <= 0) break;

          const outstanding = safeNumber(loan.outstandingBalance, 0);
          const payment = Math.min(requested, availableCash, outstanding);
          if (payment <= 0) break;

          const newOutstanding = Math.max(0, outstanding - payment);
          const paidOff = newOutstanding <= 0.01;

          await financeRepo.updateLoan(loan.id, {
            outstandingBalance: newOutstanding,
            status: paidOff ? "PAID_OFF" : String(loan.status ?? "ACTIVE"),
            remainingWeeks: paidOff ? 0 : loan.remainingWeeks,
          });

          holding.cashBalance = (availableCash - payment) as any;
          break;
        }

        case "BUY_COMPANY": {
          const companyId = String(payload.companyId ?? "");
          const offerPrice = safeNumber(payload.offerPrice, 0);
          if (!companyId || offerPrice <= 0) break;

          const company = companyById[companyId];
          if (!company) break;
          if (String(company.holdingId) === hid) break;
          if (String(company.status ?? "ACTIVE") !== "ACTIVE") break;

          const buyerCash = safeNumber(holding.cashBalance, 0);
          if (buyerCash < offerPrice) break;

          const sellerId = String(company.holdingId ?? "");
          const seller = holdingById[sellerId];

          holding.cashBalance = (buyerCash - offerPrice) as any;
          if (seller) {
            const sellerCash = safeNumber(seller.cashBalance, 0);
            seller.cashBalance = (sellerCash + offerPrice) as any;
          }

          company.holdingId = holding.id as any;

          const { error } = await supabase
            .from("companies")
            .update({ holding_id: String(holding.id) })
            .eq("id", String(company.id));

          if (error) throw new Error(`Failed to transfer company: ${error.message}`);
          break;
        }

        default:
          break;
      }
    }
  }

  // 11) Finance tick per holding (update prestige_level too)
  const mergedFinancials: Record<string, CompanyFinancials> = { ...nextFinancials };

  for (const holding of holdings) {
    if (!holding.id) continue;
    const hid = holding.id;

    const holdingCompanies = companies.filter((c) => c.holdingId === hid).filter((c) => !!c.id);

    const holdingLoans: Loan[] = await financeRepo.listLoansByHolding(hid);

    const companyLoansNested = await Promise.all(
      holdingCompanies.map((c) => financeRepo.listLoansByCompany(c.id))
    );
    const companyLoans = companyLoansNested.flat();

    const finTick = financeEngine.tick({
      year,
      week,
      economy: macroEconomy,
      holding,
      companies: holdingCompanies,
      companyFinancials: mergedFinancials,
      loans: [...holdingLoans, ...companyLoans],
      rng,
    } as unknown as Parameters<typeof financeEngine.tick>[0]);

    const nextHolding = finTick.nextHolding as Holding;

    for (const nextLoan of finTick.nextLoans ?? []) {
      if (!nextLoan?.id) continue;
      const patch: Partial<{
        outstandingBalance: number;
        remainingWeeks: number;
        status: string;
        interestRate: number;
      }> = {};

      if (Number.isFinite(Number(nextLoan.outstandingBalance))) {
        patch.outstandingBalance = Number(nextLoan.outstandingBalance);
      }
      if (Number.isFinite(Number(nextLoan.remainingWeeks))) {
        patch.remainingWeeks = Number(nextLoan.remainingWeeks);
      }
      if (nextLoan.status) {
        patch.status = String(nextLoan.status);
      }
      if (Number.isFinite(Number(nextLoan.interestRate))) {
        patch.interestRate = Number(nextLoan.interestRate);
      }

      if (Object.keys(patch).length > 0) {
        await financeRepo.updateLoan(nextLoan.id, patch);
      }
    }

    // ✅ include prestige_level, default to existing if undefined
    const prestige = Number.isFinite((nextHolding as any)?.prestigeLevel)
      ? (nextHolding as any).prestigeLevel
      : holding.prestigeLevel ?? 0;

    const { error: holdErr } = await supabase
      .from("holdings")
      .update({
        cash_balance: safeNumber((nextHolding as any)?.cashBalance, safeNumber(holding.cashBalance, 0)),
        total_debt: safeNumber((nextHolding as any)?.totalDebt, safeNumber(holding.totalDebt, 0)),
        total_equity: safeNumber((nextHolding as any)?.totalEquity, safeNumber(holding.totalEquity, 0)),
        prestige_level: prestige,
      })
      .eq("id", String(hid));

    if (holdErr) throw new Error(`Failed to update holding totals: ${holdErr.message}`);

    Object.assign(mergedFinancials, finTick.nextCompanyFinancials);
  }

  // 12) Events generation per holding
  const createdEventInputs: unknown[] = [];

  const companyFinancialsById: Record<string, CompanyFinancials> = {};
  for (const [cid, f] of Object.entries(mergedFinancials)) {
    if (!cid) continue;
    companyFinancialsById[cid] = f;
  }

  for (const holding of holdings) {
    if (!holding.id) continue;

    const holdingCompanies = companies.filter((c) => c.holdingId === holding.id);

    const out = eventsEngine.generate({
      worldId,
      year,
      week,
      economy: macroEconomy,
      season,
      sectors: sectors as Sector[],
      sectorStatesById,
      companies: holdingCompanies,
      companyFinancialsById,
      holding,
      rng,
    } as unknown as Parameters<typeof eventsEngine.generate>[0]);

    for (const e of out.events as unknown[]) createdEventInputs.push(e);
  }

  await deleteEventsForWeek(worldId, yearNum, weekNum);
  const createdEvents = await insertEvents(createdEventInputs);

  // 13) Progression tick per holding/player
  for (const holding of holdings) {
    if (!holding.id) continue;
    const playerId = holding.playerId;
    if (!playerId) continue;

    const player = await playerRepo.getById(playerId as unknown as Player["id"]);
    if (!player) continue;

    const holdingCompanies = companies.filter((c) => c.holdingId === holding.id);

    const finByCompany: Record<string, CompanyFinancials | null> = {};
    for (const c of holdingCompanies) {
      if (!c.id) continue;
      finByCompany[String(c.id)] = mergedFinancials[String(c.id)] ?? null;
    }

    const prog = progressionEngine.tick({
      year,
      week,
      player,
      holding,
      companies: holdingCompanies,
      financialsByCompanyId: finByCompany,
      events: createdEvents,
      rng,
    } as unknown as Parameters<typeof progressionEngine.tick>[0]);

    // keep optional (as you had)
    try {
      await playerRepo.updateReputation(playerId as unknown as Player["id"], {
        brandRepLevel: (prog.nextPlayer as any)?.brandRepLevel,
        brandRepXp: (prog.nextPlayer as any)?.brandRepXp,
        creditRepLevel: (prog.nextPlayer as any)?.creditRepLevel,
        creditRepXp: (prog.nextPlayer as any)?.creditRepXp,
        prestigeLevel: (prog.nextPlayer as any)?.prestigeLevel,
      } as unknown as Parameters<typeof playerRepo.updateReputation>[1]);
    } catch {
      // optional
    }
  }

  // 14) Persist company_state + company_financials
  await upsertCompanyStates(worldId, Object.values(nextStates));
  await upsertCompanyFinancials(worldId, Object.values(mergedFinancials));

  // 15) Advance economy time + persist
  const nextWeekNum = weekNum + 1;
  const nextYearNum = nextWeekNum > 52 ? yearNum + 1 : yearNum;
  const normalizedWeek = nextWeekNum > 52 ? 1 : nextWeekNum;

  const lastTickAt = new Date().toISOString();
  const nextEconomy: WorldEconomyState = {
    ...macroEconomy,
    currentYear: nextYearNum,
    currentWeek: normalizedWeek,
    lastTickAt: lastTickAt as unknown as Timestamp,
  } as WorldEconomyState;

  await worldRepo.updateEconomyState(worldId, {
    currentYear: nextYearNum,
    currentWeek: normalizedWeek,
    baseInterestRate: macroEconomy.baseInterestRate,
    inflationRate: macroEconomy.inflationRate,
    baseWageIndex: macroEconomy.baseWageIndex,
    macroModifiers: macroEconomy.macroModifiers,
    lastTickAt,
  });

  // 16) Mark round complete
  await finishWorldRound(worldRound.id);

  return {
    worldRound,
    nextEconomy,
    sectorStates: nextWorldSectorStates,
    companies,
    nextStates,
    nextFinancials: mergedFinancials,
    createdEvents,
  };
}

