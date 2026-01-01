import type { AIArchetypeId } from "../../../../ai/aiTypes";
import type { EvServicesProductSku } from "./evServices.products";
import { evServicesProducts } from "./evServices.products";
import { evServicesUnlocks } from "./evServices.unlocks";
import { evServicesUpgrades } from "./evServices.upgrades";

type NicheMarketProductConfig = {
  productSku: EvServicesProductSku;
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
  unlockedProducts: EvServicesProductSku[];
};

type NicheAIConfig = {
  archetypeWeights: Record<AIArchetypeId, number>;
  minCashReserve: number;
  maxDebtRatio: number;
  targetUtilization: number;
};

type EvServicesNicheConfig = {
  id: string;
  sectorId: string;
  name: string;
  description: string;
  market: NicheMarketConfig;
  startingLoadout: NicheStartingLoadout;
  aiConfig: NicheAIConfig;
  products: typeof evServicesProducts;
  unlocks: typeof evServicesUnlocks;
  upgrades: typeof evServicesUpgrades;
};

export const EvServicesNicheConfig: EvServicesNicheConfig = {
  id: "evServices",
  sectorId: "AUTO",
  name: "EV Services",
  description: "Charging network operations with uptime, grid, and energy cost risk.",
  market: {
    products: [
      {
        productSku: "ac_charge_session_unit",
        baseDemandPerYear: 90000000,
        basePrice: 5,
        seasonalityCurve: [0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.25, 1.2, 1.05, 0.9, 0.82, 0.75],
        qualityMultiplier: 1.02,
        saturationImpact: 1.1,
      },
      {
        productSku: "dc_fast_charge_session_unit",
        baseDemandPerYear: 60000000,
        basePrice: 18,
        seasonalityCurve: [0.78, 0.82, 0.92, 1.02, 1.12, 1.25, 1.35, 1.28, 1.1, 0.95, 0.85, 0.78],
        qualityMultiplier: 1.04,
        saturationImpact: 1.18,
      },
      {
        productSku: "kwh_energy_sale_kwh",
        baseDemandPerYear: 1200000000,
        basePrice: 0.55,
        seasonalityCurve: [0.8, 0.85, 0.92, 1.02, 1.1, 1.2, 1.3, 1.25, 1.05, 0.92, 0.86, 0.8],
        qualityMultiplier: 1.01,
        saturationImpact: 1.05,
      },
      {
        productSku: "charging_membership_monthly_unit",
        baseDemandPerYear: 4000000,
        basePrice: 12,
        seasonalityCurve: [0.92, 0.94, 0.98, 1, 1.05, 1.08, 1.1, 1.05, 1, 0.98, 0.95, 0.93],
        qualityMultiplier: 1.03,
        saturationImpact: 1.12,
      },
      {
        productSku: "fleet_charging_contract_unit",
        baseDemandPerYear: 140000,
        basePrice: 3500,
        seasonalityCurve: [0.9, 0.92, 0.95, 1, 1.05, 1.1, 1.12, 1.08, 1.02, 0.98, 0.94, 0.92],
        qualityMultiplier: 1.06,
        saturationImpact: 1.2,
      },
      {
        productSku: "installation_service_unit",
        baseDemandPerYear: 800000,
        basePrice: 4500,
        seasonalityCurve: [0.85, 0.9, 1, 1.08, 1.12, 1.05, 0.98, 0.95, 0.97, 1.02, 1.05, 0.92],
        qualityMultiplier: 1.05,
        saturationImpact: 1.14,
      },
    ],
  },
  startingLoadout: {
    startingCash: 220000,
    assets: [
      { assetId: "chargers_ac_count", count: 4 },
      { assetId: "chargers_dc_count", count: 0 },
      { assetId: "charger_power_ac_kw", count: 11 },
      { assetId: "charger_power_dc_kw", count: 100 },
      { assetId: "site_count", count: 1 },
      { assetId: "parking_bays_count", count: 6 },
      { assetId: "grid_capacity_kw", count: 100 },
      { assetId: "peak_demand_kw", count: 60 },
      { assetId: "uptime_score", count: 0.82 },
      { assetId: "utilization_rate", count: 0.35 },
      { assetId: "location_quality_score", count: 0.45 },
      { assetId: "compliance_score", count: 0.55 },
      { assetId: "reputation_score", count: 0.45 },
      { assetId: "metering_enabled", count: 0 },
      { assetId: "membership_active_count", count: 0 },
      { assetId: "fleet_contracts_active_count", count: 0 },
      { assetId: "maintenance_backlog_units", count: 2 },
      { assetId: "demand_charge_exposure_score", count: 0.55 },
      { assetId: "support_response_time_score", count: 0.6 },
      { assetId: "energy_purchase_price_eur_per_kwh", count: 0.28 },
      { assetId: "retail_price_eur_per_kwh_base", count: 0.55 },
      { assetId: "grid_fee_eur_per_kwh_base", count: 0.07 },
      { assetId: "payment_processing_pct", count: 0.02 },
      { assetId: "average_session_kwh_ac", count: 14 },
      { assetId: "average_session_kwh_dc", count: 42 },
    ],
    staff: [
      { roleId: "operations_tech", fte: 1 },
      { roleId: "support_agent", fte: 1 },
      { roleId: "certified_installer", fte: 0 },
    ],
    unlockedProducts: ["ac_charge_session_unit"],
  },
  aiConfig: {
    archetypeWeights: {
      Conservative: 0.25,
      Expansionist: 0.25,
      CostCutter: 0.15,
      ContractSpecialist: 0.15,
      VerticalIntegrator: 0.1,
      OrganicPurist: 0.1,
    },
    minCashReserve: 80000,
    maxDebtRatio: 0.55,
    targetUtilization: 0.72,
  },
  products: evServicesProducts,
  unlocks: evServicesUnlocks,
  upgrades: evServicesUpgrades,
};
