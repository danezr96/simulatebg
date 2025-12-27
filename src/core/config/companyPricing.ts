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
  LOW: 18,
  MEDIUM: 75,
  HIGH: 260,
};

const CAPEX_MULTIPLIER: Record<string, number> = {
  LOW: 0.85,
  MEDIUM: 1.0,
  HIGH: 1.35,
};

const COMPETITION_MULTIPLIER: Record<string, number> = {
  FRAGMENTED: 0.95,
  OLIGOPOLY: 1.1,
  MONOPOLY_LIKE: 1.25,
};

const SECTOR_MULTIPLIER: Record<string, number> = {
  HORECA: 0.85,
  RETAIL: 0.9,
  ECOM: 0.95,
  TECH: 1.35,
  BUILD: 1.25,
  LOGI: 1.15,
  PROP: 1.5,
  MANU: 1.4,
  AGRI: 0.9,
  ENER: 1.7,
  HEAL: 1.6,
  MEDIA: 1.05,
  FIN: 1.45,
  AUTO: 1.2,
  RECY: 1.25,
};

const STARTUP_COST_MIN = 25_000;
const STARTUP_COST_MAX = 8_000_000;

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

  const baseDemand = Math.max(1, Number(config.baseDemandLevel ?? 1));
  const ticketPrice = TICKET_PRICE_BASE[config.ticketSize ?? "MEDIUM"] ?? TICKET_PRICE_BASE.MEDIUM;
  const annualRevenue = baseDemand * ticketPrice * 52;

  const marginMin = clamp(Number(config.marginRange?.min ?? 0.05), 0.02, 0.6);
  const marginMax = clamp(Number(config.marginRange?.max ?? 0.18), marginMin, 0.6);
  const marginMid = (marginMin + marginMax) / 2;
  const annualProfit = annualRevenue * marginMid;
  const annualProfitRange = {
    min: annualRevenue * marginMin,
    max: annualRevenue * marginMax,
  };

  const capexMultiplier = CAPEX_MULTIPLIER[config.capexIntensity ?? "MEDIUM"] ?? 1;
  const sectorMultiplier = SECTOR_MULTIPLIER[sector.code] ?? 1;
  const competitionMultiplier = COMPETITION_MULTIPLIER[config.competitionType ?? "FRAGMENTED"] ?? 1;

  const regulation = clamp(Number(config.regulationRisk ?? 0), 0, 1);
  const labour = clamp(Number(config.labourIntensity ?? 0), 0, 1);

  const baseCost = annualRevenue * 0.22;
  const riskMultiplier = 1 + regulation * 0.35 + labour * 0.2;

  const rawCost =
    baseCost * capexMultiplier * sectorMultiplier * competitionMultiplier * riskMultiplier;
  const startupCost = roundMoney(clamp(rawCost, STARTUP_COST_MIN, STARTUP_COST_MAX));

  const roi = annualProfit > 0 ? annualProfit / startupCost : 0;
  const paybackYears = annualProfit > 0 ? startupCost / annualProfit : 99;

  const volatility = clamp(Number(config.demandVolatility ?? 0), 0, 1);
  const elasticity = clamp(Number(config.priceElasticity ?? 0), 0, 1.5) / 1.5;
  const riskScore = clamp(volatility * 0.45 + regulation * 0.35 + elasticity * 0.2, 0, 1);

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
    riskLabel: getRiskLabel(riskScore),
  };
}
