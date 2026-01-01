import type { MobilityProductSku } from "./mobility.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | MobilityProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type MobilityUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const mobilityUpgrades: MobilityUpgrade[] = [
  {
    id: "online_booking_dynamic_pricing",
    name: "Online Booking System & Dynamic Pricing",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 5000..60000",
    opexFormula: "monthlyFixed 200..2000",
    effects: [
      { key: "booking_system_enabled", op: "set", value: true },
      { key: "retail_channel_score", op: "add", range: [0.1, 0.3] },
      { key: "cancellations_rate", op: "mul", range: [0.85, 0.95] },
      { key: "utilization_rate_target", op: "add", range: [0.05, 0.15] },
      { key: "unlock_products", op: "set", value: ["insurance_addon_day_unit"] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["pricing_backlash_reputation_drop", "conversion_volatility"],
    },
  },
  {
    id: "fleet_expansion_economy_program",
    name: "Fleet Expansion Program (Economy)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "fleet_economy_count * (8000..22000)",
    opexFormula: "monthlyFixed 400..1800",
    effects: [
      { key: "fleet_economy_count", op: "add", range: [3, 8] },
      { key: "bookings_pipeline_units", op: "add", range: [6, 18] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [8, 14],
      failureEffects: ["utilization_drop", "financing_pressure"],
    },
  },
  {
    id: "premium_fleet_acquisition",
    name: "Premium Fleet Acquisition",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "fleet_premium_count * (25000..75000)",
    opexFormula: "monthlyFixed 600..2400",
    effects: [
      { key: "fleet_premium_count", op: "add", range: [1, 4] },
      { key: "reputation_score", op: "add", range: [0.03, 0.08] },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 16],
      failureEffects: ["claim_severity_increase", "downtime_spike"],
    },
  },
  {
    id: "maintenance_turnaround_optimization",
    name: "Maintenance & Turnaround Optimization",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0",
    opexFormula: "monthlyFixed 500..8000",
    effects: [
      { key: "downtime_pct", op: "mul", range: [0.7, 0.9] },
      { key: "cleaning_capacity_vehicles_per_tick", op: "add", range: [1, 3] },
      { key: "maintenance_backlog_units", op: "mul", range: [0.7, 0.9] },
    ],
    risk: {
      failureChancePctRange: [6, 12],
      variancePctRange: [5, 10],
      failureEffects: ["fixed_cost_pressure"],
    },
  },
  {
    id: "telematics_risk_scoring",
    name: "Telematics & Risk Scoring",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 3000..40000",
    opexFormula: "per_vehicle_monthly 2..10",
    effects: [
      { key: "accident_rate_per_day", op: "mul", range: [0.7, 0.9] },
      { key: "fraud_risk_score", op: "mul", range: [0.8, 0.95] },
      { key: "insurance_eur_per_day_base", op: "mul", range: [0.9, 0.98] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["privacy_backlash_reputation_drop"],
    },
  },
  {
    id: "corporate_contracting_sla_program",
    name: "Corporate Contracting & SLA Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 7 },
    capexFormula: "capex 5000..80000",
    opexFormula: "monthlyFixed 500..6000",
    effects: [
      { key: "unlock_products", op: "set", value: ["corporate_fleet_contract_unit"] },
      { key: "corporate_channel_score", op: "add", range: [0.1, 0.3] },
      { key: "reputation_score", op: "add", range: [0.02, 0.06] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [8, 14],
      failureEffects: ["sla_penalties", "contract_churn"],
    },
  },
  {
    id: "delivery_partnerships_program",
    name: "Delivery Partnerships Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "capex 3000..50000",
    opexFormula: "monthlyFixed 200..3000",
    effects: [
      { key: "unlock_products", op: "set", value: ["delivery_mobility_day_unit"] },
      { key: "delivery_channel_score", op: "add", range: [0.1, 0.35] },
      { key: "utilization_rate_target", op: "add", range: [0.03, 0.08] },
      { key: "maintenance_backlog_units", op: "add", range: [1, 3] },
    ],
    risk: {
      failureChancePctRange: [9, 17],
      variancePctRange: [7, 13],
      failureEffects: ["wear_and_tear_spike", "downtime_increase"],
    },
  },
  {
    id: "insurance_structure_optimization",
    name: "Insurance Structure Optimization",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0",
    opexFormula: "monthlyFixed 0",
    effects: [
      { key: "insurance_eur_per_day_base", op: "mul", range: [0.88, 0.96] },
      { key: "deductible_eur", op: "add", range: [500, 1500] },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 14],
      failureEffects: ["large_claim_shock", "reserve_shortfall"],
    },
  },
];

export function testMobilityUpgrades(): boolean {
  const hasAccidentReduction = mobilityUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "accident_rate_per_day")
  );
  const hasFleetExpansion = mobilityUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "fleet_economy_count")
  );
  return mobilityUpgrades.length >= 7 && hasAccidentReduction && hasFleetExpansion;
}
