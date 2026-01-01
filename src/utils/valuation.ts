import type { CompanyFinancials } from "../core/domain";

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function estimateCompanyLiquidationValue(financials: CompanyFinancials | null): number {
  const revenue = safeNumber(financials?.revenue, 0);
  const netProfit = safeNumber(financials?.netProfit, 0);
  const equity = safeNumber((financials as any)?.equity, 0);
  return Math.max(10_000, revenue * 1.1, netProfit * 6, equity * 1.2);
}
