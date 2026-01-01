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

export type SectorConfig = {
  id: string;
  name: string;
  description: string;
  nicheIds: string[];
  eventPool: SectorEvent[];
};

export const sectorConfig: SectorConfig = {
  id: "AGRI",
  name: "Agriculture",
  description: "Food and input supply chains driven by seasons and yields.",
  nicheIds: [
    "cropFarm",
    "dairy",
    "foodProcessing",
    "greenhouse",
    "livestock",
    "organicFarming",
  ],
  eventPool: [
    {
      id: "agri_weather_boost",
      label: "Ideal Growing Weather",
      description: "Strong yields increase supply across the sector.",
      category: "positive",
      impact: { supplyShift: 0.12, priceShift: -0.04, durationWeeks: 6 },
    },
    {
      id: "agri_drought",
      label: "Seasonal Drought",
      description: "Lower yields reduce supply and raise prices.",
      category: "negative",
      impact: { supplyShift: -0.18, priceShift: 0.08, durationWeeks: 8 },
    },
    {
      id: "agri_fuel_spike",
      label: "Fuel Cost Spike",
      description: "Higher logistics costs pressure margins and prices.",
      category: "negative",
      impact: { priceShift: 0.06, durationWeeks: 4 },
    },
    {
      id: "agri_export_demand",
      label: "Export Demand Surge",
      description: "New export contracts lift demand.",
      category: "positive",
      impact: { demandShift: 0.15, priceShift: 0.04, durationWeeks: 5 },
    },
    {
      id: "agri_input_shortage",
      label: "Fertilizer Shortage",
      description: "Input constraints reduce effective supply.",
      category: "negative",
      impact: { supplyShift: -0.1, durationWeeks: 6 },
    },
    {
      id: "agri_market_calm",
      label: "Stable Market Weeks",
      description: "Low volatility and steady prices.",
      category: "neutral",
      impact: { priceShift: 0, durationWeeks: 4 },
    },
  ],
};

export function testSectorConfig(): boolean {
  return (
    sectorConfig.id === "AGRI" &&
    sectorConfig.nicheIds.length === 6 &&
    sectorConfig.eventPool.length >= 4
  );
}
