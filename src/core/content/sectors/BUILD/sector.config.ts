export type SectorEventCategory = "positive" | "negative" | "neutral";

export type SectorEventImpact = {
  demandShift?: number;
  supplyShift?: number;
  priceShift?: number;
  durationWeeks?: number;
};

export type SectorEvent = {
  id: string;
  label: string;
  description: string;
  category: SectorEventCategory;
  impact: SectorEventImpact;
};

export type SectorAIHints = {
  preferredArchetypes: string[];
  riskToleranceDefault: number;
  typicalStrategyWeights: {
    growth: number;
    margin: number;
    compliance: number;
    reputation: number;
    cashflow: number;
  };
};

export type SectorConfig = {
  id: string;
  name: string;
  description: string;
  nicheIds: string[];
  decisionProfile: string;
  upgradeProfile: string;
  aiHints: SectorAIHints;
  eventPool: SectorEvent[];
};

export const sectorConfig: SectorConfig = {
  id: "BUILD",
  name: "Construction",
  description: "Contracting and project delivery shaped by crews, materials, and schedules.",
  nicheIds: [
    "commercialBuild",
    "electrical",
    "engineering",
    "newBuilds",
    "plumbing",
    "renovation",
  ],
  decisionProfile: "SECTOR_BUILD",
  upgradeProfile: "INDUSTRIAL",
  aiHints: {
    preferredArchetypes: [
      "BidMaster",
      "SafetyFirstOperator",
      "ScheduleOptimizer",
      "ChangeOrderMaximizer",
    ],
    riskToleranceDefault: 0.4,
    typicalStrategyWeights: {
      growth: 0.28,
      margin: 0.22,
      compliance: 0.22,
      reputation: 0.16,
      cashflow: 0.12,
    },
  },
  eventPool: [
    {
      id: "build_materials_spike",
      label: "Materials Price Spike",
      description: "Materials inflation squeezes margins and raises bid prices.",
      category: "negative",
      impact: { priceShift: 0.09, durationWeeks: 6 },
    },
    {
      id: "build_permit_backlog",
      label: "Permit Backlog",
      description: "Permit delays slow project starts and stretch schedules.",
      category: "negative",
      impact: { supplyShift: -0.1, priceShift: 0.04, durationWeeks: 8 },
    },
    {
      id: "build_public_tender_wave",
      label: "Public Tender Wave",
      description: "New public tenders lift bid volume and backlog.",
      category: "positive",
      impact: { demandShift: 0.12, durationWeeks: 6 },
    },
    {
      id: "build_workforce_shortage",
      label: "Skilled Labor Shortage",
      description: "Crew shortages slow delivery and increase labor costs.",
      category: "negative",
      impact: { supplyShift: -0.15, priceShift: 0.05, durationWeeks: 7 },
    },
    {
      id: "build_safety_audit_pass",
      label: "Safety Audit Pass",
      description: "Strong safety performance boosts win rates and reputation.",
      category: "positive",
      impact: { demandShift: 0.06, priceShift: 0.02, durationWeeks: 5 },
    },
    {
      id: "build_change_order_spike",
      label: "Change Order Spike",
      description: "Scope changes drive higher billables and longer schedules.",
      category: "neutral",
      impact: { priceShift: 0.04, durationWeeks: 5 },
    },
  ],
};

export function testSectorConfig(): boolean {
  return (
    sectorConfig.id === "BUILD" &&
    sectorConfig.nicheIds.length === 6 &&
    sectorConfig.eventPool.length >= 4
  );
}
