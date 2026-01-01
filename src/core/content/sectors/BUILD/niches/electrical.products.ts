export type ElectricalProductSku =
  | "residential_wiring_job_unit"
  | "commercial_fitout_electrical_job_unit"
  | "industrial_panel_upgrade_job_unit"
  | "solar_inverter_install_job_unit"
  | "emergency_callout_job_unit"
  | "annual_maintenance_contract_unit";

export type Range = {
  min: number;
  max: number;
};

export type JobCostModel = {
  laborHoursPerJobRange: Range;
  materialCostEurPerJobRange: Range;
  copperSensitivityScore: number;
  subcontractorPctRange?: Range;
  mobilizationCostEurRange: Range;
};

export type QualityComplianceModel = {
  inspectionRequired: boolean;
  inspectionFailProbabilityRange: Range;
  callbackProbabilityRange: Range;
  callbackCostPctRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  urgencySensitivity: number;
};

export type ProductRequirements = {
  electriciansFteMin: number;
  masterElectricianFteMin: number;
  schedulerFteMin: number;
  certificationLevelMin: number;
  complianceScoreMin?: number;
  reputationScoreMin?: number;
};

export type ElectricalProduct = {
  sku: ElectricalProductSku;
  name: string;
  unit: "unit";
  productionType: "job" | "retainer";
  basePriceEurRange: Range;
  grossMarginPctRange: Range;
  typicalDurationTicksRange: Range;
  paymentTermsDaysRange: Range;
  retentionPctRange: Range;
  costModel: JobCostModel;
  qualityModel: QualityComplianceModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const electricalProducts: ElectricalProduct[] = [
  {
    sku: "residential_wiring_job_unit",
    name: "Residential Wiring Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 400, max: 3500 },
    grossMarginPctRange: { min: 0.12, max: 0.28 },
    typicalDurationTicksRange: { min: 1, max: 3 },
    paymentTermsDaysRange: { min: 7, max: 30 },
    retentionPctRange: { min: 0, max: 0.02 },
    costModel: {
      laborHoursPerJobRange: { min: 6, max: 40 },
      materialCostEurPerJobRange: { min: 80, max: 900 },
      copperSensitivityScore: 0.35,
      mobilizationCostEurRange: { min: 0, max: 150 },
    },
    qualityModel: {
      inspectionRequired: false,
      inspectionFailProbabilityRange: { min: 0.01, max: 0.05 },
      callbackProbabilityRange: { min: 0.03, max: 0.08 },
      callbackCostPctRange: { min: 0.05, max: 0.12 },
    },
    demandModel: {
      baseDemandWeight: 0.38,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.55,
      urgencySensitivity: 0.35,
    },
    requirements: {
      electriciansFteMin: 1,
      masterElectricianFteMin: 0,
      schedulerFteMin: 0,
      certificationLevelMin: 0,
    },
    baselineUnitPriceEur: 1400,
    baselineUnitCostEur: 1150,
  },
  {
    sku: "commercial_fitout_electrical_job_unit",
    name: "Commercial Fit-Out Electrical Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 8000, max: 250000 },
    grossMarginPctRange: { min: 0.1, max: 0.2 },
    typicalDurationTicksRange: { min: 2, max: 8 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    retentionPctRange: { min: 0.03, max: 0.07 },
    costModel: {
      laborHoursPerJobRange: { min: 80, max: 1200 },
      materialCostEurPerJobRange: { min: 1500, max: 60000 },
      copperSensitivityScore: 0.6,
      subcontractorPctRange: { min: 0.05, max: 0.2 },
      mobilizationCostEurRange: { min: 400, max: 5000 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.04, max: 0.12 },
      callbackProbabilityRange: { min: 0.03, max: 0.08 },
      callbackCostPctRange: { min: 0.04, max: 0.1 },
    },
    demandModel: {
      baseDemandWeight: 0.16,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.4,
      urgencySensitivity: 0.3,
    },
    requirements: {
      electriciansFteMin: 6,
      masterElectricianFteMin: 1,
      schedulerFteMin: 1,
      certificationLevelMin: 2,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.55,
    },
    baselineUnitPriceEur: 52000,
    baselineUnitCostEur: 45000,
  },
  {
    sku: "industrial_panel_upgrade_job_unit",
    name: "Industrial Panel Upgrade Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 6000, max: 180000 },
    grossMarginPctRange: { min: 0.1, max: 0.18 },
    typicalDurationTicksRange: { min: 2, max: 7 },
    paymentTermsDaysRange: { min: 30, max: 75 },
    retentionPctRange: { min: 0.04, max: 0.08 },
    costModel: {
      laborHoursPerJobRange: { min: 60, max: 900 },
      materialCostEurPerJobRange: { min: 1200, max: 50000 },
      copperSensitivityScore: 0.65,
      subcontractorPctRange: { min: 0.05, max: 0.2 },
      mobilizationCostEurRange: { min: 300, max: 4000 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.05, max: 0.14 },
      callbackProbabilityRange: { min: 0.03, max: 0.07 },
      callbackCostPctRange: { min: 0.05, max: 0.12 },
    },
    demandModel: {
      baseDemandWeight: 0.14,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.35,
      urgencySensitivity: 0.25,
    },
    requirements: {
      electriciansFteMin: 5,
      masterElectricianFteMin: 1,
      schedulerFteMin: 1,
      certificationLevelMin: 2,
      complianceScoreMin: 0.7,
    },
    baselineUnitPriceEur: 48000,
    baselineUnitCostEur: 42000,
  },
  {
    sku: "solar_inverter_install_job_unit",
    name: "Solar Inverter Install Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 2500, max: 25000 },
    grossMarginPctRange: { min: 0.12, max: 0.22 },
    typicalDurationTicksRange: { min: 1, max: 4 },
    paymentTermsDaysRange: { min: 20, max: 45 },
    retentionPctRange: { min: 0.02, max: 0.06 },
    costModel: {
      laborHoursPerJobRange: { min: 12, max: 80 },
      materialCostEurPerJobRange: { min: 800, max: 12000 },
      copperSensitivityScore: 0.5,
      mobilizationCostEurRange: { min: 100, max: 900 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.04, max: 0.1 },
      callbackProbabilityRange: { min: 0.03, max: 0.08 },
      callbackCostPctRange: { min: 0.04, max: 0.1 },
    },
    demandModel: {
      baseDemandWeight: 0.12,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.4,
      urgencySensitivity: 0.35,
    },
    requirements: {
      electriciansFteMin: 3,
      masterElectricianFteMin: 1,
      schedulerFteMin: 0,
      certificationLevelMin: 1,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.55,
    },
    baselineUnitPriceEur: 8500,
    baselineUnitCostEur: 7100,
  },
  {
    sku: "emergency_callout_job_unit",
    name: "Emergency Callout Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 120, max: 950 },
    grossMarginPctRange: { min: 0.2, max: 0.4 },
    typicalDurationTicksRange: { min: 1, max: 2 },
    paymentTermsDaysRange: { min: 0, max: 14 },
    retentionPctRange: { min: 0, max: 0.01 },
    costModel: {
      laborHoursPerJobRange: { min: 2, max: 10 },
      materialCostEurPerJobRange: { min: 30, max: 300 },
      copperSensitivityScore: 0.2,
      mobilizationCostEurRange: { min: 0, max: 120 },
    },
    qualityModel: {
      inspectionRequired: false,
      inspectionFailProbabilityRange: { min: 0.01, max: 0.04 },
      callbackProbabilityRange: { min: 0.08, max: 0.18 },
      callbackCostPctRange: { min: 0.08, max: 0.18 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "winter_emergency_seasonality",
      priceElasticity: 0.3,
      urgencySensitivity: 0.9,
    },
    requirements: {
      electriciansFteMin: 2,
      masterElectricianFteMin: 0,
      schedulerFteMin: 0,
      certificationLevelMin: 0,
      reputationScoreMin: 0.45,
    },
    baselineUnitPriceEur: 420,
    baselineUnitCostEur: 300,
  },
  {
    sku: "annual_maintenance_contract_unit",
    name: "Annual Maintenance Contract",
    unit: "unit",
    productionType: "retainer",
    basePriceEurRange: { min: 300, max: 6000 },
    grossMarginPctRange: { min: 0.15, max: 0.3 },
    typicalDurationTicksRange: { min: 4, max: 12 },
    paymentTermsDaysRange: { min: 15, max: 45 },
    retentionPctRange: { min: 0, max: 0.04 },
    costModel: {
      laborHoursPerJobRange: { min: 4, max: 28 },
      materialCostEurPerJobRange: { min: 50, max: 800 },
      copperSensitivityScore: 0.25,
      mobilizationCostEurRange: { min: 0, max: 100 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.02, max: 0.08 },
      callbackProbabilityRange: { min: 0.02, max: 0.06 },
      callbackCostPctRange: { min: 0.03, max: 0.08 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.35,
      urgencySensitivity: 0.2,
    },
    requirements: {
      electriciansFteMin: 3,
      masterElectricianFteMin: 1,
      schedulerFteMin: 1,
      certificationLevelMin: 1,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.6,
    },
    baselineUnitPriceEur: 1800,
    baselineUnitCostEur: 1350,
  },
];

export function getBaselineMargin(product: ElectricalProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testElectricalProducts(): boolean {
  const emergency = electricalProducts.find(
    (product) => product.sku === "emergency_callout_job_unit"
  );
  const residential = electricalProducts.find(
    (product) => product.sku === "residential_wiring_job_unit"
  );
  return (
    electricalProducts.length === 6 &&
    !!emergency &&
    !!residential &&
    getBaselineMargin(emergency) > 0
  );
}
