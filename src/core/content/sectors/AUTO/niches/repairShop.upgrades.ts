export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type RepairShopUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const repairShopUpgrades: RepairShopUpgrade[] = [
  {
    id: "shop_management_software",
    name: "Shop Management Software",
    timing: "multi_tick",
    leadTimeTicks: { min: 1, max: 3 },
    capexFormula: "capex 2000..25000",
    opexFormula: "monthlyFixed 100..800",
    effects: [
      { key: "shop_software_enabled", op: "set", value: true },
      { key: "average_wait_ticks", op: "mul", range: [0.75, 0.9] },
      { key: "customer_satisfaction_score", op: "add", range: [0.02, 0.06] },
    ],
    risk: {
      failureChancePctRange: [6, 12],
      variancePctRange: [5, 10],
      failureEffects: ["adoption_dip_capacity -10% for 1 tick"],
    },
  },
  {
    id: "bay_lift_expansion",
    name: "Bay & Lift Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "service_bays * (20000..80000) + lifts * (8000..30000)",
    opexFormula: "monthlyFixed 600..2200",
    effects: [
      { key: "service_bays", op: "add", range: [1, 3] },
      { key: "lifts", op: "add", range: [1, 2] },
      { key: "labor_hours_capacity_per_tick", op: "add", range: [15, 45] },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["underutilized_capacity"],
    },
  },
  {
    id: "parts_supplier_diversification",
    name: "Parts Supplier Diversification",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 0",
    opexFormula: "parts_cost * 1.02..1.08",
    effects: [
      { key: "parts_fill_rate", op: "add", range: [0.1, 0.25] },
      { key: "supplier_lead_time_ticks", op: "mul", range: [0.6, 0.8] },
      { key: "parts_stockouts_count", op: "mul", range: [0.3, 0.7] },
    ],
    risk: {
      failureChancePctRange: [5, 9],
      variancePctRange: [4, 8],
      failureEffects: ["parts_cost_pressure"],
    },
  },
  {
    id: "technician_training_program",
    name: "Technician Training Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 2000..20000",
    opexFormula: "monthlyFixed 300..1500",
    effects: [
      { key: "comeback_rate", op: "mul", range: [0.65, 0.9] },
      { key: "labor_hours_per_job", op: "mul", range: [0.85, 0.95] },
    ],
    risk: {
      failureChancePctRange: [7, 14],
      variancePctRange: [6, 12],
      failureEffects: ["training_capacity_dip"],
    },
  },
  {
    id: "advanced_diagnostics_suite",
    name: "Advanced Diagnostics Suite",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 4 },
    capexFormula: "capex 10000..80000",
    opexFormula: "monthlyFixed 200..1200",
    effects: [
      { key: "diagnostic_tools_level", op: "add", range: [1, 1] },
      { key: "unlock_products", op: "set", value: ["diagnostics_advanced_unit"] },
      { key: "comeback_rate", op: "mul", range: [0.9, 0.97] },
    ],
    risk: {
      failureChancePctRange: [8, 15],
      variancePctRange: [5, 10],
      failureEffects: ["tool_breakdown_downtime 1..2 ticks"],
    },
  },
  {
    id: "ev_certification_high_voltage_tools",
    name: "EV Certification & High-Voltage Tools",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 8 },
    capexFormula: "capex 20000..150000",
    opexFormula: "monthlyFixed 300..2000",
    effects: [
      { key: "ev_tools_enabled", op: "set", value: true },
      { key: "compliance_score", op: "add", range: [0.1, 0.2] },
      { key: "unlock_products", op: "set", value: ["ev_repair_job_unit"] },
    ],
    risk: {
      failureChancePctRange: [10, 18],
      variancePctRange: [8, 14],
      failureEffects: ["audit_failure_lockout_ticks 2..4"],
    },
  },
];

export function testRepairShopUpgrades(): boolean {
  const hasDiagnostics = repairShopUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        Array.isArray(effect.value) &&
        effect.value.includes("diagnostics_advanced_unit")
    )
  );
  const hasCapacity = repairShopUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "service_bays")
  );
  return repairShopUpgrades.length >= 6 && hasDiagnostics && hasCapacity;
}
