// src/core/config/companyPricing.ts
import type { Sector, Niche } from "../domain/sector";

type RiskLabel = "Low" | "Medium" | "High";

export type StartupPricing = {
  startupCost: number;
  annualRevenue: number;
  annualProfit: number;
  annualProfitRange: { min: number; max: number };
  marginRange: { min: number; max: number };
  roi: number;
  paybackYears: number;
  ticketPrice: number;
  riskScore: number;
  riskLabel: RiskLabel;
};

const TICKET_PRICE_BASE: Record<string, number> = {
  LOW: 20,
  MEDIUM: 85,
  HIGH: 320,
};

const CAPEX_REVENUE_MULTIPLIER: Record<string, number> = {
  LOW: 0.2,
  MEDIUM: 0.5,
  HIGH: 1.1,
};

const PAYBACK_MULTIPLIER: Record<string, number> = {
  LOW: 3.0,
  MEDIUM: 4.5,
  HIGH: 8.0,
};

const COMPETITION_MULTIPLIER: Record<string, number> = {
  FRAGMENTED: 0.95,
  OLIGOPOLY: 1.0,
  MONOPOLY_LIKE: 1.1,
};

const SECTOR_MULTIPLIER: Record<string, number> = {
  HORECA: 0.85,
  RETAIL: 0.9,
  ECOM: 0.9,
  TECH: 1.05,
  BUILD: 1.1,
  LOGI: 1.0,
  PROP: 1.25,
  MANU: 1.1,
  AGRI: 0.9,
  ENER: 1.3,
  HEAL: 1.15,
  MEDIA: 0.95,
  FIN: 1.1,
  AUTO: 1.05,
  RECY: 1.0,
};

const STARTUP_COST_MAX = 50_000_000;
const STARTUP_COST_FLOOR_BY_CAPEX: Record<string, number> = {
  LOW: 80_000,
  MEDIUM: 200_000,
  HIGH: 500_000,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.round(value / 500) * 500;
}

function getRiskLabel(score: number): RiskLabel {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

export function getStartupPricing(sector: Sector, niche: Niche): StartupPricing {
  const config = niche.config ?? ({} as any);

  const baseDemand = Math.max(1, Number(niche.baseDemandIndex ?? config.baseDemandLevel ?? 1));
  const baselineVolumeMin = Number(niche.volumeBaselineWeek?.min ?? NaN);
  const baselineVolumeMax = Number(niche.volumeBaselineWeek?.max ?? NaN);
  const volumeWeekly =
    Number.isFinite(baselineVolumeMin) && Number.isFinite(baselineVolumeMax)
      ? Math.max(1, (baselineVolumeMin + baselineVolumeMax) / 2)
      : baseDemand;
  const ticketLevel = niche.ticketLevel ?? config.ticketSize ?? "MEDIUM";
  const ticketPrice = TICKET_PRICE_BASE[ticketLevel] ?? TICKET_PRICE_BASE.MEDIUM;

  const marginMinRaw = niche.marginPctRange?.min ?? config.marginRange?.min ?? 0.05;
  const marginMaxRaw = niche.marginPctRange?.max ?? config.marginRange?.max ?? 0.18;
  const marginMin = clamp(Number(marginMinRaw) > 1 ? Number(marginMinRaw) / 100 : Number(marginMinRaw), 0.02, 0.6);
  const marginMax = clamp(
    Number(marginMaxRaw) > 1 ? Number(marginMaxRaw) / 100 : Number(marginMaxRaw),
    marginMin,
    0.6
  );
  const marginMid = (marginMin + marginMax) / 2;

  const roiPct = niche.roiPct != null ? Number(niche.roiPct) / 100 : null;
  const paybackYearsProvided = niche.paybackYears != null ? Number(niche.paybackYears) : null;
  const explicitStartupCost = Number(
    niche.startupCostEur ?? (niche as any).startupCost ?? (config as any).startupCost ?? NaN
  );
  const hasExplicitStartupCost = Number.isFinite(explicitStartupCost) && explicitStartupCost > 0;

  let annualProfit = volumeWeekly * ticketPrice * 52 * marginMid;
  if (roiPct != null && hasExplicitStartupCost) {
    annualProfit = explicitStartupCost * roiPct;
  } else if (paybackYearsProvided && hasExplicitStartupCost) {
    annualProfit = explicitStartupCost / Math.max(0.1, paybackYearsProvided);
  }

  let annualRevenue = volumeWeekly * ticketPrice * 52;
  if (annualProfit > 0 && marginMid > 0) {
    annualRevenue = annualProfit / marginMid;
  }

  const annualProfitRange = {
    min: annualRevenue * marginMin,
    max: annualRevenue * marginMax,
  };

  const capexIntensity = String(config.capexIntensity ?? niche.capex ?? "MEDIUM");
  const capexMultiplier = CAPEX_REVENUE_MULTIPLIER[capexIntensity] ?? 0.5;
  const paybackMultiplier = PAYBACK_MULTIPLIER[capexIntensity] ?? 4.5;
  const sectorMultiplier = SECTOR_MULTIPLIER[sector.code] ?? 1;
  const competitionMultiplier = COMPETITION_MULTIPLIER[config.competitionType ?? "FRAGMENTED"] ?? 1;

  const regulation = clamp(Number(config.regulationRisk ?? 0), 0, 1);
  const labour = clamp(Number(config.labourIntensity ?? 0), 0, 1);
  const volatility = clamp(Number(config.demandVolatility ?? 0), 0, 1);

  const revenueCapex = annualRevenue * capexMultiplier;
  const profitPayback = annualProfit * paybackMultiplier;
  const baseCost = Math.max(revenueCapex, profitPayback);
  const riskMultiplier = 1 + regulation * 0.25 + labour * 0.12 + volatility * 0.1;

  const rawCost = baseCost * sectorMultiplier * competitionMultiplier * riskMultiplier;
  const startupCostFloor = STARTUP_COST_FLOOR_BY_CAPEX[capexIntensity] ?? 200_000;
  const computedStartupCost = roundMoney(clamp(rawCost, startupCostFloor, STARTUP_COST_MAX));
  const startupCost = hasExplicitStartupCost ? explicitStartupCost : computedStartupCost;

  const roi = roiPct != null ? roiPct : annualProfit > 0 ? annualProfit / startupCost : 0;
  const paybackYears = paybackYearsProvided ?? (annualProfit > 0 ? startupCost / annualProfit : 99);

  const elasticity = clamp(Number(config.priceElasticity ?? 0), 0, 1.5) / 1.5;
  const riskScore = clamp(volatility * 0.45 + regulation * 0.35 + elasticity * 0.2, 0, 1);
  const riskLabel = (niche.risk as RiskLabel | undefined) ?? getRiskLabel(riskScore);

  return {
    startupCost,
    annualRevenue,
    annualProfit,
    annualProfitRange,
    marginRange: { min: marginMin, max: marginMax },
    roi,
    paybackYears,
    ticketPrice,
    riskScore,
    riskLabel,
  };
}
