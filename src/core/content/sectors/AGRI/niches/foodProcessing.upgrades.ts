import type { FoodProcessingProductSku } from "./foodProcessing.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | FoodProcessingProductSku[];
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type FoodProcessingUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const foodProcessingUpgrades: FoodProcessingUpgrade[] = [
  {
    id: "energy_optimization",
    name: "Energy Optimization",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 2 },
    capexFormula: "0",
    opexFormula: "monthlyFixed 2000..10000",
    effects: [{ key: "energy_cost", op: "mul", range: [0.7, 0.85] }],
    risk: {
      failureChancePctRange: [5, 12],
      variancePctRange: [4, 10],
      failureEffects: ["audit_gaps_reduce_savings"],
    },
  },
  {
    id: "advanced_packaging",
    name: "Advanced Packaging",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 5 },
    capexFormula: "capex 300000..900000",
    opexFormula: "0",
    effects: [
      { key: "shelf_life", op: "mul", range: [1.4, 1.4] },
      { key: "price_premium", op: "mul", range: [1.1, 1.1] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [5, 12],
      failureEffects: ["packaging_line_delay_weeks 1..3"],
    },
  },
  {
    id: "throughput_expansion",
    name: "Throughput Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 8 },
    capexFormula: "startup_cost * (0.1..0.25)",
    opexFormula: "revenueMonthly * (0.004..0.01)",
    effects: [
      { key: "machine_capacity", op: "mul", range: [1.25, 1.6] },
      { key: "fixed_cost", op: "mul", range: [1.05, 1.15] },
    ],
    risk: {
      failureChancePctRange: [8, 18],
      variancePctRange: [6, 14],
      failureEffects: ["underutilization_penalty_weeks 2..4"],
    },
  },
  {
    id: "contract_production_line",
    name: "Contract Production Line",
    timing: "multi_tick",
    leadTimeTicks: { min: 5, max: 9 },
    capexFormula: "startup_cost * (0.12..0.3)",
    opexFormula: "revenueMonthly * (0.004..0.01)",
    effects: [
      { key: "unlock_products", op: "set", value: ["private_label_batch"] },
      { key: "contract_capacity", op: "mul", range: [1.1, 1.3] },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 16],
      failureEffects: ["sla_penalties_weeks 1..3"],
    },
  },
];

export function testFoodProcessingUpgrades(): boolean {
  const hasContract = foodProcessingUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) => effect.key === "unlock_products" && effect.op === "set"
    )
  );
  return foodProcessingUpgrades.length >= 4 && hasContract;
}
