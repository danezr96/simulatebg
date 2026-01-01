export type CommercialBuildProductSku =
  | "warehouse_shell_project_unit"
  | "office_fitout_project_unit"
  | "retail_unit_project_unit"
  | "industrial_extension_project_unit"
  | "design_build_contract_unit"
  | "maintenance_repair_retain_unit";

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

export type PaymentModel = {
  paymentTermsDaysRange: Range;
  retentionPctRange: Range;
};

export type ProjectCostModel = {
  laborHoursPerProjectRange: Range;
  materialsCostPctRange: Range;
  subcontractorCostPctRange: Range;
  equipmentDaysPerProjectRange: Range;
  mobilizationCostEurRange: Range;
  contingencyPctRange: Range;
};

export type ProjectRiskModel = {
  delayProbabilityRange: Range;
  delayPenaltyPctRange: Range;
  safetyIncidentRateRange: Range;
  reworkPctRange: Range;
};

export type DemandModel = {
  baseDemandWeight: number;
  seasonalityKey: string;
  priceElasticity: number;
};

export type ProductRequirements = {
  crewFteMin: number;
  supervisorFteMin: number;
  estimatorFteMin: number;
  equipmentRequirements: string[];
  complianceScoreMin?: number;
  reputationScoreMin?: number;
};

export type CommercialBuildProduct = {
  sku: CommercialBuildProductSku;
  name: string;
  unit: "unit";
  productionType: "project" | "retainer";
  baseContractValueEurRange: Range;
  grossMarginPctRange: Range;
  typicalDurationTicksRange: Range;
  paymentModel: PaymentModel;
  changeOrderRateRange: Range;
  bidWinRateModifier: number;
  costModel: ProjectCostModel;
  riskModel: ProjectRiskModel;
  demandModel: DemandModel;
  requirements: ProductRequirements;
  baselineUnitPriceEur: number;
  baselineUnitCostEur: number;
};

export const commercialBuildProducts: CommercialBuildProduct[] = [
  {
    sku: "warehouse_shell_project_unit",
    name: "Warehouse Shell Project",
    unit: "unit",
    productionType: "project",
    baseContractValueEurRange: { min: 1500000, max: 20000000 },
    grossMarginPctRange: { min: 0.08, max: 0.16 },
    typicalDurationTicksRange: { min: 16, max: 52 },
    paymentModel: {
      paymentTermsDaysRange: { min: 45, max: 90 },
      retentionPctRange: { min: 0.06, max: 0.1 },
    },
    changeOrderRateRange: { min: 0.05, max: 0.12 },
    bidWinRateModifier: 0.85,
    costModel: {
      laborHoursPerProjectRange: { min: 1600, max: 12000 },
      materialsCostPctRange: { min: 0.4, max: 0.55 },
      subcontractorCostPctRange: { min: 0.15, max: 0.3 },
      equipmentDaysPerProjectRange: { min: 20, max: 120 },
      mobilizationCostEurRange: { min: 25000, max: 200000 },
      contingencyPctRange: { min: 0.06, max: 0.12 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.2, max: 0.45 },
      delayPenaltyPctRange: { min: 0.02, max: 0.08 },
      safetyIncidentRateRange: { min: 0.012, max: 0.04 },
      reworkPctRange: { min: 0.02, max: 0.06 },
    },
    demandModel: {
      baseDemandWeight: 0.18,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.4,
    },
    requirements: {
      crewFteMin: 14,
      supervisorFteMin: 2,
      estimatorFteMin: 1,
      equipmentRequirements: ["excavator_access", "crane_access"],
      complianceScoreMin: 0.55,
    },
    baselineUnitPriceEur: 6000000,
    baselineUnitCostEur: 5400000,
  },
  {
    sku: "office_fitout_project_unit",
    name: "Office Fit-Out Project",
    unit: "unit",
    productionType: "project",
    baseContractValueEurRange: { min: 250000, max: 6000000 },
    grossMarginPctRange: { min: 0.1, max: 0.2 },
    typicalDurationTicksRange: { min: 8, max: 32 },
    paymentModel: {
      paymentTermsDaysRange: { min: 30, max: 60 },
      retentionPctRange: { min: 0.05, max: 0.08 },
    },
    changeOrderRateRange: { min: 0.08, max: 0.2 },
    bidWinRateModifier: 0.95,
    costModel: {
      laborHoursPerProjectRange: { min: 400, max: 3000 },
      materialsCostPctRange: { min: 0.25, max: 0.45 },
      subcontractorCostPctRange: { min: 0.2, max: 0.35 },
      equipmentDaysPerProjectRange: { min: 8, max: 45 },
      mobilizationCostEurRange: { min: 8000, max: 60000 },
      contingencyPctRange: { min: 0.05, max: 0.1 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.15, max: 0.35 },
      delayPenaltyPctRange: { min: 0.015, max: 0.06 },
      safetyIncidentRateRange: { min: 0.008, max: 0.03 },
      reworkPctRange: { min: 0.03, max: 0.08 },
    },
    demandModel: {
      baseDemandWeight: 0.22,
      seasonalityKey: "renovation_summer_peak_seasonality",
      priceElasticity: 0.45,
    },
    requirements: {
      crewFteMin: 10,
      supervisorFteMin: 2,
      estimatorFteMin: 1,
      equipmentRequirements: ["scissor_lift_access"],
      reputationScoreMin: 0.55,
    },
    baselineUnitPriceEur: 1200000,
    baselineUnitCostEur: 1020000,
  },
  {
    sku: "retail_unit_project_unit",
    name: "Retail Unit Project",
    unit: "unit",
    productionType: "project",
    baseContractValueEurRange: { min: 150000, max: 3000000 },
    grossMarginPctRange: { min: 0.1, max: 0.22 },
    typicalDurationTicksRange: { min: 6, max: 24 },
    paymentModel: {
      paymentTermsDaysRange: { min: 30, max: 60 },
      retentionPctRange: { min: 0.05, max: 0.08 },
    },
    changeOrderRateRange: { min: 0.1, max: 0.22 },
    bidWinRateModifier: 1.1,
    costModel: {
      laborHoursPerProjectRange: { min: 250, max: 1800 },
      materialsCostPctRange: { min: 0.2, max: 0.4 },
      subcontractorCostPctRange: { min: 0.15, max: 0.3 },
      equipmentDaysPerProjectRange: { min: 6, max: 30 },
      mobilizationCostEurRange: { min: 5000, max: 40000 },
      contingencyPctRange: { min: 0.04, max: 0.1 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.12, max: 0.3 },
      delayPenaltyPctRange: { min: 0.015, max: 0.05 },
      safetyIncidentRateRange: { min: 0.008, max: 0.025 },
      reworkPctRange: { min: 0.03, max: 0.07 },
    },
    demandModel: {
      baseDemandWeight: 0.24,
      seasonalityKey: "renovation_summer_peak_seasonality",
      priceElasticity: 0.5,
    },
    requirements: {
      crewFteMin: 6,
      supervisorFteMin: 1,
      estimatorFteMin: 1,
      equipmentRequirements: ["scissor_lift_access"],
      reputationScoreMin: 0.45,
    },
    baselineUnitPriceEur: 650000,
    baselineUnitCostEur: 520000,
  },
  {
    sku: "industrial_extension_project_unit",
    name: "Industrial Extension Project",
    unit: "unit",
    productionType: "project",
    baseContractValueEurRange: { min: 800000, max: 12000000 },
    grossMarginPctRange: { min: 0.08, max: 0.16 },
    typicalDurationTicksRange: { min: 12, max: 48 },
    paymentModel: {
      paymentTermsDaysRange: { min: 45, max: 90 },
      retentionPctRange: { min: 0.06, max: 0.1 },
    },
    changeOrderRateRange: { min: 0.08, max: 0.18 },
    bidWinRateModifier: 0.9,
    costModel: {
      laborHoursPerProjectRange: { min: 800, max: 7000 },
      materialsCostPctRange: { min: 0.35, max: 0.55 },
      subcontractorCostPctRange: { min: 0.2, max: 0.35 },
      equipmentDaysPerProjectRange: { min: 12, max: 70 },
      mobilizationCostEurRange: { min: 15000, max: 120000 },
      contingencyPctRange: { min: 0.05, max: 0.12 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.18, max: 0.4 },
      delayPenaltyPctRange: { min: 0.02, max: 0.08 },
      safetyIncidentRateRange: { min: 0.01, max: 0.035 },
      reworkPctRange: { min: 0.02, max: 0.06 },
    },
    demandModel: {
      baseDemandWeight: 0.16,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.4,
    },
    requirements: {
      crewFteMin: 12,
      supervisorFteMin: 2,
      estimatorFteMin: 1,
      equipmentRequirements: ["forklift_access", "excavator_access"],
      complianceScoreMin: 0.6,
    },
    baselineUnitPriceEur: 3500000,
    baselineUnitCostEur: 3150000,
  },
  {
    sku: "design_build_contract_unit",
    name: "Design-Build Contract",
    unit: "unit",
    productionType: "project",
    baseContractValueEurRange: { min: 2000000, max: 35000000 },
    grossMarginPctRange: { min: 0.1, max: 0.18 },
    typicalDurationTicksRange: { min: 20, max: 80 },
    paymentModel: {
      paymentTermsDaysRange: { min: 60, max: 120 },
      retentionPctRange: { min: 0.07, max: 0.1 },
    },
    changeOrderRateRange: { min: 0.12, max: 0.3 },
    bidWinRateModifier: 0.8,
    costModel: {
      laborHoursPerProjectRange: { min: 2000, max: 15000 },
      materialsCostPctRange: { min: 0.3, max: 0.55 },
      subcontractorCostPctRange: { min: 0.2, max: 0.35 },
      equipmentDaysPerProjectRange: { min: 20, max: 120 },
      mobilizationCostEurRange: { min: 30000, max: 250000 },
      contingencyPctRange: { min: 0.06, max: 0.14 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.25, max: 0.5 },
      delayPenaltyPctRange: { min: 0.03, max: 0.1 },
      safetyIncidentRateRange: { min: 0.012, max: 0.04 },
      reworkPctRange: { min: 0.04, max: 0.1 },
    },
    demandModel: {
      baseDemandWeight: 0.1,
      seasonalityKey: "public_tender_cycle_seasonality",
      priceElasticity: 0.35,
    },
    requirements: {
      crewFteMin: 16,
      supervisorFteMin: 3,
      estimatorFteMin: 2,
      equipmentRequirements: ["crane_access", "site_office_setup"],
      complianceScoreMin: 0.65,
      reputationScoreMin: 0.65,
    },
    baselineUnitPriceEur: 10000000,
    baselineUnitCostEur: 8900000,
  },
  {
    sku: "maintenance_repair_retain_unit",
    name: "Maintenance & Repair Retainer",
    unit: "unit",
    productionType: "retainer",
    baseContractValueEurRange: { min: 8000, max: 80000 },
    grossMarginPctRange: { min: 0.12, max: 0.25 },
    typicalDurationTicksRange: { min: 4, max: 12 },
    paymentModel: {
      paymentTermsDaysRange: { min: 30, max: 45 },
      retentionPctRange: { min: 0.05, max: 0.08 },
    },
    changeOrderRateRange: { min: 0.02, max: 0.08 },
    bidWinRateModifier: 1.2,
    costModel: {
      laborHoursPerProjectRange: { min: 60, max: 400 },
      materialsCostPctRange: { min: 0.1, max: 0.25 },
      subcontractorCostPctRange: { min: 0.05, max: 0.15 },
      equipmentDaysPerProjectRange: { min: 2, max: 8 },
      mobilizationCostEurRange: { min: 1000, max: 8000 },
      contingencyPctRange: { min: 0.02, max: 0.06 },
    },
    riskModel: {
      delayProbabilityRange: { min: 0.05, max: 0.15 },
      delayPenaltyPctRange: { min: 0.005, max: 0.03 },
      safetyIncidentRateRange: { min: 0.002, max: 0.01 },
      reworkPctRange: { min: 0.01, max: 0.04 },
    },
    demandModel: {
      baseDemandWeight: 0.3,
      seasonalityKey: "weather_construction_seasonality",
      priceElasticity: 0.55,
    },
    requirements: {
      crewFteMin: 4,
      supervisorFteMin: 0.5,
      estimatorFteMin: 0,
      equipmentRequirements: ["service_van_access"],
      complianceScoreMin: 0.45,
    },
    baselineUnitPriceEur: 25000,
    baselineUnitCostEur: 19000,
  },
];

export function getBaselineMargin(product: CommercialBuildProduct): number {
  return product.baselineUnitPriceEur - product.baselineUnitCostEur;
}

export function testCommercialBuildProducts(): boolean {
  const warehouse = commercialBuildProducts.find(
    (product) => product.sku === "warehouse_shell_project_unit"
  );
  const retainer = commercialBuildProducts.find(
    (product) => product.sku === "maintenance_repair_retain_unit"
  );
  return (
    commercialBuildProducts.length === 6 &&
    !!warehouse &&
    !!retainer &&
    getBaselineMargin(retainer) > 0
  );
}
