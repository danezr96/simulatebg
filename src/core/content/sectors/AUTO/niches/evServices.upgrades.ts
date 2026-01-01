import type { EvServicesProductSku } from "./evServices.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | EvServicesProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type EvServicesUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const evServicesUpgrades: EvServicesUpgrade[] = [
  {
    id: "site_permitting_pipeline",
    name: "Site Acquisition & Permitting Pipeline",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 10 },
    capexFormula: "site_count * (5000..60000)",
    opexFormula: "monthlyFixed 300..1200",
    effects: [
      { key: "site_count", op: "add", range: [1, 2] },
      { key: "location_quality_score", op: "add", range: [0.05, 0.2] },
    ],
    risk: {
      failureChancePctRange: [10, 22],
      variancePctRange: [8, 16],
      failureEffects: ["permit_delay_ticks 2..5", "sunk_costs_if_rejected"],
    },
  },
  {
    id: "dc_fast_charger_expansion",
    name: "DC Fast Charger Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 12 },
    capexFormula: "chargers_dc_count * (60000..300000)",
    opexFormula: "monthlyFixed 800..3500",
    effects: [
      { key: "chargers_dc_count", op: "add", range: [1, 3] },
      { key: "peak_demand_kw", op: "add", range: [40, 120] },
      { key: "utilization_rate", op: "add", range: [0.03, 0.08] },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 16],
      failureEffects: ["demand_charge_spike", "low_utilization"],
    },
  },
  {
    id: "smart_metering_dynamic_pricing",
    name: "Smart Metering & Dynamic Pricing",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..25000",
    opexFormula: "monthlyFixed 100..1000",
    effects: [
      { key: "metering_enabled", op: "set", value: true },
      { key: "unlock_products", op: "set", value: ["kwh_energy_sale_kwh"] },
      { key: "retail_price_eur_per_kwh_base", op: "mul", range: [0.95, 1.05] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [5, 10],
      failureEffects: ["customer_backlash", "price_volatility_visible"],
    },
  },
  {
    id: "maintenance_uptime_program",
    name: "Maintenance & Uptime Program",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0",
    opexFormula: "monthlyFixed 500..6000",
    effects: [
      { key: "uptime_score", op: "add", range: [0.05, 0.15] },
      { key: "maintenance_backlog_units", op: "mul", range: [0.6, 0.85] },
      { key: "support_response_time_score", op: "add", range: [0.02, 0.05] },
    ],
    risk: {
      failureChancePctRange: [4, 10],
      variancePctRange: [4, 8],
      failureEffects: ["fixed_cost_burden"],
    },
  },
  {
    id: "onsite_battery_buffer",
    name: "Onsite Battery Buffer",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 10 },
    capexFormula: "capex 30000..500000",
    opexFormula: "monthlyFixed 400..2500",
    effects: [
      { key: "demand_charge_exposure_score", op: "mul", range: [0.6, 0.85] },
      { key: "grid_capacity_kw", op: "add", range: [20, 80] },
    ],
    risk: {
      failureChancePctRange: [9, 18],
      variancePctRange: [7, 14],
      failureEffects: ["battery_degradation_costs", "underutilized_storage"],
    },
  },
  {
    id: "crm_billing_system",
    name: "CRM & Billing Subscription System",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 3000..40000",
    opexFormula: "monthlyFixed 200..2000",
    effects: [
      {
        key: "unlock_products",
        op: "set",
        value: ["charging_membership_monthly_unit"],
      },
      { key: "membership_active_count", op: "add", range: [100, 400] },
      { key: "support_response_time_score", op: "add", range: [0.04, 0.1] },
    ],
    risk: {
      failureChancePctRange: [7, 14],
      variancePctRange: [6, 12],
      failureEffects: ["implementation_dip_capacity 5..10%"],
    },
  },
  {
    id: "electrical_safety_program",
    name: "Electrical Safety & Compliance Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 3 },
    capexFormula: "capex 1000..20000",
    opexFormula: "monthlyFixed 100..1200",
    effects: [
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      { key: "unlock_products", op: "set", value: ["dc_fast_charge_session_unit"] },
      { key: "uptime_score", op: "add", range: [0.02, 0.05] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["audit_failure_lockout_ticks 1..3"],
    },
  },
  {
    id: "fleet_partnerships_program",
    name: "Fleet Partnerships Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 6 },
    capexFormula: "capex 5000..50000",
    opexFormula: "monthlyFixed 600..2500",
    effects: [
      { key: "unlock_products", op: "set", value: ["fleet_charging_contract_unit"] },
      { key: "fleet_contracts_active_count", op: "add", range: [1, 3] },
      { key: "reputation_score", op: "add", range: [0.03, 0.08] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [8, 14],
      failureEffects: ["sla_penalties_if_uptime_drops"],
    },
  },
];

export function testEvServicesUpgrades(): boolean {
  const hasMeteringUnlock = evServicesUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        Array.isArray(effect.value) &&
        effect.value.includes("kwh_energy_sale_kwh")
    )
  );
  const hasDemandChargeShield = evServicesUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "demand_charge_exposure_score")
  );
  return evServicesUpgrades.length >= 6 && hasMeteringUnlock && hasDemandChargeShield;
}
