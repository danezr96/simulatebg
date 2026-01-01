import type { CompanyDecisionPayload, HoldingDecisionPayload } from "../domain";
import type { BaselineInput, CompanyProjection, ProjectionSummary } from "./types";
import { estimateRiskBand } from "./riskBands";

const DEFAULT_SAFETY_BUFFER_PCT = 0.12;

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readVolatility(config: Record<string, unknown> | null | undefined, key: string, fallback: number): number {
  if (!config) return fallback;
  const raw = config[key];
  return Number.isFinite(raw as number) ? (raw as number) : fallback;
}

function getDecisionType(payload: CompanyDecisionPayload): string {
  return typeof payload?.type === "string" ? payload.type : "";
}

function sumUpgradeReserve(
  decisions: CompanyDecisionPayload[] | undefined,
  upgradesById: BaselineInput["upgradesById"]
): number {
  if (!decisions?.length || !upgradesById) return 0;
  let total = 0;
  for (const payload of decisions) {
    if (getDecisionType(payload) !== "BUY_UPGRADE") continue;
    const upgradeId = String((payload as any)?.upgradeId ?? "");
    if (!upgradeId) continue;
    const upgrade = upgradesById[upgradeId];
    total += toNumber(upgrade?.cost, 0);
  }
  return total;
}

function applyDecisionEffects(
  base: {
    expectedRevenue: number;
    expectedCosts: number;
    expectedProfit: number;
    expectedEndCash: number;
  },
  decisions: CompanyDecisionPayload[] | undefined,
  context: {
    statePriceLevel: number;
    stateMarketingLevel: number;
    stateEmployees: number;
    stateCapacity: number;
    priceElasticity: number;
  }
) {
  if (!decisions?.length) return base;

  let revenue = base.expectedRevenue;
  let costs = base.expectedCosts;

  for (const payload of decisions) {
    const type = getDecisionType(payload);
    switch (type) {
      case "SET_PRICE": {
        const priceLevel = toNumber((payload as any).priceLevel, context.statePriceLevel);
        const ratio = context.statePriceLevel > 0 ? priceLevel / context.statePriceLevel : 1;
        const demandAdjust = clamp(1 - context.priceElasticity * (ratio - 1), 0.6, 1.4);
        revenue = revenue * ratio * demandAdjust;
        break;
      }
      case "SET_MARKETING": {
        const marketingLevel = toNumber((payload as any).marketingLevel, context.stateMarketingLevel);
        const delta = marketingLevel - context.stateMarketingLevel;
        const boost = clamp(1 + delta / 8000, 0.75, 1.6);
        revenue = revenue * boost;
        costs += Math.max(0, marketingLevel) * 0.02;
        break;
      }
      case "SET_STAFFING": {
        const targetEmployees = toNumber((payload as any).targetEmployees, context.stateEmployees);
        const delta = targetEmployees - context.stateEmployees;
        revenue = revenue * clamp(1 + delta * 0.01, 0.85, 1.25);
        costs += delta * 350;
        break;
      }
      case "INVEST_CAPACITY": {
        const addCapacity = toNumber((payload as any).addCapacity, 0);
        const capacityBase = Math.max(1, context.stateCapacity);
        const boost = clamp(1 + (addCapacity / capacityBase) * 0.15, 0.8, 1.4);
        revenue = revenue * boost;
        costs += Math.abs(addCapacity) * 45;
        break;
      }
      case "INVEST_QUALITY": {
        const addQuality = toNumber((payload as any).addQuality, 0);
        const boost = clamp(1 + addQuality * 0.5, 0.9, 1.25);
        revenue = revenue * boost;
        costs += Math.abs(addQuality) * 1200;
        break;
      }
      case "START_PROGRAM": {
        const effects = ((payload as any).effects ?? {}) as Record<string, unknown>;
        const marketingDelta = toNumber(effects.marketingLevelDelta, 0);
        const marketingMultiplier = toNumber(effects.marketingMultiplier, 1);
        const qualityMultiplier = toNumber(effects.qualityMultiplier, 1);
        const priceLevelMultiplier = toNumber(effects.priceLevelMultiplier, 1);
        const capacityMultiplier = toNumber(effects.capacityMultiplier, 1);
        const variableCostMultiplier = toNumber(effects.variableCostMultiplier, 1);
        const labourCostMultiplier = toNumber(effects.labourCostMultiplier, 1);
        const extraOpex = toNumber(effects.extraOpex, 0);
        const weeklyCost = toNumber((payload as any).weeklyCost, 0);

        revenue = revenue * marketingMultiplier * qualityMultiplier * priceLevelMultiplier * capacityMultiplier;
        if (marketingDelta !== 0) {
          revenue = revenue * clamp(1 + marketingDelta / 8000, 0.8, 1.5);
        }
        costs = costs * variableCostMultiplier * labourCostMultiplier + extraOpex + weeklyCost;
        break;
      }
      default:
        break;
    }
  }

  const expectedProfit = revenue - costs;
  const expectedEndCash = base.expectedEndCash + (expectedProfit - base.expectedProfit);

  return {
    expectedRevenue: revenue,
    expectedCosts: costs,
    expectedProfit,
    expectedEndCash,
  };
}

function holdingDecisionDelta(decisions: HoldingDecisionPayload[] | undefined): number {
  if (!decisions?.length) return 0;
  let delta = 0;
  for (const payload of decisions) {
    switch (payload.type) {
      case "INJECT_CAPITAL":
        delta -= toNumber((payload as any).amount, 0);
        break;
      case "WITHDRAW_DIVIDEND":
        delta += toNumber((payload as any).amount, 0);
        break;
      case "TAKE_HOLDING_LOAN":
        delta += toNumber((payload as any).principal, 0);
        break;
      case "REPAY_HOLDING_LOAN":
        delta -= toNumber((payload as any).amount, 0);
        break;
      case "BUY_PROPERTY":
        delta -= toNumber((payload as any).purchasePrice, 0);
        break;
      case "BUY_INVESTMENT":
        delta -= toNumber((payload as any).amount, 0);
        break;
      case "START_COMPANY":
        delta -= toNumber((payload as any).seedCapital, 0);
        break;
      case "BUY_COMPANY":
        delta -= toNumber((payload as any).offerPrice, 0);
        break;
      default:
        break;
    }
  }
  return delta;
}

export function buildBaselineProjection(input: BaselineInput): ProjectionSummary {
  const safetyPct = Number.isFinite(input.safetyBufferPct)
    ? (input.safetyBufferPct as number)
    : DEFAULT_SAFETY_BUFFER_PCT;

  const macroRiskFactor = toNumber(input.economy?.macroModifiers?.riskGlobalFactor, 1);

  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalReservedOps = 0;
  let totalReservedUpgrades = 0;
  let totalVolatility = 0;

  const companies: CompanyProjection[] = input.companies.map((entry) => {
    const financials = entry.financials;
    const state = entry.state;
    const config = entry.nicheConfig ?? {};

    const baseRevenue = toNumber(financials?.revenue, 0);
    const baseCosts =
      toNumber(financials?.cogs, 0) +
      toNumber(financials?.opex, 0) +
      toNumber(financials?.interestCost, 0) +
      toNumber(financials?.taxExpense, 0);
    const baseProfit = Number.isFinite(financials?.netProfit)
      ? toNumber(financials?.netProfit, 0)
      : baseRevenue - baseCosts;
    const baseEndCash = Number.isFinite(financials?.cashChange)
      ? toNumber(financials?.cashChange, baseProfit)
      : baseProfit;

    const adjusted = applyDecisionEffects(
      {
        expectedRevenue: baseRevenue,
        expectedCosts: baseCosts,
        expectedProfit: baseProfit,
        expectedEndCash: baseEndCash,
      },
      entry.decisions,
      {
        statePriceLevel: toNumber(state?.priceLevel, 1),
        stateMarketingLevel: toNumber(state?.marketingLevel, 0),
        stateEmployees: toNumber(state?.employees, 0),
        stateCapacity: toNumber(state?.capacity, 1),
        priceElasticity: readVolatility(config, "priceElasticity", 0.35),
      }
    );

    const reservedUpgradeCash = sumUpgradeReserve(entry.decisions, input.upgradesById);
    const reservedOpsCash = Math.max(0, adjusted.expectedCosts);
    const safetyBufferCash = Math.max(0, (reservedOpsCash + reservedUpgradeCash) * safetyPct);
    const safeToSpendCash = Math.max(
      0,
      adjusted.expectedEndCash - reservedOpsCash - reservedUpgradeCash - safetyBufferCash
    );

    const demandVolatility = readVolatility(config, "demandVolatility", 0.18);
    const priceVolatility = readVolatility(config, "priceVolatility", 0.2);
    const defectVolatility = readVolatility(config, "defectVolatility", readVolatility(config, "returnsVolatility", 0.12));
    const avgVol = (demandVolatility + priceVolatility + defectVolatility) / 3;
    totalVolatility += avgVol;

    const riskBandEndCash = estimateRiskBand({
      expected: adjusted.expectedEndCash,
      demandVolatility,
      priceVolatility,
      defectVolatility,
      macroRiskFactor,
    });

    totalRevenue += adjusted.expectedRevenue;
    totalCosts += adjusted.expectedCosts;
    totalProfit += adjusted.expectedProfit;
    totalReservedOps += reservedOpsCash;
    totalReservedUpgrades += reservedUpgradeCash;

    return {
      companyId: String(entry.company.id),
      name: String(entry.company.name ?? "Company"),
      sectorId: String(entry.company.sectorId),
      nicheId: String(entry.company.nicheId),
      expectedRevenue: adjusted.expectedRevenue,
      expectedCosts: adjusted.expectedCosts,
      expectedProfit: adjusted.expectedProfit,
      expectedEndCash: adjusted.expectedEndCash,
      riskBandEndCash,
      reservedOpsCash,
      reservedUpgradeCash,
      safetyBufferCash,
      safeToSpendCash,
    };
  });

  const startingCash = toNumber(input.holding?.cashBalance, 0);
  const safetyBufferCash = Math.max(0, (totalReservedOps + totalReservedUpgrades) * safetyPct);
  const safeToSpendCash = startingCash - totalReservedOps - totalReservedUpgrades - safetyBufferCash;
  const holdingDelta = holdingDecisionDelta(input.holdingDecisions);
  const expectedEndCash = startingCash + totalProfit - totalReservedUpgrades + holdingDelta;

  const avgVolatility = companies.length > 0 ? totalVolatility / companies.length : 0.2;
  const riskBandEndCash = estimateRiskBand({
    expected: expectedEndCash,
    demandVolatility: avgVolatility,
    priceVolatility: avgVolatility,
    defectVolatility: avgVolatility,
    macroRiskFactor,
  });

  return {
    startingCash,
    reservedOpsCash: totalReservedOps,
    reservedUpgradeCash: totalReservedUpgrades,
    safetyBufferCash,
    safeToSpendCash,
    expectedRevenue: totalRevenue,
    expectedCosts: totalCosts,
    expectedProfit: totalProfit,
    expectedEndCash,
    riskBandEndCash,
    companies,
  };
}
