import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { PlumbingProductSku } from "./plumbing.products";
import { plumbingProducts } from "./plumbing.products";
import { plumbingUnlocks } from "./plumbing.unlocks";
import { plumbingUpgrades } from "./plumbing.upgrades";

type NicheMarketProductConfig = {
  productSku: PlumbingProductSku;
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
  unlockedProducts: PlumbingProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type PlumbingNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof plumbingProducts;
  unlocks: typeof plumbingUnlocks;
  upgrades: typeof plumbingUpgrades;
};

export const PlumbingNicheConfig: PlumbingNicheConfig = {
  id: "plumbing",
  sectorId: "BUILD",
  name: "Plumbing",
  description:
    "High-volume service plumbing driven by scheduling, parts flow, and callback risk.",
  market: {
    products: [
      {
        productSku: "residential_repair_visit_job_unit",
        baseDemandPerYear: 52000,
        basePrice: 320,
        seasonalityCurve: [0.95, 0.97, 0.98, 1, 1.03, 1.05, 1.04, 1.02, 1, 0.98, 0.96, 0.95],
        qualityMultiplier: 1.05,
        saturationImpact: 1.1,
      },
      {
        productSku: "bathroom_installation_job_unit",
        baseDemandPerYear: 8400,
        basePrice: 7800,
        seasonalityCurve: [0.8, 0.86, 0.95, 1.05, 1.15, 1.22, 1.2, 1.1, 0.98, 0.9, 0.85, 0.8],
        qualityMultiplier: 1.12,
        saturationImpact: 1.15,
      },
      {
        productSku: "commercial_fitout_plumbing_job_unit",
        baseDemandPerYear: 2600,
        basePrice: 42000,
        seasonalityCurve: [0.82, 0.88, 0.96, 1.05, 1.12, 1.2, 1.22, 1.15, 1.02, 0.94, 0.88, 0.82],
        qualityMultiplier: 1.1,
        saturationImpact: 1.18,
      },
      {
        productSku: "boiler_heatpump_plumbing_service_job_unit",
        baseDemandPerYear: 14000,
        basePrice: 2400,
        seasonalityCurve: [1.28, 1.2, 1.05, 0.95, 0.9, 0.85, 0.82, 0.85, 0.92, 1.05, 1.18, 1.26],
        qualityMultiplier: 1.08,
        saturationImpact: 1.08,
      },
      {
        productSku: "emergency_leak_callout_job_unit",
        baseDemandPerYear: 36000,
        basePrice: 520,
        seasonalityCurve: [1.4, 1.3, 1.05, 0.9, 0.85, 0.8, 0.78, 0.82, 0.9, 1.05, 1.25, 1.35],
        qualityMultiplier: 1.02,
        saturationImpact: 1.12,
      },
      {
        productSku: "property_maintenance_contract_unit",
        baseDemandPerYear: 12000,
        basePrice: 7500,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98, 0.99],
        qualityMultiplier: 1.15,
        saturationImpact: 1.06,
      },
    ],
  },
  startingLoadout: {
    startingCash: 140000,
    assets: [
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "pricing_power_score", count: 0.45 },
      { assetId: "utilization_target", count: 0.65 },
      { assetId: "utilization_actual", count: 0.45 },
      { assetId: "labor_hours_capacity_per_tick", count: 70 },
      { assetId: "job_queue_count", count: 6 },
      { assetId: "average_wait_ticks", count: 2 },
      { assetId: "overtime_enabled", count: 0 },
      { assetId: "on_call_enabled", count: 0 },
      { assetId: "parts_inventory_value_eur", count: 10000 },
      { assetId: "parts_fill_rate", count: 0.7 },
      { assetId: "supplier_lead_time_ticks_min", count: 1 },
      { assetId: "supplier_lead_time_ticks_max", count: 3 },
      { assetId: "parts_waste_pct", count: 0.04 },
      { assetId: "critical_parts_stockouts_count", count: 0 },
      { assetId: "callback_rate", count: 0.1 },
      { assetId: "callbacks_queue_count", count: 0 },
      { assetId: "inspection_required_rate", count: 0.25 },
      { assetId: "inspection_fail_probability", count: 0.1 },
      { assetId: "warranty_reserve_eur", count: 2500 },
      { assetId: "water_damage_claim_probability", count: 0.006 },
      { assetId: "accounts_receivable_eur", count: 15000 },
      { assetId: "payment_delay_ticks_min", count: 1 },
      { assetId: "payment_delay_ticks_max", count: 4 },
      { assetId: "retention_held_eur", count: 0 },
    ],
    staff: [
      { roleId: "plumbers_fte", fte: 2 },
      { roleId: "master_plumber_fte", fte: 0 },
      { roleId: "apprentices_fte", fte: 1 },
      { roleId: "dispatcher_fte", fte: 0 },
    ],
    unlockedProducts: ["residential_repair_visit_job_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.18,
      Expansionist: 0.18,
      CostCutter: 0.18,
      ContractSpecialist: 0.22,
      VerticalIntegrator: 0.16,
      OrganicPurist: 0.08,
    },
    minCashReserve: 60000,
    maxDebtRatio: 0.45,
    targetUtilization: 0.72,
  },
  products: plumbingProducts,
  unlocks: plumbingUnlocks,
  upgrades: plumbingUpgrades,
};
