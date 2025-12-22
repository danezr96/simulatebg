// src/core/domain/programs.ts
import type {
  CompanyId,
  ProgramId,
  WorldId,
  Year,
  WeekNumber,
  Timestamp,
  NicheId,
  UpgradeId,
  CompanyUpgradeId,
  Money,
  Decimal,
  JsonObject,
} from "./common";

export type CompanyEffectModifiers = {
  marketingLevelDelta?: Decimal;
  marketingMultiplier?: Decimal;
  reputationMultiplier?: Decimal;
  qualityMultiplier?: Decimal;
  priceLevelMultiplier?: Decimal;
  capacityMultiplier?: Decimal;
  variableCostMultiplier?: Decimal;
  labourCostMultiplier?: Decimal;
  extraOpex?: Money;
};

export type ProgramStatus = "ACTIVE" | "CANCELLED" | "COMPLETED";

export type CompanyProgram = {
  id: ProgramId;
  companyId: CompanyId;
  worldId: WorldId;
  programType: string;
  payload: JsonObject;
  startYear: Year;
  startWeek: WeekNumber;
  durationWeeks: number;
  status: ProgramStatus;
  createdAt: Timestamp;
  cancelledAt?: Timestamp;
};

export type NicheUpgrade = {
  id: UpgradeId;
  nicheId: NicheId;
  code: string;
  treeKey: string;
  name: string;
  description?: string;
  tier: number;
  cost: Money;
  durationWeeks: number;
  effects: CompanyEffectModifiers;
  createdAt: Timestamp;
};

export type CompanyUpgradeStatus = "ACTIVE" | "INACTIVE";

export type CompanyUpgrade = {
  id: CompanyUpgradeId;
  companyId: CompanyId;
  worldId: WorldId;
  upgradeId: UpgradeId;
  purchasedYear: Year;
  purchasedWeek: WeekNumber;
  status: CompanyUpgradeStatus;
  createdAt: Timestamp;
};
