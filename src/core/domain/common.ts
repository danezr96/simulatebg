// src/core/domain/common.ts

/**
 * Canonical domain primitives (single source of truth).
 * Everything in core/domain should only depend on files in core/domain.
 *
 * Keep this file dependency-free.
 */

/** Branded string type utility (compile-time safety for IDs). */
export type Brand<K, T extends string> = K & { __brand: T };

/** Generic ID brand. */
export type Id<T extends string> = Brand<string, T>;

// ---- Branded IDs (DB uuid strings) ----
export type PlayerId = Id<"PlayerId">;
export type HoldingId = Id<"HoldingId">;
export type WorldId = Id<"WorldId">;
export type RoundId = Id<"RoundId">;

export type SectorId = Id<"SectorId">;
export type NicheId = Id<"NicheId">;
export type CompanyId = Id<"CompanyId">;

export type LoanId = Id<"LoanId">;
export type PropertyId = Id<"PropertyId">;
export type InvestmentId = Id<"InvestmentId">;

export type EventId = Id<"EventId">;
export type SkillId = Id<"SkillId">;
export type AchievementId = Id<"AchievementId">;

export type SeasonId = Id<"SeasonId">;

export type BotProfileId = Id<"BotProfileId">;
export type BotId = Id<"BotId">;
export type ProgramId = Id<"ProgramId">;
export type UpgradeId = Id<"UpgradeId">;
export type CompanyUpgradeId = Id<"CompanyUpgradeId">;
export type AcquisitionOfferId = Id<"AcquisitionOfferId">;

// ---- Time primitives ----
/** ISO timestamp string (timestamptz). */
export type Timestamp = Brand<string, "Timestamp">;

/** Local date string "YYYY-MM-DD". */
export type LocalDate = Brand<string, "LocalDate">;

/** In-game year (1..). */
export type Year = Brand<number, "Year">;

/** In-game week (1..52). */
export type WeekNumber = Brand<number, "WeekNumber">;

// ---- Region / locale ----
export type RegionCode = Brand<string, "RegionCode">;

// ---- Currency / money ----
export type CurrencyCode = "EUR" | "USD" | "GBP";

/** Money stored as number but branded. */
export type Money = Brand<number, "Money">;

/** Decimal helper for XP, ratios, etc. */
export type Decimal = Brand<number, "Decimal">;

/** Percentage as fraction, e.g. 0.12 = 12%. */
export type Fraction = Brand<number, "Fraction">;

// ---- JSON helpers ----
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type JsonObject = { [k: string]: JsonValue };

// ---- Constructors (runtime no-ops, compile-time clarity) ----
export const asId = <T extends string>(v: string) => v as Id<T>;
export const asWorldId = (v: string) => v as WorldId;
export const asSeasonId = (v: string) => v as SeasonId;

export const asTimestamp = (v: string) => v as Timestamp;
export const asLocalDate = (v: string) => v as LocalDate;
export const asYear = (v: number) => v as Year;
export const asWeek = (v: number) => v as WeekNumber;
export const asRegion = (v: string) => v as RegionCode;

export const asMoney = (v: number) => v as Money;
export const asDecimal = (v: number) => v as Decimal;
export const asFraction = (v: number) => v as Fraction;

/** Exhaustiveness helper */
export function assertNever(x: never, msg = "Unexpected value"): never {
  throw new Error(`${msg}: ${String(x)}`);
}

// ---- Enums / shared unions ----
export type DecisionSource = "PLAYER" | "BOT" | "SYSTEM";

export type RiskAppetite = "LOW" | "MEDIUM" | "HIGH";
