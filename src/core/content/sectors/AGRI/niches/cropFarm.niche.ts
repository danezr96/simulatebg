import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { NicheValidationIssue } from "../../../catalog.validation";
import { validateNicheContent } from "../../../catalog.validation";
import { nicheProducts } from "./cropFarm.products";
import { nicheUnlocks } from "./cropFarm.unlocks";
import { nicheUpgrades } from "./cropFarm.upgrades";

export type NicheMarketProductConfig = {
  productSku: string;
  baseDemandPerYear: number;
  basePrice: number;
  seasonalityCurve: number[];
  qualityMultiplier: number;
  saturationImpact: number;
};

export type NicheMarketConfig = {
  products: NicheMarketProductConfig[];
};

export type NicheStartingLoadout = {
  startingCash: number;
  assets: { assetId: string; count: number }[];
  staff: { roleId: string; fte: number }[];
  unlockedProducts: string[];
};

export type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

export type NicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof nicheProducts;
  unlocks: typeof nicheUnlocks;
  upgrades: typeof nicheUpgrades;
};

export const nicheConfig: NicheConfig = {
  id: "cropFarm",
  sectorId: "AGRI",
  name: "Crop Farm",
  description: "Field and greenhouse crops with seasonal yield swings.",
  market: {
    products: [
      {
        productSku: "agri.crop.wheat",
        baseDemandPerYear: 14000,
        basePrice: 240,
        seasonalityCurve: [0.9, 0.95, 1, 1.05, 1.1, 1.05, 1, 0.95, 0.9, 0.95, 1, 1.05],
        qualityMultiplier: 1.05,
        saturationImpact: 1.1,
      },
      {
        productSku: "agri.crop.corn",
        baseDemandPerYear: 12000,
        basePrice: 220,
        seasonalityCurve: [0.9, 0.95, 1.05, 1.1, 1.15, 1.1, 1, 0.95, 0.9, 0.95, 1, 1.05],
        qualityMultiplier: 1.04,
        saturationImpact: 1.1,
      },
      {
        productSku: "agri.crop.potato",
        baseDemandPerYear: 9000,
        basePrice: 300,
        seasonalityCurve: [1.1, 1.05, 1, 0.95, 0.9, 0.95, 1, 1.05, 1.1, 1.05, 1, 0.95],
        qualityMultiplier: 1.06,
        saturationImpact: 1.12,
      },
      {
        productSku: "agri.crop.soy",
        baseDemandPerYear: 7000,
        basePrice: 320,
        seasonalityCurve: [0.95, 1, 1.05, 1.1, 1.1, 1.05, 1, 0.95, 0.9, 0.95, 1, 1.05],
        qualityMultiplier: 1.05,
        saturationImpact: 1.08,
      },
      {
        productSku: "agri.crop.tomato",
        baseDemandPerYear: 5000,
        basePrice: 1.9,
        seasonalityCurve: [1.1, 1.05, 1, 0.95, 0.9, 0.95, 1, 1.05, 1.1, 1.1, 1.05, 1],
        qualityMultiplier: 1.15,
        saturationImpact: 1.2,
      },
      {
        productSku: "agri.crop.apple",
        baseDemandPerYear: 6000,
        basePrice: 1.4,
        seasonalityCurve: [0.95, 0.95, 1, 1.05, 1.1, 1.1, 1.05, 1, 0.95, 0.9, 0.95, 1],
        qualityMultiplier: 1.12,
        saturationImpact: 1.15,
      },
    ],
  },
  startingLoadout: {
    startingCash: 120000,
    assets: [
      { assetId: "land_ha", count: 20 },
      { assetId: "tractor", count: 1 },
      { assetId: "harvester", count: 1 },
      { assetId: "cold_storage_tons", count: 10 },
    ],
    staff: [
      { roleId: "farm_manager", fte: 1 },
      { roleId: "field_worker", fte: 4 },
      { roleId: "machine_operator", fte: 1 },
    ],
    unlockedProducts: ["agri.crop.wheat", "agri.crop.potato"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.2,
      Expansionist: 0.2,
      CostCutter: 0.2,
      ContractSpecialist: 0.15,
      VerticalIntegrator: 0.15,
      OrganicPurist: 0.1,
    },
    minCashReserve: 50000,
    maxDebtRatio: 0.5,
    targetUtilization: 0.75,
  },
  products: nicheProducts,
  unlocks: nicheUnlocks,
  upgrades: nicheUpgrades,
};

export function validateCropFarmNiche(): NicheValidationIssue[] {
  const allowedUnits = ["ton", "kg"];
  const startingAssets = nicheConfig.startingLoadout.assets.map((asset) => asset.assetId);
  const startingRoles = nicheConfig.startingLoadout.staff.map((staff) => staff.roleId);

  return validateNicheContent({
    nicheId: nicheConfig.id,
    products: nicheProducts,
    unlocks: nicheUnlocks,
    upgrades: nicheUpgrades,
    allowedUnits,
    allowedAssetIds: startingAssets,
    allowedRoleIds: startingRoles,
  });
}

export function testCropFarmNiche(): boolean {
  return (
    nicheConfig.products.length === 6 &&
    nicheConfig.unlocks.length === 6 &&
    nicheConfig.market.products.length === 6 &&
    validateCropFarmNiche().length === 0
  );
}
