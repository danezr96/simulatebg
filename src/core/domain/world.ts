// src/core/domain/world.ts
import type { SeasonId, Timestamp, WorldId, JsonObject, Decimal } from "./common";
import type { GameTime } from "./time";

/**
 * World configuration + macro economy state.
 * Mirrors tables:
 * - worlds
 * - world_economy_state
 *
 * NOTE:
 * - WorldRound / WorldRoundStatus live in ./time
 *   (to avoid duplicate exports in domain/index.ts)
 */

export type WorldMode = "NORMAL" | "FAST" | "SLOW" | "HARDCORE";
export type WorldStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type World = {
  id: WorldId;
  name: string;
  mode: WorldMode;
  status: WorldStatus;
  baseRoundIntervalSeconds: number;
  seasonId?: SeasonId;
  createdAt: Timestamp;
};

export type WorldMacroModifiers = {
  /** Multiplier on global demand across all sectors. (1.0 baseline) */
  demandGlobalFactor: number;
  /** Multiplier on energy-related costs. */
  costEnergyFactor: number;
  /** Multiplier on labour-related costs. */
  costLabourFactor: number;
  /** Global risk modifier, used by event engine. */
  riskGlobalFactor: number;
};

export type WorldEconomyState = {
  worldId: WorldId;

  currentYear: number; // persisted as number; cast to Year when needed
  currentWeek: number; // persisted as number; cast to WeekNumber when needed

  /** Annual base interest rate (0.02 = 2%). */
  baseInterestRate: Decimal;

  /** Annual inflation rate (0.02 = 2%). */
  inflationRate: Decimal;

  /** Wage index baseline (1.0 at start). */
  baseWageIndex: Decimal;

  lastTickAt?: Timestamp;
  lastTickStartedAt?: Timestamp;
  isTicking: boolean;

  macroModifiers: WorldMacroModifiers;
};

export type WorldMatchmakingConfig = {
  enabled: boolean;
  minReputation?: number;
  maxReputation?: number;
  minNetWorth?: number;
  maxNetWorth?: number;
};

export type WorldRuntimeState = {
  world: World;
  economy: WorldEconomyState;
  time: GameTime;
};

/**
 * Safe defaults if DB json is empty.
 */
export const DEFAULT_MACRO_MODIFIERS: WorldMacroModifiers = {
  demandGlobalFactor: 1,
  costEnergyFactor: 1,
  costLabourFactor: 1,
  riskGlobalFactor: 1,
};

/**
 * Parse macro modifiers from jsonb (defensive).
 */
export function parseMacroModifiers(json: JsonObject | null | undefined): WorldMacroModifiers {
  const j = json ?? {};
  return {
    demandGlobalFactor: typeof j["demandGlobalFactor"] === "number" ? (j["demandGlobalFactor"] as number) : 1,
    costEnergyFactor: typeof j["costEnergyFactor"] === "number" ? (j["costEnergyFactor"] as number) : 1,
    costLabourFactor: typeof j["costLabourFactor"] === "number" ? (j["costLabourFactor"] as number) : 1,
    riskGlobalFactor: typeof j["riskGlobalFactor"] === "number" ? (j["riskGlobalFactor"] as number) : 1,
  };
}
