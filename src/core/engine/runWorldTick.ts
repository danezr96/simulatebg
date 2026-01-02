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
  AcquisitionOffer,
  AcquisitionOfferAction,
  NicheProduct,
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
  SetProductPlanDecision,
} from "../domain";

import { asMoney, yearWeekKey } from "../domain";
import { parseCapexRange } from "../../utils/upgradeCost";
import { estimateCompanyLiquidationValue } from "../../utils/valuation";

import { supabase } from "../persistence/supabaseClient";

import { worldRepo } from "../persistence/worldRepo";
import { sectorRepo } from "../persistence/sectorRepo";
import { decisionRepo } from "../persistence/decisionRepo";
import { financeRepo } from "../persistence/financeRepo";
import { playerRepo } from "../persistence/playerRepo";
import { programRepo } from "../persistence/programRepo";
import { upgradeRepo } from "../persistence/upgradeRepo";
import { acquisitionRepo } from "../persistence/acquisitionRepo";
import { botRepo } from "../persistence/botRepo";

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

type ProductPlanStats = {
  avgPrice: number;
  avgCost: number;
  capacityMultiplier: number;
  bufferWeeks: number;
};

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function listNicheProductsByNicheIds(nicheIds: string[]): Promise<NicheProduct[]> {
  if (nicheIds.length === 0) return [];

  const { data, error } = await supabase
    .from("niche_products")
    .select("*")
    .in("niche_id", nicheIds);

  if (error) throw new Error(`Failed to load niche_products: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    nicheId: row.niche_id,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    priceMinEur: safeNumber(row.price_min_eur),
    priceMaxEur: safeNumber(row.price_max_eur),
    cogsPctMin: safeNumber(row.cogs_pct_min),
    cogsPctMax: safeNumber(row.cogs_pct_max),
    capacityDriver: row.capacity_driver,
    notes: row.notes,
  }));
}

function computeProductPlanStats(
  plan: SetProductPlanDecision,
  products: NicheProduct[]
): ProductPlanStats | null {
  if (!plan || !Array.isArray(plan.items) || plan.items.length === 0 || products.length === 0) {
    return null;
  }

  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const items = plan.items.filter((item) => item && productBySku.has(item.sku));
  if (items.length === 0) return null;

  let totalShare = 0;
  for (const item of items) {
    totalShare += Math.max(0, safeNumber(item.volumeShare, 0));
  }
  const weightTotal = totalShare > 0 ? totalShare : items.length;

  let avgPrice = 0;
  let avgCost = 0;
  let avgBuffer = 0;

  for (const item of items) {
    const product = productBySku.get(item.sku);
    if (!product) continue;
    const weight = totalShare > 0 ? Math.max(0, safeNumber(item.volumeShare, 0)) : 1;
    if (weight <= 0) continue;

    const priceMin = safeNumber(product.priceMinEur, 0);
    const priceMax = Math.max(priceMin, safeNumber(product.priceMaxEur, priceMin));
    const baselinePrice = (priceMin + priceMax) / 2 || priceMin;
    const price = clamp(safeNumber(item.priceEur, baselinePrice), priceMin, priceMax);

    const cogsPct = clamp(
      (safeNumber(product.cogsPctMin, 0) + safeNumber(product.cogsPctMax, 0)) / 2,
      0,
      300
    );
    const cost = price * (cogsPct / 100);

    avgPrice += price * weight;
    avgCost += cost * weight;
    avgBuffer += clamp(safeNumber(item.bufferWeeks, 0), 0, 12) * weight;
  }

  avgPrice = avgPrice / weightTotal;
  avgCost = avgCost / weightTotal;
  avgBuffer = avgBuffer / weightTotal;

  const capacityMultiplier = 1 + clamp(avgBuffer, 0, 8) * 0.05;

  return {
    avgPrice,
    avgCost,
    capacityMultiplier,
    bufferWeeks: avgBuffer,
  };
}

function readStartingUnlockedProducts(niche?: Niche | null): string[] {
  const config = (niche as any)?.config ?? {};
  const unlocked = Array.isArray(config?.startingLoadout?.unlockedProducts)
    ? config.startingLoadout.unlockedProducts
    : [];
  return unlocked.map((sku: unknown) => String(sku)).filter(Boolean);
}

const ACQUISITION_OFFER_DEFAULT_EXPIRY_WEEKS = 4;

function addWeeks(year: number, week: number, delta: number): { year: number; week: number } {
  const base = (year - 1) * 52 + week;
  const next = Math.max(1, base + delta);
  const nextYear = Math.floor((next - 1) / 52) + 1;
  const nextWeek = ((next - 1) % 52) + 1;
  return { year: nextYear, week: nextWeek };
}

function isOfferExpired(offer: AcquisitionOffer, year: number, week: number): boolean {
  if (!offer.expiresYear || !offer.expiresWeek) return false;
  return yearWeekKey(offer.expiresYear as any, offer.expiresWeek as any) < yearWeekKey(year as any, week as any);
}

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
  const baseCost = safeNumber((upgrade as any)?.cost, 0);
  if (baseCost > 0) return baseCost;

  const formula = String((upgrade as any)?.capexFormula ?? "");
  const range = parseCapexRange(formula, startupCost);
  if (range) {
    return pickRange(`${seedKey}:capex_formula`, range.min, range.max, range.min);
  }

  return baseCost;
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
  const variable = String(effect?.variable ?? effect?.key ?? "");
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
  const baseQuality = safeNumber(state?.qualityScore, 0);

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
    case "unit_cost":
      applyMultiplier("variableCostMultiplier", value);
      return 0;
    case "returns_rate":
    case "refund_rate":
      applyMultiplier("variableCostMultiplier", value);
      return 0;
    case "incidentRate":
    case "insuranceCost":
    case "supportTicketsPerCustomer":
      applyMultiplier("labourCostMultiplier", value);
      return 0;
    case "avgTicket":
    case "avg_ticket":
    case "price_uplift":
      applyMultiplier("priceLevelMultiplier", value);
      return 0;
    case "conversionRate":
    case "conversion_rate":
    case "baseDemand":
    case "base_demand":
      applyMultiplier("marketingMultiplier", value);
      return 0;
    case "repeatRate":
    case "repeat_rate":
      applyMultiplier("reputationMultiplier", value);
      return 0;
    case "churnRate":
    case "churn_rate": {
      const boost = 1 + (1 - value) * 0.5;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "downtimeRate":
    case "downtime_rate": {
      const boost = 1 + (1 - value) * 0.5;
      applyMultiplier("capacityMultiplier", boost);
      return 0;
    }
    case "fineChance":
    case "fine_chance": {
      const boost = 1 + (1 - value) * 0.1;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "reputation":
    case "reputation_score":
    case "brand_reputation_score": {
      const boost = op === "add" ? 1 + value / 100 : value;
      applyMultiplier("reputationMultiplier", boost);
      return 0;
    }
    case "quality":
    case "quality_score":
    case "service_quality_score": {
      if (op === "add" && baseQuality > 0) {
        applyMultiplier("qualityMultiplier", (baseQuality + value) / baseQuality);
      } else if (op === "mul") {
        applyMultiplier("qualityMultiplier", value);
      }
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getMonthIndexFromWeek(week: number): number {
  const t = (week - 1) / 52;
  return clamp(Math.floor(t * 12), 0, 11);
}

function computeEffectiveCapacity(
  state: CompanyState | null,
  modifiers: CompanyEffectModifiers | null,
  plan?: ProductPlanStats | null
): number {
  if (!state) return 0;
  const mod = modifiers ?? {};
  const planMult = Number.isFinite(Number(plan?.capacityMultiplier))
    ? Number(plan?.capacityMultiplier)
    : 1;
  return (
    Math.max(0, safeNumber(state.capacity, 0)) *
    safeNumber(mod.capacityMultiplier, 1) *
    planMult
  );
}

function readSegmentDemandFromSummary(
  summary: Record<string, unknown> | null | undefined,
  segment: string
): number {
  if (!summary || typeof summary !== "object") return 0;
  const segmentDemand = (summary as any).segmentDemand;
  if (segmentDemand && typeof segmentDemand === "object" && segment in segmentDemand) {
    return safeNumber(segmentDemand[segment], 0);
  }
  switch (segment) {
    case "interior_addon":
      return safeNumber((summary as any).interiorAddOnDemand, 0);
    case "detailing":
      return safeNumber((summary as any).detailingDemand, 0);
    case "fleet":
      return safeNumber((summary as any).fleetDemand, 0);
    default:
      return 0;
  }
}

function resolveOpsModifiers(params: {
  niche: Niche;
  state: CompanyState;
  opsIntensity?: number;
  availability?: number;
}): { modifiers: CompanyEffectModifiers; extraOpex: number } | null {
  const cfg = (params.niche.config as any)?.opsResolution;
  if (!cfg || typeof cfg !== "object") return null;

  const core = (params.niche.config as any)?.coreAssumptions ?? {};
  const operations = (params.niche.config as any)?.operations ?? {};
  const maintenance = (params.niche.config as any)?.maintenance ?? {};

  const staffing = cfg.staffing ?? {};
  const energyModes = cfg.energyModes ?? {};

  const ticksPerWeek = Math.max(1, safeNumber(core.ticksPerWeek, 1008));
  const laneThroughput = Math.max(0.1, safeNumber(operations?.laneThroughputPerTick?.base, 2));
  const capacityPerLaneWeek = laneThroughput * ticksPerWeek;
  const plannedCapacity = Math.max(0, safeNumber(params.state.capacity, 0));
  const laneCount = Math.max(1, plannedCapacity / Math.max(1, capacityPerLaneWeek));

  const laneFtePerLane = Math.max(0.1, safeNumber(staffing.laneFtePerLane, 1));
  const staffNeeded = laneCount * laneFtePerLane;
  const employees = Math.max(0, safeNumber(params.state.employees, 0));
  const staffRatio = staffNeeded > 0 ? employees / staffNeeded : 1;
  const staffFloor = clamp(safeNumber(staffing.staffShortageCapacityFloor, 0.4), 0.1, 1);
  const staffFactor = clamp(staffRatio, staffFloor, 1);

  const availability = params.availability != null ? clamp(params.availability, 0.4, 1.2) : 1;

  const intensity = params.opsIntensity != null ? clamp(params.opsIntensity, 0, 1) : 0.5;
  const energyKey = intensity <= 0.33 ? "eco" : intensity >= 0.75 ? "peak_avoid" : "normal";
  const energy = energyModes[energyKey] ?? {};
  const energyCostMult = safeNumber(energy.energyCostMultiplier, 1);
  const energyThroughputMult = safeNumber(energy.throughputMultiplier, 1);
  const energyQualityMult = safeNumber(energy.qualityMultiplier, 1);

  const qualityScore = safeNumber(params.state.qualityScore, 0.6);
  const qualityNorm = clamp((qualityScore - 0.4) / 0.6, 0, 1);
  let maintenanceLevel = Math.round(qualityNorm * 3);
  if (intensity > 0.75) maintenanceLevel = Math.max(0, maintenanceLevel - 1);

  const levels = Array.isArray(maintenance.levels) ? maintenance.levels : [];
  const levelCfg =
    levels.find((level: any) => Number(level?.level) === maintenanceLevel) ?? levels[0] ?? {};
  const breakdownChancePct = Math.max(0, safeNumber(levelCfg.breakdownChancePct, 0.2));
  const downtimeRange = maintenance.downtimeTicksRange ?? {};
  const avgDowntimeTicks =
    (safeNumber(downtimeRange.min, 2) + safeNumber(downtimeRange.max, 12)) / 2;

  const expectedDowntimeTicks =
    laneCount * ticksPerWeek * (breakdownChancePct / 100) * avgDowntimeTicks;
  const downtimeFactor = clamp(1 - expectedDowntimeTicks / Math.max(1, ticksPerWeek), 0, 1);

  const maintenanceCostPerLaneTick = Math.max(0, safeNumber(levelCfg.costPerLanePerTick, 0));
  const maintenanceCost = maintenanceCostPerLaneTick * laneCount * ticksPerWeek;

  const overstaffBoost = staffRatio > 1 ? Math.min(0.06, (staffRatio - 1) * 0.05) : 0;

  const mods: CompanyEffectModifiers = {
    capacityMultiplier: (staffFactor * availability * energyThroughputMult * downtimeFactor) as any,
    qualityMultiplier: (energyQualityMult * (1 + overstaffBoost)) as any,
    variableCostMultiplier: energyCostMult as any,
  };

  return { modifiers: mods, extraOpex: maintenanceCost };
}

type CarwashZoneState = {
  cars: number;
  incomeIndex: number;
  commuterIndex: number;
  urbanity: number;
  categoryAwareness: number;
  categorySatisfaction: number;
  categoryConvenience: number;
  latentDemand: number;
  addOnRate: number;
  detailingRate: number;
};

type CarwashDemandState = {
  carsTotal: number;
  zones: CarwashZoneState[];
};

function pickWeighted(rng: () => number, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  if (entries.length === 0) return "";
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0) || 1;
  const roll = rng() * total;
  let acc = 0;
  for (const [key, weight] of entries) {
    acc += Math.max(0, weight);
    if (roll <= acc) return key;
  }
  return entries[entries.length - 1][0];
}

function splitCarsAcrossZones(
  rng: () => number,
  total: number,
  zones: number,
  minPerZone: number,
  maxPerZone: number
): number[] {
  const out: number[] = [];
  let remaining = total;
  for (let i = 0; i < zones; i += 1) {
    const zonesLeft = zones - i;
    const minAllowed = Math.max(minPerZone, remaining - (zonesLeft - 1) * maxPerZone);
    const maxAllowed = Math.min(maxPerZone, remaining - (zonesLeft - 1) * minPerZone);
    const value = minAllowed + rng() * Math.max(0, maxAllowed - minAllowed);
    const cars = Math.max(minPerZone, Math.min(maxPerZone, Math.round(value)));
    out.push(cars);
    remaining -= cars;
  }
  return out;
}

function resolveSeasonLabel(monthIndex: number): "winter" | "spring" | "summer" | "autumn" {
  if (monthIndex === 11 || monthIndex <= 1) return "winter";
  if (monthIndex <= 4) return "spring";
  if (monthIndex <= 7) return "summer";
  return "autumn";
}

function resolveCarwashDemand(params: {
  worldId: WorldId;
  year: number;
  week: number;
  niche: Niche;
  companies: Company[];
  preSimStates: Record<string, CompanyState>;
  modifiersByCompanyId: Record<string, CompanyEffectModifiers>;
  productPlansByCompanyId: Record<string, ProductPlanStats>;
  economy: WorldEconomyState;
  prevState: CarwashDemandState | null;
}): { demand: number; nextState: CarwashDemandState; summary: Record<string, unknown> } | null {
  const cfg = (params.niche.config as any)?.demandEngine;
  if (!cfg || typeof cfg !== "object") return null;

  const activeCompanies = Math.max(1, params.companies.length);
  const zoneScaling = cfg.zoneScaling ?? {};
  const zoneCount = clamp(
    Math.round(activeCompanies / Math.max(1, safeNumber(zoneScaling.companiesPerZone, 2))),
    safeNumber(zoneScaling.min, 1),
    safeNumber(zoneScaling.max, 25)
  );

  const seedKey = `${params.worldId}:${params.year}:${params.week}:${String(params.niche.id)}:demand`;
  const rng = mulberry32(fnv1a32(seedKey));

  const regionRanges = Array.isArray(cfg.regionCarsTotalRanges) ? cfg.regionCarsTotalRanges : [];
  const matchedRange =
    regionRanges.find(
      (range: any) =>
        activeCompanies >= safeNumber(range.minCompanies, 0) &&
        activeCompanies <= safeNumber(range.maxCompanies, Number.POSITIVE_INFINITY)
    ) ?? regionRanges[regionRanges.length - 1];

  const carsRange = matchedRange?.carsTotalRange ?? [80_000, 200_000];
  const carsTotal = Math.round(
    params.prevState?.carsTotal ??
      (safeNumber(carsRange[0], 80_000) +
        rng() * Math.max(0, safeNumber(carsRange[1], 200_000) - safeNumber(carsRange[0], 80_000)))
  );

  const zoneCarsRange = cfg.zoneCarsRange ?? { min: 20_000, max: 90_000 };
  const carsByZone =
    params.prevState?.zones?.length === zoneCount
      ? params.prevState.zones.map((zone) => zone.cars)
      : splitCarsAcrossZones(
          rng,
          carsTotal,
          zoneCount,
          safeNumber(zoneCarsRange.min, 20_000),
          safeNumber(zoneCarsRange.max, 90_000)
        );

  const incomeRange = cfg.zoneIncomeIndexRange ?? [0.75, 1.35];
  const commuterRange = cfg.zoneCommuterIndexRange ?? [0.7, 1.45];

  const baseRates = cfg.baseWashesPerCarPerMonth ?? { urban: 0.45, suburban: 0.55, carHeavy: 0.65 };
  const baseRateMin = safeNumber(baseRates.urban, 0.45);
  const baseRateMax = safeNumber(baseRates.carHeavy, 0.65);

  const monthIndex = getMonthIndexFromWeek(params.week);
  const seasonKey = resolveSeasonLabel(monthIndex);
  const seasonMults = cfg.seasonMultipliers ?? {};
  const seasonMultiplier = safeNumber(seasonMults[seasonKey], 1);

  const weatherProfiles = cfg.weatherProfiles ?? {};
  const weatherProfile =
    weatherProfiles[seasonKey] ?? weatherProfiles.default ?? {
      sunny: 0.3,
      cloudy: 0.25,
      light_rain: 0.2,
      heavy_rain: 0.15,
      snow_freezing: 0.1,
    };
  let weatherKey = pickWeighted(rng, weatherProfile);
  if (!weatherKey) weatherKey = "cloudy";

  const saltWeekChance = safeNumber(cfg.saltWeekChance, 0.04);
  const saltWeekMult = safeNumber(cfg.saltWeekMultiplier, 1.35);
  const saltWeekActive = seasonKey === "winter" && rng() < saltWeekChance;

  const weatherMults = cfg.weatherMultipliers ?? {};
  const weatherMultiplier = saltWeekActive
    ? saltWeekMult
    : safeNumber(weatherMults[weatherKey], 1);

  const macroBounds = cfg.macroMultiplierRange ?? { min: 0.85, max: 1.15 };
  const macroIndexRaw = safeNumber(
    (params.economy as any)?.macroModifiers?.demandGlobalFactor,
    1
  );
  const macroMultiplier = clamp(macroIndexRaw, safeNumber(macroBounds.min, 0.85), safeNumber(macroBounds.max, 1.15));

  let totalMarketing = 0;
  let totalQuality = 0;
  let totalCapacity = 0;
  let qualityCount = 0;

  for (const c of params.companies) {
    if (!c.id) continue;
    const cid = String(c.id);
    const state = params.preSimStates[cid];
    if (!state) continue;
    const mod = params.modifiersByCompanyId[cid] ?? {};
    const plan = params.productPlansByCompanyId[cid] ?? null;

    const marketing = safeNumber(state.marketingLevel, 0);
    const marketingApplied =
      (marketing + safeNumber(mod.marketingLevelDelta, 0)) * safeNumber(mod.marketingMultiplier, 1);
    totalMarketing += Math.max(0, marketingApplied);

    const quality = safeNumber(state.qualityScore, 0.6) * safeNumber(mod.qualityMultiplier, 1);
    totalQuality += quality;
    qualityCount += 1;

    totalCapacity += computeEffectiveCapacity(state, mod, plan);
  }

  const avgQuality = qualityCount > 0 ? totalQuality / qualityCount : 0.6;
  const avgQualityPct = clamp(avgQuality / 1.2, 0, 1) * 100;
  const marketingPerZone = totalMarketing / Math.max(1, zoneCount);
  const capacityPerZone = totalCapacity / Math.max(1, zoneCount);

  const captureCfg = cfg.captureRatio ?? { min: 0.35, max: 0.85, base: 0.45, convWeight: 0.2, awWeight: 0.2 };
  const growthCfg = cfg.categoryGrowth ?? { min: 1, max: 1.6, targetCapMultiplier: 2.2 };
  const latentCfg = cfg.latentDemand ?? {
    carryoverRates: { sunny: 0.35, cloudy: 0.25, light_rain: 0.2, heavy_rain: 0.1, snow_freezing: 0.15 },
  };

  const segmentShares = cfg.segmentShares ?? {
    budget: 0.3,
    standard: 0.35,
    premium: 0.2,
    ultimate: 0.1,
    noise: 0.05,
  };
  const incomeShift = cfg.incomeShift ?? { lowIndex: 0.8, highIndex: 1.2 };

  const addOnRange = cfg.addOnRateRange ?? { min: 0.08, max: 0.16 };
  const detailingRange = cfg.detailingRateRange ?? { min: 0.002, max: 0.01 };

  let totalDemand = 0;
  let totalCapturable = 0;
  let totalLatent = 0;
  let totalFleet = 0;
  let totalDetailing = 0;
  let totalInteriorAddOn = 0;
  const segmentTotals = { budget: 0, standard: 0, premium: 0, ultimate: 0 };

  const nextZones: CarwashZoneState[] = [];

  for (let i = 0; i < zoneCount; i += 1) {
    const prevZone = params.prevState?.zones?.[i];
    const cars = carsByZone[i] ?? safeNumber(zoneCarsRange.min, 20_000);
    const incomeIndex = prevZone?.incomeIndex ?? lerp(safeNumber(incomeRange[0], 0.75), safeNumber(incomeRange[1], 1.35), rng());
    const commuterIndex =
      prevZone?.commuterIndex ?? lerp(safeNumber(commuterRange[0], 0.7), safeNumber(commuterRange[1], 1.45), rng());
    const urbanity =
      prevZone?.urbanity ??
      clamp((commuterIndex - safeNumber(commuterRange[0], 0.7)) / Math.max(0.1, safeNumber(commuterRange[1], 1.45) - safeNumber(commuterRange[0], 0.7)), 0, 1);

    const prevAwareness = safeNumber(prevZone?.categoryAwareness, 35);
    const prevSatisfaction = safeNumber(prevZone?.categorySatisfaction, 55);
    const prevConvenience = safeNumber(prevZone?.categoryConvenience, 40);
    const prevLatent = safeNumber(prevZone?.latentDemand, 0);

    const awarenessDelta = 0.06 * Math.log(1 + marketingPerZone / 40) - 0.02;
    const awareness = clamp(prevAwareness + awarenessDelta, 0, 100);
    const satisfaction = clamp(lerp(prevSatisfaction, avgQualityPct, 0.1), 0, 100);

    const baseRate = baseRateMin + (1 - urbanity) * (baseRateMax - baseRateMin);
    const growthMultiplier = clamp(
      1 +
        0.25 * (awareness / 100) +
        0.2 * (prevConvenience / 100) +
        0.15 * (satisfaction / 100),
      safeNumber(growthCfg.min, 1),
      safeNumber(growthCfg.max, 1.6)
    );

    const monthlyTAM =
      cars * baseRate * seasonMultiplier * weatherMultiplier * macroMultiplier * growthMultiplier;
    const weeklyTAM = (monthlyTAM / 30) * 7;
    const stochastic = clamp(0.85 + rng() * 0.3, 0.6, 1.4);
    const tamWeek = Math.max(0, weeklyTAM * stochastic);

    const targetCap = tamWeek * safeNumber(growthCfg.targetCapMultiplier, 2.2);
    const convenience = clamp(
      100 * (1 - Math.exp(-capacityPerZone / Math.max(1, targetCap))),
      0,
      100
    );

    const capture = clamp(
      safeNumber(captureCfg.base, 0.45) +
        safeNumber(captureCfg.convWeight, 0.2) * (convenience / 100) +
        safeNumber(captureCfg.awWeight, 0.2) * (awareness / 100),
      safeNumber(captureCfg.min, 0.35),
      safeNumber(captureCfg.max, 0.85)
    );

    const capturable = tamWeek * capture;
    const available = capturable + prevLatent;
    const unserved = Math.max(0, available - capacityPerZone);

    const carryRate =
      safeNumber(latentCfg.carryoverRates?.[weatherKey], 0.25);
    const latentDemand = unserved * carryRate;

    const lowIndex = safeNumber(incomeShift.lowIndex, 0.8);
    const highIndex = safeNumber(incomeShift.highIndex, 1.2);
    const t = clamp((incomeIndex - lowIndex) / Math.max(0.01, highIndex - lowIndex), 0, 1);
    const budgetMult = lerp(1.1, 0.9, t);
    const premiumMult = lerp(0.8, 1.25, t);
    const ultimateMult = lerp(0.8, 1.25, t);

    const baseBudget = safeNumber(segmentShares.budget, 0.3) * budgetMult;
    const basePremium = safeNumber(segmentShares.premium, 0.2) * premiumMult;
    const baseUltimate = safeNumber(segmentShares.ultimate, 0.1) * ultimateMult;
    const baseStandard = safeNumber(segmentShares.standard, 0.35) + safeNumber(segmentShares.noise, 0.05);
    const sumShares = baseBudget + baseStandard + basePremium + baseUltimate || 1;

    const budgetShare = baseBudget / sumShares;
    const standardShare = baseStandard / sumShares;
    const premiumShare = basePremium / sumShares;
    const ultimateShare = baseUltimate / sumShares;

    segmentTotals.budget += available * budgetShare;
    segmentTotals.standard += available * standardShare;
    segmentTotals.premium += available * premiumShare;
    segmentTotals.ultimate += available * ultimateShare;

    const addOnRate = prevZone?.addOnRate ?? lerp(safeNumber(addOnRange.min, 0.08), safeNumber(addOnRange.max, 0.16), rng());
    const detailingRate =
      prevZone?.detailingRate ?? lerp(safeNumber(detailingRange.min, 0.002), safeNumber(detailingRange.max, 0.01), rng());

    const interiorAddOnBase = available * (standardShare + premiumShare + ultimateShare);
    const interiorAddOnDemand = interiorAddOnBase * addOnRate;
    const detailingDemand = available * detailingRate;

    const fleetShareMax = safeNumber(cfg.fleetShareMax, 0.15);
    const fleetShare = clamp(
      ((commuterIndex - safeNumber(commuterRange[0], 0.7)) /
        Math.max(0.01, safeNumber(commuterRange[1], 1.45) - safeNumber(commuterRange[0], 0.7))) *
        fleetShareMax,
      0,
      fleetShareMax
    );
    const fleetDemand = available * fleetShare;

    totalDemand += available;
    totalCapturable += capturable;
    totalLatent += latentDemand;
    totalFleet += fleetDemand;
    totalDetailing += detailingDemand;
    totalInteriorAddOn += interiorAddOnDemand;

    nextZones.push({
      cars,
      incomeIndex,
      commuterIndex,
      urbanity,
      categoryAwareness: awareness,
      categorySatisfaction: satisfaction,
      categoryConvenience: convenience,
      latentDemand,
      addOnRate,
      detailingRate,
    });
  }

  const nextState: CarwashDemandState = {
    carsTotal,
    zones: nextZones,
  };

  const summary = {
    totalDemand,
    totalCapturable,
    totalLatent,
    zoneCount,
    season: seasonKey,
    weather: weatherKey,
    saltWeekActive,
    avgAddOnRate: zoneCount > 0 ? totalInteriorAddOn / Math.max(1, (segmentTotals.standard + segmentTotals.premium + segmentTotals.ultimate)) : 0,
    avgDetailingRate: zoneCount > 0 ? totalDetailing / Math.max(1, totalDemand) : 0,
    avgFleetShare: zoneCount > 0 ? totalFleet / Math.max(1, totalDemand) : 0,
    segmentDemand: segmentTotals,
    interiorAddOnDemand: totalInteriorAddOn,
    detailingDemand: totalDetailing,
    fleetDemand: totalFleet,
  };

  return { demand: totalDemand, nextState, summary };
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
    awareness_score: (s as any).awarenessScore ?? 20,
    employees: s.employees,
    fixed_costs: s.fixedCosts,
    variable_cost_per_unit: s.variableCostPerUnit,
    // DB column is brand_score (legacy), domain is reputationScore
    brand_score: s.reputationScore,
    operational_efficiency_score: (s as any).operationalEfficiencyScore ?? 50,
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
      "company_id, world_id, year, week, price_level, capacity, quality_score, marketing_level, awareness_score, employees, fixed_costs, variable_cost_per_unit, brand_score, operational_efficiency_score, utilisation_rate, created_at"
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
        awareness_score: number;
        employees: number;
        fixed_costs: number;
        variable_cost_per_unit: number;
        brand_score: number;
        operational_efficiency_score: number;
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
    awarenessScore: (row.awareness_score ?? 20) as any,
    employees: row.employees,
    fixedCosts: row.fixed_costs as any,
    variableCostPerUnit: row.variable_cost_per_unit as any,
    reputationScore: row.brand_score as any, // DB brand_score -> domain reputationScore
    operationalEfficiencyScore: (row.operational_efficiency_score ?? 50) as any,
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

  const bots = await botRepo.listByWorld(worldId);
  const botHoldingIds = new Set(bots.map((bot) => String(bot.holdingId)));

  // 4) Load sectors + niches
  const sectors = await sectorRepo.listSectors();
  const allNiches = await sectorRepo.listAllNiches();

  const nicheById: Record<string, Niche> = {};
  for (const n of allNiches) {
    const id = String((n as unknown as { id: string }).id);
    if (id) nicheById[id] = n;
  }

  const nicheIds = Object.keys(nicheById);
  const nicheProducts = await listNicheProductsByNicheIds(nicheIds);
  const nicheProductsByNicheId = new Map<string, NicheProduct[]>();
  for (const product of nicheProducts) {
    const list = nicheProductsByNicheId.get(String(product.nicheId)) ?? [];
    list.push(product);
    nicheProductsByNicheId.set(String(product.nicheId), list);
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

  const acquisitionOffersById: Record<string, AcquisitionOffer> = {};
  const acquisitionOffersByCompanyId: Record<string, AcquisitionOffer[]> = {};
  const openAcquisitionOffers = await acquisitionRepo.listOpenByWorld(worldId);

  for (const offer of openAcquisitionOffers) {
    if (isOfferExpired(offer, yearNum, weekNum)) {
      await acquisitionRepo.updateOffer(offer.id, {
        status: "EXPIRED",
        turn: "NONE",
        lastAction: offer.lastAction,
      });
      continue;
    }
    acquisitionOffersById[String(offer.id)] = offer;
    const list = acquisitionOffersByCompanyId[String(offer.companyId)] ?? [];
    list.push(offer);
    acquisitionOffersByCompanyId[String(offer.companyId)] = list;
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

  const unlockedProductsByCompanyId: Record<string, Set<string>> = {};
  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);
    const niche = nicheById[String((c as any)?.nicheId ?? "")];
    const unlocked = new Set<string>(readStartingUnlockedProducts(niche));

    const companyUpgradesForCompany = upgradesByCompanyId[cid] ?? [];
    for (const cu of companyUpgradesForCompany) {
      const upgradeId = String(cu.upgradeId);
      const upgrade = upgradeById[upgradeId];
      if (!upgrade) continue;

      const seedKey = `${cid}:${upgradeId}`;
      const delayWeeks = resolveUpgradeDelayWeeks(upgrade, seedKey);
      const purchaseIdx = weekIndex(Number(cu.purchasedYear), Number(cu.purchasedWeek));
      const effectsActive = weekIndex(yearNum, weekNum) >= purchaseIdx + delayWeeks;
      if (!effectsActive) continue;

      const effects = Array.isArray((upgrade as any)?.effects) ? (upgrade as any).effects : [];
      for (const effect of effects) {
        if (String(effect?.key ?? "") !== "unlock_products") continue;
        const value = effect?.value;
        if (!Array.isArray(value)) continue;
        value.forEach((sku: unknown) => unlocked.add(String(sku)));
      }
    }

    unlockedProductsByCompanyId[cid] = unlocked;
  }

  const oneTimeOpexByCompanyId: Record<string, number> = {};
  const opsIntensityByCompanyId: Record<string, number> = {};
  const availabilityByCompanyId: Record<string, number> = {};

  // 7) Apply decisions -> preSimStates (switch on payload.type)
  const preSimStates: Record<string, CompanyState> = {};
  const productPlanByCompanyId: Record<string, SetProductPlanDecision | null> = {};

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
        awarenessScore: 20 as any,
        employees: 3,
        fixedCosts: 500 as any,
        variableCostPerUnit: 2 as any,
        reputationScore: 0.5 as any,
        operationalEfficiencyScore: 50 as any,
        utilisationRate: 0 as any,
        createdAt: nowIso(),
      } as CompanyState);

    const decisions = decisionsByCompanyId[cid] ?? [];
    const next: CompanyState = { ...base, createdAt: base.createdAt ?? nowIso() };

    for (const d of decisions) {
      const payload = (d as unknown as { payload: CompanyDecisionPayload }).payload;

        switch (payload.type) {
          case "SET_PRODUCT_PLAN": {
            if (payload && Array.isArray(payload.items)) {
              productPlanByCompanyId[cid] = payload as SetProductPlanDecision;
            }
            break;
          }
          case "SET_PRICE":
            next.priceLevel = safeNumber(payload.priceLevel, safeNumber(next.priceLevel, 1)) as any;
            break;

        case "SET_MARKETING":
          next.marketingLevel = safeNumber(payload.marketingLevel, safeNumber(next.marketingLevel, 0)) as any;
          break;

        case "SET_STAFFING":
          next.employees = Math.max(0, Math.floor(safeNumber(payload.targetEmployees, next.employees)));
          break;

        case "SET_OPERATIONS_INTENSITY":
          opsIntensityByCompanyId[cid] = clamp(safeNumber((payload as any)?.intensity, 0.5), 0, 1);
          break;

        case "ADJUST_OPENING_HOURS":
          availabilityByCompanyId[cid] = clamp(safeNumber((payload as any)?.availability, 1), 0.1, 1.2);
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

  const productPlanStatsByCompanyId: Record<string, ProductPlanStats> = {};

  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);
    const plan = productPlanByCompanyId[cid];
    if (!plan) continue;
    const nicheId = String((c as any)?.nicheId ?? "");
    if (!nicheId) continue;
      const allProducts = nicheProductsByNicheId.get(nicheId) ?? [];
      const unlocked = unlockedProductsByCompanyId[cid];
      const products =
        unlocked && unlocked.size > 0
          ? allProducts.filter((product) => unlocked.has(product.sku))
          : allProducts.slice(0, 1);
      const stats = computeProductPlanStats(plan, products);
    if (stats) {
      productPlanStatsByCompanyId[cid] = stats;
    }
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

  for (const c of companies) {
    if (!c.id) continue;
    const cid = String(c.id);
    const niche = nicheById[String((c as any)?.nicheId ?? "")];
    if (!niche) continue;
    const state = preSimStates[cid];
    if (!state) continue;

    const ops = resolveOpsModifiers({
      niche,
      state,
      opsIntensity: opsIntensityByCompanyId[cid],
      availability: availabilityByCompanyId[cid],
    });
    if (!ops) continue;

    const mods = modifiersByCompanyId[cid] ?? {};
    mods.capacityMultiplier =
      (safeNumber(mods.capacityMultiplier, 1) *
        safeNumber(ops.modifiers.capacityMultiplier, 1)) as any;
    mods.qualityMultiplier =
      (safeNumber(mods.qualityMultiplier, 1) *
        safeNumber(ops.modifiers.qualityMultiplier, 1)) as any;
    mods.variableCostMultiplier =
      (safeNumber(mods.variableCostMultiplier, 1) *
        safeNumber(ops.modifiers.variableCostMultiplier, 1)) as any;
    modifiersByCompanyId[cid] = mods;

    if (ops.extraOpex) {
      extraOpexByCompanyId[cid] = (extraOpexByCompanyId[cid] ?? 0) + ops.extraOpex;
    }
  }

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

  const segmentDemandByKey: Record<string, number> = {};
  const marketAllocationByKey: Record<string, any> = {};
  const nicheDemandStateBySectorId: Record<string, Record<string, CarwashDemandState>> = {};
  const nicheDemandSummaryBySectorId: Record<string, Record<string, unknown>> = {};
  const nicheRefPricesBySectorId: Record<string, Record<string, Record<string, number>>> = {};

  for (const [key, segCompanies] of companiesBySegment.entries()) {
    const [sectorId, nicheId] = key.split("|");
    const niche = nicheById[nicheId];
    if (!niche) continue;

    const prevSectorState = prevSectorStateBySectorId[sectorId] ?? null;
    const prevMetrics = ((prevSectorState as any)?.lastRoundMetrics ?? {}) as any;
    const prevNicheState =
      (prevMetrics.nicheDemandState && prevMetrics.nicheDemandState[nicheId]) ?? null;

    const demandResult = resolveCarwashDemand({
      worldId,
      year: yearNum,
      week: weekNum,
      niche,
      companies: segCompanies,
      preSimStates,
      modifiersByCompanyId,
      productPlansByCompanyId: productPlanStatsByCompanyId,
      economy: macroEconomy,
      prevState: prevNicheState,
    });

    if (demandResult) {
      segmentDemandByKey[key] = demandResult.demand;
      const nicheState =
        nicheDemandStateBySectorId[sectorId] ??
        { ...((prevMetrics.nicheDemandState ?? {}) as Record<string, CarwashDemandState>) };
      nicheState[nicheId] = demandResult.nextState;
      nicheDemandStateBySectorId[sectorId] = nicheState;

      const nicheSummary =
        nicheDemandSummaryBySectorId[sectorId] ??
        { ...((prevMetrics.nicheDemandSummary ?? {}) as Record<string, unknown>) };
      nicheSummary[nicheId] = demandResult.summary;
      nicheDemandSummaryBySectorId[sectorId] = nicheSummary;
    }

    const marketCfg = (niche.config as any)?.marketAllocation;
    if (demandResult && marketCfg && typeof marketCfg === "object") {
      const segmentSkuMap = (marketCfg as any).segmentSkuMap ?? {};
      const segments = Object.keys(segmentSkuMap);
      if (segments.length > 0) {
        const summary = (demandResult.summary ?? {}) as Record<string, unknown>;
        const segmentDemand: Record<string, number> = {};
        for (const segment of segments) {
          segmentDemand[segment] = readSegmentDemandFromSummary(summary, segment);
        }

        const fleetDemand = safeNumber(segmentDemand.fleet, 0);
        if (fleetDemand > 0 && segmentDemand.standard != null) {
          const standardDemand = safeNumber(segmentDemand.standard, 0);
          const shift = Math.min(fleetDemand, standardDemand);
          segmentDemand.standard = standardDemand - shift;
          segmentDemand.fleet = shift;
        }

        const productList = nicheProductsByNicheId.get(nicheId) ?? [];
        const productBySku = new Map(productList.map((product) => [product.sku, product]));
        const segmentPricesByCompanyId: Record<string, Record<string, number>> = {};
        const segmentEligibilityByCompanyId: Record<string, Record<string, boolean>> = {};
        const priceSums: Record<string, number> = {};
        const priceCounts: Record<string, number> = {};

        for (const c of segCompanies) {
          if (!c.id) continue;
          const cid = String(c.id);
          const state = preSimStates[cid] ?? null;
          const mod = modifiersByCompanyId[cid] ?? {};
          const plan = productPlanByCompanyId[cid];
          const planItems = Array.isArray(plan?.items) ? plan?.items : [];
          const cap = computeEffectiveCapacity(state, mod, productPlanStatsByCompanyId[cid]);
          const priceLevel = safeNumber(state?.priceLevel, 1) * safeNumber(mod.priceLevelMultiplier, 1);

          const priceBySegment: Record<string, number> = {};
          const eligibilityBySegment: Record<string, boolean> = {};
          const unlocked = unlockedProductsByCompanyId[cid];

          for (const segment of segments) {
            const sku = segmentSkuMap[segment];
            const product = productBySku.get(sku);
            if (!product) {
              eligibilityBySegment[segment] = false;
              continue;
            }

            const isUnlocked = unlocked ? unlocked.has(sku) : true;
            eligibilityBySegment[segment] = isUnlocked;
            if (!isUnlocked) continue;

            const planItem = planItems.find((item) => item?.sku === sku);
            const priceMin = safeNumber(product.priceMinEur, 0);
            const priceMax = Math.max(priceMin, safeNumber(product.priceMaxEur, priceMin));
            const baseline = (priceMin + priceMax) / 2 || priceMin || 1;
            const planPrice = safeNumber(planItem?.priceEur, 0);
            const price = clamp(planPrice > 0 ? planPrice : baseline * priceLevel, priceMin, priceMax);
            priceBySegment[segment] = price;

            if (cap > 0) {
              priceSums[segment] = (priceSums[segment] ?? 0) + price;
              priceCounts[segment] = (priceCounts[segment] ?? 0) + 1;
            }
          }

          segmentPricesByCompanyId[cid] = priceBySegment;
          segmentEligibilityByCompanyId[cid] = eligibilityBySegment;
        }

        const prevRefPrices =
          (prevMetrics.nicheRefPrices && prevMetrics.nicheRefPrices[nicheId]) ?? {};
        const refCfg = (marketCfg as any).referencePrice ?? {};
        const ewmaAlpha = clamp(safeNumber(refCfg.ewmaAlpha, 0.02), 0, 1);
        const maxMovePct = Math.max(0, safeNumber(refCfg.maxMovePct, 0.08));
        const minPriceFloor = Math.max(0.01, safeNumber(refCfg.minPriceFloor, 1));
        const referencePricesBySegment: Record<string, number> = {};

        for (const segment of segments) {
          const count = priceCounts[segment] ?? 0;
          const avgPrice = count > 0 ? (priceSums[segment] ?? 0) / count : 0;
          const sku = segmentSkuMap[segment];
          const product = productBySku.get(sku);
          const priceMin = Math.max(minPriceFloor, safeNumber(product?.priceMinEur, minPriceFloor));
          const priceMax = Math.max(priceMin, safeNumber(product?.priceMaxEur, priceMin));
          const baseline = (priceMin + priceMax) / 2 || priceMin;
          const prevRef = safeNumber((prevRefPrices as any)?.[segment], 0);

          let nextRef = avgPrice > 0 ? avgPrice : baseline;
          if (prevRef > 0 && ewmaAlpha > 0) {
            const target = avgPrice > 0 ? avgPrice : prevRef;
            const ewma = (1 - ewmaAlpha) * prevRef + ewmaAlpha * target;
            nextRef =
              maxMovePct > 0 ? clamp(ewma, prevRef * (1 - maxMovePct), prevRef * (1 + maxMovePct)) : ewma;
          } else if (prevRef > 0 && avgPrice <= 0) {
            nextRef = prevRef;
          }

          referencePricesBySegment[segment] = Math.max(minPriceFloor, nextRef);
        }

        const config = {
          elasticities: (marketCfg as any).elasticities ?? {},
          priceFactorClamp: (marketCfg as any).priceFactorClamp ?? { min: 0.65, max: 1.45 },
          softmaxTemperature: safeNumber((marketCfg as any).softmaxTemperature, 10),
          weights: (marketCfg as any).weights ?? {
            price: 1,
            quality: 0.8,
            marketing: 0.55,
            reputation: 0.7,
            availability: 0.6,
          },
        };

        marketAllocationByKey[key] = {
          segmentDemand,
          segmentPricesByCompanyId,
          segmentEligibilityByCompanyId,
          referencePricesBySegment,
          config,
        };

        const nicheRef =
          nicheRefPricesBySectorId[sectorId] ??
          { ...((prevMetrics.nicheRefPrices ?? {}) as Record<string, Record<string, number>>) };
        nicheRef[nicheId] = referencePricesBySegment;
        nicheRefPricesBySectorId[sectorId] = nicheRef;
      }
    }
  }

  for (const ss of nextWorldSectorStates) {
    const sid = String((ss as any)?.sectorId ?? "");
    if (!sid) continue;
    const metrics = { ...(((ss as any)?.lastRoundMetrics ?? {}) as Record<string, unknown>) };
    if (nicheDemandStateBySectorId[sid]) {
      metrics.nicheDemandState = nicheDemandStateBySectorId[sid];
    }
    if (nicheDemandSummaryBySectorId[sid]) {
      metrics.nicheDemandSummary = nicheDemandSummaryBySectorId[sid];
    }
    if (nicheRefPricesBySectorId[sid]) {
      metrics.nicheRefPrices = nicheRefPricesBySectorId[sid];
    }
    (ss as any).lastRoundMetrics = metrics;
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

  for (const [key, segCompanies] of companiesBySegment.entries()) {
    const [sectorId, nicheId] = key.split("|");
    const niche = nicheById[nicheId];
    if (!niche) continue;

    const demand = segmentDemandByKey[key] ?? sectorDemandBySectorId[sectorId] ?? 0;

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
      productPlansByCompanyId: productPlanStatsByCompanyId,
      marketAllocation: marketAllocationByKey[key],
      rng,
    } as unknown as Parameters<typeof companyEngine.simulate>[0]);

    Object.assign(nextStates, sim.nextStates);
    Object.assign(nextFinancials, sim.financials);
  }

  // 10.5) Apply holding decisions (loans + acquisitions)
  const cacheOpenOffer = (offer: AcquisitionOffer) => {
    const id = String(offer.id);
    acquisitionOffersById[id] = offer;
    const companyId = String(offer.companyId);
    const list = acquisitionOffersByCompanyId[companyId] ?? [];
    const idx = list.findIndex((entry) => String(entry.id) === id);
    if (idx >= 0) {
      list[idx] = offer;
    } else {
      list.push(offer);
    }
    acquisitionOffersByCompanyId[companyId] = list;
  };

  const dropOpenOffer = (offer: AcquisitionOffer) => {
    const id = String(offer.id);
    delete acquisitionOffersById[id];
    const companyId = String(offer.companyId);
    const list = (acquisitionOffersByCompanyId[companyId] ?? []).filter(
      (entry) => String(entry.id) !== id
    );
    if (list.length > 0) {
      acquisitionOffersByCompanyId[companyId] = list;
    } else {
      delete acquisitionOffersByCompanyId[companyId];
    }
  };

  const appendOfferHistory = (
    offer: AcquisitionOffer,
    input: { action: AcquisitionOfferAction; by: "BUYER" | "SELLER"; price: number; message?: string }
  ) => {
    const history = Array.isArray(offer.history) ? [...offer.history] : [];
    history.push({
      action: input.action,
      by: input.by,
      price: asMoney(input.price),
      message: input.message,
      year: year as any,
      week: week as any,
      at: nowIso(),
    });
    return history;
  };

  const acceptOffer = async (offer: AcquisitionOffer, acceptedBy: "BUYER" | "SELLER") => {
    const buyerId = String(offer.buyerHoldingId);
    const sellerId = String(offer.sellerHoldingId);
    const companyId = String(offer.companyId);
    const buyer = holdingById[buyerId];
    const seller = holdingById[sellerId];
    const company = companyById[companyId];

    if (!buyer || !seller || !company) {
      const updated = await acquisitionRepo.updateOffer(offer.id, {
        status: "EXPIRED",
        turn: "NONE",
        lastAction: acceptedBy,
        history: appendOfferHistory(offer, {
          action: "EXPIRE",
          by: acceptedBy,
          price: safeNumber(offer.offerPrice, 0),
        }),
      });
      dropOpenOffer(updated);
      return;
    }

    if (String(company.holdingId) !== sellerId) {
      const updated = await acquisitionRepo.updateOffer(offer.id, {
        status: "EXPIRED",
        turn: "NONE",
        lastAction: acceptedBy,
        history: appendOfferHistory(offer, {
          action: "EXPIRE",
          by: acceptedBy,
          price: safeNumber(offer.offerPrice, 0),
        }),
      });
      dropOpenOffer(updated);
      return;
    }

    const price = safeNumber(offer.offerPrice, 0);
    const buyerCash = safeNumber(buyer.cashBalance, 0);
    if (buyerCash < price) {
      const updated = await acquisitionRepo.updateOffer(offer.id, {
        status: "FAILED_FUNDS",
        turn: "NONE",
        lastAction: acceptedBy,
        history: appendOfferHistory(offer, {
          action: "FAIL_FUNDS",
          by: acceptedBy,
          price,
        }),
      });
      dropOpenOffer(updated);
      return;
    }

    buyer.cashBalance = (buyerCash - price) as any;
    const sellerCash = safeNumber(seller.cashBalance, 0);
    seller.cashBalance = (sellerCash + price) as any;

    company.holdingId = buyer.id as any;

    const { error } = await supabase
      .from("companies")
      .update({ holding_id: String(buyer.id) })
      .eq("id", String(company.id));

    if (error) throw new Error(`Failed to transfer company: ${error.message}`);

    const updated = await acquisitionRepo.updateOffer(offer.id, {
      status: "ACCEPTED",
      turn: "NONE",
      lastAction: acceptedBy,
      history: appendOfferHistory(offer, {
        action: "ACCEPT",
        by: acceptedBy,
        price,
      }),
    });
    dropOpenOffer(updated);

    const competingOffers = acquisitionOffersByCompanyId[companyId] ?? [];
    for (const other of competingOffers) {
      if (String(other.id) === String(offer.id)) continue;
      const closed = await acquisitionRepo.updateOffer(other.id, {
        status: "EXPIRED",
        turn: "NONE",
        lastAction: other.lastAction,
        history: appendOfferHistory(other, {
          action: "EXPIRE",
          by: other.lastAction,
          price: safeNumber(other.offerPrice, 0),
        }),
      });
      dropOpenOffer(closed);
    }
  };

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

        case "SUBMIT_ACQUISITION_OFFER": {
          const companyId = String(payload.companyId ?? "");
          const offerPrice = safeNumber(payload.offerPrice, 0);
          if (!companyId || offerPrice <= 0) break;

          const company = companyById[companyId];
          if (!company) break;
          if (String(company.status ?? "ACTIVE") !== "ACTIVE") break;

          const sellerId = String(company.holdingId ?? "");
          if (!sellerId || sellerId === hid) break;

          const expiresIn = Math.max(
            1,
            Math.floor(safeNumber(payload.expiresInWeeks, ACQUISITION_OFFER_DEFAULT_EXPIRY_WEEKS))
          );
          const expiresAt = addWeeks(yearNum, weekNum, expiresIn);

          const existingOffers = acquisitionOffersByCompanyId[companyId] ?? [];
          const existing = existingOffers.find(
            (offer) => String(offer.buyerHoldingId) === hid
          );

          const historyEntry = {
            action: "SUBMIT",
            by: "BUYER" as const,
            price: offerPrice,
            message: payload.message,
            year: year as any,
            week: week as any,
            at: nowIso(),
          };

          if (existing) {
            const updated = await acquisitionRepo.updateOffer(existing.id, {
              status: "OPEN",
              offerPrice,
              message: payload.message ?? null,
              turn: "SELLER",
              lastAction: "BUYER",
              counterCount: safeNumber(existing.counterCount, 0),
              expiresYear: expiresAt.year,
              expiresWeek: expiresAt.week,
              history: [...(Array.isArray(existing.history) ? existing.history : []), historyEntry],
            });
            cacheOpenOffer(updated);
            break;
          }

          const created = await acquisitionRepo.createOffer({
            worldId,
            companyId: company.id,
            buyerHoldingId: holding.id as any,
            sellerHoldingId: company.holdingId as any,
            offerPrice,
            message: payload.message,
            turn: "SELLER",
            lastAction: "BUYER",
            expiresYear: expiresAt.year,
            expiresWeek: expiresAt.week,
            history: [historyEntry],
          });
          cacheOpenOffer(created);
          break;
        }

        case "WITHDRAW_ACQUISITION_OFFER": {
          const offerId = String(payload.offerId ?? "");
          if (!offerId) break;
          const offer = acquisitionOffersById[offerId];
          if (!offer) break;
          if (String(offer.buyerHoldingId) !== hid) break;

          const updated = await acquisitionRepo.updateOffer(offer.id, {
            status: "WITHDRAWN",
            turn: "NONE",
            lastAction: "BUYER",
            history: appendOfferHistory(offer, {
              action: "WITHDRAW",
              by: "BUYER",
              price: safeNumber(offer.offerPrice, 0),
            }),
          });
          dropOpenOffer(updated);
          break;
        }

        case "REJECT_ACQUISITION_OFFER": {
          const offerId = String(payload.offerId ?? "");
          if (!offerId) break;
          const offer = acquisitionOffersById[offerId];
          if (!offer) break;

          const isBuyer = String(offer.buyerHoldingId) === hid;
          const isSeller = String(offer.sellerHoldingId) === hid;
          if (!isBuyer && !isSeller) break;
          if (offer.turn === "BUYER" && !isBuyer) break;
          if (offer.turn === "SELLER" && !isSeller) break;

          const updated = await acquisitionRepo.updateOffer(offer.id, {
            status: "REJECTED",
            turn: "NONE",
            lastAction: isSeller ? "SELLER" : "BUYER",
            message: payload.reason ?? null,
            history: appendOfferHistory(offer, {
              action: "REJECT",
              by: isSeller ? "SELLER" : "BUYER",
              price: safeNumber(offer.offerPrice, 0),
              message: payload.reason,
            }),
          });
          dropOpenOffer(updated);
          break;
        }

        case "COUNTER_ACQUISITION_OFFER": {
          const offerId = String(payload.offerId ?? "");
          const counterPrice = safeNumber(payload.counterPrice, 0);
          if (!offerId || counterPrice <= 0) break;
          const offer = acquisitionOffersById[offerId];
          if (!offer) break;

          const isBuyer = String(offer.buyerHoldingId) === hid;
          const isSeller = String(offer.sellerHoldingId) === hid;
          if (!isBuyer && !isSeller) break;
          if (offer.turn === "BUYER" && !isBuyer) break;
          if (offer.turn === "SELLER" && !isSeller) break;

          const nextTurn = isBuyer ? "SELLER" : "BUYER";
          const expiresAt = addWeeks(yearNum, weekNum, ACQUISITION_OFFER_DEFAULT_EXPIRY_WEEKS);
          const updated = await acquisitionRepo.updateOffer(offer.id, {
            status: "COUNTERED",
            offerPrice: counterPrice,
            message: payload.message ?? null,
            turn: nextTurn,
            lastAction: isBuyer ? "BUYER" : "SELLER",
            counterCount: safeNumber(offer.counterCount, 0) + 1,
            expiresYear: expiresAt.year,
            expiresWeek: expiresAt.week,
            history: appendOfferHistory(offer, {
              action: "COUNTER",
              by: isBuyer ? "BUYER" : "SELLER",
              price: counterPrice,
              message: payload.message,
            }),
          });
          cacheOpenOffer(updated);
          break;
        }

        case "ACCEPT_ACQUISITION_OFFER": {
          const offerId = String(payload.offerId ?? "");
          if (!offerId) break;
          const offer = acquisitionOffersById[offerId];
          if (!offer) break;

          const isBuyer = String(offer.buyerHoldingId) === hid;
          const isSeller = String(offer.sellerHoldingId) === hid;
          if (!isBuyer && !isSeller) break;
          if (offer.turn === "BUYER" && !isBuyer) break;
          if (offer.turn === "SELLER" && !isSeller) break;

          await acceptOffer(offer, isSeller ? "SELLER" : "BUYER");
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

  for (const offer of Object.values(acquisitionOffersById)) {
    if (offer.status !== "OPEN" && offer.status !== "COUNTERED") continue;
    if (offer.turn !== "SELLER") continue;

    const sellerId = String(offer.sellerHoldingId);
    if (!botHoldingIds.has(sellerId)) continue;

    const companyId = String(offer.companyId);
    const company = companyById[companyId];
    if (!company) continue;

    const valuation = estimateCompanyLiquidationValue(latestFinancialsByCompanyId[companyId] ?? null);
    const price = safeNumber(offer.offerPrice, 0);
    const counters = safeNumber(offer.counterCount, 0);

    const acceptFloor = valuation * (counters >= 2 ? 0.95 : 1.05);
    const rejectCeil = valuation * 0.7;

    if (price >= acceptFloor) {
      await acceptOffer(offer, "SELLER");
      continue;
    }

    if (price <= rejectCeil) {
      const updated = await acquisitionRepo.updateOffer(offer.id, {
        status: "REJECTED",
        turn: "NONE",
        lastAction: "SELLER",
        history: appendOfferHistory(offer, {
          action: "REJECT",
          by: "SELLER",
          price,
        }),
      });
      dropOpenOffer(updated);
      continue;
    }

    if (counters >= 4) {
      const updated = await acquisitionRepo.updateOffer(offer.id, {
        status: "REJECTED",
        turn: "NONE",
        lastAction: "SELLER",
        history: appendOfferHistory(offer, {
          action: "REJECT",
          by: "SELLER",
          price,
        }),
      });
      dropOpenOffer(updated);
      continue;
    }

    const counterPrice = Math.max(price, valuation * (1.08 + rng() * 0.08));
    const expiresAt = addWeeks(yearNum, weekNum, ACQUISITION_OFFER_DEFAULT_EXPIRY_WEEKS);
    const updated = await acquisitionRepo.updateOffer(offer.id, {
      status: "COUNTERED",
      offerPrice: counterPrice,
      turn: "BUYER",
      lastAction: "SELLER",
      counterCount: counters + 1,
      expiresYear: expiresAt.year,
      expiresWeek: expiresAt.week,
      history: appendOfferHistory(offer, {
        action: "COUNTER",
        by: "SELLER",
        price: counterPrice,
      }),
    });
    cacheOpenOffer(updated);
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

