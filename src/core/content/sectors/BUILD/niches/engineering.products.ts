export type EngineeringProductSku =
  | "structural_design_package_unit"
  | "mep_design_package_unit"
  | "geotechnical_survey_unit"
  | "permitting_and_code_review_unit"
  | "bim_coordination_service_unit"
  | "owner_rep_project_management_unit";

export type Range = {
  min: number;
  max: number;
};

export type PricingModel = {
  modelType: "fixed_fee" | "tm_hourly" | "mixed";
  baseFeeEurRange?: Range;
  hourlyRateEurRange?: Range;
  typicalBillableHoursRange?: Range;
};

export type StaffHoursByRoleRange = {
  engineerHoursRange: Range;
  seniorEngineerHoursRange: Range;
  projectManagerHoursRange: Range;
  drafterHoursRange: Range;
};

export type EngineeringCostModel = {
  staffHoursByRoleRange: StaffHoursByRoleRange;
  softwareCostEurPerTickRange: Range;
  insuranceCostPctOfRevenueRange: Range;
  subcontractorCostPctRange: Range;
};

export type LiabilityModel = {
  revisionRoundsRange: Range;
  errorProbabilityRange: Range;
  liabilityClaimProbabilityRange: Range;
  claimSeverityEurRange: Range;
  reworkHoursPctRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  reputationSensitivity: number;
};

export type ProductRequirements = {
  engineersFteMin: number;
  seniorEngineersFteMin: number;
  projectManagerFteMin: number;
  bimSpecialistFteMin: number;
  certificationLevelMin: number;
  complianceScoreMin?: number;
  reputationScoreMin?: number;
};

export type EngineeringProduct = {
  sku: EngineeringProductSku;
  name: string;
  unit: "unit";
  productionType: "project" | "retainer";
  pricingModel: PricingModel;
  grossMarginPctRange: Range;
  typicalDurationTicksRange: Range;
  paymentTermsDaysRange: Range;
  retentionPctRange: Range;
  costModel: EngineeringCostModel;
  liabilityModel: LiabilityModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const engineeringProducts: EngineeringProduct[] = [
  {
    sku: "structural_design_package_unit",
    name: "Structural Design Package",
    unit: "unit",
    productionType: "project",
    pricingModel: {
      modelType: "fixed_fee",
      baseFeeEurRange: { min: 8000, max: 250000 },
      hourlyRateEurRange: { min: 90, max: 150 },
      typicalBillableHoursRange: { min: 80, max: 1200 },
    },
    grossMarginPctRange: { min: 0.3, max: 0.55 },
    typicalDurationTicksRange: { min: 3, max: 12 },
    paymentTermsDaysRange: { min: 30, max: 75 },
    retentionPctRange: { min: 0.03, max: 0.08 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 120, max: 1400 },
        seniorEngineerHoursRange: { min: 40, max: 400 },
        projectManagerHoursRange: { min: 20, max: 160 },
        drafterHoursRange: { min: 40, max: 320 },
      },
      softwareCostEurPerTickRange: { min: 200, max: 1200 },
      insuranceCostPctOfRevenueRange: { min: 0.02, max: 0.05 },
      subcontractorCostPctRange: { min: 0.02, max: 0.08 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 1, max: 4 },
      errorProbabilityRange: { min: 0.04, max: 0.12 },
      liabilityClaimProbabilityRange: { min: 0.002, max: 0.01 },
      claimSeverityEurRange: { min: 25000, max: 750000 },
      reworkHoursPctRange: { min: 0.05, max: 0.18 },
    },
    demandModel: {
      baseDemandWeight: 0.2,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.35,
      reputationSensitivity: 0.7,
    },
    requirements: {
      engineersFteMin: 2,
      seniorEngineersFteMin: 1,
      projectManagerFteMin: 0,
      bimSpecialistFteMin: 0,
      certificationLevelMin: 0,
      reputationScoreMin: 0.5,
    },
    baselineUnitPriceEur: 90000,
    baselineUnitCostEur: 63000,
  },
  {
    sku: "mep_design_package_unit",
    name: "MEP Design Package",
    unit: "unit",
    productionType: "project",
    pricingModel: {
      modelType: "mixed",
      baseFeeEurRange: { min: 10000, max: 300000 },
      hourlyRateEurRange: { min: 85, max: 160 },
      typicalBillableHoursRange: { min: 140, max: 1600 },
    },
    grossMarginPctRange: { min: 0.28, max: 0.5 },
    typicalDurationTicksRange: { min: 4, max: 14 },
    paymentTermsDaysRange: { min: 30, max: 75 },
    retentionPctRange: { min: 0.04, max: 0.08 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 180, max: 1800 },
        seniorEngineerHoursRange: { min: 60, max: 500 },
        projectManagerHoursRange: { min: 30, max: 220 },
        drafterHoursRange: { min: 60, max: 400 },
      },
      softwareCostEurPerTickRange: { min: 250, max: 1400 },
      insuranceCostPctOfRevenueRange: { min: 0.02, max: 0.06 },
      subcontractorCostPctRange: { min: 0.03, max: 0.1 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 2, max: 5 },
      errorProbabilityRange: { min: 0.05, max: 0.15 },
      liabilityClaimProbabilityRange: { min: 0.003, max: 0.015 },
      claimSeverityEurRange: { min: 30000, max: 900000 },
      reworkHoursPctRange: { min: 0.06, max: 0.2 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.32,
      reputationSensitivity: 0.65,
    },
    requirements: {
      engineersFteMin: 3,
      seniorEngineersFteMin: 1,
      projectManagerFteMin: 1,
      bimSpecialistFteMin: 0,
      certificationLevelMin: 1,
      complianceScoreMin: 0.6,
    },
    baselineUnitPriceEur: 120000,
    baselineUnitCostEur: 78000,
  },
  {
    sku: "geotechnical_survey_unit",
    name: "Geotechnical Survey",
    unit: "unit",
    productionType: "project",
    pricingModel: {
      modelType: "fixed_fee",
      baseFeeEurRange: { min: 2000, max: 60000 },
      hourlyRateEurRange: { min: 70, max: 120 },
      typicalBillableHoursRange: { min: 20, max: 300 },
    },
    grossMarginPctRange: { min: 0.25, max: 0.45 },
    typicalDurationTicksRange: { min: 1, max: 4 },
    paymentTermsDaysRange: { min: 20, max: 45 },
    retentionPctRange: { min: 0, max: 0.03 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 20, max: 160 },
        seniorEngineerHoursRange: { min: 10, max: 120 },
        projectManagerHoursRange: { min: 6, max: 40 },
        drafterHoursRange: { min: 10, max: 80 },
      },
      softwareCostEurPerTickRange: { min: 100, max: 700 },
      insuranceCostPctOfRevenueRange: { min: 0.015, max: 0.04 },
      subcontractorCostPctRange: { min: 0.3, max: 0.6 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 1, max: 3 },
      errorProbabilityRange: { min: 0.03, max: 0.1 },
      liabilityClaimProbabilityRange: { min: 0.001, max: 0.006 },
      claimSeverityEurRange: { min: 10000, max: 250000 },
      reworkHoursPctRange: { min: 0.04, max: 0.12 },
    },
    demandModel: {
      baseDemandWeight: 0.16,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.4,
      reputationSensitivity: 0.5,
    },
    requirements: {
      engineersFteMin: 1,
      seniorEngineersFteMin: 0,
      projectManagerFteMin: 0,
      bimSpecialistFteMin: 0,
      certificationLevelMin: 0,
      complianceScoreMin: 0.55,
    },
    baselineUnitPriceEur: 18000,
    baselineUnitCostEur: 12000,
  },
  {
    sku: "permitting_and_code_review_unit",
    name: "Permitting & Code Review",
    unit: "unit",
    productionType: "project",
    pricingModel: {
      modelType: "tm_hourly",
      baseFeeEurRange: { min: 1500, max: 45000 },
      hourlyRateEurRange: { min: 65, max: 130 },
      typicalBillableHoursRange: { min: 10, max: 200 },
    },
    grossMarginPctRange: { min: 0.3, max: 0.55 },
    typicalDurationTicksRange: { min: 1, max: 6 },
    paymentTermsDaysRange: { min: 15, max: 45 },
    retentionPctRange: { min: 0, max: 0.04 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 12, max: 160 },
        seniorEngineerHoursRange: { min: 8, max: 120 },
        projectManagerHoursRange: { min: 6, max: 80 },
        drafterHoursRange: { min: 4, max: 50 },
      },
      softwareCostEurPerTickRange: { min: 80, max: 600 },
      insuranceCostPctOfRevenueRange: { min: 0.015, max: 0.04 },
      subcontractorCostPctRange: { min: 0.02, max: 0.08 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 1, max: 3 },
      errorProbabilityRange: { min: 0.02, max: 0.08 },
      liabilityClaimProbabilityRange: { min: 0.001, max: 0.004 },
      claimSeverityEurRange: { min: 10000, max: 150000 },
      reworkHoursPctRange: { min: 0.03, max: 0.1 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.45,
      reputationSensitivity: 0.55,
    },
    requirements: {
      engineersFteMin: 1,
      seniorEngineersFteMin: 0,
      projectManagerFteMin: 0,
      bimSpecialistFteMin: 0,
      certificationLevelMin: 0,
      complianceScoreMin: 0.5,
    },
    baselineUnitPriceEur: 12000,
    baselineUnitCostEur: 7500,
  },
  {
    sku: "bim_coordination_service_unit",
    name: "BIM Coordination Service",
    unit: "unit",
    productionType: "project",
    pricingModel: {
      modelType: "mixed",
      baseFeeEurRange: { min: 6000, max: 180000 },
      hourlyRateEurRange: { min: 80, max: 150 },
      typicalBillableHoursRange: { min: 60, max: 900 },
    },
    grossMarginPctRange: { min: 0.32, max: 0.6 },
    typicalDurationTicksRange: { min: 2, max: 10 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    retentionPctRange: { min: 0.02, max: 0.06 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 40, max: 600 },
        seniorEngineerHoursRange: { min: 20, max: 240 },
        projectManagerHoursRange: { min: 20, max: 180 },
        drafterHoursRange: { min: 50, max: 500 },
      },
      softwareCostEurPerTickRange: { min: 400, max: 2500 },
      insuranceCostPctOfRevenueRange: { min: 0.02, max: 0.05 },
      subcontractorCostPctRange: { min: 0.02, max: 0.08 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 2, max: 5 },
      errorProbabilityRange: { min: 0.04, max: 0.12 },
      liabilityClaimProbabilityRange: { min: 0.002, max: 0.008 },
      claimSeverityEurRange: { min: 20000, max: 500000 },
      reworkHoursPctRange: { min: 0.05, max: 0.15 },
    },
    demandModel: {
      baseDemandWeight: 0.14,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.38,
      reputationSensitivity: 0.75,
    },
    requirements: {
      engineersFteMin: 1,
      seniorEngineersFteMin: 1,
      projectManagerFteMin: 0,
      bimSpecialistFteMin: 1,
      certificationLevelMin: 1,
      complianceScoreMin: 0.55,
      reputationScoreMin: 0.6,
    },
    baselineUnitPriceEur: 45000,
    baselineUnitCostEur: 28500,
  },
  {
    sku: "owner_rep_project_management_unit",
    name: "Owner's Rep Project Management",
    unit: "unit",
    productionType: "retainer",
    pricingModel: {
      modelType: "mixed",
      baseFeeEurRange: { min: 5000, max: 120000 },
      hourlyRateEurRange: { min: 90, max: 160 },
      typicalBillableHoursRange: { min: 40, max: 300 },
    },
    grossMarginPctRange: { min: 0.25, max: 0.5 },
    typicalDurationTicksRange: { min: 4, max: 16 },
    paymentTermsDaysRange: { min: 30, max: 75 },
    retentionPctRange: { min: 0.05, max: 0.1 },
    costModel: {
      staffHoursByRoleRange: {
        engineerHoursRange: { min: 20, max: 200 },
        seniorEngineerHoursRange: { min: 20, max: 180 },
        projectManagerHoursRange: { min: 60, max: 520 },
        drafterHoursRange: { min: 10, max: 80 },
      },
      softwareCostEurPerTickRange: { min: 200, max: 1400 },
      insuranceCostPctOfRevenueRange: { min: 0.03, max: 0.08 },
      subcontractorCostPctRange: { min: 0.02, max: 0.08 },
    },
    liabilityModel: {
      revisionRoundsRange: { min: 2, max: 6 },
      errorProbabilityRange: { min: 0.05, max: 0.14 },
      liabilityClaimProbabilityRange: { min: 0.004, max: 0.02 },
      claimSeverityEurRange: { min: 50000, max: 1200000 },
      reworkHoursPctRange: { min: 0.06, max: 0.2 },
    },
    demandModel: {
      baseDemandWeight: 0.1,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.28,
      reputationSensitivity: 0.8,
    },
    requirements: {
      engineersFteMin: 1,
      seniorEngineersFteMin: 1,
      projectManagerFteMin: 1,
      bimSpecialistFteMin: 0,
      certificationLevelMin: 1,
      complianceScoreMin: 0.7,
      reputationScoreMin: 0.65,
    },
    baselineUnitPriceEur: 35000,
    baselineUnitCostEur: 24500,
  },
];

export function getBaselineMargin(product: EngineeringProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testEngineeringProducts(): boolean {
  const permitting = engineeringProducts.find(
    (product) => product.sku === "permitting_and_code_review_unit"
  );
  const ownerRep = engineeringProducts.find(
    (product) => product.sku === "owner_rep_project_management_unit"
  );
  return (
    engineeringProducts.length === 6 &&
    !!permitting &&
    !!ownerRep &&
    getBaselineMargin(permitting) > 0
  );
}
