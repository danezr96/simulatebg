// src/core/engine/sectorEngine.ts
import type {
  Sector,
  Niche,
  WorldSectorState,
  WorldEconomyState,
  SectorId,
  WorldId,
  Year,
  WeekNumber,
} from "../domain";

import { mulberry32, clamp, sum } from "../../utils/math";
import { economyConfig } from "../../config/economy";

/**
 * SectorEngine (v0)
 * - Generates per-sector demand each week
 * - Applies seasonality + trend + volatility + macro modifiers
 * - Deterministic via seeded RNG
 */

// Domain doesn't export Season (only SeasonId). We only need sectorModifiers.
type SeasonLike = {
  sectorModifiers?: Record<
    string,
    {
      demandFactor?: number;
      volatilityFactor?: number;
    }
  >;
} | null;

export type SectorTickInput = {
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  economy: WorldEconomyState;
  season?: SeasonLike;

  sector: Sector;
  niches: Niche[];
  prevState: WorldSectorState | null;
};

export type SectorTickOutput = {
  nextState: WorldSectorState;
  demand: number;
  volatilityShock: number;
};

function seedFromStrings(...parts: string[]): number {
  let h = 2166136261;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      h ^= p.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function getMonthIndexFromWeek(week: number): number {
  const t = (week - 1) / 52;
  return clamp(Math.floor(t * 12), 0, 11);
}

// Softmax helpers for market share
function softmax(xs: number[], temperature: number): number[] {
  if (xs.length === 0) return [];
  const t = Math.max(0.0001, temperature);

  // stabilize
  const m = Math.max(...xs);
  const exps = xs.map((x) => Math.exp((x - m) / t));
  const denom = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / denom);
}

export const sectorEngine = {
  tick(input: SectorTickInput): SectorTickOutput {
    // v0 defaults (since economyConfig.sector doesn't exist anymore)
    const CFG = {
      trendPerWeek: 0.0008,          // gentle growth
      trendFactor: { min: 0.75, max: 1.35 },
      volatility: { min: 0.02, max: 0.35, default: 0.12 },
      demand: { min: 0, max: 1_000_000 },
      demandSmoothing: 0.35,
    } as const;

    const prevDemand = Number(input.prevState?.currentDemand ?? 0);

    // Base demand from niches (avg of baseDemandLevel)
    const baseDemandLevels = input.niches.map((n) => Number((n.config as any)?.baseDemandLevel ?? 100));
    const baseDemand = baseDemandLevels.length ? sum(baseDemandLevels) / baseDemandLevels.length : 100;

    // Seasonality
    const monthIdx = getMonthIndexFromWeek(Number(input.week));
    const monthlyFactors = input.niches.map((n) => {
      const mf = (n.config as any)?.seasonalityPattern?.monthlyFactors;
      return Array.isArray(mf) && mf.length === 12 ? Number(mf[monthIdx]) : 1;
    });
    const seasonalityFactor = monthlyFactors.length ? sum(monthlyFactors) / monthlyFactors.length : 1;

    // Trend
    const prevTrend = Number(input.prevState?.trendFactor ?? 1);
    const nextTrend = clamp(
      prevTrend * (1 + CFG.trendPerWeek),
      CFG.trendFactor.min,
      CFG.trendFactor.max
    );

    // Volatility (prev -> persist) + optional season modifier
    const baseVol = Number(input.prevState?.volatility ?? CFG.volatility.default);
    const seasonVolFactor =
      Number(input.season?.sectorModifiers?.[String(input.sector.id)]?.volatilityFactor ?? 1);
    const vol = clamp(baseVol * seasonVolFactor, CFG.volatility.min, CFG.volatility.max);

    // RNG shock
    const seed = seedFromStrings(String(input.worldId), String(input.year), String(input.week), String(input.sector.id));
    const rng = mulberry32(seed);

    const raw = rng() * 2 - 1; // [-1..+1]
    const shock = raw * vol;
    const volatilityShock = shock;

    // Macro modifiers
    const globalDemandFactor =
      Number(input.economy.macroModifiers?.demandGlobalFactor ?? economyConfig.demand.globalDemandFactor ?? 1);

    const seasonDemandFactor =
      Number(input.season?.sectorModifiers?.[String(input.sector.id)]?.demandFactor ?? 1);

    // Demand formula
    const targetDemand =
      baseDemand *
      nextTrend *
      seasonalityFactor *
      globalDemandFactor *
      seasonDemandFactor *
      (1 + shock);

    // Smooth to avoid extreme jitter
    const smooth = CFG.demandSmoothing;
    const demand = clamp(
      (1 - smooth) * prevDemand + smooth * targetDemand,
      CFG.demand.min,
      CFG.demand.max
    );

    const nextState: WorldSectorState = {
      worldId: input.worldId,
      sectorId: input.sector.id as SectorId,
      currentDemand: demand as any,
      trendFactor: nextTrend as any,
      volatility: vol as any,
      // ✅ don't ever set {} here (type requires metrics or undefined)
      lastRoundMetrics: input.prevState?.lastRoundMetrics,
    };

    return { nextState, demand, volatilityShock };
  },

  /**
   * Compute shares from utilities.
   * Uses economyConfig.marketShare (softmax temperature + clamp).
   */
  computeMarketShares(utilities: Array<{ id: string; utility: number }>): Record<string, number> {
    const cfg = economyConfig.marketShare;

    const vals = utilities.map((u) =>
      clamp(Number(u.utility ?? 0), cfg.utilityClamp.min, cfg.utilityClamp.max)
    );

    const probs = softmax(vals, cfg.softmaxTemperature);

    const out: Record<string, number> = {};
    for (let i = 0; i < utilities.length; i++) {
      out[utilities[i].id] = probs[i] ?? 0;
    }
    return out;
  },
};
