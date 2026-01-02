// src/core/domain/company.ts
import type{
  CompanyId,
  HoldingId,
  WorldId,
  SectorId,
  NicheId,
  RegionCode,
  Timestamp,
  Year,
  WeekNumber,
  Decimal,
  Money,
} from "./common";

/**
 * Company / BV entity.
 * Mirrors `companies` table.
 */

export type CompanyStatus =
  | "ACTIVE"
  | "LIQUIDATING"
  | "BANKRUPT"
  | "SOLD";

export type Company = {
  id: CompanyId;
  holdingId: HoldingId;
  worldId: WorldId;

  sectorId: SectorId;
  nicheId: NicheId;

  name: string;
  region: RegionCode;

  foundedYear: Year;
  status: CompanyStatus;

  createdAt: Timestamp;
};

/* =========================
 * Operational state (per week)
 * ========================= */

/**
 * Weekly operational state of a company.
 * Mirrors `company_state` table.
 */
export type CompanyState = {
  id: string; // row id (uuid), not branded because it's internal
  companyId: CompanyId;
  worldId: WorldId;

  year: Year;
  week: WeekNumber;

  /** Relative or absolute price level (engine decides meaning). */
  priceLevel: Decimal;

  /** Max producible / serviceable volume this week. */
  capacity: Decimal;

  /** Quality index (influences attractiveness). */
  qualityScore: Decimal;

  /** Marketing intensity / spend index. */
  marketingLevel: Decimal;

  /** Brand awareness score (0..100). */
  awarenessScore: Decimal;

  /** Headcount (or FTE-equivalent). */
  employees: number;

  /** Weekly fixed costs (rent, base salaries, etc.). */
  fixedCosts: Money;

  /** Variable cost per unit sold. */
  variableCostPerUnit: Money;

  /** Company-specific reputation/brand score. */
  reputationScore: Decimal;

  /** Operational efficiency score (0..100). */
  operationalEfficiencyScore: Decimal;

  /** Capacity utilisation (0..1), usually derived. */
  utilisationRate: Decimal;

  createdAt: Timestamp;
};

/* =========================
 * Financials & KPIs
 * ========================= */

/**
 * Derived KPIs for UI & analytics.
 * These are NOT persisted directly.
 */
export type CompanyKPI = {
  companyId: CompanyId;

  revenue: Money;
  netProfit: Money;

  marginPct: Decimal;

  /** Revenue level at which profit = 0. */
  breakEvenPoint: Decimal;

  utilisationRate: Decimal;
};

/**
 * Helper type used during simulation before persisting results.
 */
export type CompanySimulationResult = {
  companyId: CompanyId;

  demand: Decimal;
  soldVolume: Decimal;

  revenue: Money;
  variableCosts: Money;
  fixedCosts: Money;

  interestCost: Money;
  taxExpense: Money;

  netProfit: Money;
  cashChange: Money;

  overflowDemand: Decimal;
};
