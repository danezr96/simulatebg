import type { RenovationProductSku } from "./renovation.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string | string[] | RenovationProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type RenovationUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const renovationUpgrades: RenovationUpgrade[] = [
  {
    id: "contract_discipline_system",
    name: "Contract Discipline System (Deposits + Change Orders)",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..15000",
    opexFormula: "admin_pct 0.2..0.8%",
    effects: [
      { key: "contract_discipline_score", op: "add", range: [0.1, 0.3] },
      { key: "change_order_acceptance_rate", op: "add", range: [0.05, 0.2] },
      { key: "scope_creep_rate_modifier", op: "mul", range: [0.8, 0.95] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["close_rate_penalty", "client_pushback"],
    },
  },
  {
    id: "preinspection_hidden_defect_detection",
    name: "Pre-Inspection & Hidden Defect Detection Kit",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 500..18000",
    opexFormula: "inspection_tools_pct 0.2..0.6%",
    effects: [
      { key: "defect_detection_score", op: "add", range: [0.15, 0.4] },
      { key: "hidden_defect_probability_modifier", op: "mul", range: [0.75, 0.9] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["quote_cycle_slowdown", "inspection_time_drag"],
    },
  },
  {
    id: "project_controls_milestone_billing",
    name: "Project Controls & Milestone Billing Toolkit",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..40000",
    opexFormula: "monthlyFixed 150..2000",
    effects: [
      { key: "schedule_slip_score", op: "add", range: [-0.25, -0.1] },
      { key: "payment_delay_ticks_modifier", op: "mul", range: [0.85, 0.95] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["implementation_dip_ticks 1..1", "process_overhead"],
    },
  },
  {
    id: "supplier_framework_fixtures",
    name: "Supplier Framework (Fixtures/Cabinets/Tiles)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..35000",
    opexFormula: "inventory_carry_pct 0.4..1.2%",
    effects: [
      { key: "materials_fill_rate", op: "add", range: [0.05, 0.2] },
      { key: "supplier_lead_time_ticks_modifier", op: "mul", range: [0.75, 0.9] },
      { key: "materials_inventory_value_eur", op: "add", range: [5000, 20000] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["cash_tied_up", "overstock_waste"],
    },
  },
  {
    id: "preferred_subcontractor_network",
    name: "Preferred Subcontractor Network (Plumbing/Electrical)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 1000..25000",
    opexFormula: "subcontractor_premium_pct 0.5..1.5%",
    effects: [
      { key: "subcontractor_delay_probability", op: "add", range: [-0.2, -0.05] },
      { key: "subcontractor_cost_pct", op: "add", range: [0.02, 0.06] },
      { key: "subcontractor_dependency_score", op: "add", range: [-0.12, -0.04] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["cost_pressure", "subs_capacity_risk"],
    },
  },
  {
    id: "design_freeze_client_signoff",
    name: "Design Freeze & Client Sign-Off Process",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..8000",
    opexFormula: "admin_pct 0.1..0.6%",
    effects: [
      { key: "design_freeze_compliance", op: "add", range: [0.15, 0.35] },
      { key: "scope_creep_rate_modifier", op: "mul", range: [0.75, 0.9] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["client_happiness_dip", "close_rate_drag"],
    },
  },
  {
    id: "portfolio_marketing_engine",
    name: "Portfolio Marketing (Before/After Engine)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1000..40000",
    opexFormula: "monthlyFixed 150..3000",
    effects: [
      { key: "lead_pool_count", op: "add", range: [4, 12] },
      { key: "pricing_power_score", op: "add", range: [0.05, 0.25] },
      { key: "close_rate_base", op: "add", range: [0.02, 0.1] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["reputation_event_if_defects", "marketing_overpromise"],
    },
  },
  {
    id: "quality_punch_warranty_system",
    name: "Quality Punch & Warranty System",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..20000",
    opexFormula: "quality_admin_pct 0.2..0.8%",
    effects: [
      { key: "defect_rate_modifier", op: "mul", range: [0.65, 0.9] },
      { key: "warranty_claim_rate_modifier", op: "mul", range: [0.7, 0.9] },
      { key: "reputation_score", op: "add", range: [0.02, 0.06] },
      { key: "labor_hours_capacity_per_tick", op: "add", range: [-8, -3] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["punch_list_overhead", "throughput_dip"],
    },
  },
  {
    id: "property_manager_sales_engine",
    name: "Property Manager Sales Engine (Tenant Turnover)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 2000..60000",
    opexFormula: "monthlyFixed 200..4000",
    effects: [
      { key: "lead_pool_count", op: "add", range: [3, 10] },
      {
        key: "unlock_products",
        op: "set",
        value: ["tenant_turnover_renovation_contract_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["sla_penalties", "reputation_drop_if_slip_high"],
    },
  },
  {
    id: "insurance_documentation_compliance_pack",
    name: "Insurance Documentation & Compliance Pack",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "capex 3000..70000",
    opexFormula: "monthlyFixed 200..3000",
    effects: [
      { key: "documentation_process_enabled", op: "set", value: true },
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      { key: "unlock_products", op: "set", value: ["insurance_restoration_job_unit"] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["admin_overhead", "utilization_dip_if_staffing_low"],
    },
  },
];

export function testRenovationUpgrades(): boolean {
  const hasContractDiscipline = renovationUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "contract_discipline_score")
  );
  const hasDetection = renovationUpgrades.some(
    (upgrade) => upgrade.id === "preinspection_hidden_defect_detection"
  );
  return renovationUpgrades.length >= 10 && hasContractDiscipline && hasDetection;
}
