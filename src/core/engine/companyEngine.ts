// src/core/engine/companyEngine.ts
import type {
  Company,
  CompanyState,
  CompanyFinancials,
  WorldEconomyState,
  Niche,
  WorldId,
  CompanyId,
  Year,
  WeekNumber,
} from "../domain";
import type { CompanyEffectModifiers } from "../domain/programs";

import { clamp, lerp } from "../../utils/math";
import { economyConfig } from "../../config/economy";
import { sectorEngine } from "./sectorEngine";
import type { BotMarketPressure } from "./botMarketEngine";

/**
 * CompanyEngine
 * - Given a sector demand and a set of companies in that sector,
 *   calculates:
 *   - utility / market share
 *   - sold volume (bounded by capacity)
 *   - revenue / costs / profit
 *   - next CompanyState (utilisation etc.)
 *   - CompanyFinancials row for that week
 *
 * Note:
 * - Decisions application should happen BEFORE this engine.
 */

// Domain doesn't export Season (only SeasonId). We only need macroModifiers here.
type SeasonLike = {
  macroModifiers?: {
    costLabourFactor?: number;
    costEnergyFactor?: number;
  };
} | null;

type ProductPlanStats = {
  avgPrice?: number;
  avgCost?: number;
  capacityMultiplier?: number;
  bufferWeeks?: number;
};

type Range = {
  min: number;
  max: number;
};

type MarketAllocationConfig = {
  elasticities: Record<string, number>;
  priceFactorClamp: Range;
  softmaxTemperature: number;
  weights: {
    price: number;
    quality: number;
    marketing: number;
    reputation: number;
    availability: number;
  };
};

type MarketAllocationInput = {
  segmentDemand: Record<string, number>;
  segmentPricesByCompanyId: Record<string, Record<string, number>>;
  segmentEligibilityByCompanyId?: Record<string, Record<string, boolean>>;
  referencePricesBySegment: Record<string, number>;
  config: MarketAllocationConfig;
};

export type CompanySimInput = {
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  economy: WorldEconomyState;
  season?: SeasonLike;

  niche: Niche;
  companies: Company[];
  statesByCompanyId: Record<string, CompanyState | null>;

  sectorDemand: number;
  botPressure?: BotMarketPressure | null;
  modifiersByCompanyId?: Record<string, CompanyEffectModifiers>;
  extraOpexByCompanyId?: Record<string, number>;
  productPlansByCompanyId?: Record<string, ProductPlanStats>;
  marketAllocation?: MarketAllocationInput;
};

export type CompanySimOutput = {
  nextStates: Record<string, CompanyState>;
  financials: Record<string, CompanyFinancials>;
  marketShares: Record<string, number>;
  soldVolumes: Record<string, number>;
};

function priceScore(priceLevel: number): number {
  const p = clamp(priceLevel, 0.4, 2.5);
  return 1 / Math.pow(p, 0.8);
}

function qualityScore(q: number): number {
  return clamp(q, 0.2, 3.0);
}

function marketingScore(m: number): number {
  // diminishing returns
  return 1 + Math.log10(1 + clamp(m, 0, 10_000));
}

function reputationScore(r: number): number {
  return clamp(r, 0.1, 1.5);
}

function availabilityScore(capacity: number, avgCapacity: number): number {
  if (avgCapacity <= 0) return 1;
  return clamp(capacity / avgCapacity, 0.4, 1.6);
}

function softmax(xs: number[], temperature: number): number[] {
  if (xs.length === 0) return [];
  const t = Math.max(0.0001, temperature);

  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp((x - m) / t));
  const denom = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / denom);
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function qualityPctFromScore(qualityScore: number): number {
  return clamp(qualityScore / 1.2, 0, 1) * 100;
}

function computeRefundPct(
  qualityScore: number,
  brackets: Array<{ min: number; max: number; refundRangePct: [number, number] }>
): number {
  if (!Array.isArray(brackets) || brackets.length === 0) return 0;
  const qualityPct = qualityPctFromScore(qualityScore);

  for (const bracket of brackets) {
    const min = safeNumber((bracket as any)?.min, 0);
    const max = Math.max(min, safeNumber((bracket as any)?.max, min));
    if (qualityPct < min || qualityPct > max) continue;

    const range = (bracket as any)?.refundRangePct;
    const minRefund = Math.max(0, safeNumber(range?.[0], 0));
    const maxRefund = Math.max(minRefund, safeNumber(range?.[1], minRefund));
    const t = max > min ? clamp((qualityPct - min) / (max - min), 0, 1) : 0;
    return lerp(maxRefund, minRefund, t);
  }

  return 0;
}

export const companyEngine = {
  simulate(input: CompanySimInput): CompanySimOutput {
    const weights = economyConfig.attractiveness.weights;
    const modifiers = input.modifiersByCompanyId ?? {};
    const extraOpex = input.extraOpexByCompanyId ?? {};

    // Fallback constants until you add a dedicated "company" config section
    const DEFAULTS = {
      pricing: {
        defaultBasePrice: 100,
      },
      costs: {
        defaultVarCost: 40,
        defaultFixedCosts: 1_000,
        baseWagePerEmployee: 500,
      },
      reputation: {
        // economyConfig.reputation.weeklyDelta.lossPenalty is negative in your config
        profitBoost: economyConfig.reputation.weeklyDelta.profitBonus,
        lossPenalty: Math.abs(economyConfig.reputation.weeklyDelta.lossPenalty),
        smoothing: 0.35,
      },
    } as const;

    const nicheCfg: any = input.niche.config ?? {};
    const softStats = nicheCfg.softStats ?? null;

    const elasticity = Number(nicheCfg.priceElasticity ?? 1); // higher => price matters more
    const labourIntensity = Number(nicheCfg.labourIntensity ?? 1);
    const skillIntensity = Number(nicheCfg.skillIntensity ?? 1);

    const wageIndex = Number(input.economy.baseWageIndex ?? economyConfig.wages.baseIndex ?? 1);
    const inflation = Number(input.economy.inflationRate ?? economyConfig.inflation.baseAnnualInflation ?? 0.02);

    const labourCostFactor =
      Number(input.economy.macroModifiers?.costLabourFactor ?? 1) *
      Number(input.season?.macroModifiers?.costLabourFactor ?? 1);

    const energyCostFactor =
      Number(input.economy.macroModifiers?.costEnergyFactor ?? 1) *
      Number(input.season?.macroModifiers?.costEnergyFactor ?? 1);

    const botPressure = input.botPressure ?? null;
    const botDemandFactor = botPressure
      ? clamp(1 - botPressure.competitionPressure * 0.35 + botPressure.demandNoise * 0.2, 0.4, 1.3)
      : 1;
    const priceDemandFactor = botPressure ? clamp(1 + botPressure.pricePressure, 0.1, 1.5) : 1;
    const effectiveDemand = Math.max(0, input.sectorDemand * botDemandFactor * priceDemandFactor);

    const applyScalar = (base: number, delta?: number, mult?: number) =>
      (base + Number(delta ?? 0)) * Number(mult ?? 1);

    let marketShares: Record<string, number> = {};
    let soldVolumes: Record<string, number> = {};
    let revenueByCompany: Record<string, number> | null = null;

    if (input.marketAllocation && Object.keys(input.marketAllocation.segmentDemand ?? {}).length > 0) {
      const allocation = input.marketAllocation;
      const segDemandEntries = Object.entries(allocation.segmentDemand ?? {});

      const capacityRemaining: Record<string, number> = {};
      const companyScores: Record<
        string,
        { quality: number; marketing: number; reputation: number; capacity: number; awareness: number }
      > = {};

      let capSum = 0;
      for (const c of input.companies) {
        const cid = String(c.id);
        const s = input.statesByCompanyId[c.id] ?? null;
        const mod = modifiers[c.id] ?? {};
        const plan = input.productPlansByCompanyId?.[cid] ?? null;
        const planCapacityMultiplier = Number.isFinite(Number(plan?.capacityMultiplier))
          ? Number(plan?.capacityMultiplier)
          : 1;

        const cap =
          Math.max(0, Number(s?.capacity ?? 0)) *
          Number(mod.capacityMultiplier ?? 1) *
          planCapacityMultiplier;
        capacityRemaining[cid] = cap;
        capSum += cap;

        const q = applyScalar(Number(s?.qualityScore ?? 1), 0, mod.qualityMultiplier);
        const m = applyScalar(
          Number(s?.marketingLevel ?? 0),
          Number(mod.marketingLevelDelta ?? 0),
          mod.marketingMultiplier
        );
        const rep = applyScalar(Number(s?.reputationScore ?? 0.5), 0, mod.reputationMultiplier);
        const awareness = safeNumber((s as any)?.awarenessScore, 20);

        companyScores[cid] = { quality: q, marketing: m, reputation: rep, capacity: cap, awareness };
      }

      const avgCap = capSum / Math.max(1, input.companies.length);
      const soldByCompany: Record<string, number> = {};
      const revenueMap: Record<string, number> = {};

      const priceClamp = allocation.config.priceFactorClamp ?? { min: 0.65, max: 1.45 };
      const weightsCfg = allocation.config.weights;
      const softmaxTemp = allocation.config.softmaxTemperature ?? economyConfig.marketShare.softmaxTemperature;

      for (const [segment, demandRaw] of segDemandEntries) {
        const demand = Math.max(0, Number(demandRaw)) * botDemandFactor * priceDemandFactor;
        if (demand <= 0) continue;

        const segmentElasticity = Number(allocation.config.elasticities?.[segment] ?? elasticity);
        let remainingDemand = demand;
        let rounds = 0;

        while (remainingDemand > 0.0001 && rounds < 4) {
          const eligible: string[] = [];
          const scores: number[] = [];
          const prices: number[] = [];

          for (const c of input.companies) {
            const cid = String(c.id);
            if (capacityRemaining[cid] <= 0) continue;

            const eligibleMap = allocation.segmentEligibilityByCompanyId?.[cid];
            if (eligibleMap && eligibleMap[segment] === false) continue;

            const price = allocation.segmentPricesByCompanyId?.[cid]?.[segment];
            if (!Number.isFinite(price)) continue;

            const refPrice = Math.max(0.01, Number(allocation.referencePricesBySegment?.[segment] ?? price));
            const priceIndex = price / refPrice;
            const priceFactor = clamp(Math.pow(priceIndex, -segmentElasticity), priceClamp.min, priceClamp.max);

            const scoreBase = companyScores[cid];
            const availability = availabilityScore(capacityRemaining[cid], avgCap);
            const reachFactor = softStats
              ? clamp(0.1 + scoreBase.awareness / 125, 0.1, 0.9)
              : 1;
            const marketingTerm = marketingScore(scoreBase.marketing) * reachFactor;

            const attractiveness =
              weightsCfg.price * Math.log(Math.max(0.0001, priceFactor)) +
              weightsCfg.quality * Math.log(Math.max(0.0001, qualityScore(scoreBase.quality))) +
              weightsCfg.marketing * Math.log(Math.max(0.0001, marketingTerm)) +
              weightsCfg.reputation * Math.log(Math.max(0.0001, reputationScore(scoreBase.reputation))) +
              weightsCfg.availability * Math.log(Math.max(0.0001, availability));

            eligible.push(cid);
            scores.push(clamp(attractiveness, -20, 20));
            prices.push(price);
          }

          if (eligible.length === 0) break;

          const shares = softmax(scores, softmaxTemp);
          let deliveredThisRound = 0;

          for (let i = 0; i < eligible.length; i += 1) {
            const cid = eligible[i];
            const share = shares[i] ?? 0;
            if (share <= 0) continue;

            const allocated = remainingDemand * share;
            const deliver = Math.min(allocated, capacityRemaining[cid]);
            if (deliver <= 0) continue;

            capacityRemaining[cid] -= deliver;
            soldByCompany[cid] = (soldByCompany[cid] ?? 0) + deliver;
            revenueMap[cid] = (revenueMap[cid] ?? 0) + deliver * prices[i];
            deliveredThisRound += deliver;
          }

          remainingDemand -= deliveredThisRound;
          if (deliveredThisRound <= 0.0001) break;
          rounds += 1;
        }
      }

      soldVolumes = soldByCompany;
      revenueByCompany = revenueMap;

      const totalDemand = segDemandEntries.reduce(
        (sum, [, v]) => sum + Math.max(0, Number(v)) * botDemandFactor * priceDemandFactor,
        0
      );
      marketShares = {};
      for (const c of input.companies) {
        const sold = soldVolumes[c.id] ?? 0;
        marketShares[c.id] = totalDemand > 0 ? sold / totalDemand : 0;
      }
    } else {
      // 1) Utility per company -> market shares
      const utilities = input.companies.map((c) => {
        const cid = String(c.id);
        const s = input.statesByCompanyId[c.id] ?? null;
        const mod = modifiers[c.id] ?? {};
        const plan = input.productPlansByCompanyId?.[cid] ?? null;
        const planCapacityMultiplier = Number.isFinite(Number(plan?.capacityMultiplier))
          ? Number(plan?.capacityMultiplier)
          : 1;

        const priceLvl = applyScalar(Number(s?.priceLevel ?? 1), 0, mod.priceLevelMultiplier);
        const cap =
          Math.max(0, Number(s?.capacity ?? 0)) *
          Number(mod.capacityMultiplier ?? 1) *
          planCapacityMultiplier;
        const q = applyScalar(Number(s?.qualityScore ?? 1), 0, mod.qualityMultiplier);
        const m = applyScalar(
          Number(s?.marketingLevel ?? 0),
          Number(mod.marketingLevelDelta ?? 0),
          mod.marketingMultiplier
        );
        const rep = applyScalar(Number(s?.reputationScore ?? 0.5), 0, mod.reputationMultiplier);
        const awareness = safeNumber((s as any)?.awarenessScore, 20);
        const reachFactor = softStats ? clamp(0.1 + awareness / 125, 0.1, 0.9) : 1;
        const marketingTerm = Math.max(0.0001, marketingScore(m) * reachFactor);

        // Utility model (simple v0)
        const u =
          Math.pow(priceScore(priceLvl), 1 + elasticity) *
          Math.pow(qualityScore(q), weights.quality) *
          Math.pow(marketingTerm, weights.marketing) *
          Math.pow(reputationScore(rep), weights.reputation) *
          (cap > 0 ? 1 : 0);

        return { id: c.id, utility: u };
      });

      marketShares = sectorEngine.computeMarketShares(utilities);

      // 2) Demand -> sold volume (bounded by capacity)
      soldVolumes = {};

      for (const c of input.companies) {
        const cid = String(c.id);
        const share = marketShares[c.id] ?? 0;
        const desired = effectiveDemand * share;

        const s = input.statesByCompanyId[c.id] ?? null;
        const mod = modifiers[c.id] ?? {};
        const plan = input.productPlansByCompanyId?.[cid] ?? null;
        const planCapacityMultiplier = Number.isFinite(Number(plan?.capacityMultiplier))
          ? Number(plan?.capacityMultiplier)
          : 1;
        const cap =
          Math.max(0, Number(s?.capacity ?? 0)) *
          Number(mod.capacityMultiplier ?? 1) *
          planCapacityMultiplier;

        soldVolumes[c.id] = Math.min(desired, cap);
      }
    }

    // 3) Financials + next state
    const financials: Record<string, CompanyFinancials> = {};
    const nextStates: Record<string, CompanyState> = {};

    for (const c of input.companies) {
      const cid = String(c.id);
      const prev = input.statesByCompanyId[c.id] ?? null;
      const mod = modifiers[c.id] ?? {};
      const plan = input.productPlansByCompanyId?.[cid] ?? null;

      const basePriceLevel = Number(prev?.priceLevel ?? 1);
      const priceLvl = applyScalar(basePriceLevel, 0, mod.priceLevelMultiplier);
      const sold = Number(soldVolumes[c.id] ?? 0);
      const qualityForRefunds = applyScalar(Number(prev?.qualityScore ?? 1), 0, mod.qualityMultiplier);
      const prevAwareness = safeNumber((prev as any)?.awarenessScore, 20);
      const prevEfficiency = safeNumber((prev as any)?.operationalEfficiencyScore, 50);

      // Pricing
      const basePrice = Number(nicheCfg.basePrice ?? DEFAULTS.pricing.defaultBasePrice);
      const planPrice = Number(plan?.avgPrice);
      const revenueOverride = revenueByCompany ? revenueByCompany[cid] : null;
      const unitPrice =
        revenueOverride != null && sold > 0
          ? revenueOverride / sold
          : Number.isFinite(planPrice) && planPrice > 0
            ? planPrice
            : basePrice * priceLvl;

      // Variable cost per unit
      const baseVarCost = Number(prev?.variableCostPerUnit ?? nicheCfg.baseVariableCost ?? DEFAULTS.costs.defaultVarCost);
      const planCost = Number(plan?.avgCost);
      const rawVarCost = Number.isFinite(planCost) && planCost > 0 ? planCost : baseVarCost;
      const efficiencyCostMultiplier = softStats
        ? clamp(1.08 - prevEfficiency / 250, 0.7, 1.08)
        : 1;
      const varCostPerUnit =
        rawVarCost *
        (1 + inflation) *
        energyCostFactor *
        Number(mod.variableCostMultiplier ?? 1) *
        efficiencyCostMultiplier;

      // Fixed costs
      const fixedCostsBase = Number(prev?.fixedCosts ?? DEFAULTS.costs.defaultFixedCosts);
      const fixedCosts = fixedCostsBase * efficiencyCostMultiplier;

      // Labour costs
      const employees = Number(prev?.employees ?? 0);
      const baseWagePerEmployee = Number(nicheCfg.baseWagePerEmployee ?? DEFAULTS.costs.baseWagePerEmployee);
      const labourCost =
        employees *
        baseWagePerEmployee *
        wageIndex *
        labourIntensity *
        (0.8 + 0.4 * skillIntensity) *
        labourCostFactor *
        Number(mod.labourCostMultiplier ?? 1) *
        efficiencyCostMultiplier;

      // Marketing treated as weekly opex
      const baseMarketingLevel = Number(prev?.marketingLevel ?? 0);
      const marketingSpend = applyScalar(
        baseMarketingLevel,
        Number(mod.marketingLevelDelta ?? 0),
        mod.marketingMultiplier
      );
      const statCaps = (softStats?.statDriftCapsPerTick ?? {}) as {
        awarenessUp?: number;
        awarenessDecay?: number;
        efficiency?: number;
      };
      const awarenessUpCap = safeNumber(statCaps.awarenessUp, 0);
      const awarenessDecay = safeNumber(statCaps.awarenessDecay, 0);
      const awarenessSignal = Math.log(1 + Math.max(0, marketingSpend) / 40);
      const awarenessDelta = clamp(0.06 * awarenessSignal, 0, awarenessUpCap) + awarenessDecay;
      const nextAwareness = clamp(prevAwareness + awarenessDelta, 0, 100);

      const grossRevenue = revenueOverride != null && sold > 0 ? revenueOverride : unitPrice * sold;
      const refundBrackets = Array.isArray(softStats?.qualityRefundsPctByScore)
        ? (softStats?.qualityRefundsPctByScore as Array<{
            min: number;
            max: number;
            refundRangePct: [number, number];
          }>)
        : [];
      const refundPct = refundBrackets.length > 0 ? computeRefundPct(qualityForRefunds, refundBrackets) : 0;
      const refundAmount = grossRevenue * (refundPct / 100);
      const revenue = Math.max(0, grossRevenue - refundAmount);
      const cogs = varCostPerUnit * sold;
      const opex = fixedCosts + labourCost + marketingSpend + Number(extraOpex[c.id] ?? 0);

      // v0: interest & tax handled elsewhere
      const interestCost = 0;
      const taxExpense = 0;

      const netProfit = revenue - cogs - opex - interestCost - taxExpense;
      const cashChange = netProfit;

      // Utilisation
      const planCapacityMultiplier = Number.isFinite(Number(plan?.capacityMultiplier))
        ? Number(plan?.capacityMultiplier)
        : 1;
      const cap =
        Math.max(0, Number(prev?.capacity ?? 0)) *
        Number(mod.capacityMultiplier ?? 1) *
        planCapacityMultiplier;
      const utilisation = cap > 0 ? sold / cap : 0;

      // Reputation drift
      const prevRepBase = Number(prev?.reputationScore ?? 0.5);
      const repTarget =
        netProfit > 0
          ? clamp(prevRepBase + DEFAULTS.reputation.profitBoost, 0, 1.2)
          : clamp(prevRepBase - DEFAULTS.reputation.lossPenalty, 0, 1.2);

      const nextRep = lerp(prevRepBase, repTarget, DEFAULTS.reputation.smoothing);
      const repCap = safeNumber(softStats?.statDriftCapsPerTick?.reputation, 0);
      const qualityPct = qualityPctFromScore(qualityForRefunds);
      const reviewDeltaRaw = (qualityPct - 60) / 400 - refundPct / 200;
      const reviewDelta = repCap > 0 ? clamp(reviewDeltaRaw, -repCap, repCap) : reviewDeltaRaw;
      const nextRepReviewed = clamp(nextRep + reviewDelta, 0, 1.2);
      const efficiencyCap = safeNumber(statCaps.efficiency, 0);
      const efficiencyDeltaRaw = (utilisation - 0.6) * 0.5;
      const efficiencyDelta = efficiencyCap > 0 ? clamp(efficiencyDeltaRaw, -efficiencyCap, efficiencyCap) : efficiencyDeltaRaw;
      const nextEfficiency = clamp(prevEfficiency + efficiencyDelta, 0, 100);

      const nextState: CompanyState = {
        id: prev?.id ?? `state_${c.id}_${input.year}_${input.week}`,
        companyId: c.id as CompanyId,
        worldId: input.worldId,
        year: input.year,
        week: input.week,

        priceLevel: basePriceLevel as any,
        capacity: Math.max(0, Number(prev?.capacity ?? 0)) as any,
        qualityScore: Number(prev?.qualityScore ?? 1) as any,
        marketingLevel: baseMarketingLevel as any,
        awarenessScore: nextAwareness as any,
        employees,
        fixedCosts: fixedCostsBase as any,
        variableCostPerUnit: baseVarCost as any,
        reputationScore: nextRepReviewed as any,
        operationalEfficiencyScore: nextEfficiency as any,
        utilisationRate: utilisation as any,

        createdAt: prev?.createdAt ?? (new Date().toISOString() as any),
      };

      nextStates[c.id] = nextState;

      financials[c.id] = {
        id: `fin_${c.id}_${input.year}_${input.week}`,
        companyId: c.id as CompanyId,
        worldId: input.worldId,
        year: input.year,
        week: input.week,

        revenue: revenue as any,
        cogs: cogs as any,
        opex: opex as any,
        interestCost: interestCost as any,
        taxExpense: taxExpense as any,
        netProfit: netProfit as any,
        cashChange: cashChange as any,

        assets: 0 as any,
        liabilities: 0 as any,
        equity: 0 as any,

        createdAt: new Date().toISOString() as any,
      };
    }

    return { nextStates, financials, marketShares, soldVolumes };
  },
};
