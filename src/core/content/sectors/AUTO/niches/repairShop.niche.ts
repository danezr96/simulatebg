import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { RepairShopProductSku } from "./repairShop.products";
import { repairShopProducts } from "./repairShop.products";
import { repairShopUnlocks } from "./repairShop.unlocks";
import { repairShopUpgrades } from "./repairShop.upgrades";

type NicheMarketProductConfig = {
  productSku: RepairShopProductSku;
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
  unlockedProducts: RepairShopProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type RepairShopNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof repairShopProducts;
  unlocks: typeof repairShopUnlocks;
  upgrades: typeof repairShopUpgrades;
};

export const RepairShopNicheConfig: RepairShopNicheConfig = {
  id: "repairShop",
  sectorId: "AUTO",
  name: "Repair Shop",
  description: "Service bays with parts supply risk and comeback exposure.",
  market: {
    products: [
      {
        productSku: "inspection_service_unit",
        baseDemandPerYear: 12000000,
        basePrice: 75,
        seasonalityCurve: [0.9, 0.95, 1.1, 1.2, 1.05, 0.95, 0.9, 0.95, 1.05, 1.15, 1.05, 0.95],
        qualityMultiplier: 1.02,
        saturationImpact: 1.1,
      },
      {
        productSku: "oil_service_unit",
        baseDemandPerYear: 9000000,
        basePrice: 140,
        seasonalityCurve: [0.95, 0.98, 1, 1.02, 1.05, 1.08, 1.05, 1.02, 1, 0.98, 0.96, 0.95],
        qualityMultiplier: 1.01,
        saturationImpact: 1.12,
      },
      {
        productSku: "brake_job_unit",
        baseDemandPerYear: 6000000,
        basePrice: 520,
        seasonalityCurve: [0.92, 0.96, 1.05, 1.12, 1.06, 1, 0.95, 0.98, 1.04, 1.08, 1.04, 0.96],
        qualityMultiplier: 1.05,
        saturationImpact: 1.15,
      },
      {
        productSku: "tires_service_unit",
        baseDemandPerYear: 7000000,
        basePrice: 110,
        seasonalityCurve: [1.2, 1.15, 1.05, 0.9, 0.8, 0.7, 0.7, 0.75, 0.95, 1.3, 1.45, 1.35],
        qualityMultiplier: 1.03,
        saturationImpact: 1.18,
      },
      {
        productSku: "diagnostics_advanced_unit",
        baseDemandPerYear: 4000000,
        basePrice: 140,
        seasonalityCurve: [0.95, 0.98, 1.02, 1.08, 1.05, 0.98, 0.96, 0.98, 1.02, 1.05, 1.02, 0.98],
        qualityMultiplier: 1.06,
        saturationImpact: 1.08,
      },
      {
        productSku: "ev_repair_job_unit",
        baseDemandPerYear: 1200000,
        basePrice: 750,
        seasonalityCurve: [0.85, 0.9, 0.95, 1, 1.08, 1.15, 1.2, 1.15, 1.05, 0.98, 0.92, 0.88],
        qualityMultiplier: 1.08,
        saturationImpact: 1.2,
      },
    ],
  },
  startingLoadout: {
    startingCash: 140000,
    assets: [
      { assetId: "service_bays", count: 2 },
      { assetId: "lifts", count: 2 },
      { assetId: "diagnostic_tools_level", count: 1 },
      { assetId: "ev_tools_enabled", count: 0 },
      { assetId: "shop_software_enabled", count: 0 },
      { assetId: "labor_hours_capacity_per_tick", count: 60 },
      { assetId: "queue_jobs_count", count: 6 },
      { assetId: "average_wait_ticks", count: 2 },
      { assetId: "max_queue_before_churn", count: 18 },
      { assetId: "customer_satisfaction_score", count: 0.55 },
      { assetId: "parts_inventory_value_eur", count: 20000 },
      { assetId: "parts_fill_rate", count: 0.75 },
      { assetId: "supplier_lead_time_ticks_min", count: 1 },
      { assetId: "supplier_lead_time_ticks_max", count: 3 },
      { assetId: "parts_price_index", count: 1 },
      { assetId: "parts_stockouts_count", count: 0 },
      { assetId: "comeback_rate", count: 0.05 },
      { assetId: "warranty_reserve_eur", count: 5000 },
      { assetId: "comeback_queue_jobs_count", count: 0 },
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
    ],
    staff: [
      { roleId: "technician", fte: 2 },
      { roleId: "master_tech", fte: 0 },
      { roleId: "service_advisor", fte: 1 },
    ],
    unlockedProducts: ["inspection_service_unit", "oil_service_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.3,
      Expansionist: 0.2,
      CostCutter: 0.2,
      ContractSpecialist: 0.1,
      VerticalIntegrator: 0.1,
      OrganicPurist: 0.1,
    },
    minCashReserve: 45000,
    maxDebtRatio: 0.5,
    targetUtilization: 0.78,
  },
  products: repairShopProducts,
  unlocks: repairShopUnlocks,
  upgrades: repairShopUpgrades,
};
