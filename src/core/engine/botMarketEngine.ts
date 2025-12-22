// src/core/engine/botMarketEngine.ts
import type { Niche, WorldEconomyState, WorldId, Year, WeekNumber } from "../domain";

import { clamp, mulberry32 } from "../../utils/math";
import { economyConfig } from "../../config/economy";

export type BotMarketPressure = {
  competitionPressure: number; // 0..1
  pricePressure: number; // -1..+1
  demandNoise: number; // 0..1
  volatilityBoost: number; // 0..0.5
};

export type BotMarketInput = {
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  economy: WorldEconomyState;
  niche: Niche;
  sectorVolatility?: number;
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

function jitter(rng: () => number, magnitude: number): number {
  return (rng() * 2 - 1) * magnitude;
}

function competitionBaseline(type: string): number {
  switch (type) {
    case "MONOPOLY_LIKE":
      return 0.15;
    case "OLIGOPOLY":
      return 0.35;
    case "FRAGMENTED":
      return 0.55;
    default:
      return 0.45;
  }
}

export const botMarketEngine = {
  tick(input: BotMarketInput): BotMarketPressure {
    const nicheCfg: any = input.niche.config ?? {};

    const nicheVol = clamp(Number(nicheCfg.demandVolatility ?? 0.2), 0, 1);
    const worldVol = clamp(
      Number(input.sectorVolatility ?? economyConfig.demand.globalNoiseStd ?? 0.02) * 2,
      0,
      1
    );

    const baseVol = clamp((nicheVol + worldVol) / 2, 0, 1);
    const compType = String(nicheCfg.competitionType ?? "FRAGMENTED");

    const seed = seedFromStrings(
      String(input.worldId),
      String(input.year),
      String(input.week),
      String((input.niche as any).id ?? input.niche.code ?? "")
    );
    const rng = mulberry32(seed);

    const competitionPressure = clamp(
      competitionBaseline(compType) + baseVol * 0.2 + jitter(rng, 0.15),
      0,
      1
    );

    const elasticity = clamp(Number(nicheCfg.priceElasticity ?? 0.6), 0, 1.5);
    const priceBias = clamp(0.4 - elasticity, -0.6, 0.4);
    const pricePressure = clamp(priceBias - competitionPressure * 0.2 + jitter(rng, 0.25), -1, 1);

    const demandNoise = clamp(rng() * (0.3 + baseVol * 0.7), 0, 1);

    const volatilityBoost = clamp(0.1 + baseVol * 0.35 + competitionPressure * 0.1, 0, 0.5);

    return {
      competitionPressure,
      pricePressure,
      demandNoise,
      volatilityBoost,
    };
  },
};
