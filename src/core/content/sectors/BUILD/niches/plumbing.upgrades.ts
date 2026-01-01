import type { PlumbingProductSku } from "./plumbing.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string | string[] | PlumbingProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type PlumbingUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const plumbingUpgrades: PlumbingUpgrade[] = [
  {
    id: "on_call_rotation_setup",
    name: "On-Call Rotation Setup",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..8000",
    opexFormula: "overtime_premium_pct 0.1..0.35",
    effects: [
      { key: "on_call_enabled", op: "set", value: true },
      { key: "emergency_demand_uplift", op: "add", range: [0.15, 0.4] },
      {
        key: "unlock_products",
        op: "set",
        value: ["emergency_leak_callout_job_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["burnout_callback_increase", "overtime_cost_spike"],
    },
  },
  {
    id: "parts_inventory_system",
    name: "Parts Inventory System & Reorder Points",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1000..25000",
    opexFormula: "inventory_carry_pct 0.5..1.5%",
    effects: [
      { key: "parts_fill_rate", op: "add", range: [0.05, 0.2] },
      { key: "parts_inventory_value_eur", op: "add", range: [4000, 18000] },
      { key: "critical_parts_stockouts_modifier", op: "mul", range: [0.5, 0.8] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["cash_tied_up", "overstock_waste"],
    },
  },
  {
    id: "hire_master_plumber",
    name: "Hire Master Plumber",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 500..8000",
    opexFormula: "per_master_plumber_monthly 4200..7800",
    effects: [
      { key: "master_plumber_fte", op: "add", range: [1, 1] },
      { key: "inspection_fail_probability_modifier", op: "mul", range: [0.7, 0.9] },
      {
        key: "unlock_products",
        op: "set",
        value: [
          "bathroom_installation_job_unit",
          "commercial_fitout_plumbing_job_unit",
          "boiler_heatpump_plumbing_service_job_unit",
        ],
      },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["overhead_pressure", "utilization_pressure"],
    },
  },
  {
    id: "quality_checklist_pressure_testing",
    name: "Quality Checklist + Pressure Testing",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..12000",
    opexFormula: "quality_admin_pct 0.2..0.8%",
    effects: [
      { key: "callback_probability_modifier", op: "mul", range: [0.6, 0.9] },
      { key: "water_damage_claim_probability_modifier", op: "mul", range: [0.6, 0.85] },
      { key: "labor_hours_capacity_per_tick", op: "add", range: [-8, -3] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["admin_overhead_capacity_dip"],
    },
  },
  {
    id: "dispatcher_routing_discipline",
    name: "Dispatcher & Routing Discipline",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 1000..20000",
    opexFormula: "dispatcher_monthly 2800..5200",
    effects: [
      { key: "utilization_actual", op: "add", range: [0.05, 0.2] },
      { key: "average_wait_ticks", op: "add", range: [-2, -0.5] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["implementation_dip_ticks 1..1", "routing_overhead"],
    },
  },
  {
    id: "commercial_compliance_pack",
    name: "Commercial Compliance Pack",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..40000",
    opexFormula: "monthlyFixed 150..2000",
    effects: [
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      {
        key: "unlock_products",
        op: "set",
        value: ["commercial_fitout_plumbing_job_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["admin_overhead", "audit_disruption"],
    },
  },
  {
    id: "tooling_upgrade_pipe_press_camera",
    name: "Tooling Upgrade (Pipe Press + Drain Camera)",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 3000..60000",
    opexFormula: "tool_maintenance_pct 0.3..1.2%",
    effects: [
      { key: "labor_hours_per_job_modifier", op: "mul", range: [0.85, 0.95] },
      { key: "inspection_fail_probability_modifier", op: "mul", range: [0.8, 0.95] },
      {
        key: "unlock_products",
        op: "set",
        value: ["boiler_heatpump_plumbing_service_job_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["calibration_downtime", "maintenance_cost_spike"],
    },
  },
  {
    id: "warranty_reserve_policy",
    name: "Warranty Reserve Policy & Analytics",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..10000",
    opexFormula: "analytics_tools_pct 0.2..0.8%",
    effects: [
      { key: "warranty_reserve_eur_target", op: "add", range: [2000, 6000] },
      { key: "claim_severity_modifier", op: "mul", range: [0.9, 0.98] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["under_reserving_risk", "claim_shock_exposure"],
    },
  },
  {
    id: "property_manager_sales_engine",
    name: "Property Manager Sales Engine",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..50000",
    opexFormula: "monthlyFixed 200..3000",
    effects: [
      { key: "lead_pool_count", op: "add", range: [3, 8] },
      { key: "pricing_power_score", op: "add", range: [0.02, 0.08] },
      {
        key: "unlock_products",
        op: "set",
        value: ["property_maintenance_contract_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["reputation_penalty_if_callbacks_high"],
    },
  },
  {
    id: "project_controls_system",
    name: "Project Controls & Documentation",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1500..25000",
    opexFormula: "monthlyFixed 150..1200",
    effects: [
      { key: "average_wait_ticks", op: "add", range: [-1.5, -0.4] },
      { key: "inspection_fail_probability_modifier", op: "mul", range: [0.85, 0.95] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["documentation_overhead", "process_drag"],
    },
  },
];

export function testPlumbingUpgrades(): boolean {
  const hasCallbackReduction = plumbingUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "callback_probability_modifier")
  );
  const hasInventoryUpgrade = plumbingUpgrades.some(
    (upgrade) => upgrade.id === "parts_inventory_system"
  );
  return plumbingUpgrades.length >= 9 && hasCallbackReduction && hasInventoryUpgrade;
}
