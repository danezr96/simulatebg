export type MobilityProductSku =
  | "economy_rental_day_unit"
  | "premium_rental_day_unit"
  | "van_rental_day_unit"
  | "corporate_fleet_contract_unit"
  | "insurance_addon_day_unit"
  | "delivery_mobility_day_unit";

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

export type MobilityCogsModel = {
  vehicleDepreciationEurPerDayRange: Range;
  maintenanceEurPerDayRange: Range;
  insuranceEurPerDayRange: Range;
  cleaningEurPerDayRange: Range;
  paymentProcessingPctRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  leadTimeSensitivity: number;
};

export type MobilityProduct = {
  sku: MobilityProductSku;
  name: string;
  unit: "unit";
  productionType: "rental" | "contract" | "addon" | "delivery";
  basePriceEurRange: Range;
  cogsModel: MobilityCogsModel;
  demandModel: DemandModel;
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minUptimeScore?: number;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const mobilityProducts: MobilityProduct[] = [
  {
    sku: "economy_rental_day_unit",
    name: "Economy Rental Day",
    unit: "unit",
    productionType: "rental",
    basePriceEurRange: { min: 25, max: 70 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 8, max: 18 },
      maintenanceEurPerDayRange: { min: 2, max: 6 },
      insuranceEurPerDayRange: { min: 3, max: 9 },
      cleaningEurPerDayRange: { min: 1, max: 4 },
      paymentProcessingPctRange: { min: 0.02, max: 0.04 },
    },
    demandModel: {
      baseDemandWeight: 0.55,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.55,
      leadTimeSensitivity: 0.45,
    },
    requiredAssets: [
      { assetId: "fleet_economy_count", minCount: 4 },
      { assetId: "downtime_pct", minCount: 0 },
    ],
    requiredStaff: [{ roleId: "ops_staff", minFTE: 1 }],
    baselineUnitPriceEur: 45,
    baselineUnitCostEur: 32,
  },
  {
    sku: "premium_rental_day_unit",
    name: "Premium Rental Day",
    unit: "unit",
    productionType: "rental",
    basePriceEurRange: { min: 65, max: 180 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 18, max: 45 },
      maintenanceEurPerDayRange: { min: 3, max: 9 },
      insuranceEurPerDayRange: { min: 6, max: 12 },
      cleaningEurPerDayRange: { min: 2, max: 6 },
      paymentProcessingPctRange: { min: 0.02, max: 0.04 },
    },
    demandModel: {
      baseDemandWeight: 0.2,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.4,
      leadTimeSensitivity: 0.35,
    },
    requiredAssets: [{ assetId: "fleet_premium_count", minCount: 2 }],
    requiredStaff: [
      { roleId: "ops_staff", minFTE: 1 },
      { roleId: "customer_support_staff", minFTE: 1 },
    ],
    minReputationScore: 0.55,
    baselineUnitPriceEur: 120,
    baselineUnitCostEur: 80,
  },
  {
    sku: "van_rental_day_unit",
    name: "Van Rental Day",
    unit: "unit",
    productionType: "rental",
    basePriceEurRange: { min: 55, max: 150 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 12, max: 30 },
      maintenanceEurPerDayRange: { min: 3, max: 10 },
      insuranceEurPerDayRange: { min: 4, max: 10 },
      cleaningEurPerDayRange: { min: 2, max: 5 },
      paymentProcessingPctRange: { min: 0.02, max: 0.04 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.45,
      leadTimeSensitivity: 0.4,
    },
    requiredAssets: [{ assetId: "fleet_van_count", minCount: 2 }],
    requiredStaff: [{ roleId: "ops_staff", minFTE: 1 }],
    minComplianceScore: 0.55,
    baselineUnitPriceEur: 95,
    baselineUnitCostEur: 63,
  },
  {
    sku: "corporate_fleet_contract_unit",
    name: "Corporate Fleet Contract",
    unit: "unit",
    productionType: "contract",
    basePriceEurRange: { min: 1000, max: 25000 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 14, max: 38 },
      maintenanceEurPerDayRange: { min: 3, max: 8 },
      insuranceEurPerDayRange: { min: 4, max: 10 },
      cleaningEurPerDayRange: { min: 1, max: 4 },
      paymentProcessingPctRange: { min: 0.01, max: 0.03 },
    },
    demandModel: {
      baseDemandWeight: 0.08,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.25,
      leadTimeSensitivity: 0.3,
    },
    requiredAssets: [
      { assetId: "fleet_economy_count", minCount: 6 },
      { assetId: "fleet_van_count", minCount: 2 },
    ],
    requiredStaff: [{ roleId: "corporate_sales_staff", minFTE: 1 }],
    minComplianceScore: 0.7,
    minReputationScore: 0.6,
    minUptimeScore: 0.9,
    baselineUnitPriceEur: 8000,
    baselineUnitCostEur: 6000,
  },
  {
    sku: "insurance_addon_day_unit",
    name: "Insurance Add-on Day",
    unit: "unit",
    productionType: "addon",
    basePriceEurRange: { min: 6, max: 20 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 0.2, max: 0.8 },
      maintenanceEurPerDayRange: { min: 0.1, max: 0.4 },
      insuranceEurPerDayRange: { min: 1.2, max: 4.5 },
      cleaningEurPerDayRange: { min: 0.1, max: 0.4 },
      paymentProcessingPctRange: { min: 0.01, max: 0.03 },
    },
    demandModel: {
      baseDemandWeight: 0.4,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.2,
      leadTimeSensitivity: 0.2,
    },
    requiredAssets: [{ assetId: "booking_system_enabled", minCount: 1 }],
    requiredStaff: [{ roleId: "customer_support_staff", minFTE: 1 }],
    minReputationScore: 0.45,
    baselineUnitPriceEur: 12,
    baselineUnitCostEur: 4,
  },
  {
    sku: "delivery_mobility_day_unit",
    name: "Delivery Mobility Day",
    unit: "unit",
    productionType: "delivery",
    basePriceEurRange: { min: 40, max: 120 },
    cogsModel: {
      vehicleDepreciationEurPerDayRange: { min: 12, max: 26 },
      maintenanceEurPerDayRange: { min: 4, max: 10 },
      insuranceEurPerDayRange: { min: 4, max: 10 },
      cleaningEurPerDayRange: { min: 2, max: 5 },
      paymentProcessingPctRange: { min: 0.01, max: 0.03 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.4,
      leadTimeSensitivity: 0.6,
    },
    requiredAssets: [
      { assetId: "fleet_van_count", minCount: 2 },
      { assetId: "fleet_economy_count", minCount: 6 },
    ],
    requiredStaff: [{ roleId: "logistics_staff", minFTE: 1 }],
    minComplianceScore: 0.65,
    minUptimeScore: 0.85,
    baselineUnitPriceEur: 80,
    baselineUnitCostEur: 55,
  },
];

export function getBaselineMargin(product: MobilityProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testMobilityProducts(): boolean {
  const economy = mobilityProducts.find(
    (product) => product.sku === "economy_rental_day_unit"
  );
  const corporate = mobilityProducts.find(
    (product) => product.sku === "corporate_fleet_contract_unit"
  );
  return (
    mobilityProducts.length === 6 &&
    !!economy &&
    !!corporate &&
    getBaselineMargin(economy) > 0
  );
}
