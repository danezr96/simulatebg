// src/utils/format.ts

/**
 * Formatting helpers for UI display.
 * These helpers NEVER change underlying data,
 * they only convert values to human-readable strings.
 */

import { formatMoney, formatMoneyCompact } from "./money";
import type {CurrencyCode } from "./money";

/**
 * Format a plain number with locale-aware separators.
 */
export function formatNumber(
  value: number,
  locale = "nl-NL",
  decimals = 0
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a percentage.
 * Input is expected as fraction (e.g. 0.123 → 12.3%).
 */
export function formatPercent(
  value: number,
  locale = "nl-NL",
  decimals = 1
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format money (full).
 */
export function formatCurrency(
  value: number,
  currency: CurrencyCode = "EUR",
  locale = "nl-NL"
): string {
  return formatMoney(value, currency, locale);
}

/**
 * Format money (compact, e.g. €1.2M).
 */
export function formatCurrencyCompact(
  value: number,
  currency: CurrencyCode = "EUR",
  locale = "nl-NL"
): string {
  return formatMoneyCompact(value, currency, locale);
}

/**
 * Format date from ISO string.
 */
export function formatDate(
  isoDate: string,
  locale = "nl-NL",
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...options,
  }).format(date);
}

/**
 * Format year + week to display label.
 * Example: Y3 · W14
 */
export function formatYearWeek(year: number, week: number): string {
  return `Y${year} · W${week}`;
}

/**
 * Format KPI values with sensible defaults.
 */
export function formatKpi(
  value: number,
  type: "money" | "money-compact" | "percent" | "number",
  options?: {
    currency?: CurrencyCode;
    locale?: string;
    decimals?: number;
  }
): string {
  const locale = options?.locale ?? "nl-NL";

  switch (type) {
    case "money":
      return formatMoney(value, options?.currency ?? "EUR", locale);
    case "money-compact":
      return formatMoneyCompact(value, options?.currency ?? "EUR", locale);
    case "percent":
      return formatPercent(value, locale, options?.decimals ?? 1);
    case "number":
    default:
      return formatNumber(value, locale, options?.decimals ?? 0);
  }
}

/**
 * Fallback display helper.
 */
export function dashIfEmpty<T>(
  value: T | null | undefined,
  formatter?: (v: T) => string
): string {
  if (value === null || value === undefined) return "—";
  return formatter ? formatter(value) : String(value);
}

// src/utils/format.ts
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

