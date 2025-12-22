// src/core/domain/progression.ts
import type{
  PlayerId,
  SkillId,
  AchievementId,
  Timestamp,
  Decimal,
  JsonObject,
} from "./common";

/**
 * Progression domain:
 * - reputation & XP curve (player-level)
 * - skills & skill trees
 * - achievements
 * - prestige meta
 *
 * Mirrors tables:
 * - skills
 * - player_skills
 * - achievements
 * - player_achievements
 */

/* =========================
 * Skills & skill trees
 * ========================= */

export type SkillTreeId = string;

export type SkillTree = {
  id: SkillTreeId;
  name: string;
  description?: string;
};

export type SkillTier = number; // 1, 2, 3, ...

export type SkillEffects = {
  /** Modifiers applied by engine (additive or multiplicative, defined in engine) */
  interestRateModifier?: Decimal;
  marketingEffectivenessModifier?: Decimal;
  capacityEfficiencyModifier?: Decimal;
  variableCostEfficiencyModifier?: Decimal;
  eventRiskReduction?: Decimal;
  taxEfficiencyModifier?: Decimal;
};

export type Skill = {
  id: SkillId;
  treeId: SkillTreeId;
  name: string;
  description: string;
  tier: SkillTier;
  effects: SkillEffects;
};

export type PlayerSkill = {
  playerId: PlayerId;
  skillId: SkillId;
  unlockedAt: Timestamp;
};

/* =========================
 * Achievements
 * ========================= */

export type AchievementConditions = {
  minNetWorth?: Decimal;
  minReputationLevel?: number;
  minActiveCompanies?: number;
  minConsecutiveProfitableRounds?: number;

  /** Escape hatch for engine-defined checks */
  specialConditionKey?: string;
};

export type Achievement = {
  id: AchievementId;
  name: string;
  description: string;
  conditions: AchievementConditions;
};

export type PlayerAchievement = {
  playerId: PlayerId;
  achievementId: AchievementId;
  unlockedAt: Timestamp;
};

/* =========================
 * Reputation & prestige
 * ========================= */

/**
 * Reputation progression config.
 * XP curve usually lives in config (economy.ts),
 * but this type is shared between engine & services.
 */
export type ReputationProgression = {
  /** XP required for next level: base * level^exponent */
  baseXp: Decimal;
  exponent: Decimal;
  maxLevel: number;
};

/**
 * Prestige meta (soft reset info).
 * Usually stored on player or in a separate table if expanded later.
 */
export type PrestigeMeta = {
  prestigeLevel: number;
  /** Permanent bonuses carried over between runs */
  bonuses: JsonObject;
};
