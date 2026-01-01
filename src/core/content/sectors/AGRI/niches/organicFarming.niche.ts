import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { OrganicFarmingProductSku } from "./organicFarming.products";
import { organicFarmingProducts } from "./organicFarming.products";
import { organicFarmingUnlocks } from "./organicFarming.unlocks";
import { organicFarmingUpgrades } from "./organicFarming.upgrades";

type NicheMarketProductConfig = {
  productSku: OrganicFarmingProductSku;
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
  unlockedProducts: OrganicFarmingProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type OrganicFarmingNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof organicFarmingProducts;
  unlocks: typeof organicFarmingUnlocks;
  upgrades: typeof organicFarmingUpgrades;
};

export const OrganicFarmingNicheConfig: OrganicFarmingNicheConfig = {
  id: "organicFarming",
  sectorId: "AGRI",
  name: "Organic Farming",
  description: "Certification-driven farming with premium channels and audit risk.",
  market: {
    products: [
      {
        productSku: "organic_grain_ton",
        baseDemandPerYear: 3500000,
        basePrice: 420,
        seasonalityCurve: [0.9, 0.9, 0.92, 0.96, 1, 1.05, 1.1, 1.08, 1.02, 0.98, 0.94, 0.92],
        qualityMultiplier: 1.08,
        saturationImpact: 1.15,
      },
      {
        productSku: "organic_vegetables_kg",
        baseDemandPerYear: 4000000,
        basePrice: 3.2,
        seasonalityCurve: [0.85, 0.88, 0.92, 0.98, 1.05, 1.1, 1.08, 1.03, 0.98, 0.94, 0.9, 0.88],
        qualityMultiplier: 1.18,
        saturationImpact: 1.2,
      },
      {
        productSku: "organic_milk_liter",
        baseDemandPerYear: 1200000,
        basePrice: 1.1,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.99, 1],
        qualityMultiplier: 1.12,
        saturationImpact: 1.1,
      },
      {
        productSku: "csa_box_unit",
        baseDemandPerYear: 12000000,
        basePrice: 25,
        seasonalityCurve: [0.9, 0.92, 0.95, 1, 1.05, 1.08, 1.08, 1.04, 1, 0.96, 0.92, 0.9],
        qualityMultiplier: 1.2,
        saturationImpact: 1.05,
      },
      {
        productSku: "farmers_market_slot_day",
        baseDemandPerYear: 1000000,
        basePrice: 900,
        seasonalityCurve: [0.85, 0.88, 0.92, 0.98, 1.05, 1.1, 1.12, 1.08, 1.02, 0.96, 0.9, 0.88],
        qualityMultiplier: 1.25,
        saturationImpact: 1.12,
      },
      {
        productSku: "premium_organic_contract_batch",
        baseDemandPerYear: 500000,
        basePrice: 30000,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98, 0.99],
        qualityMultiplier: 1.22,
        saturationImpact: 1.08,
      },
    ],
  },
  startingLoadout: {
    startingCash: 280000,
    assets: [
      { assetId: "organic_arable_m2", count: 220000 },
      { assetId: "tractor", count: 1 },
      { assetId: "seeder", count: 1 },
      { assetId: "storage_ton", count: 80 },
      { assetId: "compost_capacity_ton", count: 0 },
      { assetId: "soil_health_score", count: 0.45 },
      { assetId: "rotation_compliance_score", count: 0.35 },
      { assetId: "organic_certified", count: 0 },
      { assetId: "audit_readiness_score", count: 0.35 },
      { assetId: "brand_reputation_score", count: 0.4 },
      { assetId: "synthetic_input_used_last_ticks", count: 0 },
    ],
    staff: [
      { roleId: "farm_worker", fte: 2 },
      { roleId: "logistics_staff", fte: 1 },
      { roleId: "farm_manager", fte: 0 },
      { roleId: "quality_compliance", fte: 0 },
      { roleId: "sales_staff", fte: 0 },
    ],
    unlockedProducts: ["organic_grain_ton"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.1,
      Expansionist: 0.1,
      CostCutter: 0.1,
      ContractSpecialist: 0.2,
      VerticalIntegrator: 0.1,
      OrganicPurist: 0.4,
    },
    minCashReserve: 120000,
    maxDebtRatio: 0.4,
    targetUtilization: 0.7,
  },
  products: organicFarmingProducts,
  unlocks: organicFarmingUnlocks,
  upgrades: organicFarmingUpgrades,
};
