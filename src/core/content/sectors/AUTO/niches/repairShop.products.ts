export type RepairShopProductSku =
  | "inspection_service_unit"
  | "oil_service_unit"
  | "brake_job_unit"
  | "tires_service_unit"
  | "diagnostics_advanced_unit"
  | "ev_repair_job_unit";

export type Range = {
  min: number;
  max: number;
};

export type JobModel = {
  laborHoursPerUnitRange: Range;
  partsCostEurPerUnitRange: Range;
  partsAvailabilitySensitivity: number;
  reworkProbabilityRange: Range;
  customerTimeSensitivity: number;
  qualitySensitivity: number;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
};

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type ProductRequirements = {
  serviceBaysMin: number;
  liftsMin: number;
  diagnosticToolsLevelMin: number;
  evToolsRequired?: boolean;
  complianceScoreMin?: number;
  reputationScoreMin?: number;
  staff: StaffRequirement[];
};

export type RepairShopProduct = {
  sku: RepairShopProductSku;
  name: string;
  unit: "unit";
  productionType: "service";
  basePriceEurRange: Range;
  jobModel: JobModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const repairShopProducts: RepairShopProduct[] = [
  {
    sku: "inspection_service_unit",
    name: "Inspection Service",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 45, max: 120 },
    jobModel: {
      laborHoursPerUnitRange: { min: 0.6, max: 1.2 },
      partsCostEurPerUnitRange: { min: 5, max: 20 },
      partsAvailabilitySensitivity: 0.2,
      reworkProbabilityRange: { min: 0.01, max: 0.03 },
      customerTimeSensitivity: 0.4,
      qualitySensitivity: 0.4,
    },
    demandModel: {
      baseDemandWeight: 0.55,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.3,
    },
    requirements: {
      serviceBaysMin: 1,
      liftsMin: 1,
      diagnosticToolsLevelMin: 1,
      complianceScoreMin: 0.5,
      staff: [
        { roleId: "technician", minFTE: 1 },
        { roleId: "service_advisor", minFTE: 1 },
      ],
    },
    baselineUnitPriceEur: 75,
    baselineUnitCostEur: 55,
  },
  {
    sku: "oil_service_unit",
    name: "Oil Service",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 90, max: 220 },
    jobModel: {
      laborHoursPerUnitRange: { min: 0.7, max: 1.5 },
      partsCostEurPerUnitRange: { min: 25, max: 90 },
      partsAvailabilitySensitivity: 0.35,
      reworkProbabilityRange: { min: 0.02, max: 0.05 },
      customerTimeSensitivity: 0.5,
      qualitySensitivity: 0.35,
    },
    demandModel: {
      baseDemandWeight: 0.6,
      seasonalityKey: "car_wash_weather_seasonality",
      priceElasticity: 0.45,
    },
    requirements: {
      serviceBaysMin: 1,
      liftsMin: 1,
      diagnosticToolsLevelMin: 1,
      staff: [{ roleId: "technician", minFTE: 1 }],
    },
    baselineUnitPriceEur: 140,
    baselineUnitCostEur: 110,
  },
  {
    sku: "brake_job_unit",
    name: "Brake Job",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 280, max: 900 },
    jobModel: {
      laborHoursPerUnitRange: { min: 2.5, max: 5.5 },
      partsCostEurPerUnitRange: { min: 120, max: 520 },
      partsAvailabilitySensitivity: 0.6,
      reworkProbabilityRange: { min: 0.04, max: 0.1 },
      customerTimeSensitivity: 0.55,
      qualitySensitivity: 0.6,
    },
    demandModel: {
      baseDemandWeight: 0.35,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.4,
    },
    requirements: {
      serviceBaysMin: 2,
      liftsMin: 1,
      diagnosticToolsLevelMin: 1,
      reputationScoreMin: 0.45,
      staff: [
        { roleId: "technician", minFTE: 2 },
        { roleId: "service_advisor", minFTE: 1 },
      ],
    },
    baselineUnitPriceEur: 520,
    baselineUnitCostEur: 430,
  },
  {
    sku: "tires_service_unit",
    name: "Tires Service",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 60, max: 180 },
    jobModel: {
      laborHoursPerUnitRange: { min: 0.8, max: 1.8 },
      partsCostEurPerUnitRange: { min: 40, max: 300 },
      partsAvailabilitySensitivity: 0.7,
      reworkProbabilityRange: { min: 0.02, max: 0.06 },
      customerTimeSensitivity: 0.6,
      qualitySensitivity: 0.5,
    },
    demandModel: {
      baseDemandWeight: 0.45,
      seasonalityKey: "winter_tires_seasonality",
      priceElasticity: 0.6,
    },
    requirements: {
      serviceBaysMin: 1,
      liftsMin: 1,
      diagnosticToolsLevelMin: 1,
      staff: [{ roleId: "technician", minFTE: 2 }],
    },
    baselineUnitPriceEur: 110,
    baselineUnitCostEur: 90,
  },
  {
    sku: "diagnostics_advanced_unit",
    name: "Advanced Diagnostics",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 80, max: 250 },
    jobModel: {
      laborHoursPerUnitRange: { min: 1, max: 3 },
      partsCostEurPerUnitRange: { min: 10, max: 80 },
      partsAvailabilitySensitivity: 0.4,
      reworkProbabilityRange: { min: 0.05, max: 0.15 },
      customerTimeSensitivity: 0.65,
      qualitySensitivity: 0.7,
    },
    demandModel: {
      baseDemandWeight: 0.3,
      seasonalityKey: "inspection_peak_seasonality",
      priceElasticity: 0.35,
    },
    requirements: {
      serviceBaysMin: 1,
      liftsMin: 1,
      diagnosticToolsLevelMin: 2,
      reputationScoreMin: 0.55,
      staff: [
        { roleId: "master_tech", minFTE: 1 },
        { roleId: "service_advisor", minFTE: 1 },
      ],
    },
    baselineUnitPriceEur: 140,
    baselineUnitCostEur: 120,
  },
  {
    sku: "ev_repair_job_unit",
    name: "EV Repair Job",
    unit: "unit",
    productionType: "service",
    basePriceEurRange: { min: 250, max: 2000 },
    jobModel: {
      laborHoursPerUnitRange: { min: 2, max: 8 },
      partsCostEurPerUnitRange: { min: 150, max: 1200 },
      partsAvailabilitySensitivity: 0.65,
      reworkProbabilityRange: { min: 0.03, max: 0.12 },
      customerTimeSensitivity: 0.7,
      qualitySensitivity: 0.75,
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "summer_travel_mobility_seasonality",
      priceElasticity: 0.4,
    },
    requirements: {
      serviceBaysMin: 2,
      liftsMin: 1,
      diagnosticToolsLevelMin: 3,
      evToolsRequired: true,
      complianceScoreMin: 0.75,
      reputationScoreMin: 0.6,
      staff: [
        { roleId: "technician", minFTE: 2 },
        { roleId: "master_tech", minFTE: 1 },
        { roleId: "service_advisor", minFTE: 1 },
      ],
    },
    baselineUnitPriceEur: 750,
    baselineUnitCostEur: 680,
  },
];

export function getBaselineMargin(product: RepairShopProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testRepairShopProducts(): boolean {
  const inspection = repairShopProducts.find(
    (product) => product.sku === "inspection_service_unit"
  );
  const evJob = repairShopProducts.find(
    (product) => product.sku === "ev_repair_job_unit"
  );
  return (
    repairShopProducts.length === 6 &&
    !!inspection &&
    !!evJob &&
    getBaselineMargin(inspection) > 0
  );
}
