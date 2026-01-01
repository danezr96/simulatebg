export type RenovationProductSku =
  | "small_repair_punchlist_job_unit"
  | "kitchen_renovation_job_unit"
  | "bathroom_renovation_job_unit"
  | "whole_home_renovation_job_unit"
  | "tenant_turnover_renovation_contract_unit"
  | "insurance_restoration_job_unit";

export type Range = {
  min: number;
  max: number;
};

export type RenovationCostModel = {
  laborHoursPerJobRange: Range;
  materialsCostEurPerJobRange: Range;
  subcontractorCostPctRange: Range;
  mobilizationCostEurRange: Range;
  overheadCostPctRange: Range;
};

export type ScopeContractModel = {
  scopeCreepProbabilityRange: Range;
  scopeCreepCostPctRange: Range;
  changeOrderAcceptanceRateRange: Range;
  changeOrderMarginPctRange: Range;
  milestoneBillingEnabled: boolean;
};

export type HiddenDefectModel = {
  hiddenDefectProbabilityRange: Range;
  defectDetectionSensitivity: number;
  defectReworkCostEurRange: Range;
  defectDelayTicksRange: Range;
};

export type QualityWarrantyModel = {
  defectRateRange: Range;
  warrantyClaimRateRange: Range;
  warrantyClaimSeverityEurRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
  reputationSensitivity: number;
};

export type ProductRequirements = {
  crewFteMin: number;
  siteManagersFteMin: number;
  projectManagerFteMin: number;
  complianceScoreMin?: number;
  reputationScoreMin?: number;
  contractDisciplineScoreMin?: number;
  defectDetectionScoreMin?: number;
  documentationProcessRequired?: boolean;
};

export type RenovationProduct = {
  sku: RenovationProductSku;
  name: string;
  unit: "unit";
  productionType: "job" | "retainer";
  basePriceEurRange: Range;
  grossMarginPctRange: Range;
  typicalDurationTicksRange: Range;
  paymentTermsDaysRange: Range;
  depositPctRange: Range;
  retentionPctRange: Range;
  costModel: RenovationCostModel;
  scopeContractModel: ScopeContractModel;
  hiddenDefectModel: HiddenDefectModel;
  qualityWarrantyModel: QualityWarrantyModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const renovationProducts: RenovationProduct[] = [
  {
    sku: "small_repair_punchlist_job_unit",
    name: "Small Repair & Punch List",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 300, max: 2500 },
    grossMarginPctRange: { min: 0.25, max: 0.45 },
    typicalDurationTicksRange: { min: 1, max: 2 },
    paymentTermsDaysRange: { min: 7, max: 30 },
    depositPctRange: { min: 0.1, max: 0.2 },
    retentionPctRange: { min: 0, max: 0.03 },
    costModel: {
      laborHoursPerJobRange: { min: 4, max: 30 },
      materialsCostEurPerJobRange: { min: 80, max: 600 },
      subcontractorCostPctRange: { min: 0.02, max: 0.08 },
      mobilizationCostEurRange: { min: 0, max: 150 },
      overheadCostPctRange: { min: 0.08, max: 0.2 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.05, max: 0.15 },
      scopeCreepCostPctRange: { min: 0.02, max: 0.08 },
      changeOrderAcceptanceRateRange: { min: 0.2, max: 0.45 },
      changeOrderMarginPctRange: { min: 0.15, max: 0.3 },
      milestoneBillingEnabled: false,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.03, max: 0.1 },
      defectDetectionSensitivity: 0.35,
      defectReworkCostEurRange: { min: 200, max: 2500 },
      defectDelayTicksRange: { min: 0, max: 1 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.02, max: 0.08 },
      warrantyClaimRateRange: { min: 0.01, max: 0.04 },
      warrantyClaimSeverityEurRange: { min: 300, max: 4000 },
    },
    demandModel: {
      baseDemandWeight: 0.3,
      seasonalityKey: "winter_indoor_project_seasonality",
      priceElasticity: 0.45,
      reputationSensitivity: 0.35,
    },
    requirements: {
      crewFteMin: 2,
      siteManagersFteMin: 0,
      projectManagerFteMin: 0,
      complianceScoreMin: 0.45,
      reputationScoreMin: 0.35,
    },
    baselineUnitPriceEur: 1200,
    baselineUnitCostEur: 750,
  },
  {
    sku: "kitchen_renovation_job_unit",
    name: "Kitchen Renovation",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 8000, max: 45000 },
    grossMarginPctRange: { min: 0.2, max: 0.4 },
    typicalDurationTicksRange: { min: 2, max: 10 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    depositPctRange: { min: 0.2, max: 0.3 },
    retentionPctRange: { min: 0.04, max: 0.08 },
    costModel: {
      laborHoursPerJobRange: { min: 80, max: 420 },
      materialsCostEurPerJobRange: { min: 3000, max: 22000 },
      subcontractorCostPctRange: { min: 0.12, max: 0.28 },
      mobilizationCostEurRange: { min: 200, max: 1800 },
      overheadCostPctRange: { min: 0.1, max: 0.25 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.2, max: 0.45 },
      scopeCreepCostPctRange: { min: 0.05, max: 0.18 },
      changeOrderAcceptanceRateRange: { min: 0.35, max: 0.7 },
      changeOrderMarginPctRange: { min: 0.2, max: 0.4 },
      milestoneBillingEnabled: true,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.08, max: 0.22 },
      defectDetectionSensitivity: 0.45,
      defectReworkCostEurRange: { min: 1500, max: 12000 },
      defectDelayTicksRange: { min: 1, max: 4 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.03, max: 0.1 },
      warrantyClaimRateRange: { min: 0.02, max: 0.06 },
      warrantyClaimSeverityEurRange: { min: 1500, max: 15000 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "spring_renovation_seasonality",
      priceElasticity: 0.32,
      reputationSensitivity: 0.55,
    },
    requirements: {
      crewFteMin: 4,
      siteManagersFteMin: 0,
      projectManagerFteMin: 0,
      complianceScoreMin: 0.5,
      reputationScoreMin: 0.5,
      contractDisciplineScoreMin: 0.45,
    },
    baselineUnitPriceEur: 22000,
    baselineUnitCostEur: 15000,
  },
  {
    sku: "bathroom_renovation_job_unit",
    name: "Bathroom Renovation",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 7000, max: 35000 },
    grossMarginPctRange: { min: 0.2, max: 0.38 },
    typicalDurationTicksRange: { min: 2, max: 9 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    depositPctRange: { min: 0.2, max: 0.3 },
    retentionPctRange: { min: 0.04, max: 0.08 },
    costModel: {
      laborHoursPerJobRange: { min: 70, max: 360 },
      materialsCostEurPerJobRange: { min: 2500, max: 16000 },
      subcontractorCostPctRange: { min: 0.12, max: 0.28 },
      mobilizationCostEurRange: { min: 200, max: 1500 },
      overheadCostPctRange: { min: 0.1, max: 0.25 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.18, max: 0.4 },
      scopeCreepCostPctRange: { min: 0.05, max: 0.16 },
      changeOrderAcceptanceRateRange: { min: 0.35, max: 0.65 },
      changeOrderMarginPctRange: { min: 0.18, max: 0.38 },
      milestoneBillingEnabled: true,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.1, max: 0.28 },
      defectDetectionSensitivity: 0.5,
      defectReworkCostEurRange: { min: 1500, max: 15000 },
      defectDelayTicksRange: { min: 1, max: 5 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.04, max: 0.12 },
      warrantyClaimRateRange: { min: 0.03, max: 0.08 },
      warrantyClaimSeverityEurRange: { min: 2000, max: 20000 },
    },
    demandModel: {
      baseDemandWeight: 0.2,
      seasonalityKey: "spring_renovation_seasonality",
      priceElasticity: 0.34,
      reputationSensitivity: 0.6,
    },
    requirements: {
      crewFteMin: 4,
      siteManagersFteMin: 0,
      projectManagerFteMin: 0,
      complianceScoreMin: 0.5,
      reputationScoreMin: 0.45,
      defectDetectionScoreMin: 0.35,
    },
    baselineUnitPriceEur: 18000,
    baselineUnitCostEur: 12500,
  },
  {
    sku: "whole_home_renovation_job_unit",
    name: "Whole-Home Renovation",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 60000, max: 450000 },
    grossMarginPctRange: { min: 0.18, max: 0.35 },
    typicalDurationTicksRange: { min: 8, max: 30 },
    paymentTermsDaysRange: { min: 45, max: 90 },
    depositPctRange: { min: 0.25, max: 0.35 },
    retentionPctRange: { min: 0.05, max: 0.1 },
    costModel: {
      laborHoursPerJobRange: { min: 600, max: 3600 },
      materialsCostEurPerJobRange: { min: 25000, max: 250000 },
      subcontractorCostPctRange: { min: 0.15, max: 0.32 },
      mobilizationCostEurRange: { min: 2000, max: 20000 },
      overheadCostPctRange: { min: 0.12, max: 0.3 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.15, max: 0.35 },
      scopeCreepCostPctRange: { min: 0.06, max: 0.2 },
      changeOrderAcceptanceRateRange: { min: 0.3, max: 0.6 },
      changeOrderMarginPctRange: { min: 0.18, max: 0.35 },
      milestoneBillingEnabled: true,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.12, max: 0.3 },
      defectDetectionSensitivity: 0.55,
      defectReworkCostEurRange: { min: 8000, max: 80000 },
      defectDelayTicksRange: { min: 2, max: 8 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.03, max: 0.1 },
      warrantyClaimRateRange: { min: 0.02, max: 0.06 },
      warrantyClaimSeverityEurRange: { min: 5000, max: 60000 },
    },
    demandModel: {
      baseDemandWeight: 0.1,
      seasonalityKey: "spring_renovation_seasonality",
      priceElasticity: 0.25,
      reputationSensitivity: 0.7,
    },
    requirements: {
      crewFteMin: 6,
      siteManagersFteMin: 1,
      projectManagerFteMin: 1,
      complianceScoreMin: 0.6,
      reputationScoreMin: 0.65,
      contractDisciplineScoreMin: 0.6,
      defectDetectionScoreMin: 0.45,
    },
    baselineUnitPriceEur: 180000,
    baselineUnitCostEur: 135000,
  },
  {
    sku: "tenant_turnover_renovation_contract_unit",
    name: "Tenant Turnover Renovation Contract",
    unit: "unit",
    productionType: "retainer",
    basePriceEurRange: { min: 2500, max: 60000 },
    grossMarginPctRange: { min: 0.15, max: 0.3 },
    typicalDurationTicksRange: { min: 2, max: 8 },
    paymentTermsDaysRange: { min: 30, max: 60 },
    depositPctRange: { min: 0.1, max: 0.2 },
    retentionPctRange: { min: 0.03, max: 0.06 },
    costModel: {
      laborHoursPerJobRange: { min: 60, max: 280 },
      materialsCostEurPerJobRange: { min: 2000, max: 20000 },
      subcontractorCostPctRange: { min: 0.12, max: 0.28 },
      mobilizationCostEurRange: { min: 200, max: 1500 },
      overheadCostPctRange: { min: 0.1, max: 0.24 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.08, max: 0.2 },
      scopeCreepCostPctRange: { min: 0.03, max: 0.1 },
      changeOrderAcceptanceRateRange: { min: 0.25, max: 0.5 },
      changeOrderMarginPctRange: { min: 0.12, max: 0.28 },
      milestoneBillingEnabled: true,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.06, max: 0.18 },
      defectDetectionSensitivity: 0.4,
      defectReworkCostEurRange: { min: 1000, max: 12000 },
      defectDelayTicksRange: { min: 1, max: 4 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.03, max: 0.08 },
      warrantyClaimRateRange: { min: 0.02, max: 0.05 },
      warrantyClaimSeverityEurRange: { min: 1500, max: 15000 },
    },
    demandModel: {
      baseDemandWeight: 0.12,
      seasonalityKey: "winter_indoor_project_seasonality",
      priceElasticity: 0.22,
      reputationSensitivity: 0.75,
    },
    requirements: {
      crewFteMin: 4,
      siteManagersFteMin: 0,
      projectManagerFteMin: 1,
      complianceScoreMin: 0.55,
      reputationScoreMin: 0.6,
      contractDisciplineScoreMin: 0.5,
    },
    baselineUnitPriceEur: 18000,
    baselineUnitCostEur: 13500,
  },
  {
    sku: "insurance_restoration_job_unit",
    name: "Insurance Restoration Job",
    unit: "unit",
    productionType: "job",
    basePriceEurRange: { min: 5000, max: 120000 },
    grossMarginPctRange: { min: 0.12, max: 0.28 },
    typicalDurationTicksRange: { min: 3, max: 14 },
    paymentTermsDaysRange: { min: 45, max: 90 },
    depositPctRange: { min: 0.1, max: 0.2 },
    retentionPctRange: { min: 0.04, max: 0.08 },
    costModel: {
      laborHoursPerJobRange: { min: 120, max: 900 },
      materialsCostEurPerJobRange: { min: 4000, max: 60000 },
      subcontractorCostPctRange: { min: 0.15, max: 0.35 },
      mobilizationCostEurRange: { min: 500, max: 5000 },
      overheadCostPctRange: { min: 0.12, max: 0.28 },
    },
    scopeContractModel: {
      scopeCreepProbabilityRange: { min: 0.08, max: 0.2 },
      scopeCreepCostPctRange: { min: 0.03, max: 0.12 },
      changeOrderAcceptanceRateRange: { min: 0.2, max: 0.45 },
      changeOrderMarginPctRange: { min: 0.1, max: 0.25 },
      milestoneBillingEnabled: true,
    },
    hiddenDefectModel: {
      hiddenDefectProbabilityRange: { min: 0.1, max: 0.25 },
      defectDetectionSensitivity: 0.5,
      defectReworkCostEurRange: { min: 3000, max: 40000 },
      defectDelayTicksRange: { min: 1, max: 6 },
    },
    qualityWarrantyModel: {
      defectRateRange: { min: 0.04, max: 0.12 },
      warrantyClaimRateRange: { min: 0.03, max: 0.08 },
      warrantyClaimSeverityEurRange: { min: 2500, max: 30000 },
    },
    demandModel: {
      baseDemandWeight: 0.1,
      seasonalityKey: "winter_indoor_project_seasonality",
      priceElasticity: 0.18,
      reputationSensitivity: 0.65,
    },
    requirements: {
      crewFteMin: 4,
      siteManagersFteMin: 0,
      projectManagerFteMin: 1,
      complianceScoreMin: 0.7,
      reputationScoreMin: 0.5,
      documentationProcessRequired: true,
    },
    baselineUnitPriceEur: 42000,
    baselineUnitCostEur: 34000,
  },
];

export function getBaselineMargin(product: RenovationProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testRenovationProducts(): boolean {
  const smallRepair = renovationProducts.find(
    (product) => product.sku === "small_repair_punchlist_job_unit"
  );
  const insurance = renovationProducts.find(
    (product) => product.sku === "insurance_restoration_job_unit"
  );
  return (
    renovationProducts.length === 6 &&
    !!smallRepair &&
    !!insurance &&
    getBaselineMargin(smallRepair) > 0
  );
}
