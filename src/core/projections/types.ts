import type {
  Company,
  CompanyDecisionPayload,
  CompanyFinancials,
  CompanyState,
  Holding,
  HoldingDecisionPayload,
  World,
  WorldEconomyState,
} from "../domain";

export type RiskBand = {
  worst: number;
  expected: number;
  best: number;
};

export type DraftUpgradeItem = {
  companyId: string;
  upgradeId: string;
};

export type ProjectionCompanyInput = {
  company: Company;
  state?: CompanyState | null;
  financials?: CompanyFinancials | null;
  sectorCode?: string | null;
  nicheConfig?: Record<string, unknown> | null;
  decisions?: CompanyDecisionPayload[];
};

export type BaselineInput = {
  world?: World | null;
  economy?: WorldEconomyState | null;
  holding?: Holding | null;
  companies: ProjectionCompanyInput[];
  holdingDecisions?: HoldingDecisionPayload[];
  upgradesById?: Record<string, { cost?: number } | undefined>;
  safetyBufferPct?: number;
};

export type CompanyProjection = {
  companyId: string;
  name: string;
  sectorId: string;
  nicheId: string;
  expectedRevenue: number;
  expectedCosts: number;
  expectedProfit: number;
  expectedEndCash: number;
  riskBandEndCash: RiskBand;
  reservedOpsCash: number;
  reservedUpgradeCash: number;
  safetyBufferCash: number;
  safeToSpendCash: number;
};

export type ProjectionSummary = {
  startingCash: number;
  reservedOpsCash: number;
  reservedUpgradeCash: number;
  safetyBufferCash: number;
  safeToSpendCash: number;
  expectedRevenue: number;
  expectedCosts: number;
  expectedProfit: number;
  expectedEndCash: number;
  riskBandEndCash: RiskBand;
  companies: CompanyProjection[];
};

export type ProjectionDelta = {
  revenue: number;
  costs: number;
  profit: number;
  endCash: number;
  safeToSpendCash: number;
};

export type CompanyDelta = {
  companyId: string;
  revenue: number;
  costs: number;
  profit: number;
  endCash: number;
};

export type WhatIfInput = BaselineInput & {
  baseline?: ProjectionSummary;
  draftCompanyDecisions?: Record<string, CompanyDecisionPayload[]>;
  draftHoldingAllocations?: Record<string, number>;
  draftUpgradeQueue?: DraftUpgradeItem[];
};

export type WhatIfProjection = ProjectionSummary & {
  deltas: ProjectionDelta;
  companyDeltas: CompanyDelta[];
};
