// src/core/domain/player.ts
import type { CurrencyCode, PlayerId, Timestamp, Decimal, JsonObject } from "./common";
import { asDecimal } from "./common";

/**
 * Player = tycoon identity (per Supabase auth user).
 * Mirrors `players` table.
 */
export type Player = {
  id: PlayerId;
  userId: string; // auth.users.id (uuid as string)

  name: string;
  avatarUrl?: string;

  baseCurrency: CurrencyCode;

  /**
   * Reputation model (schema-aligned split).
   * Levels: integer 1..999
   * XP: Decimal (may be fractional)
   */
  brandRepLevel: number;
  brandRepXp: Decimal;

  creditRepLevel: number;
  creditRepXp: Decimal;

  /**
   * Prestige: long-term status indicator (1..999).
   * (Keep number type; enforce range in engine/services)
   */
  prestigeLevel: number;

  createdAt: Timestamp;

  /**
   * Optional meta blob if you later want flexible profile flags/settings
   * without adding columns.
   * NOTE: Only map to/from DB if you have a `meta` jsonb column.
   */
  meta?: JsonObject;
};

export type PlayerStatsPoint = {
  year: number;
  week: number;
  netWorth: number;
};

export type PlayerStats = {
  playerId: PlayerId;
  totalNetWorthHistory: PlayerStatsPoint[];

  totalCompaniesFounded: number;
  totalBankruptcies: number;
};

export type PlayerReputationChangeReason =
  | "CONSISTENT_PROFIT"
  | "LOSS_STREAK"
  | "BANKRUPTCY"
  | "EVENT_POSITIVE"
  | "EVENT_NEGATIVE"
  | "SKILL_UNLOCK"
  | "ACHIEVEMENT"
  | "SYSTEM_ADJUST";

/**
 * Defaults for creation/seed/bootstrap.
 * Use these whenever you create a new Player.
 */
export const DEFAULT_PLAYER_REPUTATION = {
  brandRepLevel: 1,
  brandRepXp: asDecimal(0),
  creditRepLevel: 1,
  creditRepXp: asDecimal(0),
  prestigeLevel: 1,
} as const;

/**
 * Helpers (keeps UI/engine readable + avoids fake fields on Player)
 */
export function getOverallReputationLevel(
  p: Pick<Player, "brandRepLevel" | "creditRepLevel">
): number {
  return Math.round((p.brandRepLevel + p.creditRepLevel) / 2);
}

export function clampRepLevel(level: number): number {
  return Math.max(1, Math.min(999, Math.floor(level)));
}

export function clampRepXp(xp: number): Decimal {
  return asDecimal(Math.max(0, xp));
}
