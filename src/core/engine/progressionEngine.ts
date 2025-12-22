// src/core/engine/progressionEngine.ts
import type {
  Player,
  Holding,
  Company,
  CompanyFinancials,
  GameEvent,
  Year,
  WeekNumber,
  Decimal,
} from "../domain";

import { asDecimal, getOverallReputationLevel } from "../domain";
import { clamp } from "../../utils/math";
import { economyConfig } from "../../config/economy";

/**
 * ProgressionEngine (v0)
 * - Computes weekly reputation XP changes for the Player based on:
 *   - profitability across companies
 *   - stability (no bankruptcies)
 *   - positive/negative events
 *
 * Reputation model is split:
 *  - brandRepLevel/brandRepXp
 *  - creditRepLevel/creditRepXp
 */

export type ProgressionTickInput = {
  year: Year;
  week: WeekNumber;

  player: Player;
  holding: Holding;

  companies: Company[];
  financialsByCompanyId: Record<string, CompanyFinancials | null>;
  events: GameEvent[];
};

export type ProgressionTickOutput = {
  nextPlayer: Player;
  /** average XP delta across brand+credit */
  deltaXp: number;
  /** change in overall rep level (avg of brand+credit levels) */
  deltaLevel: number;
};

function toNumber(x: number | Decimal | null | undefined): number {
  return Number(x ?? 0);
}

function xpForNextLevel(level: number): number {
  const curve = economyConfig.reputation.xpCurve;
  return curve.base * Math.pow(level, curve.exponent);
}

function applyXpToLevel(currentLevel: number, currentXp: number, addXp: number) {
  const maxLevel = economyConfig.reputation.xpCurve.maxLevel;

  let level = currentLevel;
  let xp = currentXp + addXp;

  while (level < maxLevel) {
    const req = xpForNextLevel(level);
    if (xp < req) break;
    xp -= req;
    level += 1;
  }

  if (xp < 0) xp = 0;
  return { level, xp };
}

export const progressionEngine = {
  tick(input: ProgressionTickInput): ProgressionTickOutput {
    const rep = economyConfig.reputation.weeklyDelta;

    const activeCompanies = input.companies.filter((c) => (c as any).status === "ACTIVE");

    const profits = activeCompanies.map((c) =>
      toNumber(input.financialsByCompanyId[String(c.id)]?.netProfit)
    );

    const profitableCount = profits.filter((p) => p > 0).length;
    const totalProfit = profits.reduce((a, b) => a + b, 0);

    // ---- v0 XP model (self-contained defaults) ----
    const XP = {
      xpPerProfitableCompany: 6,
      profitToXpDivisor: 2500,
      maxProfitXpBonus: 35,
      maxLossXpPenalty: 35,

      stabilityBonusXp: 6,
      bankruptcyPenaltyXp: 18,

      eventPositiveXp: 8,
      eventNegativeXp: 10,

      maxWeeklyXpUp: 80,
      maxWeeklyXpDown: 80,
    } as const;

    // BANKRUPTCIES
    const bankruptcies = input.companies.filter((c) => (c as any).status === "BANKRUPT").length;

    // EVENTS (split)
    let eventBrand = 0;
    let eventCredit = 0;

    for (const e of input.events) {
      const t = String((e as any).type);
      const sev = Number((e as any).severity ?? 1);

      const isPositive =
        t.includes("BOOST") ||
        t.includes("PRIZE") ||
        t.includes("AWARD") ||
        t.includes("HYPE") ||
        t.includes("INNOVATION");

      const isNegative =
        t.includes("CRASH") ||
        t.includes("FINE") ||
        t.includes("STRIKE") ||
        t.includes("SHOCK") ||
        t.includes("PANIC") ||
        t.includes("CRISIS");

      // Brand: more sensitive to hype/awards and PR shocks
      if (isPositive) eventBrand += XP.eventPositiveXp * sev;
      if (isNegative) eventBrand -= XP.eventNegativeXp * sev;

      // Credit: less sensitive to hype, more sensitive to crises/fines
      if (isPositive) eventCredit += Math.round(XP.eventPositiveXp * sev * 0.5);
      if (isNegative) eventCredit -= Math.round(XP.eventNegativeXp * sev * 0.7);
    }

    // Profit components split:
    const profitPosXp = clamp(totalProfit / XP.profitToXpDivisor, 0, XP.maxProfitXpBonus);
    const profitNegXp = clamp(totalProfit / XP.profitToXpDivisor, -XP.maxLossXpPenalty, 0);

    // BRAND XP
    let deltaBrandXp = profitableCount * XP.xpPerProfitableCompany + profitPosXp + eventBrand;

    if (bankruptcies === 0 && activeCompanies.length > 0) {
      deltaBrandXp += XP.stabilityBonusXp;
    } else {
      deltaBrandXp -= bankruptcies * Math.round(XP.bankruptcyPenaltyXp * 0.75);
    }

    // CREDIT XP
    let deltaCreditXp = profitNegXp + eventCredit;

    if (bankruptcies === 0 && activeCompanies.length > 0) {
      deltaCreditXp += XP.stabilityBonusXp;
      if (totalProfit > 0) deltaCreditXp += Math.round(profitPosXp * 0.35);
    } else {
      deltaCreditXp -= bankruptcies * XP.bankruptcyPenaltyXp;
    }

    // Optional: keep sync with economyConfig deltas (cast decimals safely)
    const profitBonus = toNumber(rep.profitBonus);
    const lossPenalty = toNumber(rep.lossPenalty); // should be negative in config

    if (totalProfit > 0) {
      deltaBrandXp += profitBonus;
      deltaCreditXp += Math.round(profitBonus * 0.4);
    }
    if (totalProfit < 0) {
      deltaBrandXp += Math.round(lossPenalty * 0.5);
      deltaCreditXp += lossPenalty;
    }

    // Clamp weekly change per track
    deltaBrandXp = clamp(deltaBrandXp, -XP.maxWeeklyXpDown, XP.maxWeeklyXpUp);
    deltaCreditXp = clamp(deltaCreditXp, -XP.maxWeeklyXpDown, XP.maxWeeklyXpUp);

    // BEFORE
    const beforeOverall = getOverallReputationLevel(input.player);

    const beforeBrandLevel = Number(input.player.brandRepLevel ?? 1);
    const beforeBrandXp = toNumber(input.player.brandRepXp);

    const beforeCreditLevel = Number(input.player.creditRepLevel ?? 1);
    const beforeCreditXp = toNumber(input.player.creditRepXp);

    // APPLY
    const brandApplied = applyXpToLevel(beforeBrandLevel, beforeBrandXp, deltaBrandXp);
    const creditApplied = applyXpToLevel(beforeCreditLevel, beforeCreditXp, deltaCreditXp);

    const nextPlayer: Player = {
      ...input.player,
      brandRepLevel: brandApplied.level,
      brandRepXp: asDecimal(brandApplied.xp),
      creditRepLevel: creditApplied.level,
      creditRepXp: asDecimal(creditApplied.xp),
      // prestigeLevel stays as-is for now (later: long-term milestones)
    };

    const afterOverall = getOverallReputationLevel(nextPlayer);

    return {
      nextPlayer,
      deltaXp: (deltaBrandXp + deltaCreditXp) / 2,
      deltaLevel: afterOverall - beforeOverall,
    };
  },
};
