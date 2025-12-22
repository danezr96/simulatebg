// src/core/engine/macroEngine.ts
import type { World, WorldEconomyState } from "../domain";
import { asDecimal } from "../domain";
import { clamp, mulberry32 } from "../../utils/math";
import { economyConfig } from "../../config/economy";

/**
 * MacroEngine (v0)
 * - Updates economy rates each week (interest, inflation, wage index)
 * - Deterministic noise based on (worldId, year, week)
 * - Optional season modifiers (if you add season later)
 */

type SeasonLike = {
  macroModifiers?: Partial<{
    interestRateDelta: number;     // additive, e.g. +0.002
    inflationRateDelta: number;    // additive, e.g. +0.003
    wageIndexMultiplier: number;   // multiplicative, e.g. 1.02
    volatilityBoost: number;       // additive volatility
  }>;
} | null;

export type MacroTickInput = {
  world: World;
  economy: WorldEconomyState;
  season?: SeasonLike;
};

export type MacroTickOutput = {
  nextEconomy: WorldEconomyState;
};

function seed(worldId: string, year: number, week: number): number {
  // stable seed (FNV-ish)
  let h = 2166136261;
  const s = `${worldId}|${year}|${week}|MACRO`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const macroEngine = {
  tick(input: MacroTickInput): MacroTickOutput {
    const { world, economy } = input;
    const year = Number((economy as any).currentYear ?? 1);
    const week = Number((economy as any).currentWeek ?? 1);

    const rng = mulberry32(seed(String((world as any).id), year, week));

    // Config defaults (keep it safe even if config evolves)
    const cfg: any = (economyConfig as any)?.macro ?? {};
    const volBase = Number(cfg.volatility ?? 0.15);

    const seasonMods = (input.season?.macroModifiers ?? {}) as any;
    const vol = clamp(volBase + Number(seasonMods.volatilityBoost ?? 0), 0, 1);

    // Mean-reverting nudges + random noise
    const noise = () => (rng() - 0.5) * 2; // -1..+1

    const baseInterest = Number((economy as any).baseInterestRate ?? 0.02);
    const inflation = Number((economy as any).inflationRate ?? 0.02);
    const wageIndex = Number((economy as any).baseWageIndex ?? 1);

    const interestDelta =
      (Number(cfg.interestDrift ?? 0) + noise() * Number(cfg.interestNoise ?? 0.002) * vol) +
      Number(seasonMods.interestRateDelta ?? 0);

    const inflationDelta =
      (Number(cfg.inflationDrift ?? 0) + noise() * Number(cfg.inflationNoise ?? 0.003) * vol) +
      Number(seasonMods.inflationRateDelta ?? 0);

    const wageMul =
      clamp(Number(cfg.wageIndexBaseMul ?? 1.002) + noise() * Number(cfg.wageIndexNoise ?? 0.002) * vol, 0.95, 1.05) *
      Number(seasonMods.wageIndexMultiplier ?? 1);

    const next: WorldEconomyState = {
      ...economy,
      baseInterestRate: asDecimal(clamp(baseInterest + interestDelta, 0, 0.5)),
      inflationRate: asDecimal(clamp(inflation + inflationDelta, -0.25, 1)),
      baseWageIndex: asDecimal(clamp(wageIndex * wageMul, 0.5, 5)),
      // currentYear/currentWeek wordt in runWorldTick doorgezet
      // lastTickAt zet runWorldTick ook (jij doet dat al)
    } as any;

    return { nextEconomy: next };
  },
};
