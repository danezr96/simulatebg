import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { EngineeringProductSku } from "./engineering.products";
import { engineeringProducts } from "./engineering.products";
import { engineeringUnlocks } from "./engineering.unlocks";
import { engineeringUpgrades } from "./engineering.upgrades";

type NicheMarketProductConfig = {
  productSku: EngineeringProductSku;
  baseDemandPerYear: number;
  basePrice: number;
  seasonalityCurve: number[];
  qualityMultiplier: number;
  saturationImpact: number;
};

type NicheMarketConfig = {
  products: NicheMarketProductConfig[];
};

type NicheStartingLoadout = {
  startingCash: number;
  assets: { assetId: string; count: number }[];
  staff: { roleId: string; fte: number }[];
  unlockedProducts: EngineeringProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type EngineeringNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof engineeringProducts;
  unlocks: typeof engineeringUnlocks;
  upgrades: typeof engineeringUpgrades;
};

export const EngineeringNicheConfig: EngineeringNicheConfig = {
  id: "engineering",
  sectorId: "BUILD",
  name: "Engineering",
  description:
    "Professional engineering services with utilization, liability, and proposal-driven growth.",
  market: {
    products: [
      {
        productSku: "structural_design_package_unit",
        baseDemandPerYear: 5200,
        basePrice: 90000,
        seasonalityCurve: [0.95, 0.97, 1, 1.05, 1.1, 1.12, 1.08, 1.04, 0.98, 0.96, 0.94, 0.92],
        qualityMultiplier: 1.08,
        saturationImpact: 1.15,
      },
      {
        productSku: "mep_design_package_unit",
        baseDemandPerYear: 4200,
        basePrice: 120000,
        seasonalityCurve: [0.92, 0.95, 0.99, 1.05, 1.12, 1.15, 1.12, 1.06, 1, 0.97, 0.95, 0.92],
        qualityMultiplier: 1.1,
        saturationImpact: 1.12,
      },
      {
        productSku: "geotechnical_survey_unit",
        baseDemandPerYear: 16000,
        basePrice: 18000,
        seasonalityCurve: [0.8, 0.85, 0.95, 1.05, 1.15, 1.2, 1.18, 1.1, 1, 0.9, 0.85, 0.8],
        qualityMultiplier: 1.02,
        saturationImpact: 1.08,
      },
      {
        productSku: "permitting_and_code_review_unit",
        baseDemandPerYear: 26000,
        basePrice: 12000,
        seasonalityCurve: [1.1, 1.08, 1.05, 1.02, 0.98, 0.95, 0.93, 0.95, 0.98, 1.02, 1.05, 1.1],
        qualityMultiplier: 1.05,
        saturationImpact: 1.1,
      },
      {
        productSku: "bim_coordination_service_unit",
        baseDemandPerYear: 7800,
        basePrice: 45000,
        seasonalityCurve: [0.9, 0.92, 0.98, 1.05, 1.12, 1.2, 1.22, 1.16, 1.05, 0.98, 0.94, 0.9],
        qualityMultiplier: 1.15,
        saturationImpact: 1.18,
      },
      {
        productSku: "owner_rep_project_management_unit",
        baseDemandPerYear: 3800,
        basePrice: 35000,
        seasonalityCurve: [1.02, 1.02, 1.02, 1.02, 1.01, 1, 0.99, 0.99, 1, 1.01, 1.02, 1.02],
        qualityMultiplier: 1.2,
        saturationImpact: 1.1,
      },
    ],
  },
  startingLoadout: {
    startingCash: 220000,
    assets: [
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "utilization_target", count: 0.7 },
      { assetId: "utilization_actual", count: 0.5 },
      { assetId: "billable_hours_capacity_per_tick", count: 90 },
      { assetId: "overtime_enabled", count: 0 },
      { assetId: "lead_pool_count", count: 10 },
      { assetId: "proposals_in_progress_count", count: 1 },
      { assetId: "proposals_capacity_per_tick", count: 1 },
      { assetId: "proposal_cost_pct_of_contract_value", count: 0.025 },
      { assetId: "win_rate_base", count: 0.3 },
      { assetId: "backlog_contract_value_eur", count: 120000 },
      { assetId: "backlog_projects_count", count: 3 },
      { assetId: "wip_active_projects_count", count: 1 },
      { assetId: "wip_burn_value_eur_per_tick", count: 30000 },
      { assetId: "wip_burn_cost_eur_per_tick", count: 22000 },
      { assetId: "permitting_delay_ticks_min", count: 1 },
      { assetId: "permitting_delay_ticks_max", count: 4 },
      { assetId: "review_cycle_delay_probability", count: 0.12 },
      { assetId: "scope_creep_rate", count: 0.15 },
      { assetId: "qa_process_maturity", count: 0.2 },
      { assetId: "revision_backlog_hours", count: 18 },
      { assetId: "error_rate", count: 0.1 },
      { assetId: "liability_risk_score", count: 0.3 },
      { assetId: "insurance_reserve_eur", count: 6000 },
      { assetId: "claims_count", count: 0 },
      { assetId: "accounts_receivable_eur", count: 20000 },
      { assetId: "payment_delay_ticks_min", count: 1 },
      { assetId: "payment_delay_ticks_max", count: 4 },
      { assetId: "retention_held_eur", count: 0 },
      { assetId: "certification_level", count: 0 },
    ],
    staff: [
      { roleId: "engineers_fte", fte: 2 },
      { roleId: "senior_engineers_fte", fte: 0 },
      { roleId: "drafters_fte", fte: 1 },
      { roleId: "project_managers_fte", fte: 0 },
      { roleId: "bim_specialists_fte", fte: 0 },
    ],
    unlockedProducts: ["permitting_and_code_review_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.2,
      Expansionist: 0.18,
      CostCutter: 0.18,
      ContractSpecialist: 0.22,
      VerticalIntegrator: 0.17,
      OrganicPurist: 0.05,
    },
    minCashReserve: 120000,
    maxDebtRatio: 0.45,
    targetUtilization: 0.75,
  },
  products: engineeringProducts,
  unlocks: engineeringUnlocks,
  upgrades: engineeringUpgrades,
};
