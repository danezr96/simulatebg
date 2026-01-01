export type CarDealerProductSku =
  | "used_car_unit"
  | "new_car_unit"
  | "trade_in_unit"
  | "financing_contract_unit"
  | "extended_warranty_unit"
  | "detailing_service_unit";

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

export type InventoryCostModel = {
  model: "inventory_cost";
  marginPctRange: Range;
};

export type ServiceCostModel = {
  model: "service_cost";
  costPerUnitRange: Range;
};

export type CogsModel = InventoryCostModel | ServiceCostModel;

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
};

export type InventoryFlow = {
  cashflowDirection: "inflow" | "outflow";
  cashflowEurRange: Range;
  inventoryUsedUnitsDelta?: number;
  inventoryNewUnitsDelta?: number;
};

export type OperationalConstraints = {
  requiresReconditioning?: boolean;
  allowAsIsOverride?: boolean;
  reconditioningHoursPerUnit?: number;
  serviceHoursPerUnit?: number;
};

export type StaffRequirementGroup = StaffRequirement[];

export type CarDealerProduct = {
  sku: CarDealerProductSku;
  name: string;
  unit: "unit";
  basePriceEurRange: Range;
  productionType: "transactional";
  cogsModel: CogsModel;
  demandModel: DemandModel;
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  requiredStaffAnyOf?: StaffRequirementGroup[];
  minComplianceScore?: number;
  minReputationScore?: number;
  requiresFloorplanFinancing?: boolean;
  inventoryFlow?: InventoryFlow;
  operational?: OperationalConstraints;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const carDealerProducts: CarDealerProduct[] = [
  {
    sku: "used_car_unit",
    name: "Used Car",
    unit: "unit",
    basePriceEurRange: { min: 8000, max: 35000 },
    productionType: "transactional",
    cogsModel: {
      model: "inventory_cost",
      marginPctRange: { min: 0.03, max: 0.12 },
    },
    demandModel: {
      baseDemandWeight: 0.55,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.55,
    },
    requiredAssets: [
      { assetId: "showroom_m2", minCount: 200 },
      { assetId: "inventory_slots", minCount: 15 },
      { assetId: "storage_slots", minCount: 10 },
      { assetId: "reconditioning_bays", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "sales_staff", minFTE: 1 },
      { roleId: "service_staff", minFTE: 1 },
    ],
    requiresFloorplanFinancing: true,
    inventoryFlow: {
      cashflowDirection: "inflow",
      cashflowEurRange: { min: 8000, max: 35000 },
      inventoryUsedUnitsDelta: -1,
    },
    operational: {
      requiresReconditioning: true,
      allowAsIsOverride: true,
      reconditioningHoursPerUnit: 6,
    },
    baselineUnitPriceEur: 18000,
    baselineUnitCostEur: 18500,
  },
  {
    sku: "new_car_unit",
    name: "New Car",
    unit: "unit",
    basePriceEurRange: { min: 18000, max: 80000 },
    productionType: "transactional",
    cogsModel: {
      model: "inventory_cost",
      marginPctRange: { min: 0.01, max: 0.06 },
    },
    demandModel: {
      baseDemandWeight: 0.25,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.45,
    },
    requiredAssets: [
      { assetId: "showroom_m2", minCount: 320 },
      { assetId: "inventory_slots", minCount: 20 },
      { assetId: "storage_slots", minCount: 10 },
    ],
    requiredStaff: [{ roleId: "sales_staff", minFTE: 2 }],
    minReputationScore: 0.6,
    requiresFloorplanFinancing: true,
    inventoryFlow: {
      cashflowDirection: "inflow",
      cashflowEurRange: { min: 18000, max: 80000 },
      inventoryNewUnitsDelta: -1,
    },
    baselineUnitPriceEur: 32000,
    baselineUnitCostEur: 31000,
  },
  {
    sku: "trade_in_unit",
    name: "Trade-In",
    unit: "unit",
    basePriceEurRange: { min: 6000, max: 20000 },
    productionType: "transactional",
    cogsModel: {
      model: "inventory_cost",
      marginPctRange: { min: -0.2, max: -0.05 },
    },
    demandModel: {
      baseDemandWeight: 0.2,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.4,
    },
    requiredAssets: [
      { assetId: "showroom_m2", minCount: 180 },
      { assetId: "inventory_slots", minCount: 10 },
      { assetId: "appraisal_tools", minCount: 1 },
    ],
    requiredStaff: [{ roleId: "sales_staff", minFTE: 1 }],
    inventoryFlow: {
      cashflowDirection: "outflow",
      cashflowEurRange: { min: 6000, max: 20000 },
      inventoryUsedUnitsDelta: 1,
    },
    operational: {
      reconditioningHoursPerUnit: 2,
    },
    baselineUnitPriceEur: 12000,
    baselineUnitCostEur: 12000,
  },
  {
    sku: "financing_contract_unit",
    name: "Financing Contract",
    unit: "unit",
    basePriceEurRange: { min: 300, max: 1800 },
    productionType: "transactional",
    cogsModel: {
      model: "service_cost",
      costPerUnitRange: { min: 80, max: 320 },
    },
    demandModel: {
      baseDemandWeight: 0.32,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.35,
    },
    requiredAssets: [{ assetId: "compliance_score", minCount: 0.7 }],
    requiredStaff: [{ roleId: "finance_staff", minFTE: 1 }],
    minComplianceScore: 0.7,
    inventoryFlow: {
      cashflowDirection: "inflow",
      cashflowEurRange: { min: 300, max: 1800 },
    },
    operational: {
      serviceHoursPerUnit: 0.6,
    },
    baselineUnitPriceEur: 900,
    baselineUnitCostEur: 200,
  },
  {
    sku: "extended_warranty_unit",
    name: "Extended Warranty",
    unit: "unit",
    basePriceEurRange: { min: 250, max: 1500 },
    productionType: "transactional",
    cogsModel: {
      model: "service_cost",
      costPerUnitRange: { min: 120, max: 520 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.3,
    },
    requiredAssets: [{ assetId: "compliance_score", minCount: 0.75 }],
    requiredStaff: [],
    requiredStaffAnyOf: [
      [{ roleId: "finance_staff", minFTE: 1 }],
      [{ roleId: "service_manager", minFTE: 1 }],
    ],
    minComplianceScore: 0.75,
    minReputationScore: 0.55,
    inventoryFlow: {
      cashflowDirection: "inflow",
      cashflowEurRange: { min: 250, max: 1500 },
    },
    operational: {
      serviceHoursPerUnit: 0.4,
    },
    baselineUnitPriceEur: 700,
    baselineUnitCostEur: 320,
  },
  {
    sku: "detailing_service_unit",
    name: "Detailing Service",
    unit: "unit",
    basePriceEurRange: { min: 80, max: 450 },
    productionType: "transactional",
    cogsModel: {
      model: "service_cost",
      costPerUnitRange: { min: 45, max: 180 },
    },
    demandModel: {
      baseDemandWeight: 0.3,
      seasonalityKey: "car_wash_weather_seasonality",
      priceElasticity: 0.6,
    },
    requiredAssets: [
      { assetId: "reconditioning_bays", minCount: 1 },
      { assetId: "service_hours_capacity_per_tick", minCount: 20 },
    ],
    requiredStaff: [{ roleId: "service_staff", minFTE: 1 }],
    inventoryFlow: {
      cashflowDirection: "inflow",
      cashflowEurRange: { min: 80, max: 450 },
    },
    operational: {
      reconditioningHoursPerUnit: 2,
      serviceHoursPerUnit: 2,
    },
    baselineUnitPriceEur: 200,
    baselineUnitCostEur: 130,
  },
];

export function getBaselineMargin(product: CarDealerProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testCarDealerProducts(): boolean {
  const usedCar = carDealerProducts.find((product) => product.sku === "used_car_unit");
  const financing = carDealerProducts.find(
    (product) => product.sku === "financing_contract_unit"
  );
  return (
    carDealerProducts.length === 6 &&
    !!usedCar &&
    !!financing &&
    getBaselineMargin(usedCar) < 0 &&
    getBaselineMargin(financing) > 0
  );
}
