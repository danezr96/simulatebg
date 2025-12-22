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

    // 1) Utility per company -> market shares
    const utilities = input.companies.map((c) => {
      const s = input.statesByCompanyId[c.id] ?? null;
      const mod = modifiers[c.id] ?? {};

      const priceLvl = applyScalar(Number(s?.priceLevel ?? 1), 0, mod.priceLevelMultiplier);
      const cap = Math.max(0, Number(s?.capacity ?? 0)) * Number(mod.capacityMultiplier ?? 1);
      const q = applyScalar(Number(s?.qualityScore ?? 1), 0, mod.qualityMultiplier);
      const m = applyScalar(
        Number(s?.marketingLevel ?? 0),
        Number(mod.marketingLevelDelta ?? 0),
        mod.marketingMultiplier
      );
      const rep = applyScalar(Number(s?.reputationScore ?? 0.5), 0, mod.reputationMultiplier);

      // Utility model (simple v0)
      const u =
        Math.pow(priceScore(priceLvl), 1 + elasticity) *
        Math.pow(qualityScore(q), weights.quality) *
        Math.pow(marketingScore(m), weights.marketing) *
        Math.pow(reputationScore(rep), weights.reputation) *
        (cap > 0 ? 1 : 0);

      return { id: c.id, utility: u };
    });

    const marketShares = sectorEngine.computeMarketShares(utilities);

    // 2) Demand -> sold volume (bounded by capacity)
    const soldVolumes: Record<string, number> = {};

    for (const c of input.companies) {
      const share = marketShares[c.id] ?? 0;
      const desired = effectiveDemand * share;

      const s = input.statesByCompanyId[c.id] ?? null;
      const mod = modifiers[c.id] ?? {};
      const cap = Math.max(0, Number(s?.capacity ?? 0)) * Number(mod.capacityMultiplier ?? 1);

      soldVolumes[c.id] = Math.min(desired, cap);
    }

    // 3) Financials + next state
    const financials: Record<string, CompanyFinancials> = {};
    const nextStates: Record<string, CompanyState> = {};

    for (const c of input.companies) {
      const prev = input.statesByCompanyId[c.id] ?? null;
      const mod = modifiers[c.id] ?? {};

      const basePriceLevel = Number(prev?.priceLevel ?? 1);
      const priceLvl = applyScalar(basePriceLevel, 0, mod.priceLevelMultiplier);
      const sold = Number(soldVolumes[c.id] ?? 0);

      // Pricing
      const basePrice = Number(nicheCfg.basePrice ?? DEFAULTS.pricing.defaultBasePrice);
      const unitPrice = basePrice * priceLvl;

      // Variable cost per unit
      const baseVarCost = Number(prev?.variableCostPerUnit ?? nicheCfg.baseVariableCost ?? DEFAULTS.costs.defaultVarCost);
      const varCostPerUnit =
        baseVarCost *
        (1 + inflation) *
        energyCostFactor *
        Number(mod.variableCostMultiplier ?? 1);

      // Fixed costs
      const fixedCosts = Number(prev?.fixedCosts ?? DEFAULTS.costs.defaultFixedCosts);

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
        Number(mod.labourCostMultiplier ?? 1);

      // Marketing treated as weekly opex
      const baseMarketingLevel = Number(prev?.marketingLevel ?? 0);
      const marketingSpend = applyScalar(
        baseMarketingLevel,
        Number(mod.marketingLevelDelta ?? 0),
        mod.marketingMultiplier
      );

      const revenue = unitPrice * sold;
      const cogs = varCostPerUnit * sold;
      const opex = fixedCosts + labourCost + marketingSpend + Number(extraOpex[c.id] ?? 0);

      // v0: interest & tax handled elsewhere
      const interestCost = 0;
      const taxExpense = 0;

      const netProfit = revenue - cogs - opex - interestCost - taxExpense;
      const cashChange = netProfit;

      // Utilisation
      const cap = Math.max(0, Number(prev?.capacity ?? 0)) * Number(mod.capacityMultiplier ?? 1);
      const utilisation = cap > 0 ? sold / cap : 0;

      // Reputation drift
      const prevRepBase = Number(prev?.reputationScore ?? 0.5);
      const repTarget =
        netProfit > 0
          ? clamp(prevRepBase + DEFAULTS.reputation.profitBoost, 0, 1.2)
          : clamp(prevRepBase - DEFAULTS.reputation.lossPenalty, 0, 1.2);

      const nextRep = lerp(prevRepBase, repTarget, DEFAULTS.reputation.smoothing);

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
        employees,
        fixedCosts: fixedCosts as any,
        variableCostPerUnit: baseVarCost as any,
        reputationScore: nextRep as any,
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
