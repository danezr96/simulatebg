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
  AcquisitionOfferId,
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
  | "SET_PRODUCT_PLAN"
  | "SET_PRICE"
  | "SET_MARKETING"
  | "SET_STAFFING"
  | "SET_OPERATIONS_INTENSITY"
  | "ADJUST_OPENING_HOURS"
  | "SET_CARWASH_OPERATIONS"
  | "SET_CARWASH_WAREHOUSE"
  | "SET_CARWASH_PROCUREMENT"
  | "SET_CARWASH_MARKETING"
  | "SET_CARWASH_HR"
  | "SET_CARWASH_PRICING"
  | "SET_CARWASH_FINANCE"
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

export type ProductPlanItem = {
  sku: string;
  priceEur: Money;
  volumeShare: Decimal;
  bufferWeeks: Decimal;
};

export type SetProductPlanDecision = {
  type: "SET_PRODUCT_PLAN";
  version: number;
  items: ProductPlanItem[];
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

export type CarwashEnergyMode = "normal" | "eco" | "peak_avoid";

export type CarwashQueuePolicy = "walk_in_only" | "reservations";

export type SetCarwashOperationsDecision = {
  type: "SET_CARWASH_OPERATIONS";
  openStatus?: boolean;
  maintenanceLevel?: number;
  energyMode?: CarwashEnergyMode;
  queuePolicy?: CarwashQueuePolicy;
  targetOutputBySku?: Record<string, number>;
  staffAllocationByRole?: Record<string, number>;
};

export type SetCarwashWarehouseDecision = {
  type: "SET_CARWASH_WAREHOUSE";
  orderQtyByCategory?: Record<string, number>;
  reorderPointByCategory?: Record<string, number>;
  safetyStockByCategory?: Record<string, number>;
  storageUpgrades?: number[];
};

export type SetCarwashProcurementDecision = {
  type: "SET_CARWASH_PROCUREMENT";
  supplierTierByCategory?: Record<string, "A" | "B" | "C">;
  contractTypeByCategory?: Record<string, "spot" | "contract_7d" | "contract_30d">;
  qualityLevel?: "budget" | "standard" | "premium";
};

export type SetCarwashMarketingDecision = {
  type: "SET_CARWASH_MARKETING";
  campaignBudgetByKey?: Record<string, number>;
  campaignDurationWeeksByKey?: Record<string, number>;
};

export type SetCarwashHrDecision = {
  type: "SET_CARWASH_HR";
  hireFireByRole?: Record<string, number>;
  wagePolicyByRole?: Record<string, number>;
  trainingLevel?: number;
  shiftPlan?: "balanced" | "extended" | "peak_only";
};

export type SetCarwashPricingDecision = {
  type: "SET_CARWASH_PRICING";
  promoDiscountPct?: number;
  promoDurationTicks?: number;
};

export type SetCarwashFinanceDecision = {
  type: "SET_CARWASH_FINANCE";
  extraRepayPerTick?: number;
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
  | SetProductPlanDecision
  | SetPriceDecision
  | SetMarketingDecision
  | SetStaffingDecision
  | SetOperationsIntensityDecision
  | AdjustOpeningHoursDecision
  | SetCarwashOperationsDecision
  | SetCarwashWarehouseDecision
  | SetCarwashProcurementDecision
  | SetCarwashMarketingDecision
  | SetCarwashHrDecision
  | SetCarwashPricingDecision
  | SetCarwashFinanceDecision
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
  | "BUY_COMPANY"
  | "SUBMIT_ACQUISITION_OFFER"
  | "ACCEPT_ACQUISITION_OFFER"
  | "REJECT_ACQUISITION_OFFER"
  | "COUNTER_ACQUISITION_OFFER"
  | "WITHDRAW_ACQUISITION_OFFER"
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

export type BuyCompanyDecision = {
  type: "BUY_COMPANY";
  companyId: CompanyId;
  offerPrice: Money;
};

export type SubmitAcquisitionOfferDecision = {
  type: "SUBMIT_ACQUISITION_OFFER";
  companyId: CompanyId;
  offerPrice: Money;
  message?: string;
  expiresInWeeks?: number;
};

export type AcceptAcquisitionOfferDecision = {
  type: "ACCEPT_ACQUISITION_OFFER";
  offerId: AcquisitionOfferId;
};

export type RejectAcquisitionOfferDecision = {
  type: "REJECT_ACQUISITION_OFFER";
  offerId: AcquisitionOfferId;
  reason?: string;
};

export type CounterAcquisitionOfferDecision = {
  type: "COUNTER_ACQUISITION_OFFER";
  offerId: AcquisitionOfferId;
  counterPrice: Money;
  message?: string;
};

export type WithdrawAcquisitionOfferDecision = {
  type: "WITHDRAW_ACQUISITION_OFFER";
  offerId: AcquisitionOfferId;
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
  | BuyCompanyDecision
  | SubmitAcquisitionOfferDecision
  | AcceptAcquisitionOfferDecision
  | RejectAcquisitionOfferDecision
  | CounterAcquisitionOfferDecision
  | WithdrawAcquisitionOfferDecision
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
