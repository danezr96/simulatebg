export type FoodProcessingProductSku =
  | "flour_kg"
  | "packaged_bread_unit"
  | "ready_meal_unit"
  | "animal_feed_mix_ton"
  | "frozen_vegetables_kg"
  | "private_label_batch";

export type Range = {
  min: number;
  max: number;
};

export type RawInputRequirement = {
  inputId: string;
  amount: number;
  unit: "kg" | "ton" | "unit" | "batch";
};

export type MachineRequirement = {
  machineId: string;
  minCount: number;
};

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type StorageHandling = {
  storageKey: string;
  overflowBehavior: "dump";
};

export type QualityImpacts = {
  complianceScore: number;
  managerPresent: number;
  processControl: number;
};

export type FoodProcessingProduct = {
  sku: FoodProcessingProductSku;
  name: string;
  unit: "kg" | "unit" | "ton" | "batch";
  basePriceEurRange: Range;
  cogsPctRange: Range;
  productionType: "continuous";
  requiredInputs: RawInputRequirement[];
  requiredMachines: MachineRequirement[];
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  energyPerUnitKwh: number;
  storage: StorageHandling;
  wastePctRange: Range;
  qualityImpacts: QualityImpacts;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const foodProcessingProducts: FoodProcessingProduct[] = [
  {
    sku: "flour_kg",
    name: "Flour",
    unit: "kg",
    basePriceEurRange: { min: 0.3, max: 0.6 },
    cogsPctRange: { min: 0.9, max: 1.15 },
    productionType: "continuous",
    requiredInputs: [{ inputId: "grain_kg", amount: 1.2, unit: "kg" }],
    requiredMachines: [{ machineId: "milling_line", minCount: 1 }],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 200 },
      { assetId: "dry_storage_kg", minCount: 10000 },
      { assetId: "energy_capacity_kwh", minCount: 2500 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "maintenance_technician", minFTE: 0.5 },
    ],
    energyPerUnitKwh: 0.25,
    storage: {
      storageKey: "dry_storage_kg",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.02, max: 0.05 },
    qualityImpacts: {
      complianceScore: 0.15,
      managerPresent: 0.05,
      processControl: 0.1,
    },
    baselineUnitPriceEur: 0.45,
    baselineUnitCostEur: 0.75,
  },
  {
    sku: "packaged_bread_unit",
    name: "Packaged Bread",
    unit: "unit",
    basePriceEurRange: { min: 1.2, max: 3.5 },
    cogsPctRange: { min: 0.5, max: 0.8 },
    productionType: "continuous",
    requiredInputs: [
      { inputId: "flour_kg", amount: 0.7, unit: "kg" },
      { inputId: "packaging_unit", amount: 1, unit: "unit" },
    ],
    requiredMachines: [
      { machineId: "mixing_line", minCount: 1 },
      { machineId: "baking_line", minCount: 2 },
      { machineId: "packaging_line", minCount: 1 },
    ],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 400 },
      { assetId: "packaging_capacity_units", minCount: 10000 },
      { assetId: "dry_storage_kg", minCount: 8000 },
      { assetId: "energy_capacity_kwh", minCount: 4000 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 4 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "maintenance_technician", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    energyPerUnitKwh: 0.4,
    storage: {
      storageKey: "packaging_capacity_units",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.03, max: 0.08 },
    qualityImpacts: {
      complianceScore: 0.25,
      managerPresent: 0.1,
      processControl: 0.15,
    },
    baselineUnitPriceEur: 2,
    baselineUnitCostEur: 1.4,
  },
  {
    sku: "ready_meal_unit",
    name: "Ready Meals",
    unit: "unit",
    basePriceEurRange: { min: 3, max: 8 },
    cogsPctRange: { min: 0.55, max: 0.85 },
    productionType: "continuous",
    requiredInputs: [
      { inputId: "meal_components_unit", amount: 1, unit: "unit" },
      { inputId: "vegetables_kg", amount: 0.4, unit: "kg" },
      { inputId: "packaging_unit", amount: 1, unit: "unit" },
    ],
    requiredMachines: [
      { machineId: "mixing_line", minCount: 1 },
      { machineId: "cooking_line", minCount: 1 },
      { machineId: "packaging_line", minCount: 1 },
    ],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 500 },
      { assetId: "cold_storage_kg", minCount: 5000 },
      { assetId: "packaging_capacity_units", minCount: 10000 },
      { assetId: "energy_capacity_kwh", minCount: 6000 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 4 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "maintenance_technician", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
      { roleId: "production_manager", minFTE: 0.5 },
    ],
    energyPerUnitKwh: 0.6,
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.06, max: 0.12 },
    qualityImpacts: {
      complianceScore: 0.35,
      managerPresent: 0.15,
      processControl: 0.2,
    },
    baselineUnitPriceEur: 5,
    baselineUnitCostEur: 3.5,
  },
  {
    sku: "animal_feed_mix_ton",
    name: "Animal Feed Mix",
    unit: "ton",
    basePriceEurRange: { min: 220, max: 420 },
    cogsPctRange: { min: 0.6, max: 0.9 },
    productionType: "continuous",
    requiredInputs: [
      { inputId: "grain_kg", amount: 700, unit: "kg" },
      { inputId: "byproduct_kg", amount: 300, unit: "kg" },
    ],
    requiredMachines: [{ machineId: "mixing_line", minCount: 1 }],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 250 },
      { assetId: "dry_storage_kg", minCount: 15000 },
      { assetId: "energy_capacity_kwh", minCount: 2000 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 2 },
      { roleId: "maintenance_technician", minFTE: 0.5 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    energyPerUnitKwh: 120,
    storage: {
      storageKey: "dry_storage_kg",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.02, max: 0.06 },
    qualityImpacts: {
      complianceScore: 0.12,
      managerPresent: 0.05,
      processControl: 0.08,
    },
    baselineUnitPriceEur: 300,
    baselineUnitCostEur: 260,
  },
  {
    sku: "frozen_vegetables_kg",
    name: "Frozen Vegetables",
    unit: "kg",
    basePriceEurRange: { min: 1.5, max: 3.5 },
    cogsPctRange: { min: 0.55, max: 0.8 },
    productionType: "continuous",
    requiredInputs: [
      { inputId: "vegetables_kg", amount: 1.1, unit: "kg" },
      { inputId: "packaging_unit", amount: 1, unit: "unit" },
    ],
    requiredMachines: [
      { machineId: "freezing_line", minCount: 1 },
      { machineId: "packaging_line", minCount: 1 },
    ],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 450 },
      { assetId: "cold_storage_kg", minCount: 8000 },
      { assetId: "packaging_capacity_units", minCount: 10000 },
      { assetId: "energy_capacity_kwh", minCount: 5000 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 3 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "maintenance_technician", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    energyPerUnitKwh: 0.5,
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.04, max: 0.1 },
    qualityImpacts: {
      complianceScore: 0.25,
      managerPresent: 0.1,
      processControl: 0.2,
    },
    baselineUnitPriceEur: 2.4,
    baselineUnitCostEur: 2,
  },
  {
    sku: "private_label_batch",
    name: "Private Label Batch",
    unit: "batch",
    basePriceEurRange: { min: 6000, max: 80000 },
    cogsPctRange: { min: 0.4, max: 0.75 },
    productionType: "continuous",
    requiredInputs: [
      { inputId: "contract_input_kg", amount: 2000, unit: "kg" },
      { inputId: "packaging_unit", amount: 20000, unit: "unit" },
    ],
    requiredMachines: [
      { machineId: "mixing_line", minCount: 1 },
      { machineId: "cooking_line", minCount: 1 },
      { machineId: "packaging_line", minCount: 1 },
    ],
    requiredAssets: [
      { assetId: "processing_m2", minCount: 600 },
      { assetId: "cold_storage_kg", minCount: 6000 },
      { assetId: "packaging_capacity_units", minCount: 20000 },
      { assetId: "energy_capacity_kwh", minCount: 7000 },
    ],
    requiredStaff: [
      { roleId: "processing_operator", minFTE: 5 },
      { roleId: "quality_compliance", minFTE: 2 },
      { roleId: "logistics_staff", minFTE: 2 },
      { roleId: "production_manager", minFTE: 1 },
    ],
    energyPerUnitKwh: 500,
    storage: {
      storageKey: "cold_storage_kg",
      overflowBehavior: "dump",
    },
    wastePctRange: { min: 0.05, max: 0.1 },
    qualityImpacts: {
      complianceScore: 0.4,
      managerPresent: 0.2,
      processControl: 0.25,
    },
    baselineUnitPriceEur: 20000,
    baselineUnitCostEur: 14000,
  },
];

export function getBaselineMargin(product: FoodProcessingProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testFoodProcessingProducts(): boolean {
  const flour = foodProcessingProducts.find((product) => product.sku === "flour_kg");
  const bread = foodProcessingProducts.find(
    (product) => product.sku === "packaged_bread_unit"
  );
  return (
    foodProcessingProducts.length === 6 &&
    !!flour &&
    !!bread &&
    getBaselineMargin(flour) < 0 &&
    getBaselineMargin(bread) > 0
  );
}
