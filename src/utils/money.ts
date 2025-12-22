// src/utils/money.ts

/**
 * Money & currency helpers.
 * Keep all monetary rounding consistent and explicit.
 */

export type CurrencyCode = "EUR" | "USD" | "GBP";

const DEFAULT_CURRENCY: CurrencyCode = "EUR";

/**
 * Round money to 2 decimals using bankers rounding (half-even).
 * This reduces bias in large simulations.
 */
export function roundMoney(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = value * factor;
  const f = Math.floor(n);
  const r = n - f;

  // Half-even rounding
  if (r > 0.5) return Math.round(n) / factor;
  if (r < 0.5) return Math.floor(n) / factor;

  // Exactly .5
  return f % 2 === 0 ? f / factor : (f + 1) / factor;
}

/**
 * Add multiple money values safely.
 */
export function addMoney(...values: number[]): number {
  return roundMoney(values.reduce((a, b) => a + b, 0));
}

/**
 * Subtract money values safely.
 */
export function subtractMoney(a: number, b: number): number {
  return roundMoney(a - b);
}

/**
 * Multiply money by a factor.
 */
export function multiplyMoney(value: number, factor: number): number {
  return roundMoney(value * factor);
}

/**
 * Divide money by a divisor.
 */
export function divideMoney(value: number, divisor: number): number {
  if (divisor === 0) return 0;
  return roundMoney(value / divisor);
}

/**
 * Format money for display.
 * Uses Intl.NumberFormat.
 */
export function formatMoney(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  locale = "nl-NL"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}

/**
 * Format large money values compactly (UI helper).
 * Example: 1_250_000 => €1.25M
 */
export function formatMoneyCompact(
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  locale = "nl-NL"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}

/**
 * Parse a formatted money string back to number.
 * Note: Locale-dependent; keep usage limited (forms only).
 */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : roundMoney(parsed);
}

/**
 * Zero money helper.
 */
export function zero(): number {
  return 0;
}

/**
 * ✅ Backwards-compatible UI API:
 * Existing UI expects: money.format(x) and sometimes money.compact(x)
 */
export const money = {
  format: formatMoney,
  compact: formatMoneyCompact,
  round: roundMoney,
  add: addMoney,
  sub: subtractMoney,
  mul: multiplyMoney,
  div: divideMoney,
  parse: parseMoney,
  zero,
} as const;
