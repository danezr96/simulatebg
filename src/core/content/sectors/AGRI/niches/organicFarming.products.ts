export type OrganicFarmingProductSku =
  | "organic_grain_ton"
  | "organic_vegetables_kg"
  | "organic_milk_liter"
  | "csa_box_unit"
  | "farmers_market_slot_day"
  | "premium_organic_contract_batch";

export type Range = {
  min: number;
  max: number;
};

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type YieldParameters = {
  landPerTonM2: number;
  yieldKgPerM2PerTick: number;
  litersPerTick: number;
  soilHealthYieldBase: number;
  soilHealthYieldMultiplier: number;
  spoilagePctRange: Range;
  channelCapPerTick: number;
};

export type OrganicFarmingProduct = {
  sku: OrganicFarmingProductSku;
  name: string;
  unit: "ton" | "kg" | "liter" | "unit" | "day" | "batch";
  basePriceEurRange: Range;
  cogsPctRange: Range;
  productionType: "seasonal" | "continuous" | "contract" | "channel";
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  yieldParams: YieldParameters;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const organicFarmingProducts: OrganicFarmingProduct[] = [
  {
    sku: "organic_grain_ton",
    name: "Organic Grain",
    unit: "ton",
    basePriceEurRange: { min: 320, max: 520 },
    cogsPctRange: { min: 0.85, max: 1.2 },
    productionType: "seasonal",
    requiredAssets: [
      { assetId: "organic_arable_m2", minCount: 200000 },
      { assetId: "soil_health_score", minCount: 0.4 },
      { assetId: "rotation_compliance_score", minCount: 0.35 },
      { assetId: "tractor", minCount: 1 },
      { assetId: "seeder", minCount: 1 },
      { assetId: "storage_ton", minCount: 80 },
    ],
    requiredStaff: [
      { roleId: "farm_worker", minFTE: 3 },
      { roleId: "farm_manager", minFTE: 0.5 },
    ],
    yieldParams: {
      landPerTonM2: 2400,
      yieldKgPerM2PerTick: 0,
      litersPerTick: 0,
      soilHealthYieldBase: 0.7,
      soilHealthYieldMultiplier: 0.5,
      spoilagePctRange: { min: 0.02, max: 0.08 },
      channelCapPerTick: 0,
    },
    baselineUnitPriceEur: 420,
    baselineUnitCostEur: 460,
  },
  {
    sku: "organic_vegetables_kg",
    name: "Organic Vegetables",
    unit: "kg",
    basePriceEurRange: { min: 1.8, max: 4.2 },
    cogsPctRange: { min: 0.7, max: 1.05 },
    productionType: "seasonal",
    requiredAssets: [
      { assetId: "organic_arable_m2", minCount: 60000 },
      { assetId: "soil_health_score", minCount: 0.5 },
      { assetId: "rotation_compliance_score", minCount: 0.6 },
      { assetId: "irrigation_system", minCount: 1 },
      { assetId: "compost_capacity_ton", minCount: 15 },
      { assetId: "cold_storage_kg", minCount: 1000 },
    ],
    requiredStaff: [
      { roleId: "farm_worker", minFTE: 4 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      landPerTonM2: 0,
      yieldKgPerM2PerTick: 0.9,
      litersPerTick: 0,
      soilHealthYieldBase: 0.7,
      soilHealthYieldMultiplier: 0.5,
      spoilagePctRange: { min: 0.08, max: 0.2 },
      channelCapPerTick: 0,
    },
    baselineUnitPriceEur: 3.2,
    baselineUnitCostEur: 2.8,
  },
  {
    sku: "organic_milk_liter",
    name: "Organic Milk",
    unit: "liter",
    basePriceEurRange: { min: 0.75, max: 1.4 },
    cogsPctRange: { min: 0.8, max: 1.1 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "dairy_module_enabled", minCount: 1 },
      { assetId: "organic_certified", minCount: 1 },
      { assetId: "cooling_tank_liters", minCount: 5000 },
      { assetId: "welfare_score", minCount: 0.75 },
    ],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 2 },
      { roleId: "quality_compliance", minFTE: 1 },
    ],
    yieldParams: {
      landPerTonM2: 0,
      yieldKgPerM2PerTick: 0,
      litersPerTick: 10000,
      soilHealthYieldBase: 0.8,
      soilHealthYieldMultiplier: 0.2,
      spoilagePctRange: { min: 0.03, max: 0.1 },
      channelCapPerTick: 0,
    },
    baselineUnitPriceEur: 1.1,
    baselineUnitCostEur: 1.0,
  },
  {
    sku: "csa_box_unit",
    name: "CSA Subscription Box",
    unit: "unit",
    basePriceEurRange: { min: 15, max: 35 },
    cogsPctRange: { min: 0.6, max: 0.85 },
    productionType: "channel",
    requiredAssets: [
      { assetId: "organic_arable_m2", minCount: 50000 },
      { assetId: "brand_reputation_score", minCount: 0.65 },
      { assetId: "csa_subscribers", minCount: 200 },
      { assetId: "cold_storage_kg", minCount: 1500 },
      { assetId: "packaging_line", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "farm_worker", minFTE: 3 },
      { roleId: "logistics_staff", minFTE: 2 },
    ],
    yieldParams: {
      landPerTonM2: 0,
      yieldKgPerM2PerTick: 0,
      litersPerTick: 0,
      soilHealthYieldBase: 0.75,
      soilHealthYieldMultiplier: 0.35,
      spoilagePctRange: { min: 0.08, max: 0.2 },
      channelCapPerTick: 250,
    },
    baselineUnitPriceEur: 25,
    baselineUnitCostEur: 18,
  },
  {
    sku: "farmers_market_slot_day",
    name: "Farmers Market Slot",
    unit: "day",
    basePriceEurRange: { min: 500, max: 1800 },
    cogsPctRange: { min: 0.4, max: 0.7 },
    productionType: "channel",
    requiredAssets: [
      { assetId: "farmers_market_slots", minCount: 1 },
      { assetId: "brand_reputation_score", minCount: 0.55 },
      { assetId: "cold_storage_kg", minCount: 800 },
    ],
    requiredStaff: [
      { roleId: "sales_staff", minFTE: 1 },
      { roleId: "farm_worker", minFTE: 2 },
    ],
    yieldParams: {
      landPerTonM2: 0,
      yieldKgPerM2PerTick: 0,
      litersPerTick: 0,
      soilHealthYieldBase: 0.7,
      soilHealthYieldMultiplier: 0.3,
      spoilagePctRange: { min: 0.05, max: 0.15 },
      channelCapPerTick: 1,
    },
    baselineUnitPriceEur: 900,
    baselineUnitCostEur: 600,
  },
  {
    sku: "premium_organic_contract_batch",
    name: "Premium Organic Contract",
    unit: "batch",
    basePriceEurRange: { min: 8000, max: 60000 },
    cogsPctRange: { min: 0.45, max: 0.75 },
    productionType: "contract",
    requiredAssets: [
      { assetId: "organic_certified", minCount: 1 },
      { assetId: "audit_readiness_score", minCount: 0.75 },
      { assetId: "cold_storage_kg", minCount: 2000 },
      { assetId: "packaging_line", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
      { roleId: "farm_manager", minFTE: 0.5 },
    ],
    yieldParams: {
      landPerTonM2: 0,
      yieldKgPerM2PerTick: 0,
      litersPerTick: 0,
      soilHealthYieldBase: 0.8,
      soilHealthYieldMultiplier: 0.25,
      spoilagePctRange: { min: 0.02, max: 0.06 },
      channelCapPerTick: 2,
    },
    baselineUnitPriceEur: 30000,
    baselineUnitCostEur: 21000,
  },
];

export function getBaselineMargin(product: OrganicFarmingProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testOrganicFarmingProducts(): boolean {
  const grain = organicFarmingProducts.find(
    (product) => product.sku === "organic_grain_ton"
  );
  const contract = organicFarmingProducts.find(
    (product) => product.sku === "premium_organic_contract_batch"
  );
  return (
    organicFarmingProducts.length === 6 &&
    !!grain &&
    !!contract &&
    getBaselineMargin(grain) < 0 &&
    getBaselineMargin(contract) > 0
  );
}
