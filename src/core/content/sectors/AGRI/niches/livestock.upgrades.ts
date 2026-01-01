export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[];
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type LivestockUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const livestockUpgrades: LivestockUpgrade[] = [
  {
    id: "biosecurity_program",
    name: "Biosecurity Program",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "0",
    opexFormula: "monthlyFixed 2000..10000",
    effects: [
      { key: "disease_chance", op: "mul", range: [0.4, 0.7] },
      { key: "health_score", op: "mul", range: [1.02, 1.08] },
    ],
    risk: {
      failureChancePctRange: [5, 12],
      variancePctRange: [4, 10],
      failureEffects: ["compliance_overhead_increase"],
    },
  },
  {
    id: "welfare_facility_improvements",
    name: "Welfare Facility Improvements",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "startup_cost * (0.03..0.10)",
    opexFormula: "revenueMonthly * (0.002..0.006)",
    effects: [
      { key: "welfare_score", op: "add", range: [0.15, 0.35] },
      { key: "growth_rate", op: "mul", range: [1.05, 1.12] },
      { key: "premium_price_access", op: "set", value: ["true"] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [5, 12],
      failureEffects: ["construction_delay_weeks 1..3"],
    },
  },
  {
    id: "feed_contract_hedging",
    name: "Feed Contract Hedging",
    timing: "immediate",
    leadTimeTicks: { min: 0, max: 0 },
    capexFormula: "0",
    opexFormula: "0",
    effects: [
      { key: "feed_price_volatility", op: "mul", range: [0.5, 0.5] },
      { key: "feed_price_base", op: "mul", range: [1.05, 1.1] },
    ],
    risk: {
      failureChancePctRange: [3, 8],
      variancePctRange: [3, 6],
      failureEffects: ["hedge_lock_in_costs"],
    },
  },
  {
    id: "onsite_processing_line",
    name: "On-site Processing Line",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 8 },
    capexFormula: "startup_cost * (0.06..0.18)",
    opexFormula: "revenueMonthly * (0.004..0.012)",
    effects: [
      { key: "processing_margin", op: "mul", range: [1.08, 1.2] },
      { key: "unlock_products", op: "set", value: ["byproducts_rendered_kg"] },
    ],
    risk: {
      failureChancePctRange: [9, 18],
      variancePctRange: [7, 14],
      failureEffects: ["processing_line_downtime_weeks 2..4"],
    },
  },
];

export function testLivestockUpgrades(): boolean {
  const hasBiosecurity = livestockUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "disease_chance")
  );
  return livestockUpgrades.length >= 4 && hasBiosecurity;
}
