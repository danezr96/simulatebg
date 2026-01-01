import type { DairyProductSku } from "./dairy.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | DairyProductSku[];
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type DairyUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const dairyUpgrades: DairyUpgrade[] = [
  {
    id: "feed_optimization_program",
    name: "Feed Optimization Program",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "0",
    opexFormula: "feedCost * (1.10..1.25)",
    effects: [
      { key: "milk_yield", op: "mul", range: [1.15, 1.3] },
      { key: "feed_cost", op: "mul", range: [1.1, 1.25] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [4, 12],
      failureEffects: ["supplier_dependency_variance"],
    },
  },
  {
    id: "herd_health_program",
    name: "Herd Health Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 4 },
    capexFormula: "0",
    opexFormula: "monthlyFixed 2000..8000",
    effects: [
      { key: "health_score", op: "mul", range: [1.2, 1.2] },
      { key: "disease_chance", op: "mul", range: [0.6, 0.6] },
    ],
    risk: {
      failureChancePctRange: [4, 10],
      variancePctRange: [3, 8],
      failureEffects: ["coverage_gap_weeks 1..2"],
    },
  },
  {
    id: "automated_milking_system",
    name: "Automated Milking System",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 6 },
    capexFormula: "startup_cost * (0.05..0.15)",
    opexFormula: "revenueMonthly * (0.005..0.012)",
    effects: [
      { key: "labor_cost", op: "mul", range: [0.8, 0.8] },
      { key: "milk_yield", op: "mul", range: [1.1, 1.1] },
    ],
    risk: {
      failureChancePctRange: [8, 18],
      variancePctRange: [6, 14],
      failureEffects: ["automation_downtime_weeks 1..3"],
    },
  },
  {
    id: "vertical_integration_push",
    name: "Vertical Integration Push",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 8 },
    capexFormula: "startup_cost * (0.08..0.18)",
    opexFormula: "revenueMonthly * (0.006..0.015)",
    effects: [
      { key: "unlock_products", op: "set", value: ["cheese_kg", "butter_kg"] },
      { key: "processing_capacity", op: "mul", range: [1.1, 1.25] },
    ],
    risk: {
      failureChancePctRange: [10, 22],
      variancePctRange: [8, 16],
      failureEffects: ["cashflow_stress_weeks 2..4"],
    },
  },
];

export function testDairyUpgrades(): boolean {
  const hasIntegration = dairyUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) => effect.key === "unlock_products" && effect.op === "set"
    )
  );
  return dairyUpgrades.length >= 4 && hasIntegration;
}
