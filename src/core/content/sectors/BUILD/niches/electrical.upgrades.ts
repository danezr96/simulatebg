import type { ElectricalProductSku } from "./electrical.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string | string[] | ElectricalProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type ElectricalUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const electricalUpgrades: ElectricalUpgrade[] = [
  {
    id: "safety_certification_compliance_pack",
    name: "Safety Certification & Compliance Pack",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1000..20000",
    opexFormula: "monthlyFixed 100..1200",
    effects: [
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      { key: "inspection_fail_probability_modifier", op: "mul", range: [0.85, 0.97] },
      { key: "callback_probability_modifier", op: "mul", range: [0.9, 0.98] },
      { key: "safety_certification_completed", op: "set", value: true },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["training_downtime_ticks 1..1", "short_term_capacity_dip"],
    },
  },
  {
    id: "scheduling_software_dispatch",
    name: "Scheduling Software & Dispatch",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 2000..35000",
    opexFormula: "monthlyFixed 150..1500",
    effects: [
      { key: "utilization_actual", op: "add", range: [0.05, 0.2] },
      { key: "average_wait_ticks", op: "add", range: [-2, -0.5] },
      {
        key: "unlock_products",
        op: "set",
        value: ["annual_maintenance_contract_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["implementation_dip_ticks 1..1"],
    },
  },
  {
    id: "apprenticeship_program",
    name: "Apprenticeship Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "capex 500..8000",
    opexFormula: "per_apprentice_monthly 1200..2200",
    effects: [
      { key: "apprentices_fte", op: "add", range: [1, 3] },
      { key: "labor_hours_capacity_per_tick", op: "add", range: [10, 25] },
      { key: "certification_training_progress", op: "add", range: [0.1, 0.3] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 14],
      failureEffects: ["callback_rate_spike", "supervision_load_increase"],
    },
  },
  {
    id: "testing_commissioning_tools",
    name: "Testing & Commissioning Tools",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 3000..60000",
    opexFormula: "monthlyFixed 150..900",
    effects: [
      { key: "inspection_fail_probability_modifier", op: "mul", range: [0.65, 0.9] },
      { key: "reputation_score", op: "add", range: [0.02, 0.06] },
      { key: "testing_tools_ready", op: "set", value: true },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["calibration_downtime_ticks 1..2", "maintenance_cost_spike"],
    },
  },
  {
    id: "materials_procurement_copper_hedging",
    name: "Materials Procurement & Copper Hedging",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..20000",
    opexFormula: "copper_hedge_fee_pct 0.002..0.01",
    effects: [
      { key: "materials_fill_rate", op: "add", range: [0.05, 0.2] },
      { key: "copper_price_volatility", op: "mul", range: [0.7, 0.9] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [6, 12],
      failureEffects: ["hedge_backfire_cost_spike"],
    },
  },
  {
    id: "on_call_team_setup",
    name: "On-Call Team Setup (Emergency)",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..10000",
    opexFormula: "overtime_premium_pct 0.1..0.35",
    effects: [
      { key: "overtime_enabled", op: "set", value: true },
      { key: "emergency_demand_uplift", op: "add", range: [0.15, 0.4] },
      { key: "unlock_products", op: "set", value: ["emergency_callout_job_unit"] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["burnout_callback_increase", "overtime_cost_spike"],
    },
  },
  {
    id: "quality_process_checklist_system",
    name: "Quality Process & Checklist System",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..12000",
    opexFormula: "monthlyFixed 100..900",
    effects: [
      { key: "callback_probability_modifier", op: "mul", range: [0.6, 0.9] },
      { key: "warranty_reserve_eur", op: "mul", range: [0.7, 0.9] },
      { key: "inspection_pass_rate", op: "add", range: [0.02, 0.08] },
    ],
    risk: {
      failureChancePctRange: [7, 14],
      variancePctRange: [5, 10],
      failureEffects: ["admin_overhead_capacity_dip"],
    },
  },
  {
    id: "hire_master_electrician",
    name: "Crew Expansion (Hire Master Electrician)",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 500..8000",
    opexFormula: "per_master_electrician_monthly 4500..8500",
    effects: [
      { key: "master_electrician_fte", op: "add", range: [1, 1] },
      { key: "labor_hours_capacity_per_tick", op: "add", range: [15, 35] },
      { key: "certification_level", op: "add", range: [1, 1] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["overhead_pressure", "demand_shortfall_risk"],
    },
  },
];

export function testElectricalUpgrades(): boolean {
  const hasInspectionReduction = electricalUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) => effect.key === "inspection_fail_probability_modifier"
    )
  );
  const hasOnCall = electricalUpgrades.some((upgrade) => upgrade.id === "on_call_team_setup");
  return electricalUpgrades.length >= 8 && hasInspectionReduction && hasOnCall;
}
