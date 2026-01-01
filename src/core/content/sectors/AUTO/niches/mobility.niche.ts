import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { MobilityProductSku } from "./mobility.products";
import { mobilityProducts } from "./mobility.products";
import { mobilityUnlocks } from "./mobility.unlocks";
import { mobilityUpgrades } from "./mobility.upgrades";

type NicheMarketProductConfig = {
  productSku: MobilityProductSku;
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
  unlockedProducts: MobilityProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type MobilityNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof mobilityProducts;
  unlocks: typeof mobilityUnlocks;
  upgrades: typeof mobilityUpgrades;
};

export const MobilityNicheConfig: MobilityNicheConfig = {
  id: "mobility",
  sectorId: "AUTO",
  name: "Mobility",
  description: "Fleet utilization with downtime, claims risk, and contract mix.",
  market: {
    products: [
      {
        productSku: "economy_rental_day_unit",
        baseDemandPerYear: 18000000,
        basePrice: 45,
        seasonalityCurve: [0.8, 0.85, 0.95, 1.05, 1.15, 1.25, 1.35, 1.3, 1.1, 0.95, 0.88, 0.82],
        qualityMultiplier: 1.02,
        saturationImpact: 1.1,
      },
      {
        productSku: "premium_rental_day_unit",
        baseDemandPerYear: 5200000,
        basePrice: 120,
        seasonalityCurve: [0.78, 0.82, 0.92, 1.02, 1.12, 1.25, 1.35, 1.3, 1.08, 0.92, 0.84, 0.8],
        qualityMultiplier: 1.06,
        saturationImpact: 1.18,
      },
      {
        productSku: "van_rental_day_unit",
        baseDemandPerYear: 6200000,
        basePrice: 95,
        seasonalityCurve: [0.85, 0.88, 0.95, 1.02, 1.12, 1.2, 1.25, 1.22, 1.08, 0.98, 0.9, 0.86],
        qualityMultiplier: 1.03,
        saturationImpact: 1.12,
      },
      {
        productSku: "corporate_fleet_contract_unit",
        baseDemandPerYear: 280000,
        basePrice: 8000,
        seasonalityCurve: [0.9, 0.92, 0.96, 1, 1.05, 1.08, 1.1, 1.06, 1, 0.98, 0.94, 0.92],
        qualityMultiplier: 1.08,
        saturationImpact: 1.2,
      },
      {
        productSku: "insurance_addon_day_unit",
        baseDemandPerYear: 14000000,
        basePrice: 12,
        seasonalityCurve: [0.82, 0.88, 0.96, 1.05, 1.12, 1.2, 1.28, 1.24, 1.08, 0.96, 0.9, 0.84],
        qualityMultiplier: 1.01,
        saturationImpact: 1.05,
      },
      {
        productSku: "delivery_mobility_day_unit",
        baseDemandPerYear: 8200000,
        basePrice: 80,
        seasonalityCurve: [0.88, 0.92, 0.98, 1.02, 1.05, 1.08, 1.1, 1.08, 1.02, 0.98, 0.95, 0.9],
        qualityMultiplier: 1.04,
        saturationImpact: 1.15,
      },
    ],
  },
  startingLoadout: {
    startingCash: 260000,
    assets: [
      { assetId: "fleet_economy_count", count: 10 },
      { assetId: "fleet_premium_count", count: 0 },
      { assetId: "fleet_van_count", count: 1 },
      { assetId: "downtime_pct", count: 0.1 },
      { assetId: "uptime_score", count: 0.9 },
      { assetId: "utilization_rate_target", count: 0.45 },
      { assetId: "utilization_rate_actual", count: 0.35 },
      { assetId: "bookings_pipeline_units", count: 12 },
      { assetId: "cancellations_rate", count: 0.08 },
      { assetId: "workshop_capacity_vehicles_per_tick", count: 2 },
      { assetId: "cleaning_capacity_vehicles_per_tick", count: 6 },
      { assetId: "maintenance_backlog_units", count: 3 },
      { assetId: "accident_rate_per_day", count: 0.006 },
      { assetId: "claim_severity_eur_min", count: 800 },
      { assetId: "claim_severity_eur_max", count: 8000 },
      { assetId: "deductible_eur", count: 1200 },
      { assetId: "insurance_reserve_eur", count: 12000 },
      { assetId: "fraud_risk_score", count: 0.35 },
      { assetId: "fleet_financing_apr", count: 0.08 },
      { assetId: "residual_value_score", count: 0.45 },
      { assetId: "retail_channel_score", count: 0.35 },
      { assetId: "corporate_channel_score", count: 0.1 },
      { assetId: "delivery_channel_score", count: 0.05 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "booking_system_enabled", count: 0 },
      { assetId: "insurance_eur_per_day_base", count: 7 },
    ],
    staff: [
      { roleId: "ops_staff", fte: 2 },
      { roleId: "customer_support_staff", fte: 1 },
      { roleId: "corporate_sales_staff", fte: 0 },
      { roleId: "logistics_staff", fte: 0 },
    ],
    unlockedProducts: ["economy_rental_day_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.25,
      Expansionist: 0.3,
      CostCutter: 0.15,
      ContractSpecialist: 0.15,
      VerticalIntegrator: 0.1,
      OrganicPurist: 0.05,
    },
    minCashReserve: 75000,
    maxDebtRatio: 0.6,
    targetUtilization: 0.72,
  },
  products: mobilityProducts,
  unlocks: mobilityUnlocks,
  upgrades: mobilityUpgrades,
};
