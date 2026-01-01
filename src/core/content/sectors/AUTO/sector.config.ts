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
  id: "AUTO",
  name: "Automotive & Mobility",
  description: "Automotive commerce and mobility services driven by inventory and local demand.",
  nicheIds: [
    "carDealer",
    "carWash",
    "evServices",
    "mobility",
    "partsTires",
    "repairShop",
  ],
  decisionProfile: "SECTOR_AUTO",
  upgradeProfile: "SERVICE",
  aiHints: {
    preferredArchetypes: [
      "InventoryFlipper",
      "ServiceOptimizer",
      "FleetAggregator",
      "PremiumBrandBuilder",
    ],
    riskToleranceDefault: 0.45,
    typicalStrategyWeights: {
      growth: 0.35,
      margin: 0.3,
      compliance: 0.2,
      reputation: 0.15,
    },
  },
  eventPool: [
    {
      id: "auto_inventory_shortage",
      label: "Inventory Shortage",
      description: "Supply gaps squeeze dealer inventory and push prices up.",
      category: "negative",
      impact: { supplyShift: -0.18, priceShift: 0.1, durationWeeks: 6 },
    },
    {
      id: "auto_interest_rate_spike",
      label: "Financing Slowdown",
      description: "Higher rates reduce demand for financed vehicles.",
      category: "negative",
      impact: { demandShift: -0.12, durationWeeks: 5 },
    },
    {
      id: "auto_fuel_price_drop",
      label: "Fuel Price Dip",
      description: "Lower fuel costs lift mobility demand and service traffic.",
      category: "positive",
      impact: { demandShift: 0.08, durationWeeks: 4 },
    },
    {
      id: "auto_recall_wave",
      label: "Recall Wave",
      description: "Warranty repairs spike and parts availability tightens.",
      category: "neutral",
      impact: { demandShift: 0.06, priceShift: 0.03, durationWeeks: 4 },
    },
    {
      id: "auto_ev_incentives",
      label: "EV Incentives Boost",
      description: "Incentives accelerate EV charging and service demand.",
      category: "positive",
      impact: { demandShift: 0.15, durationWeeks: 8 },
    },
    {
      id: "auto_local_competition",
      label: "Local Competition Surge",
      description: "New entrants pressure margins across service niches.",
      category: "negative",
      impact: { priceShift: -0.06, durationWeeks: 6 },
    },
  ],
};

export function testSectorConfig(): boolean {
  return (
    sectorConfig.id === "AUTO" &&
    sectorConfig.nicheIds.length === 6 &&
    sectorConfig.eventPool.length >= 4
  );
}
