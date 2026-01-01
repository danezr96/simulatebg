import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { ElectricalProductSku } from "./electrical.products";
import { electricalProducts } from "./electrical.products";
import { electricalUnlocks } from "./electrical.unlocks";
import { electricalUpgrades } from "./electrical.upgrades";

type NicheMarketProductConfig = {
  productSku: ElectricalProductSku;
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
  unlockedProducts: ElectricalProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type ElectricalNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof electricalProducts;
  unlocks: typeof electricalUnlocks;
  upgrades: typeof electricalUpgrades;
};

export const ElectricalNicheConfig: ElectricalNicheConfig = {
  id: "electrical",
  sectorId: "BUILD",
  name: "Electrical",
  description: "Electrical services driven by scheduling, inspections, and certification.",
  market: {
    products: [
      {
        productSku: "residential_wiring_job_unit",
        baseDemandPerYear: 42000,
        basePrice: 1400,
        seasonalityCurve: [0.9, 0.92, 0.95, 1, 1.05, 1.1, 1.08, 1.02, 0.98, 0.96, 0.93, 0.9],
        qualityMultiplier: 1.05,
        saturationImpact: 1.12,
      },
      {
        productSku: "commercial_fitout_electrical_job_unit",
        baseDemandPerYear: 3200,
        basePrice: 52000,
        seasonalityCurve: [0.85, 0.88, 0.95, 1, 1.08, 1.15, 1.18, 1.12, 1.02, 0.95, 0.9, 0.85],
        qualityMultiplier: 1.12,
        saturationImpact: 1.18,
      },
      {
        productSku: "industrial_panel_upgrade_job_unit",
        baseDemandPerYear: 2200,
        basePrice: 48000,
        seasonalityCurve: [0.86, 0.9, 0.96, 1, 1.06, 1.12, 1.15, 1.1, 1.02, 0.96, 0.9, 0.86],
        qualityMultiplier: 1.1,
        saturationImpact: 1.15,
      },
      {
        productSku: "solar_inverter_install_job_unit",
        baseDemandPerYear: 9000,
        basePrice: 8500,
        seasonalityCurve: [0.8, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.1, 1, 0.9, 0.85, 0.8],
        qualityMultiplier: 1.08,
        saturationImpact: 1.1,
      },
      {
        productSku: "emergency_callout_job_unit",
        baseDemandPerYear: 38000,
        basePrice: 420,
        seasonalityCurve: [1.35, 1.25, 1.05, 0.9, 0.85, 0.8, 0.78, 0.82, 0.9, 1.05, 1.2, 1.3],
        qualityMultiplier: 1.02,
        saturationImpact: 1.08,
      },
      {
        productSku: "annual_maintenance_contract_unit",
        baseDemandPerYear: 14000,
        basePrice: 1800,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98, 0.99],
        qualityMultiplier: 1.06,
        saturationImpact: 1.05,
      },
    ],
  },
  startingLoadout: {
    startingCash: 180000,
    assets: [
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "utilization_target", count: 0.65 },
      { assetId: "utilization_actual", count: 0.45 },
      { assetId: "labor_hours_capacity_per_tick", count: 70 },
      { assetId: "job_queue_count", count: 5 },
      { assetId: "average_wait_ticks", count: 2 },
      { assetId: "overtime_enabled", count: 0 },
      { assetId: "materials_inventory_value_eur", count: 12000 },
      { assetId: "materials_fill_rate", count: 0.75 },
      { assetId: "supplier_lead_time_ticks_min", count: 1 },
      { assetId: "supplier_lead_time_ticks_max", count: 3 },
      { assetId: "copper_price_index", count: 1 },
      { assetId: "materials_waste_pct", count: 0.04 },
      { assetId: "certification_level", count: 0 },
      { assetId: "inspection_pass_rate", count: 0.86 },
      { assetId: "callback_rate", count: 0.06 },
      { assetId: "callbacks_queue_count", count: 0 },
      { assetId: "warranty_reserve_eur", count: 5000 },
      { assetId: "accounts_receivable_eur", count: 12000 },
      { assetId: "payment_delay_ticks_min", count: 1 },
      { assetId: "payment_delay_ticks_max", count: 4 },
      { assetId: "retention_held_eur", count: 0 },
    ],
    staff: [
      { roleId: "electricians_fte", fte: 2 },
      { roleId: "master_electrician_fte", fte: 0 },
      { roleId: "apprentices_fte", fte: 0 },
      { roleId: "scheduler_fte", fte: 0 },
    ],
    unlockedProducts: ["residential_wiring_job_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.2,
      Expansionist: 0.2,
      CostCutter: 0.2,
      ContractSpecialist: 0.2,
      VerticalIntegrator: 0.15,
      OrganicPurist: 0.05,
    },
    minCashReserve: 90000,
    maxDebtRatio: 0.5,
    targetUtilization: 0.72,
  },
  products: electricalProducts,
  unlocks: electricalUnlocks,
  upgrades: electricalUpgrades,
};
