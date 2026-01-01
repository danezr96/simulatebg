import type { RiskBand } from "./types";

export type RiskBandInput = {
  expected: number;
  demandVolatility?: number;
  priceVolatility?: number;
  defectVolatility?: number;
  macroRiskFactor?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function estimateRiskBand(input: RiskBandInput): RiskBand {
  const base = average([
    Number.isFinite(input.demandVolatility) ? (input.demandVolatility as number) : 0.18,
    Number.isFinite(input.priceVolatility) ? (input.priceVolatility as number) : 0.2,
    Number.isFinite(input.defectVolatility) ? (input.defectVolatility as number) : 0.12,
  ]);
  const macro = Number.isFinite(input.macroRiskFactor) ? (input.macroRiskFactor as number) : 1;
  const spread = clamp(base * macro, 0.05, 0.6);
  const expected = input.expected;

  const worst = expected >= 0 ? expected * (1 - spread) : expected * (1 + spread);
  const best = expected >= 0 ? expected * (1 + spread) : expected * (1 - spread);

  return {
    worst: Math.min(worst, best),
    expected,
    best: Math.max(worst, best),
  };
}
