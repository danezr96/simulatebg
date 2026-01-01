import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { FoodProcessingProductSku } from "./foodProcessing.products";
import { foodProcessingProducts } from "./foodProcessing.products";
import { foodProcessingUnlocks } from "./foodProcessing.unlocks";
import { foodProcessingUpgrades } from "./foodProcessing.upgrades";

type NicheMarketProductConfig = {
  productSku: FoodProcessingProductSku;
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
  unlockedProducts: FoodProcessingProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type FoodProcessingNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof foodProcessingProducts;
  unlocks: typeof foodProcessingUnlocks;
  upgrades: typeof foodProcessingUpgrades;
};

export const FoodProcessingNicheConfig: FoodProcessingNicheConfig = {
  id: "foodProcessing",
  sectorId: "AGRI",
  name: "Food Processing",
  description: "Input-driven conversion with tight margins and high scaling.",
  market: {
    products: [
      {
        productSku: "flour_kg",
        baseDemandPerYear: 40000000,
        basePrice: 0.45,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.99, 1],
        qualityMultiplier: 1.02,
        saturationImpact: 1.2,
      },
      {
        productSku: "packaged_bread_unit",
        baseDemandPerYear: 35000000,
        basePrice: 2,
        seasonalityCurve: [0.97, 0.98, 0.99, 1, 1.02, 1.03, 1.02, 1.01, 1, 0.99, 0.98, 0.99],
        qualityMultiplier: 1.08,
        saturationImpact: 1.15,
      },
      {
        productSku: "ready_meal_unit",
        baseDemandPerYear: 20000000,
        basePrice: 5,
        seasonalityCurve: [0.96, 0.97, 0.98, 1, 1.02, 1.03, 1.03, 1.02, 1.01, 1, 0.98, 0.97],
        qualityMultiplier: 1.12,
        saturationImpact: 1.1,
      },
      {
        productSku: "animal_feed_mix_ton",
        baseDemandPerYear: 25000000,
        basePrice: 300,
        seasonalityCurve: [0.99, 0.99, 1, 1, 1.01, 1.01, 1.01, 1, 1, 0.99, 0.99, 1],
        qualityMultiplier: 1.01,
        saturationImpact: 1.08,
      },
      {
        productSku: "frozen_vegetables_kg",
        baseDemandPerYear: 18000000,
        basePrice: 2.4,
        seasonalityCurve: [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.06,
        saturationImpact: 1.12,
      },
      {
        productSku: "private_label_batch",
        baseDemandPerYear: 1200000,
        basePrice: 20000,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.15,
        saturationImpact: 1.05,
      },
    ],
  },
  startingLoadout: {
    startingCash: 400000,
    assets: [
      { assetId: "processing_m2", count: 800 },
      { assetId: "dry_storage_kg", count: 2000 },
      { assetId: "packaging_capacity_units", count: 2000 },
      { assetId: "energy_capacity_kwh", count: 4000 },
      { assetId: "milling_line", count: 1 },
    ],
    staff: [
      { roleId: "processing_operator", fte: 2 },
      { roleId: "maintenance_technician", fte: 0.5 },
      { roleId: "logistics_staff", fte: 0.5 },
    ],
    unlockedProducts: ["flour_kg"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.15,
      Expansionist: 0.2,
      CostCutter: 0.25,
      ContractSpecialist: 0.2,
      VerticalIntegrator: 0.15,
      OrganicPurist: 0.05,
    },
    minCashReserve: 150000,
    maxDebtRatio: 0.55,
    targetUtilization: 0.78,
  },
  products: foodProcessingProducts,
  unlocks: foodProcessingUnlocks,
  upgrades: foodProcessingUpgrades,
};
