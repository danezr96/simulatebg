// src/core/domain/investments.ts
import type {
  InvestmentId,
  PropertyId,
  HoldingId,
  CompanyId,
  WorldId,
  RegionCode,
  Timestamp,
  Money,
  Decimal,
  JsonObject,
} from "./common";

/**
 * Investments domain:
 * - properties (real estate)
 * - financial investments (ETF/BOND/etc.)
 *
 * Mirrors tables:
 * - properties
 * - investments
 */

export type PropertyType =
  | "OFFICE"
  | "WAREHOUSE"
  | "RETAIL"
  | "HOTEL"
  | "RESIDENTIAL"
  | "INDUSTRIAL"
  | "OTHER";

export type Property = {
  id: PropertyId;
  worldId: WorldId;

  holdingId?: HoldingId;
  companyId?: CompanyId;

  type: PropertyType;
  location: RegionCode;

  purchasePrice: Money;
  marketValue: Money;

  rentalIncomePerWeek: Money;
  maintenanceCostPerWeek: Money;

  createdAt: Timestamp;
};

export type InvestmentType =
  | "ETF"
  | "BOND"
  | "FUND"
  | "STOCK_INDEX"
  | "CASH_PRODUCT";

export type Investment = {
  id: InvestmentId;
  worldId: WorldId;

  holdingId: HoldingId;

  type: InvestmentType;
  name: string;

  currentValue: Money;
  costBasis: Money;

  /** Optional extra info like expectedReturn, volatility, correlationGroup etc. */
  meta: JsonObject;

  createdAt: Timestamp;
};

/**
 * Optional: investment product archetype (seeded).
 * If you implement `investment_products.json`, this is the shape.
 */
export type InvestmentProduct = {
  key: string;
  type: InvestmentType;
  name: string;

  expectedAnnualReturn: Decimal;
  annualVolatility: Decimal;

  /** Correlation group for crude correlation modeling */
  correlationGroup: string;

  /** Optional fees */
  annualFee?: Decimal;

  meta?: JsonObject;
};
