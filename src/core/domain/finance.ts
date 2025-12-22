// src/core/domain/finance.ts
import type {
  CompanyId,
  HoldingId,
  WorldId,
  LoanId,
  Timestamp,
  Year,
  WeekNumber,
  Decimal,
  Money,
} from "./common";

/**
 * Finance domain:
 * - loans (holding + company)
 * - weekly company financials (P&L + balance deltas)
 * - holding snapshot (aggregated view)
 *
 * Mirrors tables:
 * - loans
 * - company_financials
 * - (optional) holding_snapshots / holding_financial_snapshots
 */

export type LoanType = "HOLDING" | "COMPANY";
export type LoanStatus = "ACTIVE" | "PAID_OFF" | "DEFAULTED";

export type Loan = {
  id: LoanId;
  worldId: WorldId;

  holdingId?: HoldingId;
  companyId?: CompanyId;

  principal: Money;
  outstandingBalance: Money;

  /** Annual interest rate as fraction (0.02 = 2%). */
  interestRate: Decimal;

  termWeeks: number;
  remainingWeeks: number;

  lenderName: string;

  type: LoanType;
  status: LoanStatus;

  createdAt: Timestamp;
};

/**
 * Weekly company financial result.
 * Mirrors `company_financials`.
 */
export type CompanyFinancials = {
  id: string; // row uuid

  companyId: CompanyId;
  worldId: WorldId;

  year: Year;
  week: WeekNumber;

  revenue: Money;
  cogs: Money; // cost of goods sold (variable costs)
  opex: Money; // operating expenses (fixed costs etc.)
  interestCost: Money;
  taxExpense: Money;

  netProfit: Money;

  /** Net cash change this week. */
  cashChange: Money;

  // Simple balance sheet totals (optional but useful for leverage)
  assets: Money;
  liabilities: Money;
  equity: Money;

  createdAt: Timestamp;
};

/**
 * Holding aggregated snapshot (weekly).
 * Mirrors optional `holding_snapshots` (if you add it), and/or computed live.
 */
export type HoldingFinancialSnapshot = {
  holdingId: HoldingId;
  worldId: WorldId;

  year: Year;
  week: WeekNumber;

  totalAssets: Money;
  totalLiabilities: Money;
  totalDebt: Money;

  netWorth: Money;
};

/**
 * Tax configuration used by engine (usually from src/config/economy.ts),
 * kept here for documentation and strong typing between engine modules.
 */
export type TaxConfig = {
  corporateTaxRate: Decimal; // flat rate (for v0)
  dividendTaxRate: Decimal;
};

/**
 * Finance engine interim calculations.
 */
export type InterestComputation = {
  loanId: LoanId;
  weeklyRate: Decimal;
  interestCost: Money;
};
