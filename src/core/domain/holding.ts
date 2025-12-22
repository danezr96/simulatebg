// src/core/domain/holding.ts
import type {
  HoldingId,
  PlayerId,
  WorldId,
  CurrencyCode,
  Timestamp,
  Decimal,
  RiskAppetite,
} from "./common";

/**
 * Holding = financial / legal parent entity for a player in a world.
 * Mirrors `holdings` table.
 */

export type HoldingStatus = "ACTIVE" | "BANKRUPT" | "PRESTIGED";

export type Holding = {
  id: HoldingId;
  playerId: PlayerId;
  worldId: WorldId;

  name: string;
  baseCurrency: CurrencyCode;

  status: HoldingStatus;

  /** Liquid cash at holding level */
  cashBalance: Decimal;

  /** Aggregated equity across holding + companies */
  totalEquity: Decimal;

  /** Aggregated outstanding debt (holding + companies) */
  totalDebt: Decimal;

  prestigeLevel: number;

  createdAt: Timestamp;
};

/**
 * Snapshot for analytics / UI (mirrors optional holding_snapshots table).
 */
export type HoldingSnapshot = {
  holdingId: HoldingId;
  worldId: WorldId;

  year: number;
  week: number;

  netWorth: Decimal;
  totalAssets: Decimal;
  totalLiabilities: Decimal;
  totalDebt: Decimal;
};

/**
 * Holding-wide policy controls.
 * Used by engine & services when validating decisions.
 */
export type HoldingPolicy = {
  holdingId: HoldingId;

  /** Max allowed leverage = totalDebt / totalAssets */
  maxLeverageRatio: Decimal;

  /** Where profits should flow by default */
  dividendPreference: "HOLDING" | "REINVEST";

  /** Influences loan offers, bot behaviour & event risk */
  riskAppetite: RiskAppetite;
};
