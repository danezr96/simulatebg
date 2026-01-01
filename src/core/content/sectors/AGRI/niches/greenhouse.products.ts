export type GreenhouseProductSku =
  | "tomatoes_kg"
  | "cucumbers_kg"
  | "bell_peppers_kg"
  | "herbs_pack"
  | "strawberries_kg"
  | "microgreens_kg";

export type Range = {
  min: number;
  max: number;
};

export type AssetRequirement = {
  assetId: string;
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
  yieldKgPerM2PerTick: number;
  energyKwhPerM2PerTick: number;
  spoilagePctRange: Range;
  pestDamagePctRange: Range;
};

export type GreenhouseProduct = {
  sku: GreenhouseProductSku;
  name: string;
  unit: "kg" | "pack";
  basePriceEurRange: Range;
  cogsPctRange: Range;
  productionType: "continuous";
  requiredAssets: AssetRequirement[];
  requiredMachines: MachineRequirement[];
  requiredStaff: StaffRequirement[];
  yieldParams: YieldParameters;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const greenhouseProducts: GreenhouseProduct[] = [
  {
    sku: "tomatoes_kg",
    name: "Tomatoes",
    unit: "kg",
    basePriceEurRange: { min: 1.2, max: 3.2 },
    cogsPctRange: { min: 0.75, max: 1.1 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 5500 },
      { assetId: "climate_control_level", minCount: 0.35 },
      { assetId: "irrigation_capacity_lph", minCount: 6000 },
      { assetId: "cold_storage_kg", minCount: 2000 },
    ],
    requiredMachines: [{ machineId: "climate_control_system", minCount: 1 }],
    requiredStaff: [
      { roleId: "grower", minFTE: 1 },
      { roleId: "picking_staff", minFTE: 4 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 1.8,
      energyKwhPerM2PerTick: 4.2,
      spoilagePctRange: { min: 0.06, max: 0.18 },
      pestDamagePctRange: { min: 0.02, max: 0.08 },
    },
    baselineUnitPriceEur: 2.1,
    baselineUnitCostEur: 2.35,
  },
  {
    sku: "cucumbers_kg",
    name: "Cucumbers",
    unit: "kg",
    basePriceEurRange: { min: 0.8, max: 2 },
    cogsPctRange: { min: 0.7, max: 1.05 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 5000 },
      { assetId: "climate_control_level", minCount: 0.45 },
      { assetId: "irrigation_capacity_lph", minCount: 5500 },
      { assetId: "cold_storage_kg", minCount: 1500 },
    ],
    requiredMachines: [{ machineId: "climate_control_system", minCount: 1 }],
    requiredStaff: [
      { roleId: "grower", minFTE: 1 },
      { roleId: "picking_staff", minFTE: 4 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 2.1,
      energyKwhPerM2PerTick: 3.8,
      spoilagePctRange: { min: 0.08, max: 0.22 },
      pestDamagePctRange: { min: 0.03, max: 0.09 },
    },
    baselineUnitPriceEur: 1.3,
    baselineUnitCostEur: 1.2,
  },
  {
    sku: "bell_peppers_kg",
    name: "Bell Peppers",
    unit: "kg",
    basePriceEurRange: { min: 1.8, max: 4.5 },
    cogsPctRange: { min: 0.6, max: 0.95 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 4500 },
      { assetId: "climate_control_level", minCount: 0.6 },
      { assetId: "irrigation_capacity_lph", minCount: 5000 },
      { assetId: "cold_storage_kg", minCount: 1200 },
    ],
    requiredMachines: [
      { machineId: "climate_control_system", minCount: 1 },
      { machineId: "sorting_line", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "grower", minFTE: 1 },
      { roleId: "picking_staff", minFTE: 3 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 1.6,
      energyKwhPerM2PerTick: 4.6,
      spoilagePctRange: { min: 0.05, max: 0.16 },
      pestDamagePctRange: { min: 0.02, max: 0.07 },
    },
    baselineUnitPriceEur: 3.1,
    baselineUnitCostEur: 2.3,
  },
  {
    sku: "herbs_pack",
    name: "Herbs Pack",
    unit: "pack",
    basePriceEurRange: { min: 0.7, max: 2.2 },
    cogsPctRange: { min: 0.55, max: 0.9 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 2000 },
      { assetId: "climate_control_level", minCount: 0.5 },
      { assetId: "irrigation_capacity_lph", minCount: 3500 },
      { assetId: "cold_storage_kg", minCount: 800 },
      { assetId: "packaging_capacity_units", minCount: 8000 },
    ],
    requiredMachines: [
      { machineId: "climate_control_system", minCount: 1 },
      { machineId: "packaging_line", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "grower", minFTE: 1 },
      { roleId: "picking_staff", minFTE: 2 },
      { roleId: "packaging_operator", minFTE: 1 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 0.8,
      energyKwhPerM2PerTick: 3.5,
      spoilagePctRange: { min: 0.1, max: 0.25 },
      pestDamagePctRange: { min: 0.03, max: 0.08 },
    },
    baselineUnitPriceEur: 1.4,
    baselineUnitCostEur: 0.95,
  },
  {
    sku: "strawberries_kg",
    name: "Strawberries",
    unit: "kg",
    basePriceEurRange: { min: 2.5, max: 7 },
    cogsPctRange: { min: 0.6, max: 1.0 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 3000 },
      { assetId: "climate_control_level", minCount: 0.55 },
      { assetId: "irrigation_capacity_lph", minCount: 4000 },
      { assetId: "cold_storage_kg", minCount: 1500 },
    ],
    requiredMachines: [
      { machineId: "climate_control_system", minCount: 1 },
      { machineId: "pest_management_system", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "grower", minFTE: 1 },
      { roleId: "picking_staff", minFTE: 3 },
      { roleId: "maintenance_technician", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 1.1,
      energyKwhPerM2PerTick: 4.8,
      spoilagePctRange: { min: 0.12, max: 0.3 },
      pestDamagePctRange: { min: 0.01, max: 0.05 },
    },
    baselineUnitPriceEur: 4.5,
    baselineUnitCostEur: 3.6,
  },
  {
    sku: "microgreens_kg",
    name: "Microgreens",
    unit: "kg",
    basePriceEurRange: { min: 10, max: 35 },
    cogsPctRange: { min: 0.45, max: 0.85 },
    productionType: "continuous",
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 1200 },
      { assetId: "climate_control_level", minCount: 0.7 },
      { assetId: "irrigation_capacity_lph", minCount: 2500 },
      { assetId: "lighting_kw_capacity", minCount: 400 },
      { assetId: "co2_injection_enabled", minCount: 1 },
      { assetId: "cold_storage_kg", minCount: 500 },
    ],
    requiredMachines: [
      { machineId: "climate_control_system", minCount: 1 },
      { machineId: "led_lighting_system", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "grower", minFTE: 2 },
      { roleId: "picking_staff", minFTE: 1 },
      { roleId: "quality_compliance", minFTE: 1 },
      { roleId: "logistics_staff", minFTE: 1 },
    ],
    yieldParams: {
      yieldKgPerM2PerTick: 0.9,
      energyKwhPerM2PerTick: 7.2,
      spoilagePctRange: { min: 0.08, max: 0.2 },
      pestDamagePctRange: { min: 0.01, max: 0.04 },
    },
    baselineUnitPriceEur: 18,
    baselineUnitCostEur: 10.5,
  },
];

export function getBaselineMargin(product: GreenhouseProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testGreenhouseProducts(): boolean {
  const tomatoes = greenhouseProducts.find((product) => product.sku === "tomatoes_kg");
  const microgreens = greenhouseProducts.find(
    (product) => product.sku === "microgreens_kg"
  );
  return (
    greenhouseProducts.length === 6 &&
    !!tomatoes &&
    !!microgreens &&
    getBaselineMargin(tomatoes) < 0 &&
    getBaselineMargin(microgreens) > 0
  );
}
