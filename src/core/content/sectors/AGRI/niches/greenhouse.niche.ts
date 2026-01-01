import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { GreenhouseProductSku } from "./greenhouse.products";
import { greenhouseProducts } from "./greenhouse.products";
import { greenhouseUnlocks } from "./greenhouse.unlocks";
import { greenhouseUpgrades } from "./greenhouse.upgrades";

type NicheMarketProductConfig = {
  productSku: GreenhouseProductSku;
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
  unlockedProducts: GreenhouseProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type GreenhouseNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof greenhouseProducts;
  unlocks: typeof greenhouseUnlocks;
  upgrades: typeof greenhouseUpgrades;
};

export const GreenhouseNicheConfig: GreenhouseNicheConfig = {
  id: "greenhouse",
  sectorId: "AGRI",
  name: "Greenhouse",
  description: "Energy-sensitive controlled agriculture with fast cycles.",
  market: {
    products: [
      {
        productSku: "tomatoes_kg",
        baseDemandPerYear: 7000000,
        basePrice: 2.1,
        seasonalityCurve: [0.95, 0.96, 0.98, 1, 1.02, 1.05, 1.05, 1.03, 1, 0.98, 0.96, 0.95],
        qualityMultiplier: 1.08,
        saturationImpact: 1.2,
      },
      {
        productSku: "cucumbers_kg",
        baseDemandPerYear: 4500000,
        basePrice: 1.3,
        seasonalityCurve: [0.94, 0.95, 0.97, 1, 1.03, 1.06, 1.05, 1.02, 0.99, 0.97, 0.95, 0.94],
        qualityMultiplier: 1.05,
        saturationImpact: 1.25,
      },
      {
        productSku: "bell_peppers_kg",
        baseDemandPerYear: 3000000,
        basePrice: 3.1,
        seasonalityCurve: [0.96, 0.97, 0.98, 1, 1.02, 1.04, 1.04, 1.02, 1, 0.98, 0.97, 0.96],
        qualityMultiplier: 1.12,
        saturationImpact: 1.18,
      },
      {
        productSku: "herbs_pack",
        baseDemandPerYear: 6000000,
        basePrice: 1.4,
        seasonalityCurve: [0.98, 0.99, 1, 1.02, 1.04, 1.05, 1.05, 1.04, 1.02, 1, 0.99, 0.98],
        qualityMultiplier: 1.15,
        saturationImpact: 1.1,
      },
      {
        productSku: "strawberries_kg",
        baseDemandPerYear: 1200000,
        basePrice: 4.5,
        seasonalityCurve: [0.92, 0.94, 0.96, 1, 1.06, 1.1, 1.08, 1.02, 0.98, 0.95, 0.93, 0.92],
        qualityMultiplier: 1.2,
        saturationImpact: 1.22,
      },
      {
        productSku: "microgreens_kg",
        baseDemandPerYear: 400000,
        basePrice: 18,
        seasonalityCurve: [1, 1, 1.01, 1.02, 1.03, 1.03, 1.02, 1.02, 1.01, 1, 1, 1],
        qualityMultiplier: 1.3,
        saturationImpact: 1.08,
      },
    ],
  },
  startingLoadout: {
    startingCash: 350000,
    assets: [
      { assetId: "greenhouse_m2", count: 3000 },
      { assetId: "climate_control_level", count: 0.35 },
      { assetId: "irrigation_capacity_lph", count: 3000 },
      { assetId: "cold_storage_kg", count: 500 },
    ],
    staff: [
      { roleId: "grower", fte: 1 },
      { roleId: "picking_staff", fte: 2 },
      { roleId: "logistics_staff", fte: 1 },
    ],
    unlockedProducts: ["tomatoes_kg"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.2,
      Expansionist: 0.15,
      CostCutter: 0.2,
      ContractSpecialist: 0.1,
      VerticalIntegrator: 0.1,
      OrganicPurist: 0.25,
    },
    minCashReserve: 130000,
    maxDebtRatio: 0.5,
    targetUtilization: 0.8,
  },
  products: greenhouseProducts,
  unlocks: greenhouseUnlocks,
  upgrades: greenhouseUpgrades,
};
