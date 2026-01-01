export type Range = {
  min: number;
  max: number;
};

export type CompetitionIntensity = "FRAGMENTED" | "OLIGOPOLY" | "MONOPOLY_LIKE";

export type BuildNicheId =
  | "commercialBuild"
  | "electrical"
  | "engineering"
  | "newBuilds"
  | "plumbing"
  | "renovation";

export type BuildTrade =
  | "general"
  | "electrician"
  | "plumber"
  | "engineer"
  | "carpenter"
  | "siteSupervisor";

export type BuildLeadType = "private_client" | "developer" | "public_tender";

export type MarketDrivers = {
  constructionDemandIndexByRegion: Record<string, Range>;
  permitDelayRiskByRegion: Record<string, Range>;
  competitionIntensityByNiche: Record<BuildNicheId, CompetitionIntensity>;
  priceSensitivityByNiche: Record<BuildNicheId, number>;
  interestRateSensitivityByNiche: Record<BuildNicheId, number>;
  seasonalityCurves: Record<string, number[]>;
  macroLinks: {
    interestRateIndex: string;
    materialsPriceIndex: string;
    laborWageIndex: string;
  };
};

export type CommonConstraints = {
  bidWinRateRangeByNiche: Record<BuildNicheId, Range>;
  averageProjectDurationTicksRangeByNiche: Record<BuildNicheId, Range>;
  changeOrderRateRangeByNiche: Record<BuildNicheId, Range>;
  paymentTermsDaysRangeByNiche: Record<BuildNicheId, Range>;
  mobilizationCostEurRangeByNiche: Record<BuildNicheId, Range>;
  safetyIncidentRateRangeByNiche: Record<BuildNicheId, Range>;
  delayPenaltyPctRangeByNiche: Record<BuildNicheId, Range>;
  subcontractorDependencyScoreByNiche: Record<BuildNicheId, Range>;
  backlogDecayIfNoSales: number;
  retentionPctOnInvoicesRange: Range;
};

export type AnnualDemand = {
  commercialBuildAnnualProjectValueEur: number;
  electricalAnnualProjectValueEur: number;
  engineeringAnnualProjectValueEur: number;
  newBuildsAnnualProjectValueEur: number;
  plumbingAnnualProjectValueEur: number;
  renovationAnnualProjectValueEur: number;
};

export type PricingDefaults = {
  commercialGmPctRange: Range;
  electricalGmPctRange: Range;
  engineeringGmPctRange: Range;
  newBuildsGmPctRange: Range;
  plumbingGmPctRange: Range;
  renovationGmPctRange: Range;
  laborRateEurPerHourRangeByTrade: Record<BuildTrade, Range>;
  materialsMarkupPctRange: Range;
  equipmentRentalEurPerDayRange: Range;
};

export type PipelineToBacklogConversion = {
  baseConversionRate: number;
  bidWinRateWeight: number;
  backlogSaturationPenalty: number;
};

export type PipelineConfig = {
  leadTypes: BuildLeadType[];
  bidCostPctRange: Range;
  pipelineToBacklogConversion: PipelineToBacklogConversion;
  backlogWorkOffRatePerCrewCapacityRange: Range;
};

export type SectorMarketConfig = {
  sectorId: string;
  marketDrivers: MarketDrivers;
  constraints: CommonConstraints;
  pipeline: PipelineConfig;
  annualDemand: AnnualDemand;
  pricingDefaults: PricingDefaults;
};

const MONTH_WEEKS = [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5];

function buildWeeklyCurve(monthly: number[]): number[] {
  if (monthly.length !== 12) {
    return [];
  }
  const curve: number[] = [];
  monthly.forEach((value, index) => {
    const weeks = MONTH_WEEKS[index] ?? 4;
    for (let i = 0; i < weeks; i += 1) {
      curve.push(value);
    }
  });
  return curve;
}

export const sectorMarket: SectorMarketConfig = {
  sectorId: "BUILD",
  marketDrivers: {
    constructionDemandIndexByRegion: {
      EU_WEST_METRO: { min: 0.9, max: 1.2 },
      EU_WEST_SUBURB: { min: 0.85, max: 1.1 },
      EU_WEST_RURAL: { min: 0.75, max: 1.0 },
    },
    permitDelayRiskByRegion: {
      EU_WEST_METRO: { min: 0.12, max: 0.35 },
      EU_WEST_SUBURB: { min: 0.08, max: 0.25 },
      EU_WEST_RURAL: { min: 0.05, max: 0.2 },
    },
    competitionIntensityByNiche: {
      commercialBuild: "OLIGOPOLY",
      electrical: "FRAGMENTED",
      engineering: "OLIGOPOLY",
      newBuilds: "FRAGMENTED",
      plumbing: "FRAGMENTED",
      renovation: "FRAGMENTED",
    },
    priceSensitivityByNiche: {
      commercialBuild: 0.45,
      electrical: 0.5,
      engineering: 0.35,
      newBuilds: 0.55,
      plumbing: 0.6,
      renovation: 0.65,
    },
    interestRateSensitivityByNiche: {
      commercialBuild: 0.65,
      electrical: 0.35,
      engineering: 0.4,
      newBuilds: 0.75,
      plumbing: 0.3,
      renovation: 0.25,
    },
    seasonalityCurves: {
      weather_construction_seasonality: buildWeeklyCurve([
        0.7, 0.75, 0.85, 1, 1.1, 1.2, 1.25, 1.2, 1.05, 0.95, 0.8, 0.7,
      ]),
      renovation_summer_peak_seasonality: buildWeeklyCurve([
        0.85, 0.9, 0.95, 1.05, 1.15, 1.3, 1.35, 1.3, 1.1, 0.95, 0.9, 0.85,
      ]),
      public_tender_cycle_seasonality: buildWeeklyCurve([
        1.1, 1.05, 0.95, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.05, 0.95, 0.9,
      ]),
      newbuild_interest_rate_seasonality: buildWeeklyCurve([
        0.9, 0.92, 0.95, 1, 1.05, 1.1, 1.08, 1.05, 1, 0.98, 0.95, 0.92,
      ]),
    },
    macroLinks: {
      interestRateIndex: "macro.interest_rate_index",
      materialsPriceIndex: "macro.materials_price_index",
      laborWageIndex: "macro.labor_wage_index",
    },
  },
  constraints: {
    bidWinRateRangeByNiche: {
      commercialBuild: { min: 0.08, max: 0.18 },
      electrical: { min: 0.12, max: 0.28 },
      engineering: { min: 0.08, max: 0.2 },
      newBuilds: { min: 0.05, max: 0.12 },
      plumbing: { min: 0.15, max: 0.35 },
      renovation: { min: 0.18, max: 0.4 },
    },
    averageProjectDurationTicksRangeByNiche: {
      commercialBuild: { min: 16, max: 80 },
      electrical: { min: 4, max: 24 },
      engineering: { min: 8, max: 40 },
      newBuilds: { min: 24, max: 104 },
      plumbing: { min: 3, max: 20 },
      renovation: { min: 6, max: 36 },
    },
    changeOrderRateRangeByNiche: {
      commercialBuild: { min: 0.08, max: 0.2 },
      electrical: { min: 0.05, max: 0.15 },
      engineering: { min: 0.06, max: 0.18 },
      newBuilds: { min: 0.1, max: 0.25 },
      plumbing: { min: 0.05, max: 0.18 },
      renovation: { min: 0.12, max: 0.3 },
    },
    paymentTermsDaysRangeByNiche: {
      commercialBuild: { min: 45, max: 90 },
      electrical: { min: 30, max: 60 },
      engineering: { min: 45, max: 75 },
      newBuilds: { min: 60, max: 120 },
      plumbing: { min: 30, max: 60 },
      renovation: { min: 30, max: 75 },
    },
    mobilizationCostEurRangeByNiche: {
      commercialBuild: { min: 25000, max: 250000 },
      electrical: { min: 3000, max: 40000 },
      engineering: { min: 10000, max: 120000 },
      newBuilds: { min: 40000, max: 400000 },
      plumbing: { min: 2000, max: 20000 },
      renovation: { min: 5000, max: 60000 },
    },
    safetyIncidentRateRangeByNiche: {
      commercialBuild: { min: 0.01, max: 0.04 },
      electrical: { min: 0.008, max: 0.03 },
      engineering: { min: 0.005, max: 0.02 },
      newBuilds: { min: 0.012, max: 0.05 },
      plumbing: { min: 0.006, max: 0.025 },
      renovation: { min: 0.01, max: 0.04 },
    },
    delayPenaltyPctRangeByNiche: {
      commercialBuild: { min: 0.02, max: 0.08 },
      electrical: { min: 0.01, max: 0.05 },
      engineering: { min: 0.015, max: 0.06 },
      newBuilds: { min: 0.03, max: 0.1 },
      plumbing: { min: 0.01, max: 0.05 },
      renovation: { min: 0.015, max: 0.07 },
    },
    subcontractorDependencyScoreByNiche: {
      commercialBuild: { min: 0.35, max: 0.75 },
      electrical: { min: 0.2, max: 0.6 },
      engineering: { min: 0.25, max: 0.65 },
      newBuilds: { min: 0.4, max: 0.8 },
      plumbing: { min: 0.2, max: 0.55 },
      renovation: { min: 0.3, max: 0.7 },
    },
    backlogDecayIfNoSales: 0.05,
    retentionPctOnInvoicesRange: { min: 0.05, max: 0.1 },
  },
  pipeline: {
    leadTypes: ["private_client", "developer", "public_tender"],
    bidCostPctRange: { min: 0.01, max: 0.05 },
    pipelineToBacklogConversion: {
      baseConversionRate: 0.12,
      bidWinRateWeight: 0.6,
      backlogSaturationPenalty: 0.5,
    },
    backlogWorkOffRatePerCrewCapacityRange: { min: 0.04, max: 0.12 },
  },
  annualDemand: {
    commercialBuildAnnualProjectValueEur: 12000000000,
    electricalAnnualProjectValueEur: 3500000000,
    engineeringAnnualProjectValueEur: 2500000000,
    newBuildsAnnualProjectValueEur: 18000000000,
    plumbingAnnualProjectValueEur: 2800000000,
    renovationAnnualProjectValueEur: 7000000000,
  },
  pricingDefaults: {
    commercialGmPctRange: { min: 0.08, max: 0.18 },
    electricalGmPctRange: { min: 0.12, max: 0.25 },
    engineeringGmPctRange: { min: 0.1, max: 0.22 },
    newBuildsGmPctRange: { min: 0.07, max: 0.16 },
    plumbingGmPctRange: { min: 0.14, max: 0.28 },
    renovationGmPctRange: { min: 0.12, max: 0.24 },
    laborRateEurPerHourRangeByTrade: {
      general: { min: 28, max: 55 },
      electrician: { min: 35, max: 80 },
      plumber: { min: 32, max: 75 },
      engineer: { min: 45, max: 110 },
      carpenter: { min: 30, max: 65 },
      siteSupervisor: { min: 40, max: 90 },
    },
    materialsMarkupPctRange: { min: 0.08, max: 0.22 },
    equipmentRentalEurPerDayRange: { min: 150, max: 1200 },
  },
};

export function testSectorMarket(): boolean {
  return (
    sectorMarket.sectorId === "BUILD" &&
    sectorMarket.annualDemand.newBuildsAnnualProjectValueEur > 0 &&
    sectorMarket.marketDrivers.seasonalityCurves.weather_construction_seasonality.length ===
      52
  );
}
