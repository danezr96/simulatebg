export type EvServicesProductSku =
  | "ac_charge_session_unit"
  | "dc_fast_charge_session_unit"
  | "kwh_energy_sale_kwh"
  | "charging_membership_monthly_unit"
  | "fleet_charging_contract_unit"
  | "installation_service_unit";

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

export type DemandChargeModel = {
  model: "per_peak_kw";
  feeEurPerKwRange: Range;
};

export type EnergyCogsModel = {
  model: "energy_cost";
  energyKwhPerUnitRange: Range;
  gridFeeEurPerKwhRange: Range;
  paymentProcessingPctRange: Range;
  maintenanceCostEurPerUnitRange: Range;
  demandChargeModel: DemandChargeModel;
};

export type ServiceCogsModel = {
  model: "service_cost";
  costPerUnitRange: Range;
};

export type ContractCogsModel = {
  model: "contract_cost";
  costPerUnitRange: Range;
};

export type CogsModel = EnergyCogsModel | ServiceCogsModel | ContractCogsModel;

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  locationQualitySensitivity: number;
};

export type EvServicesProduct = {
  sku: EvServicesProductSku;
  name: string;
  unit: "unit" | "kwh";
  productionType: "service" | "subscription" | "contract" | "metered" | "installation";
  basePriceEurRange: Range;
  cogsModel: CogsModel;
  demandModel: DemandModel;
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minUptimeScore?: number;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const evServicesProducts: EvServicesProduct[] = [
  {
    sku: "ac_charge_session_unit",
    name: "AC Charge Session",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 2, max: 8 },
    cogsModel: {
      model: "energy_cost",
      energyKwhPerUnitRange: { min: 10, max: 18 },
      gridFeeEurPerKwhRange: { min: 0.04, max: 0.12 },
      paymentProcessingPctRange: { min: 0.02, max: 0.04 },
      maintenanceCostEurPerUnitRange: { min: 0.2, max: 0.8 },
      demandChargeModel: {
        model: "per_peak_kw",
        feeEurPerKwRange: { min: 3, max: 8 },
      },
    },
    demandModel: {
      baseDemandWeight: 0.5,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.4,
      locationQualitySensitivity: 0.6,
    },
    requiredAssets: [
      { assetId: "chargers_ac_count", minCount: 1 },
      { assetId: "grid_capacity_kw", minCount: 80 },
      { assetId: "uptime_score", minCount: 0.75 },
      { assetId: "site_count", minCount: 1 },
      { assetId: "parking_bays_count", minCount: 4 },
    ],
    requiredStaff: [{ roleId: "operations_tech", minFTE: 1 }],
    minComplianceScore: 0.5,
    baselineUnitPriceEur: 5.5,
    baselineUnitCostEur: 4.2,
  },
  {
    sku: "dc_fast_charge_session_unit",
    name: "DC Fast Charge Session",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 8, max: 35 },
    cogsModel: {
      model: "energy_cost",
      energyKwhPerUnitRange: { min: 28, max: 65 },
      gridFeeEurPerKwhRange: { min: 0.06, max: 0.14 },
      paymentProcessingPctRange: { min: 0.02, max: 0.04 },
      maintenanceCostEurPerUnitRange: { min: 0.6, max: 2.4 },
      demandChargeModel: {
        model: "per_peak_kw",
        feeEurPerKwRange: { min: 6, max: 18 },
      },
    },
    demandModel: {
      baseDemandWeight: 0.35,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.45,
      locationQualitySensitivity: 0.7,
    },
    requiredAssets: [
      { assetId: "chargers_dc_count", minCount: 1 },
      { assetId: "grid_capacity_kw", minCount: 180 },
      { assetId: "uptime_score", minCount: 0.8 },
      { assetId: "parking_bays_count", minCount: 4 },
    ],
    requiredStaff: [{ roleId: "operations_tech", minFTE: 1 }],
    minComplianceScore: 0.65,
    baselineUnitPriceEur: 18,
    baselineUnitCostEur: 15,
  },
  {
    sku: "kwh_energy_sale_kwh",
    name: "Metered Energy Sale",
    unit: "kwh",
    productionType: "metered",
    basePriceEurRange: { min: 0.35, max: 0.85 },
    cogsModel: {
      model: "energy_cost",
      energyKwhPerUnitRange: { min: 1, max: 1 },
      gridFeeEurPerKwhRange: { min: 0.05, max: 0.12 },
      paymentProcessingPctRange: { min: 0.01, max: 0.03 },
      maintenanceCostEurPerUnitRange: { min: 0.01, max: 0.05 },
      demandChargeModel: {
        model: "per_peak_kw",
        feeEurPerKwRange: { min: 2, max: 6 },
      },
    },
    demandModel: {
      baseDemandWeight: 0.6,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.5,
      locationQualitySensitivity: 0.55,
    },
    requiredAssets: [
      { assetId: "metering_enabled", minCount: 1 },
      { assetId: "grid_capacity_kw", minCount: 80 },
    ],
    requiredStaff: [{ roleId: "operations_tech", minFTE: 1 }],
    minComplianceScore: 0.55,
    baselineUnitPriceEur: 0.55,
    baselineUnitCostEur: 0.42,
  },
  {
    sku: "charging_membership_monthly_unit",
    name: "Charging Membership",
    unit: "unit",
    productionType: "subscription",
    basePriceEurRange: { min: 5, max: 20 },
    cogsModel: {
      model: "service_cost",
      costPerUnitRange: { min: 2, max: 8 },
    },
    demandModel: {
      baseDemandWeight: 0.2,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.3,
      locationQualitySensitivity: 0.5,
    },
    requiredAssets: [
      { assetId: "chargers_ac_count", minCount: 2 },
      { assetId: "uptime_score", minCount: 0.85 },
      { assetId: "site_count", minCount: 1 },
    ],
    requiredStaff: [{ roleId: "support_agent", minFTE: 1 }],
    minReputationScore: 0.55,
    minUptimeScore: 0.85,
    baselineUnitPriceEur: 12,
    baselineUnitCostEur: 4,
  },
  {
    sku: "fleet_charging_contract_unit",
    name: "Fleet Charging Contract",
    unit: "unit",
    productionType: "contract",
    basePriceEurRange: { min: 800, max: 12000 },
    cogsModel: {
      model: "contract_cost",
      costPerUnitRange: { min: 600, max: 6000 },
    },
    demandModel: {
      baseDemandWeight: 0.12,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.25,
      locationQualitySensitivity: 0.7,
    },
    requiredAssets: [
      { assetId: "chargers_dc_count", minCount: 1 },
      { assetId: "chargers_ac_count", minCount: 4 },
      { assetId: "uptime_score", minCount: 0.9 },
      { assetId: "site_count", minCount: 2 },
    ],
    requiredStaff: [
      { roleId: "operations_tech", minFTE: 1 },
      { roleId: "support_agent", minFTE: 1 },
    ],
    minComplianceScore: 0.7,
    minReputationScore: 0.6,
    minUptimeScore: 0.9,
    baselineUnitPriceEur: 3500,
    baselineUnitCostEur: 2400,
  },
  {
    sku: "installation_service_unit",
    name: "Installation Service",
    unit: "unit",
    productionType: "installation",
    basePriceEurRange: { min: 1200, max: 12000 },
    cogsModel: {
      model: "service_cost",
      costPerUnitRange: { min: 800, max: 9000 },
    },
    demandModel: {
      baseDemandWeight: 0.15,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.3,
      locationQualitySensitivity: 0.45,
    },
    requiredAssets: [{ assetId: "site_count", minCount: 1 }],
    requiredStaff: [{ roleId: "certified_installer", minFTE: 1 }],
    minComplianceScore: 0.75,
    baselineUnitPriceEur: 4500,
    baselineUnitCostEur: 3500,
  },
];

export function getBaselineMargin(product: EvServicesProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testEvServicesProducts(): boolean {
  const acSession = evServicesProducts.find(
    (product) => product.sku === "ac_charge_session_unit"
  );
  const membership = evServicesProducts.find(
    (product) => product.sku === "charging_membership_monthly_unit"
  );
  return (
    evServicesProducts.length === 6 &&
    !!acSession &&
    !!membership &&
    getBaselineMargin(acSession) > 0 &&
    getBaselineMargin(membership) > 0
  );
}
