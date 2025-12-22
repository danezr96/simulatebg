// src/core/domain/decisions.ts
import type{
  CompanyId,
  HoldingId,
  WorldId,
  Year,
  WeekNumber,
  Timestamp,
  DecisionSource,
  Decimal,
  Money,
  RegionCode,
  SectorId,
  NicheId,
  LoanId,
  PropertyId,
  InvestmentId,
  JsonObject,
} from "./common";
import type { CompanyEffectModifiers } from "./programs";

/**
 * Decisions are stored as jsonb payloads in DB.
 * This file defines the canonical TS payload shapes.
 *
 * Tables:
 * - company_decisions
 * - holding_decisions (recommended; if you didn't create it yet, do it now)
 */

/* =========================
 * Company decisions
 * ========================= */

export type CompanyDecisionType =
  | "SET_PRICE"
  | "SET_MARKETING"
  | "SET_STAFFING"
  | "SET_OPERATIONS_INTENSITY"
  | "ADJUST_OPENING_HOURS"
  | "INVEST_CAPACITY"
  | "INVEST_QUALITY"
  | "START_PROJECT"
  | "CANCEL_PROJECT"
  | "START_PROGRAM"
  | "CANCEL_PROGRAM"
  | "BUY_UPGRADE"
  | "TAKE_COMPANY_LOAN"
  | "REPAY_COMPANY_LOAN"
  | "DISTRIBUTE_DIVIDEND"
  | "REQUEST_CAPITAL_INJECTION";

export type SetPriceDecision = {
  type: "SET_PRICE";
  /**
   * Price level: relative to niche reference price (1.0 baseline).
   * Example: 0.9 = cheaper, 1.1 = premium.
   */
  priceLevel: Decimal;
};

export type SetMarketingDecision = {
  type: "SET_MARKETING";
  /**
   * Marketing index/spend level.
   * Keep it an index first (engine can translate to money).
   */
  marketingLevel: Decimal;
  /** Optional hard budget cap (if used) */
  budgetCap?: Money;
};

export type SetStaffingDecision = {
  type: "SET_STAFFING";
  /**
   * Employees (FTE) target.
   * Engine can model hiring/firing delays based on niche.
   */
  targetEmployees: number;
};

export type SetOperationsIntensityDecision = {
  type: "SET_OPERATIONS_INTENSITY";
  /**
   * 0..1: how hard the company runs its operations.
   * Can affect quality, utilisation and variable costs.
   */
  intensity: Decimal;
};

export type AdjustOpeningHoursDecision = {
  type: "ADJUST_OPENING_HOURS";
  /**
   * 0..1: availability multiplier for service businesses.
   * (Restaurants = more shifts; delivery = more time slots)
   */
  availability: Decimal;
};

export type InvestCapacityDecision = {
  type: "INVEST_CAPACITY";
  /**
   * Add capacity units (abstract). Engine converts to actual capex & depreciation.
   */
  addCapacity: Decimal;
  /** Optional intended capex budget */
  budget?: Money;
};

export type InvestQualityDecision = {
  type: "INVEST_QUALITY";
  /**
   * Add quality points (abstract). Engine converts to capex/opex and reputation effects.
   */
  addQuality: Decimal;
  /** Optional intended capex budget */
  budget?: Money;
};

export type StartProjectDecision = {
  type: "START_PROJECT";
  /**
   * Project key references a seeded list (future: `projects` table).
   */
  projectKey: string;
  /** Optional config overrides */
  params?: JsonObject;
};

export type CancelProjectDecision = {
  type: "CANCEL_PROJECT";
  projectKey: string;
};

export type StartProgramDecision = {
  type: "START_PROGRAM";
  programType: string;
  durationWeeks: number;
  effects?: CompanyEffectModifiers;
  weeklyCost?: Money;
  label?: string;
};

export type CancelProgramDecision = {
  type: "CANCEL_PROGRAM";
  programId: string;
};

export type BuyUpgradeDecision = {
  type: "BUY_UPGRADE";
  upgradeId: string;
};

export type TakeCompanyLoanDecision = {
  type: "TAKE_COMPANY_LOAN";
  /** Offer id (if you model offers) or existing loan id if created immediately */
  loanId?: LoanId;
  principal: Money;
  termWeeks: number;
};

export type RepayCompanyLoanDecision = {
  type: "REPAY_COMPANY_LOAN";
  loanId: LoanId;
  amount: Money;
};

export type DistributeDividendDecision = {
  type: "DISTRIBUTE_DIVIDEND";
  amount: Money;
};

export type RequestCapitalInjectionDecision = {
  type: "REQUEST_CAPITAL_INJECTION";
  amount: Money;
  reason?: string;
};

export type CompanyDecisionPayload =
  | SetPriceDecision
  | SetMarketingDecision
  | SetStaffingDecision
  | SetOperationsIntensityDecision
  | AdjustOpeningHoursDecision
  | InvestCapacityDecision
  | InvestQualityDecision
  | StartProjectDecision
  | CancelProjectDecision
  | StartProgramDecision
  | CancelProgramDecision
  | BuyUpgradeDecision
  | TakeCompanyLoanDecision
  | RepayCompanyLoanDecision
  | DistributeDividendDecision
  | RequestCapitalInjectionDecision;

export type CompanyDecision = {
  id: string; // uuid
  companyId: CompanyId;
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  source: DecisionSource;
  payload: CompanyDecisionPayload;
  createdAt: Timestamp;
};

/* =========================
 * Holding decisions
 * ========================= */

export type HoldingDecisionType =
  | "TAKE_HOLDING_LOAN"
  | "REPAY_HOLDING_LOAN"
  | "INJECT_CAPITAL"
  | "WITHDRAW_DIVIDEND"
  | "BUY_PROPERTY"
  | "SELL_PROPERTY"
  | "BUY_INVESTMENT"
  | "SELL_INVESTMENT"
  | "START_COMPANY"
  | "SELL_COMPANY"
  | "SET_HOLDING_POLICY";

export type TakeHoldingLoanDecision = {
  type: "TAKE_HOLDING_LOAN";
  loanId?: LoanId;
  principal: Money;
  termWeeks: number;
};

export type RepayHoldingLoanDecision = {
  type: "REPAY_HOLDING_LOAN";
  loanId: LoanId;
  amount: Money;
};

export type InjectCapitalDecision = {
  type: "INJECT_CAPITAL";
  companyId: CompanyId;
  amount: Money;
};

export type WithdrawDividendDecision = {
  type: "WITHDRAW_DIVIDEND";
  companyId: CompanyId;
  amount: Money;
};

export type BuyPropertyDecision = {
  type: "BUY_PROPERTY";
  propertyId?: PropertyId;
  location: RegionCode;
  propertyType: string; // keep flexible; validated elsewhere
  purchasePrice: Money;
};

export type SellPropertyDecision = {
  type: "SELL_PROPERTY";
  propertyId: PropertyId;
};

export type BuyInvestmentDecision = {
  type: "BUY_INVESTMENT";
  investmentId?: InvestmentId;
  investmentType: string; // ETF/BOND/etc. validated elsewhere
  name: string;
  amount: Money;
};

export type SellInvestmentDecision = {
  type: "SELL_INVESTMENT";
  investmentId: InvestmentId;
  amount: Money;
};

export type StartCompanyDecision = {
  type: "START_COMPANY";
  sectorId: SectorId;
  nicheId: NicheId;
  name: string;
  region: RegionCode;
  /** Seed capital from holding into company cash (if you model company cash separately later) */
  seedCapital?: Money;
};

export type SellCompanyDecision = {
  type: "SELL_COMPANY";
  companyId: CompanyId;
};

export type SetHoldingPolicyDecision = {
  type: "SET_HOLDING_POLICY";
  maxLeverageRatio?: Decimal;
  dividendPreference?: "HOLDING" | "REINVEST";
  riskAppetite?: "LOW" | "MEDIUM" | "HIGH";
};

export type HoldingDecisionPayload =
  | TakeHoldingLoanDecision
  | RepayHoldingLoanDecision
  | InjectCapitalDecision
  | WithdrawDividendDecision
  | BuyPropertyDecision
  | SellPropertyDecision
  | BuyInvestmentDecision
  | SellInvestmentDecision
  | StartCompanyDecision
  | SellCompanyDecision
  | SetHoldingPolicyDecision;

export type HoldingDecision = {
  id: string; // uuid
  holdingId: HoldingId;
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  source: DecisionSource;
  payload: HoldingDecisionPayload;
  createdAt: Timestamp;
};
