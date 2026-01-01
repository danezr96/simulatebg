import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { CarDealerProductSku } from "./carDealer.products";
import { carDealerProducts } from "./carDealer.products";
import { carDealerUnlocks } from "./carDealer.unlocks";
import { carDealerUpgrades } from "./carDealer.upgrades";

type NicheMarketProductConfig = {
  productSku: CarDealerProductSku;
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
  unlockedProducts: CarDealerProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type CarDealerNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof carDealerProducts;
  unlocks: typeof carDealerUnlocks;
  upgrades: typeof carDealerUpgrades;
};

export const CarDealerNicheConfig: CarDealerNicheConfig = {
  id: "carDealer",
  sectorId: "AUTO",
  name: "Car Dealer",
  description: "Inventory-driven vehicle sales with financing and warranty risk.",
  market: {
    products: [
      {
        productSku: "used_car_unit",
        baseDemandPerYear: 2200000,
        basePrice: 18000,
        seasonalityCurve: [0.92, 0.94, 0.96, 1, 1.05, 1.08, 1.02, 0.98, 1.02, 1.05, 1.08, 1.15],
        qualityMultiplier: 1.04,
        saturationImpact: 1.2,
      },
      {
        productSku: "new_car_unit",
        baseDemandPerYear: 900000,
        basePrice: 32000,
        seasonalityCurve: [0.9, 0.92, 0.95, 1, 1.06, 1.1, 1.04, 0.99, 1.02, 1.06, 1.1, 1.18],
        qualityMultiplier: 1.06,
        saturationImpact: 1.15,
      },
      {
        productSku: "trade_in_unit",
        baseDemandPerYear: 700000,
        basePrice: 12000,
        seasonalityCurve: [0.91, 0.93, 0.95, 1, 1.04, 1.07, 1.02, 0.99, 1.02, 1.05, 1.07, 1.12],
        qualityMultiplier: 1.01,
        saturationImpact: 1.1,
      },
      {
        productSku: "financing_contract_unit",
        baseDemandPerYear: 1200000,
        basePrice: 900,
        seasonalityCurve: [0.95, 0.96, 0.98, 1, 1.03, 1.05, 1.02, 0.99, 1, 1.03, 1.05, 1.08],
        qualityMultiplier: 1.02,
        saturationImpact: 1.08,
      },
      {
        productSku: "extended_warranty_unit",
        baseDemandPerYear: 800000,
        basePrice: 700,
        seasonalityCurve: [0.95, 0.96, 0.98, 1, 1.02, 1.04, 1.02, 1, 1, 1.02, 1.04, 1.06],
        qualityMultiplier: 1.03,
        saturationImpact: 1.05,
      },
      {
        productSku: "detailing_service_unit",
        baseDemandPerYear: 1500000,
        basePrice: 200,
        seasonalityCurve: [0.88, 0.9, 0.98, 1.05, 1.15, 1.2, 1.18, 1.12, 1.03, 0.95, 0.9, 0.88],
        qualityMultiplier: 1.02,
        saturationImpact: 1.12,
      },
    ],
  },
  startingLoadout: {
    startingCash: 250000,
    assets: [
      { assetId: "showroom_m2", count: 250 },
      { assetId: "inventory_slots", count: 25 },
      { assetId: "storage_slots", count: 15 },
      { assetId: "reconditioning_bays", count: 1 },
      { assetId: "inventory_used_units", count: 12 },
      { assetId: "inventory_new_units", count: 0 },
      { assetId: "inventory_avg_cost_used_eur", count: 15000 },
      { assetId: "inventory_avg_cost_new_eur", count: 28000 },
      { assetId: "inventory_floorplan_apr", count: 0.09 },
      { assetId: "reconditioning_queue_units", count: 4 },
      { assetId: "service_hours_capacity_per_tick", count: 40 },
      { assetId: "lead_pool", count: 80 },
      { assetId: "conversion_rate", count: 0.06 },
      { assetId: "compliance_score", count: 0.5 },
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "warranty_claim_rate", count: 0.04 },
      { assetId: "returns_rate", count: 0.05 },
      { assetId: "appraisal_tools", count: 0 },
    ],
    staff: [
      { roleId: "sales_staff", fte: 2 },
      { roleId: "service_staff", fte: 1 },
      { roleId: "finance_staff", fte: 0 },
      { roleId: "service_manager", fte: 0 },
      { roleId: "manager", fte: 1 },
    ],
    unlockedProducts: ["used_car_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.2,
      Expansionist: 0.25,
      CostCutter: 0.2,
      ContractSpecialist: 0.1,
      VerticalIntegrator: 0.2,
      OrganicPurist: 0.05,
    },
    minCashReserve: 120000,
    maxDebtRatio: 0.6,
    targetUtilization: 0.75,
  },
  products: carDealerProducts,
  unlocks: carDealerUnlocks,
  upgrades: carDealerUpgrades,
};
