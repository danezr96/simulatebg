import type { CommercialBuildProductSku } from "./commercialBuild.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string | string[] | CommercialBuildProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type CommercialBuildUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const commercialBuildUpgrades: CommercialBuildUpgrade[] = [
  {
    id: "estimating_team_expansion",
    name: "Estimating Team Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 3 },
    capexFormula: "capex 2000..15000",
    opexFormula: "per_estimator_monthly 3500..6500",
    effects: [
      { key: "estimators_fte", op: "add", range: [1, 2] },
      { key: "bids_capacity_per_tick", op: "add", range: [0.6, 1.6] },
      { key: "bid_win_rate_base", op: "add", range: [0.02, 0.05] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["overhead_pressure", "low_lead_roi"],
    },
  },
  {
    id: "safety_program_certification",
    name: "Safety Program & Certification",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 3000..30000",
    opexFormula: "monthlyFixed 200..2000",
    effects: [
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      { key: "safety_incident_rate_modifier", op: "mul", range: [0.6, 0.9] },
      { key: "safety_program_certified", op: "set", value: true },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 14],
      failureEffects: ["training_downtime_ticks 1..2", "schedule_slip_spike"],
    },
  },
  {
    id: "equipment_access_framework",
    name: "Equipment Access (Owned + Rental Framework)",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 10000..250000",
    opexFormula: "monthlyFixed 500..5000",
    effects: [
      { key: "forklift_access", op: "add", range: [1, 2] },
      { key: "scissor_lift_access", op: "add", range: [1, 2] },
      { key: "excavator_access", op: "add", range: [0, 1] },
      { key: "crane_access", op: "add", range: [0, 1] },
      { key: "wip_burn_value_eur_per_tick", op: "mul", range: [1.05, 1.25] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["idle_equipment_costs", "maintenance_downtime_ticks 1..2"],
    },
  },
  {
    id: "subcontractor_network_sla",
    name: "Subcontractor Network & SLA",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 2000..20000",
    opexFormula: "monthlyFixed 500..3000",
    effects: [
      { key: "subcontractor_dependency_score", op: "mul", range: [0.75, 0.9] },
      { key: "delay_probability_modifier", op: "mul", range: [0.7, 0.9] },
      { key: "subcontractor_cost_pct", op: "add", range: [0.01, 0.03] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["subcontractor_cost_spike", "sla_dispute_delay"],
    },
  },
  {
    id: "materials_procurement_hedging",
    name: "Materials Procurement & Hedging",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..15000",
    opexFormula: "materials_hedge_fee_pct 0.002..0.01",
    effects: [
      { key: "materials_cost_pct_modifier", op: "mul", range: [0.9, 0.97] },
      { key: "materials_price_volatility", op: "mul", range: [0.7, 0.9] },
    ],
    risk: {
      failureChancePctRange: [6, 12],
      variancePctRange: [5, 10],
      failureEffects: ["hedge_mismatch_cost_pressure"],
    },
  },
  {
    id: "project_controls_scheduling_system",
    name: "Project Controls & Scheduling System",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 5000..60000",
    opexFormula: "monthlyFixed 200..2000",
    effects: [
      { key: "schedule_slip_score", op: "mul", range: [0.75, 0.9] },
      { key: "delay_probability_modifier", op: "mul", range: [0.7, 0.9] },
      { key: "rework_pct_modifier", op: "mul", range: [0.8, 0.95] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["implementation_dip_ticks 1..1"],
    },
  },
  {
    id: "working_capital_facility",
    name: "Working Capital Facility (Credit Line)",
    timing: "immediate",
    leadTimeTicks: { min: 0, max: 0 },
    capexFormula: "capex 0",
    opexFormula: "interest_on_utilized_credit * (0.06..0.12)",
    effects: [
      { key: "credit_limit_eur", op: "add", range: [150000, 600000] },
      { key: "credit_interest_rate_pct", op: "set", value: 0.12 },
      { key: "credit_interest_model", op: "set", value: "utilization_based" },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 14],
      failureEffects: ["leverage_spiral", "covenant_breach_penalty"],
    },
  },
  {
    id: "design_coordination_capability",
    name: "Design Coordination Capability",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "capex 10000..120000",
    opexFormula: "per_designer_monthly 4000..9000",
    effects: [
      { key: "unlock_products", op: "set", value: ["design_build_contract_unit"] },
      { key: "bid_win_rate_base", op: "add", range: [0.02, 0.06] },
      { key: "change_order_rate_modifier", op: "mul", range: [0.85, 0.95] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [8, 14],
      failureEffects: ["design_liability_claim", "rework_spike"],
    },
  },
];

export function testCommercialBuildUpgrades(): boolean {
  const hasDesignBuildUnlock = commercialBuildUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        effect.op === "set" &&
        Array.isArray(effect.value) &&
        effect.value.includes("design_build_contract_unit")
    )
  );
  return commercialBuildUpgrades.length >= 8 && hasDesignBuildUnlock;
}
