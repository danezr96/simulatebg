// src/core/domain/time.ts
import type{ RoundId, Timestamp, WeekNumber, WorldId, Year } from "./common";

/**
 * In-game time representation.
 * Week numbers are 1..52 (engine should clamp/rollover).
 */
export type GameTime = {
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
};

/**
 * World round log entry (mirrors `world_rounds` table).
 */
export type WorldRoundStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type WorldRound = {
  id: RoundId;
  worldId: WorldId;
  year: Year;
  week: WeekNumber;
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  status: WorldRoundStatus;
};

/**
 * Helpers
 */
export function isSameTime(a: GameTime, b: GameTime): boolean {
  return a.worldId === b.worldId && a.year === b.year && a.week === b.week;
}

/**
 * Increment time by 1 week, rolling over year after week 52.
 */
export function nextWeek(t: GameTime): GameTime {
  const week = Number(t.week);
  const year = Number(t.year);

  if (week >= 52) {
    return {
      worldId: t.worldId,
      year: (year + 1) as Year,
      week: 1 as WeekNumber,
    };
  }

  return {
    worldId: t.worldId,
    year: t.year,
    week: (week + 1) as WeekNumber,
  };
}

/**
 * Convert a (year, week) pair into a stable integer index for sorting.
 * Example: year 1 week 1 => 1*100 + 1 (works as long as week <= 99).
 */
export function yearWeekKey(year: Year, week: WeekNumber): number {
  return Number(year) * 100 + Number(week);
}
