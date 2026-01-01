import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { CommercialBuildProductSku } from "./commercialBuild.products";
import { commercialBuildProducts } from "./commercialBuild.products";
import { commercialBuildUnlocks } from "./commercialBuild.unlocks";
import { commercialBuildUpgrades } from "./commercialBuild.upgrades";

type NicheMarketProductConfig = {
  productSku: CommercialBuildProductSku;
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
  unlockedProducts: CommercialBuildProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type CommercialBuildNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof commercialBuildProducts;
  unlocks: typeof commercialBuildUnlocks;
  upgrades: typeof commercialBuildUpgrades;
};

export const CommercialBuildNicheConfig: CommercialBuildNicheConfig = {
  id: "commercialBuild",
  sectorId: "BUILD",
  name: "Commercial Build",
  description: "Bid-driven commercial projects with backlog, retention, and schedule risk.",
  market: {
    products: [
      {
        productSku: "warehouse_shell_project_unit",
        baseDemandPerYear: 1200,
        basePrice: 6000000,
        seasonalityCurve: [0.7, 0.76, 0.85, 1, 1.1, 1.18, 1.22, 1.18, 1.05, 0.95, 0.82, 0.72],
        qualityMultiplier: 1.05,
        saturationImpact: 1.2,
      },
      {
        productSku: "office_fitout_project_unit",
        baseDemandPerYear: 4500,
        basePrice: 1200000,
        seasonalityCurve: [0.85, 0.9, 0.96, 1.05, 1.15, 1.3, 1.35, 1.3, 1.12, 0.98, 0.9, 0.85],
        qualityMultiplier: 1.12,
        saturationImpact: 1.15,
      },
      {
        productSku: "retail_unit_project_unit",
        baseDemandPerYear: 6000,
        basePrice: 650000,
        seasonalityCurve: [0.84, 0.9, 0.96, 1.06, 1.18, 1.3, 1.36, 1.3, 1.12, 0.98, 0.9, 0.84],
        qualityMultiplier: 1.1,
        saturationImpact: 1.18,
      },
      {
        productSku: "industrial_extension_project_unit",
        baseDemandPerYear: 1800,
        basePrice: 3500000,
        seasonalityCurve: [0.72, 0.78, 0.86, 1, 1.1, 1.2, 1.24, 1.2, 1.06, 0.96, 0.82, 0.74],
        qualityMultiplier: 1.06,
        saturationImpact: 1.17,
      },
      {
        productSku: "design_build_contract_unit",
        baseDemandPerYear: 800,
        basePrice: 10000000,
        seasonalityCurve: [1.1, 1.05, 0.95, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.05, 0.95, 0.9],
        qualityMultiplier: 1.15,
        saturationImpact: 1.12,
      },
      {
        productSku: "maintenance_repair_retain_unit",
        baseDemandPerYear: 20000,
        basePrice: 25000,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.03, 1.03, 1.02, 1.01, 1, 0.99, 0.98],
        qualityMultiplier: 1.02,
        saturationImpact: 1.1,
      },
    ],
  },
  startingLoadout: {
    startingCash: 450000,
    assets: [
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "lead_pool_count", count: 8 },
      { assetId: "bids_in_progress_count", count: 1 },
      { assetId: "bids_capacity_per_tick", count: 1.4 },
      { assetId: "bid_cost_pct_of_contract_value", count: 0.02 },
      { assetId: "bid_win_rate_base", count: 0.24 },
      { assetId: "backlog_contract_value_eur", count: 600000 },
      { assetId: "backlog_projects_count", count: 2 },
      { assetId: "wip_active_projects_count", count: 1 },
      { assetId: "wip_burn_value_eur_per_tick", count: 80000 },
      { assetId: "wip_burn_cost_eur_per_tick", count: 70000 },
      { assetId: "retention_pct", count: 0.07 },
      { assetId: "accounts_receivable_eur", count: 90000 },
      { assetId: "payment_delay_ticks_min", count: 2 },
      { assetId: "payment_delay_ticks_max", count: 6 },
      { assetId: "retention_held_eur", count: 0 },
      { assetId: "invoicing_enabled", count: 1 },
      { assetId: "subcontractor_dependency_score", count: 0.6 },
      { assetId: "materials_price_index", count: 1 },
      { assetId: "labor_wage_index", count: 1 },
      { assetId: "schedule_slip_score", count: 0.18 },
      { assetId: "safety_incidents_count", count: 0 },
      { assetId: "rework_backlog_value_eur", count: 0 },
      { assetId: "penalty_costs_eur_accum", count: 0 },
      { assetId: "credit_limit_eur", count: 0 },
      { assetId: "credit_interest_rate_pct", count: 0 },
      { assetId: "safety_program_certified", count: 0 },
      { assetId: "forklift_access", count: 1 },
      { assetId: "scissor_lift_access", count: 0 },
      { assetId: "excavator_access", count: 0 },
      { assetId: "crane_access", count: 0 },
      { assetId: "service_van_access", count: 1 },
      { assetId: "site_office_setup", count: 0 },
    ],
    staff: [
      { roleId: "crew_fte", fte: 8 },
      { roleId: "supervisors_fte", fte: 1 },
      { roleId: "estimators_fte", fte: 1 },
    ],
    unlockedProducts: ["maintenance_repair_retain_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.15,
      Expansionist: 0.2,
      CostCutter: 0.2,
      ContractSpecialist: 0.25,
      VerticalIntegrator: 0.15,
      OrganicPurist: 0.05,
    },
    minCashReserve: 200000,
    maxDebtRatio: 0.55,
    targetUtilization: 0.78,
  },
  products: commercialBuildProducts,
  unlocks: commercialBuildUnlocks,
  upgrades: commercialBuildUpgrades,
};
