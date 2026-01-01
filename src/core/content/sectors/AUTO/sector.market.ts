export type Range = {
  min: number;
  max: number;
};

export type CompetitionIntensity = "FRAGMENTED" | "OLIGOPOLY" | "MONOPOLY_LIKE";

export type AutoNicheId =
  | "carDealer"
  | "carWash"
  | "evServices"
  | "mobility"
  | "partsTires"
  | "repairShop";

export type MarketDrivers = {
  localDemandIndexByRegion: Record<string, Range>;
  competitionIntensityByNiche: Record<AutoNicheId, CompetitionIntensity>;
  priceSensitivityByNiche: Record<AutoNicheId, number>;
  seasonalityCurves: Record<string, number[]>;
  macroLinks: {
    fuelPriceIndex: string;
    interestRateIndex: string;
    consumerConfidenceIndex: string;
  };
};

export type CommonConstraints = {
  leadGenCostPerCustomerRange: Range;
  conversionRateRange: Range;
  averageTicketRangeByNiche: Record<AutoNicheId, Range>;
  laborCapacityPerFte: Range;
  inventoryFinancingCostRange: Range;
  partsSupplyRiskRange: Range;
  warrantyClaimRateRange: Range;
  regulatoryRiskRange: Range;
};

export type AnnualDemand = {
  carDealerVehicleSalesUnits: number;
  carWashWashesUnits: number;
  evServiceChargingSessionsUnits: number;
  mobilityRentalDaysUnits: number;
  partsOrdersUnits: number;
  repairServiceJobsUnits: number;
};

export type PricingDefaults = {
  dealerVehicleMarginPctRange: Range;
  washPricePerWashRange: Range;
  evServicePricePerSessionRange: Range;
  mobilityPricePerDayRange: Range;
  partsMarginPctRange: Range;
  repairLaborRatePerHourRange: Range;
};

export type SectorMarketConfig = {
  sectorId: string;
  marketDrivers: MarketDrivers;
  constraints: CommonConstraints;
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
  sectorId: "AUTO",
  marketDrivers: {
    localDemandIndexByRegion: {
      EU_WEST_METRO: { min: 0.95, max: 1.2 },
      EU_WEST_SUBURB: { min: 0.85, max: 1.1 },
      EU_WEST_RURAL: { min: 0.8, max: 1.05 },
    },
    competitionIntensityByNiche: {
      carDealer: "OLIGOPOLY",
      carWash: "FRAGMENTED",
      evServices: "OLIGOPOLY",
      mobility: "OLIGOPOLY",
      partsTires: "FRAGMENTED",
      repairShop: "FRAGMENTED",
    },
    priceSensitivityByNiche: {
      carDealer: 0.55,
      carWash: 0.75,
      evServices: 0.6,
      mobility: 0.7,
      partsTires: 0.65,
      repairShop: 0.5,
    },
    seasonalityCurves: {
      winter_tires_seasonality: buildWeeklyCurve([
        1.2, 1.15, 1.05, 0.9, 0.8, 0.7, 0.7, 0.75, 0.95, 1.3, 1.45, 1.35,
      ]),
      summer_travel_mobility_seasonality: buildWeeklyCurve([
        0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.25, 1.05, 0.9, 0.8, 0.75,
      ]),
      inspection_peak_seasonality: buildWeeklyCurve([
        0.9, 0.95, 1.1, 1.2, 1.05, 0.95, 0.9, 0.95, 1.05, 1.15, 1.05, 0.95,
      ]),
      car_wash_weather_seasonality: buildWeeklyCurve([
        0.85, 0.9, 1, 1.1, 1.2, 1.25, 1.2, 1.15, 1.05, 0.95, 0.9, 0.88,
      ]),
    },
    macroLinks: {
      fuelPriceIndex: "macro.fuel_price_index",
      interestRateIndex: "macro.interest_rate_index",
      consumerConfidenceIndex: "macro.consumer_confidence_index",
    },
  },
  constraints: {
    leadGenCostPerCustomerRange: { min: 12, max: 80 },
    conversionRateRange: { min: 0.02, max: 0.18 },
    averageTicketRangeByNiche: {
      carDealer: { min: 12000, max: 42000 },
      carWash: { min: 8, max: 25 },
      evServices: { min: 6, max: 25 },
      mobility: { min: 35, max: 140 },
      partsTires: { min: 80, max: 900 },
      repairShop: { min: 120, max: 1800 },
    },
    laborCapacityPerFte: { min: 15, max: 45 },
    inventoryFinancingCostRange: { min: 0.04, max: 0.12 },
    partsSupplyRiskRange: { min: 0.08, max: 0.3 },
    warrantyClaimRateRange: { min: 0.01, max: 0.06 },
    regulatoryRiskRange: { min: 0.05, max: 0.2 },
  },
  annualDemand: {
    carDealerVehicleSalesUnits: 3200000,
    carWashWashesUnits: 90000000,
    evServiceChargingSessionsUnits: 180000000,
    mobilityRentalDaysUnits: 220000000,
    partsOrdersUnits: 55000000,
    repairServiceJobsUnits: 40000000,
  },
  pricingDefaults: {
    dealerVehicleMarginPctRange: { min: 0.04, max: 0.12 },
    washPricePerWashRange: { min: 6, max: 20 },
    evServicePricePerSessionRange: { min: 8, max: 35 },
    mobilityPricePerDayRange: { min: 35, max: 120 },
    partsMarginPctRange: { min: 0.2, max: 0.45 },
    repairLaborRatePerHourRange: { min: 45, max: 120 },
  },
};

export function testSectorMarket(): boolean {
  return (
    sectorMarket.sectorId === "AUTO" &&
    sectorMarket.annualDemand.carDealerVehicleSalesUnits > 0 &&
    sectorMarket.marketDrivers.seasonalityCurves.winter_tires_seasonality.length === 52
  );
}
