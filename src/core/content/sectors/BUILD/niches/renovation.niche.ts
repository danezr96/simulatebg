import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { RenovationProductSku } from "./renovation.products";
import { renovationProducts } from "./renovation.products";
import { renovationUnlocks } from "./renovation.unlocks";
import { renovationUpgrades } from "./renovation.upgrades";

type NicheMarketProductConfig = {
  productSku: RenovationProductSku;
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
  unlockedProducts: RenovationProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type RenovationNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof renovationProducts;
  unlocks: typeof renovationUnlocks;
  upgrades: typeof renovationUpgrades;
};

export const RenovationNicheConfig: RenovationNicheConfig = {
  id: "renovation",
  sectorId: "BUILD",
  name: "Renovation",
  description:
    "Renovation work driven by scope control, hidden defects, and client expectations.",
  market: {
    products: [
      {
        productSku: "small_repair_punchlist_job_unit",
        baseDemandPerYear: 62000,
        basePrice: 1200,
        seasonalityCurve: [1.05, 1.02, 1, 1, 1.02, 1.03, 1.02, 1, 0.98, 0.98, 1, 1.03],
        qualityMultiplier: 1.03,
        saturationImpact: 1.1,
      },
      {
        productSku: "kitchen_renovation_job_unit",
        baseDemandPerYear: 9200,
        basePrice: 22000,
        seasonalityCurve: [0.78, 0.84, 0.95, 1.05, 1.18, 1.25, 1.22, 1.12, 1, 0.9, 0.84, 0.78],
        qualityMultiplier: 1.12,
        saturationImpact: 1.18,
      },
      {
        productSku: "bathroom_renovation_job_unit",
        baseDemandPerYear: 10500,
        basePrice: 18000,
        seasonalityCurve: [0.82, 0.88, 0.98, 1.06, 1.16, 1.22, 1.2, 1.1, 1, 0.9, 0.85, 0.82],
        qualityMultiplier: 1.1,
        saturationImpact: 1.15,
      },
      {
        productSku: "whole_home_renovation_job_unit",
        baseDemandPerYear: 1400,
        basePrice: 180000,
        seasonalityCurve: [0.75, 0.82, 0.92, 1.05, 1.15, 1.2, 1.18, 1.08, 0.98, 0.9, 0.82, 0.76],
        qualityMultiplier: 1.18,
        saturationImpact: 1.12,
      },
      {
        productSku: "tenant_turnover_renovation_contract_unit",
        baseDemandPerYear: 15000,
        basePrice: 18000,
        seasonalityCurve: [1.05, 1.03, 1, 0.98, 0.96, 0.95, 0.95, 0.98, 1, 1.02, 1.04, 1.05],
        qualityMultiplier: 1.08,
        saturationImpact: 1.1,
      },
      {
        productSku: "insurance_restoration_job_unit",
        baseDemandPerYear: 5200,
        basePrice: 42000,
        seasonalityCurve: [1.18, 1.12, 1.05, 0.98, 0.94, 0.92, 0.92, 0.96, 1.02, 1.08, 1.14, 1.18],
        qualityMultiplier: 1.05,
        saturationImpact: 1.08,
      },
    ],
  },
  startingLoadout: {
    startingCash: 120000,
    assets: [
      { assetId: "lead_pool_count", count: 18 },
      { assetId: "quotes_sent_count", count: 0 },
      { assetId: "quotes_capacity_per_tick", count: 3 },
      { assetId: "close_rate_base", count: 0.28 },
      { assetId: "avg_quote_cycle_ticks", count: 2 },
      { assetId: "client_happiness_score", count: 0.5 },
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "pricing_power_score", count: 0.45 },
      { assetId: "contract_discipline_score", count: 0.35 },
      { assetId: "design_freeze_compliance", count: 0.25 },
      { assetId: "scope_creep_rate", count: 0.25 },
      { assetId: "change_order_acceptance_rate", count: 0.45 },
      { assetId: "change_order_backlog_value_eur", count: 0 },
      { assetId: "labor_hours_capacity_per_tick", count: 140 },
      { assetId: "utilization_target", count: 0.7 },
      { assetId: "utilization_actual", count: 0.5 },
      { assetId: "active_projects_count", count: 1 },
      { assetId: "project_queue_count", count: 3 },
      { assetId: "schedule_slip_score", count: 0.22 },
      { assetId: "hidden_defect_probability", count: 0.16 },
      { assetId: "defect_detection_score", count: 0.25 },
      { assetId: "rework_backlog_hours", count: 0 },
      { assetId: "rework_cost_eur", count: 0 },
      { assetId: "mold_rot_claim_probability", count: 0.006 },
      { assetId: "materials_inventory_value_eur", count: 14000 },
      { assetId: "materials_fill_rate", count: 0.72 },
      { assetId: "supplier_lead_time_ticks_min", count: 1 },
      { assetId: "supplier_lead_time_ticks_max", count: 4 },
      { assetId: "subcontractor_dependency_score", count: 0.55 },
      { assetId: "subcontractor_delay_probability", count: 0.18 },
      { assetId: "subcontractor_cost_pct", count: 0.22 },
      { assetId: "accounts_receivable_eur", count: 18000 },
      { assetId: "payment_delay_ticks_min", count: 1 },
      { assetId: "payment_delay_ticks_max", count: 4 },
      { assetId: "deposit_pct", count: 0.2 },
      { assetId: "retention_pct", count: 0.05 },
      { assetId: "retention_held_eur", count: 0 },
      { assetId: "warranty_reserve_eur", count: 3000 },
      { assetId: "documentation_process_enabled", count: 0 },
    ],
    staff: [
      { roleId: "crew_fte", fte: 4 },
      { roleId: "site_managers_fte", fte: 0 },
      { roleId: "project_managers_fte", fte: 0 },
    ],
    unlockedProducts: ["small_repair_punchlist_job_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.18,
      Expansionist: 0.2,
      CostCutter: 0.18,
      ContractSpecialist: 0.2,
      VerticalIntegrator: 0.18,
      OrganicPurist: 0.06,
    },
    minCashReserve: 70000,
    maxDebtRatio: 0.5,
    targetUtilization: 0.75,
  },
  products: renovationProducts,
  unlocks: renovationUnlocks,
  upgrades: renovationUpgrades,
};
