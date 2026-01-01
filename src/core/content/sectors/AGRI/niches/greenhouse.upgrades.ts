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

export type GreenhouseUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const greenhouseUpgrades: GreenhouseUpgrade[] = [
  {
    id: "climate_control_upgrade",
    name: "Climate Control Upgrade",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "startup_cost * (0.04..0.12)",
    opexFormula: "revenueMonthly * (0.003..0.010)",
    effects: [
      { key: "climate_control_level", op: "add", range: [0.15, 0.35] },
      { key: "yield", op: "mul", range: [1.08, 1.18] },
      { key: "pest_chance", op: "mul", range: [0.75, 0.9] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [5, 12],
      failureEffects: ["control_system_tuning_delay_weeks 1..3"],
    },
  },
  {
    id: "led_lighting_system",
    name: "LED Lighting System",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 4 },
    capexFormula: "startup_cost * (0.03..0.10)",
    opexFormula: "revenueMonthly * (0.004..0.015)",
    effects: [
      { key: "yield", op: "mul", range: [1.1, 1.25] },
      { key: "energy_use", op: "mul", range: [1.15, 1.4] },
      { key: "unlock_path", op: "set", value: ["microgreens"] },
    ],
    risk: {
      failureChancePctRange: [8, 18],
      variancePctRange: [6, 14],
      failureEffects: ["energy_price_spike_penalty"],
    },
  },
  {
    id: "integrated_pest_management",
    name: "Integrated Pest Management",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "0",
    opexFormula: "monthlyFixed 2000..8000",
    effects: [
      { key: "pest_damage", op: "mul", range: [0.3, 0.7] },
      { key: "quality_score", op: "mul", range: [1.02, 1.08] },
    ],
    risk: {
      failureChancePctRange: [4, 10],
      variancePctRange: [4, 9],
      failureEffects: ["coverage_gap_weeks 1..2"],
    },
  },
  {
    id: "cold_chain_packaging_expansion",
    name: "Cold Chain & Packaging Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 3, max: 6 },
    capexFormula: "cold_storage_kg * 120 + packaging_units * 0.6",
    opexFormula: "revenueMonthly * (0.003..0.008)",
    effects: [
      { key: "spoilage_rate", op: "mul", range: [0.4, 0.8] },
      { key: "price_premium", op: "mul", range: [1.05, 1.12] },
    ],
    risk: {
      failureChancePctRange: [7, 16],
      variancePctRange: [6, 14],
      failureEffects: ["cold_chain_install_delay_weeks 1..4"],
    },
  },
];

export function testGreenhouseUpgrades(): boolean {
  const hasEnergyIncrease = greenhouseUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "energy_use")
  );
  return greenhouseUpgrades.length >= 4 && hasEnergyIncrease;
}
