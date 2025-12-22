// src/core/domain/bots.ts
import type{
  BotId,
  BotProfileId,
  WorldId,
  HoldingId,
  Decimal,
  Timestamp,
  JsonObject,
} from "./common";

/**
 * Bots domain.
 * Bots are first-class citizens in the simulation:
 * - they own holdings
 * - they create companies
 * - they make decisions using the same decision system as players
 *
 * Mirrors tables:
 * - bot_profiles
 * - bots
 */

/* =========================
 * Bot profiles (templates)
 * ========================= */

export type BotBehaviorArchetype =
  | "DISCOUNTER"
  | "PREMIUM"
  | "CONSERVATIVE"
  | "AGGRESSIVE_LEVERAGED"
  | "OPPORTUNISTIC";

export type BotBehaviorConfig = {
  /** How aggressively the bot undercuts / overprices competitors */
  priceAggressiveness: Decimal; // 0..1+

  /** Willingness to spend on marketing */
  marketingAggressiveness: Decimal; // 0..1+

  /** Preference for debt / leverage */
  leveragePreference: Decimal; // 0..1+

  /** How fast the bot expands capacity / opens new companies */
  expansionSpeed: Decimal; // 0..1+

  /** Tolerance for risk, losses, volatility */
  riskTolerance: Decimal; // 0..1+

  /** Whether the bot reacts strongly to dominant players */
  reactToDominantPlayer: boolean;

  /** Optional extra tuning knobs */
  meta?: JsonObject;
};

export type BotProfile = {
  id: BotProfileId;
  name: string;
  archetype: BotBehaviorArchetype;
  behaviorConfig: BotBehaviorConfig;
};

/* =========================
 * Bot instances (per world)
 * ========================= */

export type Bot = {
  id: BotId;
  worldId: WorldId;
  botProfileId: BotProfileId;

  /** Each bot controls exactly one holding */
  holdingId: HoldingId;

  active: boolean;

  createdAt: Timestamp;
};

/**
 * Runtime bot state (NOT persisted).
 * Used by botsEngine during a simulation tick.
 */
export type BotRuntimeContext = {
  bot: Bot;
  profile: BotProfile;

  /** Cached aggressiveness score used during decision-making */
  aggressionScore: Decimal;

  /** Cached risk score */
  riskScore: Decimal;
};
