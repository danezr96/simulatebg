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

export type OrganicFarmingUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const organicFarmingUpgrades: OrganicFarmingUpgrade[] = [
  {
    id: "organic_certification_program",
    name: "Organic Certification Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 10 },
    capexFormula: "capex 15000..60000",
    opexFormula: "monthlyFixed 500..2000",
    effects: [
      { key: "organic_certified", op: "set", value: true },
      { key: "premium_channel_access", op: "set", value: ["csa", "contracts"] },
    ],
    risk: {
      failureChancePctRange: [8, 18],
      variancePctRange: [6, 14],
      failureEffects: ["audit_failure_lockout_ticks 2..4"],
    },
  },
  {
    id: "soil_regeneration_plan",
    name: "Soil Regeneration Plan",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "0",
    opexFormula: "monthlyFixed 2000..12000",
    effects: [
      { key: "soil_health_delta_per_tick", op: "add", range: [0.05, 0.2] },
      { key: "yield_stability", op: "mul", range: [1.02, 1.08] },
    ],
    risk: {
      failureChancePctRange: [5, 12],
      variancePctRange: [4, 10],
      failureEffects: ["rotation_penalty_weeks 1..2"],
    },
  },
  {
    id: "composting_infrastructure",
    name: "Composting Infrastructure",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "compost_capacity_ton * 400",
    opexFormula: "monthlyFixed 500..3000",
    effects: [
      { key: "compost_capacity_ton", op: "add", range: [20, 80] },
      { key: "fertilizer_cost_volatility", op: "mul", range: [0.7, 0.9] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [5, 12],
      failureEffects: ["compost_system_delay_weeks 1..3"],
    },
  },
  {
    id: "brand_direct_sales_engine",
    name: "Brand & Direct Sales Engine",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 20000..200000",
    opexFormula: "revenueMonthly * (0.002..0.006)",
    effects: [
      { key: "brand_reputation_score", op: "add", range: [0.1, 0.3] },
      {
        key: "channel_capacity",
        op: "mul",
        range: [1.15, 1.4],
      },
    ],
    risk: {
      failureChancePctRange: [7, 16],
      variancePctRange: [6, 12],
      failureEffects: ["marketing_spend_overrun"],
    },
  },
];

export function testOrganicFarmingUpgrades(): boolean {
  const hasCertification = organicFarmingUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "organic_certified")
  );
  return organicFarmingUpgrades.length >= 4 && hasCertification;
}
