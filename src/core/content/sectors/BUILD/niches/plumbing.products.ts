export type PlumbingProductSku =
  | "residential_repair_visit_job_unit"
  | "bathroom_installation_job_unit"
  | "commercial_fitout_plumbing_job_unit"
  | "boiler_heatpump_plumbing_service_job_unit"
  | "emergency_leak_callout_job_unit"
  | "property_maintenance_contract_unit";

export type Range = {
  min: number;
  max: number;
};

export type JobCostModel = {
  laborHoursPerJobRange: Range;
  partsCostEurPerJobRange: Range;
  partsFillRateSensitivity: number;
  subcontractorCostPctRange?: Range;
  mobilizationCostEurRange: Range;
  overtimeCostMultiplierRange: Range;
};

export type QualityModel = {
  inspectionRequired: boolean;
  inspectionFailProbabilityRange: Range;
  callbackProbabilityRange: Range;
  callbackCostPctRange: Range;
  waterDamageClaimProbabilityRange: Range;
  claimSeverityEurRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  urgencySensitivity: number;
  reputationSensitivity: number;
};

export type ProductRequirements = {
  plumbersFteMin: number;
  masterPlumberFteMin: number;
  apprenticesFteMin?: number;
  dispatcherFteMin?: number;
  complianceScoreMin?: number;
  reputationScoreMin?: number;
  partsInventoryValueEurMin?: number;
  onCallEnabled?: boolean;
  toolingRequirements?: string[];
};

export type PlumbingProduct = {
  sku: PlumbingProductSku;
  name: string;
  unit: "unit";
  productionType: "job" | "retainer";
  basePriceEurRange: Range;
  grossMarginPctRange: Range;
  typicalDurationTicksRange: Range;
  paymentTermsDaysRange: Range;
  retentionPctRange: Range;
  costModel: JobCostModel;
  qualityModel: QualityModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const plumbingProducts: PlumbingProduct[] = [
  {
    sku: "residential_repair_visit_job_unit",
    name: "Residential Repair Visit",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 120, max: 650 },
    grossMarginPctRange: { min: 0.2, max: 0.4 },
    typicalDurationTicksRange: { min: 1, max: 2 },
    paymentTermsDaysRange: { min: 7, max: 30 },
    retentionPctRange: { min: 0, max: 0.01 },
    costModel: {
      laborHoursPerJobRange: { min: 2, max: 10 },
      partsCostEurPerJobRange: { min: 20, max: 220 },
      partsFillRateSensitivity: 0.35,
      mobilizationCostEurRange: { min: 0, max: 120 },
      overtimeCostMultiplierRange: { min: 1.1, max: 1.4 },
    },
    qualityModel: {
      inspectionRequired: false,
      inspectionFailProbabilityRange: { min: 0.01, max: 0.04 },
      callbackProbabilityRange: { min: 0.05, max: 0.12 },
      callbackCostPctRange: { min: 0.08, max: 0.18 },
      waterDamageClaimProbabilityRange: { min: 0.002, max: 0.01 },
      claimSeverityEurRange: { min: 2000, max: 50000 },
    },
    demandModel: {
      baseDemandWeight: 0.32,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.45,
      urgencySensitivity: 0.4,
      reputationSensitivity: 0.35,
    },
    requirements: {
      plumbersFteMin: 1,
      masterPlumberFteMin: 0,
      apprenticesFteMin: 0,
      dispatcherFteMin: 0,
      complianceScoreMin: 0.45,
      reputationScoreMin: 0.35,
    },
    baselineUnitPriceEur: 320,
    baselineUnitCostEur: 210,
  },
  {
    sku: "bathroom_installation_job_unit",
    name: "Bathroom Installation",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 2500, max: 18000 },
    grossMarginPctRange: { min: 0.18, max: 0.35 },
    typicalDurationTicksRange: { min: 2, max: 8 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    retentionPctRange: { min: 0.02, max: 0.05 },
    costModel: {
      laborHoursPerJobRange: { min: 40, max: 220 },
      partsCostEurPerJobRange: { min: 800, max: 6000 },
      partsFillRateSensitivity: 0.55,
      subcontractorCostPctRange: { min: 0.04, max: 0.15 },
      mobilizationCostEurRange: { min: 150, max: 1200 },
      overtimeCostMultiplierRange: { min: 1.15, max: 1.5 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.04, max: 0.12 },
      callbackProbabilityRange: { min: 0.06, max: 0.14 },
      callbackCostPctRange: { min: 0.1, max: 0.2 },
      waterDamageClaimProbabilityRange: { min: 0.004, max: 0.02 },
      claimSeverityEurRange: { min: 5000, max: 120000 },
    },
    demandModel: {
      baseDemandWeight: 0.16,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.35,
      urgencySensitivity: 0.3,
      reputationSensitivity: 0.55,
    },
    requirements: {
      plumbersFteMin: 3,
      masterPlumberFteMin: 1,
      apprenticesFteMin: 1,
      dispatcherFteMin: 0,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.5,
      partsInventoryValueEurMin: 12000,
      toolingRequirements: ["pressure_test_kit", "press_tool"],
    },
    baselineUnitPriceEur: 7800,
    baselineUnitCostEur: 5600,
  },
  {
    sku: "commercial_fitout_plumbing_job_unit",
    name: "Commercial Fit-Out Plumbing",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 6000, max: 120000 },
    grossMarginPctRange: { min: 0.15, max: 0.28 },
    typicalDurationTicksRange: { min: 3, max: 12 },
    paymentTermsDaysRange: { min: 45, max: 90 },
    retentionPctRange: { min: 0.05, max: 0.1 },
    costModel: {
      laborHoursPerJobRange: { min: 80, max: 600 },
      partsCostEurPerJobRange: { min: 2000, max: 40000 },
      partsFillRateSensitivity: 0.6,
      subcontractorCostPctRange: { min: 0.1, max: 0.25 },
      mobilizationCostEurRange: { min: 500, max: 6000 },
      overtimeCostMultiplierRange: { min: 1.2, max: 1.6 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.06, max: 0.15 },
      callbackProbabilityRange: { min: 0.05, max: 0.12 },
      callbackCostPctRange: { min: 0.08, max: 0.18 },
      waterDamageClaimProbabilityRange: { min: 0.006, max: 0.025 },
      claimSeverityEurRange: { min: 20000, max: 500000 },
    },
    demandModel: {
      baseDemandWeight: 0.12,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.3,
      urgencySensitivity: 0.2,
      reputationSensitivity: 0.65,
    },
    requirements: {
      plumbersFteMin: 4,
      masterPlumberFteMin: 1,
      dispatcherFteMin: 1,
      complianceScoreMin: 0.7,
      reputationScoreMin: 0.6,
      partsInventoryValueEurMin: 20000,
      toolingRequirements: ["press_tool", "drain_camera", "pressure_test_kit"],
    },
    baselineUnitPriceEur: 42000,
    baselineUnitCostEur: 32000,
  },
  {
    sku: "boiler_heatpump_plumbing_service_job_unit",
    name: "Boiler / Heat Pump Plumbing Service",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 350, max: 7500 },
    grossMarginPctRange: { min: 0.2, max: 0.4 },
    typicalDurationTicksRange: { min: 1, max: 4 },
    paymentTermsDaysRange: { min: 20, max: 45 },
    retentionPctRange: { min: 0, max: 0.03 },
    costModel: {
      laborHoursPerJobRange: { min: 6, max: 60 },
      partsCostEurPerJobRange: { min: 150, max: 2500 },
      partsFillRateSensitivity: 0.5,
      subcontractorCostPctRange: { min: 0.02, max: 0.1 },
      mobilizationCostEurRange: { min: 0, max: 300 },
      overtimeCostMultiplierRange: { min: 1.1, max: 1.4 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.04, max: 0.12 },
      callbackProbabilityRange: { min: 0.05, max: 0.12 },
      callbackCostPctRange: { min: 0.08, max: 0.18 },
      waterDamageClaimProbabilityRange: { min: 0.003, max: 0.015 },
      claimSeverityEurRange: { min: 5000, max: 120000 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "winter_emergency_seasonality",
      priceElasticity: 0.35,
      urgencySensitivity: 0.5,
      reputationSensitivity: 0.5,
    },
    requirements: {
      plumbersFteMin: 2,
      masterPlumberFteMin: 1,
      apprenticesFteMin: 0,
      dispatcherFteMin: 0,
      complianceScoreMin: 0.6,
      partsInventoryValueEurMin: 8000,
      toolingRequirements: ["press_tool"],
    },
    baselineUnitPriceEur: 2400,
    baselineUnitCostEur: 1650,
  },
  {
    sku: "emergency_leak_callout_job_unit",
    name: "Emergency Leak Callout",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 160, max: 1250 },
    grossMarginPctRange: { min: 0.25, max: 0.45 },
    typicalDurationTicksRange: { min: 1, max: 2 },
    paymentTermsDaysRange: { min: 0, max: 14 },
    retentionPctRange: { min: 0, max: 0.01 },
    costModel: {
      laborHoursPerJobRange: { min: 2, max: 12 },
      partsCostEurPerJobRange: { min: 50, max: 400 },
      partsFillRateSensitivity: 0.3,
      mobilizationCostEurRange: { min: 0, max: 150 },
      overtimeCostMultiplierRange: { min: 1.3, max: 1.8 },
    },
    qualityModel: {
      inspectionRequired: false,
      inspectionFailProbabilityRange: { min: 0.01, max: 0.05 },
      callbackProbabilityRange: { min: 0.1, max: 0.22 },
      callbackCostPctRange: { min: 0.1, max: 0.22 },
      waterDamageClaimProbabilityRange: { min: 0.006, max: 0.03 },
      claimSeverityEurRange: { min: 5000, max: 150000 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "winter_emergency_seasonality",
      priceElasticity: 0.25,
      urgencySensitivity: 0.9,
      reputationSensitivity: 0.4,
    },
    requirements: {
      plumbersFteMin: 2,
      masterPlumberFteMin: 0,
      complianceScoreMin: 0.5,
      reputationScoreMin: 0.45,
      onCallEnabled: true,
    },
    baselineUnitPriceEur: 520,
    baselineUnitCostEur: 340,
  },
  {
    sku: "property_maintenance_contract_unit",
    name: "Property Maintenance Contract",
    unit: "unit",
    productionType: "retainer",
    basePriceEurRange: { min: 900, max: 22000 },
    grossMarginPctRange: { min: 0.18, max: 0.35 },
    typicalDurationTicksRange: { min: 4, max: 12 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    retentionPctRange: { min: 0, max: 0.03 },
    costModel: {
      laborHoursPerJobRange: { min: 10, max: 80 },
      partsCostEurPerJobRange: { min: 120, max: 1500 },
      partsFillRateSensitivity: 0.45,
      mobilizationCostEurRange: { min: 0, max: 200 },
      overtimeCostMultiplierRange: { min: 1.05, max: 1.3 },
    },
    qualityModel: {
      inspectionRequired: true,
      inspectionFailProbabilityRange: { min: 0.03, max: 0.1 },
      callbackProbabilityRange: { min: 0.03, max: 0.08 },
      callbackCostPctRange: { min: 0.05, max: 0.12 },
      waterDamageClaimProbabilityRange: { min: 0.002, max: 0.01 },
      claimSeverityEurRange: { min: 5000, max: 200000 },
    },
    demandModel: {
      baseDemandWeight: 0.1,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.2,
      urgencySensitivity: 0.2,
      reputationSensitivity: 0.8,
    },
    requirements: {
      plumbersFteMin: 2,
      masterPlumberFteMin: 1,
      dispatcherFteMin: 1,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.6,
      partsInventoryValueEurMin: 10000,
    },
    baselineUnitPriceEur: 7500,
    baselineUnitCostEur: 5200,
  },
];

export function getBaselineMargin(product: PlumbingProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testPlumbingProducts(): boolean {
  const emergency = plumbingProducts.find(
    (product) => product.sku === "emergency_leak_callout_job_unit"
  );
  const residential = plumbingProducts.find(
    (product) => product.sku === "residential_repair_visit_job_unit"
  );
  return (
    plumbingProducts.length === 6 &&
    !!emergency &&
    !!residential &&
    getBaselineMargin(emergency) > 0
  );
}
