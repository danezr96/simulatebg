export type LivestockProductSku =
  | "poultry_meat_kg"
  | "eggs_dozen"
  | "pork_kg"
  | "beef_kg"
  | "hides_leather_kg"
  | "byproducts_rendered_kg";

export type Range = {
  min: number;
  max: number;
};

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type VehicleRequirement = {
  vehicleId: string;
  minCount: number;
};

export type MachineRequirement = {
  machineId: string;
  minCount: number;
};

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type YieldParameters = {
  feedTonPerUnitPerTick: number;
  conversionRatioAnimalsToOutput: number;
  mortalityPctRange: Range;
  spoilagePctRange: Range;
};

export type LivestockProduct = {
  sku: LivestockProductSku;
  name: string;
  unit: "kg" | "dozen";
  basePriceEurRange: Range;
  cogsPctRange: Range;
  productionType: "continuous";
  requiredAssets: AssetRequirement[];
  requiredVehicles: VehicleRequirement[];
  requiredMachines: MachineRequirement[];
  requiredStaff: StaffRequirement[];
  yieldParams: YieldParameters;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const livestockProducts: LivestockProduct[] = [
  {
    sku: "poultry_meat_kg",
    name: "Poultry Meat",
    unit: "kg",
    basePriceEurRange: { min: 2.2, max: 4 },
    cogsPctRange: { min: 0.7, max: 1.05 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "animals_total", minCount: 14000 },
      { assetId: "animals_growing", minCount: 6000 },
      { assetId: "animals_market_ready", minCount: 6000 },
      { assetId: "barn_m2", minCount: 900 },
      { assetId: "pens_capacity_animals", minCount: 16000 },
      { assetId: "feed_storage_ton", minCount: 40 },
      { assetId: "manure_capacity_ton", minCount: 20 },
      { assetId: "cold_storage_kg", minCount: 800 },
      { assetId: "health_score", minCount: 0.7 },
      { assetId: "welfare_score", minCount: 0.55 },
      { assetId: "biosecurity_level", minCount: 0.35 },
      { assetId: "contract_processing", minCount: 1 },
    ],
    requiredVehicles: [{ vehicleId: "feed_truck", minCount: 1 }],
    requiredMachines: [],
    requiredStaff: [
      { roleId: "animal_caretaker", minFTE: 2 },
      { roleId: "processing_operator", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.0028,
      conversionRatioAnimalsToOutput: 0.7,
      mortalityPctRange: { min: 0.01, max: 0.04 },
      spoilagePctRange: { min: 0.04, max: 0.12 },
    },
    baselineUnitPriceEur: 3,
    baselineUnitCostEur: 3.2,
  },
  {
    sku: "eggs_dozen",
    name: "Eggs",
    unit: "dozen",
    basePriceEurRange: { min: 1.2, max: 3.2 },
    cogsPctRange: { min: 0.55, max: 0.9 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "animals_total", minCount: 12000 },
      { assetId: "barn_m2", minCount: 800 },
      { assetId: "pens_capacity_animals", minCount: 14000 },
      { assetId: "feed_storage_ton", minCount: 35 },
      { assetId: "manure_capacity_ton", minCount: 18 },
      { assetId: "welfare_score", minCount: 0.75 },
      { assetId: "health_score", minCount: 0.7 },
    ],
    requiredVehicles: [{ vehicleId: "feed_truck", minCount: 1 }],
    requiredMachines: [{ machineId: "egg_sorting_line", minCount: 1 }],
    requiredStaff: [
      { roleId: "animal_caretaker", minFTE: 2 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.0006,
      conversionRatioAnimalsToOutput: 0.08,
      mortalityPctRange: { min: 0.005, max: 0.02 },
      spoilagePctRange: { min: 0.02, max: 0.08 },
    },
    baselineUnitPriceEur: 2.1,
    baselineUnitCostEur: 1.5,
  },
  {
    sku: "pork_kg",
    name: "Pork",
    unit: "kg",
    basePriceEurRange: { min: 1.8, max: 3.2 },
    cogsPctRange: { min: 0.65, max: 1 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "animals_total", minCount: 9000 },
      { assetId: "animals_growing", minCount: 5000 },
      { assetId: "animals_market_ready", minCount: 3000 },
      { assetId: "barn_m2", minCount: 1200 },
      { assetId: "pens_capacity_animals", minCount: 20000 },
      { assetId: "feed_storage_ton", minCount: 60 },
      { assetId: "manure_capacity_ton", minCount: 35 },
      { assetId: "cold_storage_kg", minCount: 1200 },
      { assetId: "biosecurity_level", minCount: 0.6 },
      { assetId: "health_score", minCount: 0.72 },
    ],
    requiredVehicles: [
      { vehicleId: "feed_truck", minCount: 1 },
      { vehicleId: "livestock_trailer", minCount: 1 },
    ],
    requiredMachines: [{ machineId: "slaughter_line", minCount: 1 }],
    requiredStaff: [
      { roleId: "animal_caretaker", minFTE: 3 },
      { roleId: "feed_manager", minFTE: 1 },
      { roleId: "processing_operator", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.0035,
      conversionRatioAnimalsToOutput: 85,
      mortalityPctRange: { min: 0.015, max: 0.05 },
      spoilagePctRange: { min: 0.05, max: 0.14 },
    },
    baselineUnitPriceEur: 2.6,
    baselineUnitCostEur: 2.2,
  },
  {
    sku: "beef_kg",
    name: "Beef",
    unit: "kg",
    basePriceEurRange: { min: 3.8, max: 7.5 },
    cogsPctRange: { min: 0.6, max: 0.95 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "animals_total", minCount: 2500 },
      { assetId: "animals_growing", minCount: 1500 },
      { assetId: "animals_market_ready", minCount: 800 },
      { assetId: "barn_m2", minCount: 2000 },
      { assetId: "pens_capacity_animals", minCount: 6000 },
      { assetId: "feed_storage_ton", minCount: 80 },
      { assetId: "manure_capacity_ton", minCount: 45 },
      { assetId: "cold_storage_kg", minCount: 2000 },
      { assetId: "welfare_score", minCount: 0.8 },
      { assetId: "health_score", minCount: 0.75 },
    ],
    requiredVehicles: [
      { vehicleId: "feed_truck", minCount: 1 },
      { vehicleId: "livestock_trailer", minCount: 1 },
      { vehicleId: "refrigerated_truck", minCount: 1 },
    ],
    requiredMachines: [{ machineId: "slaughter_line", minCount: 1 }],
    requiredStaff: [
      { roleId: "animal_caretaker", minFTE: 3 },
      { roleId: "feed_manager", minFTE: 1 },
      { roleId: "vet_health_officer", minFTE: 1 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.008,
      conversionRatioAnimalsToOutput: 260,
      mortalityPctRange: { min: 0.01, max: 0.04 },
      spoilagePctRange: { min: 0.04, max: 0.12 },
    },
    baselineUnitPriceEur: 5.5,
    baselineUnitCostEur: 4.5,
  },
  {
    sku: "hides_leather_kg",
    name: "Hides & Leather",
    unit: "kg",
    basePriceEurRange: { min: 0.8, max: 2.2 },
    cogsPctRange: { min: 0.4, max: 0.8 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "animals_market_ready", minCount: 3000 },
      { assetId: "cold_storage_kg", minCount: 800 },
      { assetId: "health_score", minCount: 0.7 },
      { assetId: "welfare_score", minCount: 0.7 },
    ],
    requiredVehicles: [
      { vehicleId: "refrigerated_truck", minCount: 1 },
    ],
    requiredMachines: [],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.0,
      conversionRatioAnimalsToOutput: 0.08,
      mortalityPctRange: { min: 0, max: 0 },
      spoilagePctRange: { min: 0.06, max: 0.2 },
    },
    baselineUnitPriceEur: 1.4,
    baselineUnitCostEur: 0.9,
  },
  {
    sku: "byproducts_rendered_kg",
    name: "Rendered Byproducts",
    unit: "kg",
    basePriceEurRange: { min: 0.3, max: 0.9 },
    cogsPctRange: { min: 0.25, max: 0.6 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "manure_capacity_ton", minCount: 30 },
      { assetId: "waste_processing_enabled", minCount: 1 },
    ],
    requiredVehicles: [],
    requiredMachines: [{ machineId: "rendering_unit", minCount: 1 }],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      feedTonPerUnitPerTick: 0.0,
      conversionRatioAnimalsToOutput: 0.05,
      mortalityPctRange: { min: 0, max: 0 },
      spoilagePctRange: { min: 0.03, max: 0.1 },
    },
    baselineUnitPriceEur: 0.6,
    baselineUnitCostEur: 0.4,
  },
];

export function getBaselineMargin(product: LivestockProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testLivestockProducts(): boolean {
  const poultry = livestockProducts.find((product) => product.sku === "poultry_meat_kg");
  const beef = livestockProducts.find((product) => product.sku === "beef_kg");
  return (
    livestockProducts.length === 6 &&
    !!poultry &&
    !!beef &&
    getBaselineMargin(poultry) < 0 &&
    getBaselineMargin(beef) > 0
  );
}
