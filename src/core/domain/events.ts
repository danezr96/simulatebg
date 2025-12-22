// src/core/domain/events.ts
import type{
  EventId,
  WorldId,
  SectorId,
  CompanyId,
  HoldingId,
  Timestamp,
  Year,
  WeekNumber,
  Decimal,
  JsonObject,
} from "./common";

/**
 * Events domain.
 * Used by:
 * - macro engine (world events)
 * - sector engine (sector shocks)
 * - company engine (fines, strikes, PR wins)
 *
 * Mirrors `events` table.
 */

export type EventScope = "WORLD" | "SECTOR" | "COMPANY" | "HOLDING";

export type EventType =
  // World / macro
  | "MACRO_SHOCK"
  | "SEASON_EFFECT"
  | "GLOBAL_CRISIS"

  // Sector-level
  | "SECTOR_BOOM"
  | "SECTOR_CRASH"
  | "SECTOR_REGULATION"

  // Company-level
  | "COMPANY_FINE"
  | "COMPANY_STRIKE"
  | "COMPANY_PR_AWARD"
  | "COMPANY_SCANDAL"
  | "COMPANY_INNOVATION"

  // Holding-level
  | "HOLDING_RESTRUCTURE"
  | "BANK_RESCUE"

  // Terminal
  | "BANKRUPTCY";

/**
 * Core event object.
 */
export type GameEvent = {
  id: EventId;

  worldId: WorldId;
  sectorId?: SectorId;
  companyId?: CompanyId;
  holdingId?: HoldingId;

  scope: EventScope;
  type: EventType;

  /**
   * Severity multiplier.
   * >1 = stronger impact, <1 = milder.
   */
  severity: Decimal;

  /**
   * Free-form payload:
   * - fines
   * - demand multipliers
   * - cost shocks
   * - reputation deltas
   */
  payload: JsonObject;

  year: Year;
  week: WeekNumber;

  createdAt: Timestamp;
};

/**
 * Helper type used by the engine before persisting an event.
 */
export type PendingEvent = Omit<GameEvent, "id" | "createdAt">;

/**
 * Event effect interfaces (optional, for engine clarity).
 */
export type DemandShockEffect = {
  demandMultiplier: Decimal;
  durationWeeks?: number;
};

export type CostShockEffect = {
  costMultiplier: Decimal;
  durationWeeks?: number;
};

export type ReputationEffect = {
  reputationDelta: Decimal;
};
