// src/core/domain/sector.ts
import type {
  SectorId,
  NicheId,
  WorldId,
  Year,
  WeekNumber,
  Decimal,
  JsonObject,
} from "./common";

/**
 * Sector & niche definitions.
 * - sectors, niches are mostly static (seeded)
 * - world_sector_state is dynamic per world
 */

/* =========================
 * Sector & Niche (static)
 * ========================= */

export type Sector = {
  id: SectorId;
  code: string; // e.g. "HORECA", "TECH"
  name: string;
  description?: string;
};

export type CompetitionType = "FRAGMENTED" | "OLIGOPOLY" | "MONOPOLY_LIKE";

export type CapexIntensity = "LOW" | "MEDIUM" | "HIGH";
export type TicketSize = "LOW" | "MEDIUM" | "HIGH";

/**
 * Monthly seasonality multipliers (length = 12).
 * Example: [0.9, 0.95, 1.0, 1.05, ...]
 */
export type SeasonalityPattern = {
  monthlyFactors: number[]; // 12 entries
};

/**
 * Niche configuration that drives the simulation engine.
 * This is the economic “fingerprint” of a niche.
 */
export type NicheConfig = {
  capexIntensity: CapexIntensity;

  /** Expected net margin range (fractional). */
  marginRange: {
    min: Decimal; // e.g. 0.05
    max: Decimal; // e.g. 0.18
  };

  /** Std dev of demand shocks per week. */
  demandVolatility: Decimal;

  /** Price elasticity of demand (higher = more sensitive). */
  priceElasticity: Decimal;

  /** Labour required per unit of output. */
  labourIntensity: Decimal;

  /** Importance of skill/quality of staff. */
  skillIntensity: Decimal;

  /** Likelihood & impact of regulation/compliance events. */
  regulationRisk: Decimal;

  /** Average asset lifetime for depreciation (years). */
  assetLifetimeYears: number;

  /** How easily capacity can be scaled up/down. */
  capacityElasticity: Decimal;

  ticketSize: TicketSize;

  /** Baseline demand index for this niche. */
  baseDemandLevel: Decimal;

  seasonalityPattern: SeasonalityPattern;

  competitionType: CompetitionType;

  /** Decision profile key to drive niche-specific choices (UI + engine). */
  decisionProfile?: string;

  /** Upgrade profile key to drive niche-specific upgrade trees. */
  upgradeProfile?: string;
};

export type Niche = {
  id: NicheId;
  sectorId: SectorId;
  code: string; // e.g. "HORECA_CAFE"
  name: string;
  description?: string;
  config: NicheConfig;
};

/* =========================
 * World sector state (dynamic)
 * ========================= */

export type SectorRoundMetrics = {
  year: Year;
  week: WeekNumber;

  averagePrice: Decimal;
  averageMargin: Decimal;

  totalRevenue: Decimal;
  totalSoldVolume: Decimal;

  numberOfActiveCompanies: number;
};

/**
 * Dynamic state of a sector within a specific world.
 * Mirrors `world_sector_state`.
 */
export type WorldSectorState = {
  worldId: WorldId;
  sectorId: SectorId;

  /** Current aggregate demand level (volume index). */
  currentDemand: Decimal;

  /** Long-term trend multiplier (e.g. tech boom). */
  trendFactor: Decimal;

  /** Short-term volatility parameter. */
  volatility: Decimal;

  lastRoundMetrics?: SectorRoundMetrics;

  /** Optional free-form meta (debug, analytics). */
  meta?: JsonObject;
};
