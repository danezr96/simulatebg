import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { DairyProductSku } from "./dairy.products";
import { dairyProducts } from "./dairy.products";
import { dairyUnlocks } from "./dairy.unlocks";
import { dairyUpgrades } from "./dairy.upgrades";

type NicheMarketProductConfig = {
  productSku: DairyProductSku;
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
  unlockedProducts: DairyProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type DairyNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof dairyProducts;
  unlocks: typeof dairyUnlocks;
  upgrades: typeof dairyUpgrades;
};

export const DairyNicheConfig: DairyNicheConfig = {
  id: "dairy",
  sectorId: "AGRI",
  name: "Dairy",
  description: "Continuous milk production with health constraints and thin margins.",
  market: {
    products: [
      {
        productSku: "raw_milk_bulk_liter",
        baseDemandPerYear: 80000000,
        basePrice: 0.45,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.99, 1],
        qualityMultiplier: 1.02,
        saturationImpact: 1.2,
      },
      {
        productSku: "premium_milk_liter",
        baseDemandPerYear: 14000000,
        basePrice: 0.7,
        seasonalityCurve: [0.99, 1, 1.01, 1.02, 1.03, 1.03, 1.02, 1.01, 1, 0.99, 0.99, 1],
        qualityMultiplier: 1.08,
        saturationImpact: 1.15,
      },
      {
        productSku: "cheese_kg",
        baseDemandPerYear: 40000000,
        basePrice: 12,
        seasonalityCurve: [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.12,
        saturationImpact: 1.1,
      },
      {
        productSku: "yogurt_kg",
        baseDemandPerYear: 25000000,
        basePrice: 2.8,
        seasonalityCurve: [0.98, 0.99, 1, 1.01, 1.02, 1.03, 1.02, 1.01, 1, 0.99, 0.98, 0.99],
        qualityMultiplier: 1.06,
        saturationImpact: 1.08,
      },
      {
        productSku: "butter_kg",
        baseDemandPerYear: 15000000,
        basePrice: 8,
        seasonalityCurve: [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.1,
        saturationImpact: 1.1,
      },
      {
        productSku: "whey_liter",
        baseDemandPerYear: 15000000,
        basePrice: 0.1,
        seasonalityCurve: [0.99, 0.99, 1, 1, 1.01, 1.01, 1.01, 1, 1, 0.99, 0.99, 1],
        qualityMultiplier: 1.02,
        saturationImpact: 1.3,
      },
    ],
  },
  startingLoadout: {
    startingCash: 300000,
    assets: [
      { assetId: "cows_total", count: 300 },
      { assetId: "cows_lactating", count: 250 },
      { assetId: "cows_dry", count: 50 },
      { assetId: "barn_m2", count: 1600 },
      { assetId: "milking_robots", count: 1 },
      { assetId: "cooling_tank_liters", count: 6000 },
      { assetId: "feed_storage_ton", count: 20 },
    ],
    staff: [
      { roleId: "livestock_caretaker", fte: 2 },
      { roleId: "milking_operator", fte: 1 },
      { roleId: "processing_operator", fte: 0 },
      { roleId: "quality_compliance", fte: 0 },
      { roleId: "logistics_staff", fte: 1 },
    ],
    unlockedProducts: ["raw_milk_bulk_liter"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.1,
      Expansionist: 0.15,
      CostCutter: 0.25,
      ContractSpecialist: 0.2,
      VerticalIntegrator: 0.2,
      OrganicPurist: 0.1,
    },
    minCashReserve: 120000,
    maxDebtRatio: 0.45,
    targetUtilization: 0.8,
  },
  products: dairyProducts,
  unlocks: dairyUnlocks,
  upgrades: dairyUpgrades,
};
