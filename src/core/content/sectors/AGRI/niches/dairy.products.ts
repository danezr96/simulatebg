export type DairyProductSku =
  | "raw_milk_bulk_liter"
  | "premium_milk_liter"
  | "cheese_kg"
  | "yogurt_kg"
  | "butter_kg"
  | "whey_liter";

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

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type YieldParameters = {
  litersPerCowPerTick: number;
  milkToOutputRatio: number;
  wastePctRange: Range;
};

export type QualityImpacts = {
  healthScore: number;
  complianceScore: number;
  managerPresent: number;
};

export type StorageHandling = {
  storageKey: string;
  overflowBehavior: "dump";
};

export type ByproductRule = {
  sku: DairyProductSku;
  ratio: number;
};

export type DairyProduct = {
  sku: DairyProductSku;
  name: string;
  unit: "liter" | "kg";
  basePriceEurRange: Range;
  cogsPctRange: Range;
  productionType: "continuous";
  requiredAssets: AssetRequirement[];
  requiredVehicles: VehicleRequirement[];
  requiredStaff: StaffRequirement[];
  yieldParams: YieldParameters;
  qualityImpacts: QualityImpacts;
  storage: StorageHandling;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
  byproducts?: ByproductRule[];
};

export const dairyProducts: DairyProduct[] = [
  {
    sku: "raw_milk_bulk_liter",
    name: "Raw Milk (Bulk)",
    unit: "liter",
    basePriceEurRange: { min: 0.35, max: 0.6 },
    cogsPctRange: { min: 1.2, max: 1.6 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cows_lactating", minCount: 350 },
      { assetId: "barn_m2", minCount: 1800 },
      { assetId: "milking_robots", minCount: 2 },
      { assetId: "cooling_tank_liters", minCount: 10000 },
      { assetId: "feed_ton", minCount: 25 },
    ],
    requiredVehicles: [{ vehicleId: "milk_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 3 },
      { roleId: "milking_operator", minFTE: 2 },
      { roleId: "processing_operator", minFTE: 0 },
      { roleId: "quality_compliance", minFTE: 0 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 30,
      milkToOutputRatio: 1,
      wastePctRange: { min: 0.03, max: 0.08 },
    },
    qualityImpacts: {
      healthScore: 0.6,
      complianceScore: 0.1,
      managerPresent: 0.1,
    },
    storage: {
      storageKey: "cooling_tank_liters",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 0.45,
    baselineUnitCostEur: 1.74,
  },
  {
    sku: "premium_milk_liter",
    name: "Premium Milk",
    unit: "liter",
    basePriceEurRange: { min: 0.55, max: 0.9 },
    cogsPctRange: { min: 0.9, max: 1.2 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cows_lactating", minCount: 350 },
      { assetId: "barn_m2", minCount: 1800 },
      { assetId: "milking_robots", minCount: 2 },
      { assetId: "cooling_tank_liters", minCount: 10000 },
      { assetId: "pasteurizer", minCount: 1 },
      { assetId: "feed_ton", minCount: 25 },
    ],
    requiredVehicles: [{ vehicleId: "milk_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 3 },
      { roleId: "milking_operator", minFTE: 2 },
      { roleId: "processing_operator", minFTE: 0 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 30,
      milkToOutputRatio: 1,
      wastePctRange: { min: 0.04, max: 0.1 },
    },
    qualityImpacts: {
      healthScore: 0.55,
      complianceScore: 0.25,
      managerPresent: 0.1,
    },
    storage: {
      storageKey: "cooling_tank_liters",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 0.7,
    baselineUnitCostEur: 0.68,
  },
  {
    sku: "cheese_kg",
    name: "Cheese",
    unit: "kg",
    basePriceEurRange: { min: 6, max: 18 },
    cogsPctRange: { min: 0.45, max: 0.7 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cows_lactating", minCount: 350 },
      { assetId: "barn_m2", minCount: 1800 },
      { assetId: "milking_robots", minCount: 2 },
      { assetId: "cooling_tank_liters", minCount: 10000 },
      { assetId: "cheese_vat", minCount: 2 },
      { assetId: "pasteurizer", minCount: 1 },
      { assetId: "cold_storage_kg", minCount: 1000 },
      { assetId: "feed_ton", minCount: 25 },
    ],
    requiredVehicles: [{ vehicleId: "refrigerated_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 3 },
      { roleId: "milking_operator", minFTE: 2 },
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 30,
      milkToOutputRatio: 10,
      wastePctRange: { min: 0.06, max: 0.12 },
    },
    qualityImpacts: {
      healthScore: 0.45,
      complianceScore: 0.35,
      managerPresent: 0.1,
    },
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 12,
    baselineUnitCostEur: 11,
    byproducts: [{ sku: "whey_liter", ratio: 0.6 }],
  },
  {
    sku: "yogurt_kg",
    name: "Yogurt",
    unit: "kg",
    basePriceEurRange: { min: 1.5, max: 4 },
    cogsPctRange: { min: 0.5, max: 0.8 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cows_lactating", minCount: 250 },
      { assetId: "barn_m2", minCount: 1400 },
      { assetId: "milking_robots", minCount: 2 },
      { assetId: "cooling_tank_liters", minCount: 8000 },
      { assetId: "fermentation_tank", minCount: 1 },
      { assetId: "pasteurizer", minCount: 1 },
      { assetId: "cold_storage_kg", minCount: 600 },
      { assetId: "feed_ton", minCount: 20 },
    ],
    requiredVehicles: [{ vehicleId: "refrigerated_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 2 },
      { roleId: "milking_operator", minFTE: 1 },
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 30,
      milkToOutputRatio: 1.1,
      wastePctRange: { min: 0.05, max: 0.12 },
    },
    qualityImpacts: {
      healthScore: 0.45,
      complianceScore: 0.3,
      managerPresent: 0.1,
    },
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 2.8,
    baselineUnitCostEur: 2,
  },
  {
    sku: "butter_kg",
    name: "Butter",
    unit: "kg",
    basePriceEurRange: { min: 5, max: 12 },
    cogsPctRange: { min: 0.5, max: 0.75 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cows_lactating", minCount: 350 },
      { assetId: "barn_m2", minCount: 1800 },
      { assetId: "milking_robots", minCount: 2 },
      { assetId: "cooling_tank_liters", minCount: 12000 },
      { assetId: "butter_churn", minCount: 1 },
      { assetId: "cold_storage_kg", minCount: 800 },
      { assetId: "feed_ton", minCount: 25 },
    ],
    requiredVehicles: [{ vehicleId: "refrigerated_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 3 },
      { roleId: "milking_operator", minFTE: 2 },
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 30,
      milkToOutputRatio: 24,
      wastePctRange: { min: 0.08, max: 0.15 },
    },
    qualityImpacts: {
      healthScore: 0.45,
      complianceScore: 0.3,
      managerPresent: 0.1,
    },
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 8,
    baselineUnitCostEur: 6.5,
    byproducts: [{ sku: "whey_liter", ratio: 0.4 }],
  },
  {
    sku: "whey_liter",
    name: "Whey (Byproduct)",
    unit: "liter",
    basePriceEurRange: { min: 0.05, max: 0.2 },
    cogsPctRange: { min: 0.2, max: 0.4 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "cooling_tank_liters", minCount: 4000 },
      { assetId: "cold_storage_kg", minCount: 300 },
    ],
    requiredVehicles: [{ vehicleId: "refrigerated_truck", minCount: 1 }],
    requiredStaff: [
      { roleId: "livestock_caretaker", minFTE: 0 },
      { roleId: "milking_operator", minFTE: 0 },
      { roleId: "processing_operator", minFTE: 1 },
      { roleId: "quality_compliance", minFTE: 0 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      litersPerCowPerTick: 0,
      milkToOutputRatio: 1,
      wastePctRange: { min: 0.02, max: 0.05 },
    },
    qualityImpacts: {
      healthScore: 0.1,
      complianceScore: 0.2,
      managerPresent: 0.05,
    },
    storage: {
      storageKey: "cooling_tank_liters",
      overflowBehavior: "dump",
    },
    baselineUnitPriceEur: 0.1,
    baselineUnitCostEur: 0.04,
  },
];

export function getBaselineMargin(product: DairyProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testDairyProducts(): boolean {
  const rawMilk = dairyProducts.find((product) => product.sku === "raw_milk_bulk_liter");
  const cheese = dairyProducts.find((product) => product.sku === "cheese_kg");
  return (
    dairyProducts.length === 6 &&
    !!rawMilk &&
    !!cheese &&
    getBaselineMargin(rawMilk) < 0 &&
    getBaselineMargin(cheese) > 0
  );
}
