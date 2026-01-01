import type { CompanyDecisionPayload } from "../domain";
import type { DraftUpgradeItem, WhatIfInput, WhatIfProjection } from "./types";
import { buildBaselineProjection } from "./baseline";

const EXCLUSIVE_DECISION_TYPES = new Set<string>([
  "SET_PRICE",
  "SET_MARKETING",
  "SET_STAFFING",
  "INVEST_CAPACITY",
  "INVEST_QUALITY",
  "SET_PRODUCT_PLAN",
]);

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function mergeDecisions(
  base: CompanyDecisionPayload[] | undefined,
  draft: CompanyDecisionPayload[] | undefined,
  draftUpgrades: DraftUpgradeItem[]
): CompanyDecisionPayload[] {
  const merged: CompanyDecisionPayload[] = [];
  const lastExclusive = new Map<string, CompanyDecisionPayload>();

  const ingest = (payload: CompanyDecisionPayload) => {
    const type = typeof payload?.type === "string" ? payload.type : "";
    if (EXCLUSIVE_DECISION_TYPES.has(type)) {
      lastExclusive.set(type, payload);
      return;
    }
    merged.push(payload);
  };

  base?.forEach(ingest);
  draft?.forEach(ingest);

  for (const upgrade of draftUpgrades) {
    if (!upgrade?.upgradeId) continue;
    merged.push({ type: "BUY_UPGRADE", upgradeId: upgrade.upgradeId } as any);
  }

  merged.push(...Array.from(lastExclusive.values()));
  return merged;
}

function sumAllocations(allocations: Record<string, number> | undefined): number {
  if (!allocations) return 0;
  return Object.values(allocations).reduce((sum, value) => sum + toNumber(value, 0), 0);
}

export function buildWhatIfProjection(input: WhatIfInput): WhatIfProjection {
  const baseline = input.baseline ?? buildBaselineProjection(input);

  const draftByCompany = input.draftCompanyDecisions ?? {};
  const draftUpgrades = input.draftUpgradeQueue ?? [];

  const companies = input.companies.map((entry) => {
    const companyId = String(entry.company.id);
    const upgradesForCompany = draftUpgrades.filter((u) => String(u.companyId) === companyId);
    const merged = mergeDecisions(entry.decisions, draftByCompany[companyId], upgradesForCompany);
    return { ...entry, decisions: merged };
  });

  const projection = buildBaselineProjection({
    ...input,
    companies,
  });

  const allocationDelta = sumAllocations(input.draftHoldingAllocations);
  if (allocationDelta !== 0) {
    projection.expectedEndCash -= allocationDelta;
    projection.safeToSpendCash -= allocationDelta;
    projection.riskBandEndCash = {
      worst: projection.riskBandEndCash.worst - allocationDelta,
      expected: projection.riskBandEndCash.expected - allocationDelta,
      best: projection.riskBandEndCash.best - allocationDelta,
    };
  }

  const deltas = {
    revenue: projection.expectedRevenue - baseline.expectedRevenue,
    costs: projection.expectedCosts - baseline.expectedCosts,
    profit: projection.expectedProfit - baseline.expectedProfit,
    endCash: projection.expectedEndCash - baseline.expectedEndCash,
    safeToSpendCash: projection.safeToSpendCash - baseline.safeToSpendCash,
  };

  const companyDeltas = projection.companies.map((company) => {
    const base = baseline.companies.find((c) => c.companyId === company.companyId);
    return {
      companyId: company.companyId,
      revenue: company.expectedRevenue - toNumber(base?.expectedRevenue, 0),
      costs: company.expectedCosts - toNumber(base?.expectedCosts, 0),
      profit: company.expectedProfit - toNumber(base?.expectedProfit, 0),
      endCash: company.expectedEndCash - toNumber(base?.expectedEndCash, 0),
    };
  });

  return {
    ...projection,
    deltas,
    companyDeltas,
  };
}
