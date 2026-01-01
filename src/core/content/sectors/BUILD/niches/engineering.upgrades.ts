import type { EngineeringProductSku } from "./engineering.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string | string[] | EngineeringProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type EngineeringUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const engineeringUpgrades: EngineeringUpgrade[] = [
  {
    id: "qa_baseline_checklist",
    name: "QA Baseline Checklist & Peer Review",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..8000",
    opexFormula: "monthlyFixed 0..600",
    effects: [
      { key: "qa_process_maturity", op: "add", range: [0.1, 0.25] },
      { key: "error_probability_modifier", op: "mul", range: [0.65, 0.9] },
      { key: "liability_claim_probability_modifier", op: "mul", range: [0.75, 0.9] },
      { key: "billable_hours_capacity_per_tick", op: "add", range: [-8, -3] },
      {
        key: "unlock_products",
        op: "set",
        value: ["structural_design_package_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["admin_overhead_capacity_dip"],
    },
  },
  {
    id: "software_stack_cad_bim",
    name: "Software Stack (CAD/BIM Licenses)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 3000..60000",
    opexFormula: "monthlyFixed 200..2500",
    effects: [
      { key: "billable_hours_capacity_per_tick", op: "add", range: [5, 18] },
      { key: "revision_rounds_modifier", op: "mul", range: [0.85, 0.95] },
      {
        key: "unlock_products",
        op: "set",
        value: ["bim_coordination_service_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["onboarding_dip_ticks 1..1", "license_utilization_gap"],
    },
  },
  {
    id: "proposal_engine_crm",
    name: "Proposal Engine (Templates + CRM)",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1000..25000",
    opexFormula: "monthlyFixed 100..1200",
    effects: [
      { key: "proposals_capacity_per_tick", op: "add", range: [0.6, 1.6] },
      { key: "win_rate_base", op: "add", range: [0.02, 0.1] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["overhead_pressure", "low_lead_roi"],
    },
  },
  {
    id: "hire_senior_engineer",
    name: "Hire Senior Engineer",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 4 },
    capexFormula: "capex 500..10000",
    opexFormula: "per_senior_engineer_monthly 5500..11000",
    effects: [
      { key: "senior_engineers_fte", op: "add", range: [1, 1] },
      { key: "certification_level", op: "add", range: [1, 1] },
      { key: "win_rate_base", op: "add", range: [0.02, 0.06] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["overhead_pressure", "utilization_pressure"],
    },
  },
  {
    id: "subcontractor_framework_specialty",
    name: "Subcontractor Framework (Geo + Specialty)",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..10000",
    opexFormula: "subcontractor_margin_pct 0.02..0.05",
    effects: [
      { key: "subcontractor_cost_pct", op: "add", range: [0.02, 0.05] },
      { key: "delivery_risk_modifier", op: "mul", range: [0.9, 0.98] },
      { key: "unlock_products", op: "set", value: ["geotechnical_survey_unit"] },
    ],
    risk: {
      failureChancePctRange: [9, 16],
      variancePctRange: [6, 12],
      failureEffects: ["margin_compression", "quality_variance"],
    },
  },
  {
    id: "professional_indemnity_upgrade",
    name: "Professional Indemnity Upgrade (Insurance)",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0..5000",
    opexFormula: "premium_pct_of_revenue 0.5..1.5%",
    effects: [
      { key: "liability_risk_score", op: "add", range: [-0.12, -0.04] },
      { key: "insurance_reserve_eur", op: "add", range: [2000, 8000] },
    ],
    risk: {
      failureChancePctRange: [6, 12],
      variancePctRange: [4, 8],
      failureEffects: ["fixed_cost_pressure"],
    },
  },
  {
    id: "permitting_fast_track_relationships",
    name: "Permitting Fast-Track Relationships",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 8 },
    capexFormula: "capex 2000..30000",
    opexFormula: "monthlyFixed 200..1500",
    effects: [
      { key: "permitting_delay_ticks", op: "add", range: [-1.2, -0.4] },
      { key: "review_cycle_delay_probability", op: "add", range: [-0.15, -0.05] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["contact_churn_dependency", "benefit_decay_risk"],
    },
  },
  {
    id: "governance_reporting_process",
    name: "Governance & Reporting Process",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 7 },
    capexFormula: "capex 2000..40000",
    opexFormula: "monthlyFixed 150..2000",
    effects: [
      { key: "reputation_score", op: "add", range: [0.03, 0.08] },
      { key: "scope_creep_rate_modifier", op: "mul", range: [0.85, 0.95] },
      {
        key: "unlock_products",
        op: "set",
        value: ["owner_rep_project_management_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [6, 12],
      failureEffects: ["admin_overhead_utilization_dip"],
    },
  },
  {
    id: "knowledge_base_reusable_ip",
    name: "Knowledge Base & Reusable IP Library",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "capex 1000..20000",
    opexFormula: "monthlyFixed 100..800",
    effects: [
      { key: "typical_billable_hours_modifier", op: "mul", range: [0.85, 0.95] },
      { key: "gross_margin_target", op: "add", range: [0.02, 0.06] },
    ],
    risk: {
      failureChancePctRange: [8, 14],
      variancePctRange: [5, 10],
      failureEffects: ["short_term_output_dip", "documentation_drag"],
    },
  },
];

export function testEngineeringUpgrades(): boolean {
  const hasProposalUpgrade = engineeringUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "proposals_capacity_per_tick")
  );
  const hasQaUpgrade = engineeringUpgrades.some((upgrade) => upgrade.id === "qa_baseline_checklist");
  return engineeringUpgrades.length >= 9 && hasProposalUpgrade && hasQaUpgrade;
}
