import type { WorldMacroModifiers } from "../domain";

export type BriefingScope = "macro" | "sector" | "niche" | "company" | "competitor";

export type BriefingSeverity = "info" | "opportunity" | "warning" | "critical";

export type BriefingCard = {
  id: string;
  scope: BriefingScope;
  title: string;
  body: string;
  whyItMatters: string[];
  suggestedLevers: string[];
  severity: BriefingSeverity;
};

export type BriefingSectorSignal = {
  sectorId: string;
  sectorCode?: string | null;
  sectorName?: string | null;
  currentDemand?: number;
  trendFactor?: number;
  volatility?: number;
  lastRoundMetrics?: Record<string, unknown> | null;
};

export type BriefingCompanyContext = {
  companyId: string;
  companyName: string;
  sectorCode?: string | null;
  sectorName?: string | null;
  nicheName?: string | null;
  revenue?: number;
  cogs?: number;
  opex?: number;
  interestCost?: number;
  marketingLevel?: number;
  capacity?: number;
  utilisationRate?: number;
  upgradeSpend?: number;
  cashChange?: number;
  profit?: number;
};

export type BriefingEventSignal = {
  id: string;
  scope?: string | null;
  type?: string | null;
  severity?: number;
  title?: string | null;
  summary?: string | null;
  targetLabel?: string | null;
  sectorId?: string | null;
  companyId?: string | null;
  holdingId?: string | null;
  briefingScope?: BriefingScope | null;
  payload?: Record<string, unknown> | null;
};

export type CompetitorSignal = {
  id: string;
  title: string;
  body: string;
  severity?: BriefingSeverity;
};

export type BriefingMarketShare = {
  sectorName: string;
  share: number;
  holdingRevenue?: number;
  sectorRevenue?: number;
};

export type BriefingInput = {
  macroModifiers?: WorldMacroModifiers | null;
  sectorSignals?: BriefingSectorSignal[];
  companies?: BriefingCompanyContext[];
  competitorSignals?: CompetitorSignal[];
  events?: BriefingEventSignal[];
  marketShares?: BriefingMarketShare[];
};
