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
  trendFactor?: number;
  volatility?: number;
  lastRoundMetrics?: Record<string, unknown> | null;
};

export type BriefingCompanyContext = {
  companyId: string;
  companyName: string;
  sectorCode?: string | null;
  nicheName?: string | null;
  cashChange?: number;
  profit?: number;
};

export type CompetitorSignal = {
  id: string;
  title: string;
  body: string;
  severity?: BriefingSeverity;
};

export type BriefingInput = {
  macroModifiers?: WorldMacroModifiers | null;
  sectorSignals?: BriefingSectorSignal[];
  companies?: BriefingCompanyContext[];
  competitorSignals?: CompetitorSignal[];
};
