import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { LivestockProductSku } from "./livestock.products";
import { livestockProducts } from "./livestock.products";
import { livestockUnlocks } from "./livestock.unlocks";
import { livestockUpgrades } from "./livestock.upgrades";

type NicheMarketProductConfig = {
  productSku: LivestockProductSku;
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
  unlockedProducts: LivestockProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type LivestockNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof livestockProducts;
  unlocks: typeof livestockUnlocks;
  upgrades: typeof livestockUpgrades;
};

export const LivestockNicheConfig: LivestockNicheConfig = {
  id: "livestock",
  sectorId: "AGRI",
  name: "Livestock",
  description: "Feed-driven operations with health, welfare, and compliance pressure.",
  market: {
    products: [
      {
        productSku: "poultry_meat_kg",
        baseDemandPerYear: 15000000,
        basePrice: 3,
        seasonalityCurve: [0.98, 0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.04,
        saturationImpact: 1.15,
      },
      {
        productSku: "eggs_dozen",
        baseDemandPerYear: 7000000,
        basePrice: 2.1,
        seasonalityCurve: [0.99, 1, 1.01, 1.02, 1.03, 1.02, 1.01, 1, 0.99, 0.98, 0.98, 0.99],
        qualityMultiplier: 1.08,
        saturationImpact: 1.1,
      },
      {
        productSku: "pork_kg",
        baseDemandPerYear: 20000000,
        basePrice: 2.6,
        seasonalityCurve: [0.97, 0.98, 0.99, 1, 1.01, 1.02, 1.02, 1.01, 1, 0.99, 0.98, 0.98],
        qualityMultiplier: 1.03,
        saturationImpact: 1.12,
      },
      {
        productSku: "beef_kg",
        baseDemandPerYear: 8000000,
        basePrice: 5.5,
        seasonalityCurve: [0.96, 0.97, 0.98, 1, 1.02, 1.03, 1.03, 1.02, 1, 0.99, 0.97, 0.96],
        qualityMultiplier: 1.12,
        saturationImpact: 1.08,
      },
      {
        productSku: "hides_leather_kg",
        baseDemandPerYear: 1200000,
        basePrice: 1.4,
        seasonalityCurve: [0.98, 0.98, 0.99, 1, 1.01, 1.01, 1.01, 1, 0.99, 0.98, 0.98, 0.98],
        qualityMultiplier: 1.05,
        saturationImpact: 1.2,
      },
      {
        productSku: "byproducts_rendered_kg",
        baseDemandPerYear: 5000000,
        basePrice: 0.6,
        seasonalityCurve: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        qualityMultiplier: 1.02,
        saturationImpact: 1.3,
      },
    ],
  },
  startingLoadout: {
    startingCash: 320000,
    assets: [
      { assetId: "barn_m2", count: 900 },
      { assetId: "pens_capacity_animals", count: 16000 },
      { assetId: "animals_total", count: 14000 },
      { assetId: "animals_market_ready", count: 6000 },
      { assetId: "feed_storage_ton", count: 40 },
      { assetId: "cold_storage_kg", count: 800 },
      { assetId: "manure_capacity_ton", count: 20 },
      { assetId: "feed_truck", count: 1 },
      { assetId: "contract_processing", count: 1 },
      { assetId: "biosecurity_level", count: 0.35 },
      { assetId: "welfare_score", count: 0.55 },
      { assetId: "health_score", count: 0.7 },
    ],
    staff: [
      { roleId: "animal_caretaker", fte: 2 },
      { roleId: "logistics_staff", fte: 1 },
      { roleId: "quality_compliance", fte: 0 },
      { roleId: "feed_manager", fte: 0 },
      { roleId: "vet_health_officer", fte: 0 },
      { roleId: "processing_operator", fte: 0 },
    ],
    unlockedProducts: ["poultry_meat_kg"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.15,
      Expansionist: 0.2,
      CostCutter: 0.25,
      ContractSpecialist: 0.15,
      VerticalIntegrator: 0.15,
      OrganicPurist: 0.1,
    },
    minCashReserve: 140000,
    maxDebtRatio: 0.55,
    targetUtilization: 0.78,
  },
  products: livestockProducts,
  unlocks: livestockUnlocks,
  upgrades: livestockUpgrades,
};
