// src/utils/math.ts

/**
 * Small, deterministic math helpers for the simulation engine.
 * Keep everything pure and side-effect free.
 */

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Linear interpolation.
 * t is expected in range [0, 1].
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Convert an annual rate to an effective weekly rate.
 * Example:
 *  annualRate = 0.02 (2%)
 *  weekly = (1 + 0.02)^(1/52) - 1
 */
export function annualToWeeklyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 52) - 1;
}

/**
 * Safe exponential for softmax-style calculations.
 * Prevents overflow by clamping the exponent input.
 */
export function safeExp(x: number, clampMin = -6, clampMax = 6): number {
  const v = clamp(x, clampMin, clampMax);
  return Math.exp(v);
}

/**
 * Softmax over an array of utility scores.
 * Temperature < 1.0 => more winner-takes-more.
 * Temperature > 1.0 => more even distribution.
 */
export function softmax(
  values: number[],
  temperature = 1,
  clampMin = -6,
  clampMax = 6
): number[] {
  if (values.length === 0) return [];

  const scaled = values.map((v) => safeExp(v / temperature, clampMin, clampMax));
  const sum = scaled.reduce((a, b) => a + b, 0);

  if (sum <= 0) {
    // Fallback: equal distribution
    const equal = 1 / values.length;
    return values.map(() => equal);
  }

  return scaled.map((v) => v / sum);
}

/**
 * Normally distributed random number (mean 0, std 1).
 * Box–Muller transform.
 */
export function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Normal random with given mean and standard deviation.
 */
export function randomNormalWith(mean: number, std: number): number {
  return mean + randomNormal() * std;
}

/**
 * Skewed random between min and max.
 * skew > 1 biases toward min
 * skew < 1 biases toward max
 */
export function randomSkewed(min: number, max: number, skew = 1): number {
  const u = Math.pow(Math.random(), skew);
  return min + (max - min) * u;
}

/**
 * Round to n decimals safely.
 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Sum helper (clarity > reduce inline everywhere).
 */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Weighted average.
 * weights do NOT need to sum to 1.
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length || values.length === 0) return 0;

  let totalWeight = 0;
  let total = 0;

  for (let i = 0; i < values.length; i++) {
    total += values[i] * weights[i];
    totalWeight += weights[i];
  }

  if (totalWeight === 0) return 0;
  return total / totalWeight;
}

/**
 * Percentage change helper.
 */
export function pctChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return (newValue - oldValue) / oldValue;
}

// src/utils/math.ts
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
