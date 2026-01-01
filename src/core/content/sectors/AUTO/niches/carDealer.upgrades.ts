import type { CarDealerProductSku } from "./carDealer.products";

export type UpgradeTiming = "immediate" | "next_tick" | "multi_tick";

export type UpgradeEffect = {
  key: string;
  op: "add" | "mul" | "set";
  range?: [number, number];
  value?: number | string[] | CarDealerProductSku[] | boolean;
};

export type UpgradeRisk = {
  failureChancePctRange: [number, number];
  variancePctRange: [number, number];
  failureEffects: string[];
};

export type CarDealerUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeTicks: { min: number; max: number };
  capexFormula: string;
  opexFormula: string;
  effects: UpgradeEffect[];
  risk: UpgradeRisk;
};

export const carDealerUpgrades: CarDealerUpgrade[] = [
  {
    id: "local_lead_gen_engine",
    name: "Local Lead Gen Engine",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 3000..25000",
    opexFormula: "monthlyFixed 500..2500",
    effects: [
      { key: "lead_pool", op: "add", range: [40, 160] },
      { key: "conversion_rate", op: "add", range: [0.01, 0.03] },
    ],
    risk: {
      failureChancePctRange: [4, 10],
      variancePctRange: [5, 12],
      failureEffects: ["lead_quality_drop_weeks 1..2"],
    },
  },
  {
    id: "reconditioning_bay_expansion",
    name: "Reconditioning Bay Expansion",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 6 },
    capexFormula: "reconditioning_bays * (25000..90000)",
    opexFormula: "monthlyFixed 800..3000",
    effects: [
      { key: "reconditioning_bays", op: "add", range: [1, 3] },
      { key: "service_hours_capacity_per_tick", op: "add", range: [20, 60] },
    ],
    risk: {
      failureChancePctRange: [6, 14],
      variancePctRange: [6, 12],
      failureEffects: ["underutilized_capacity"],
    },
  },
  {
    id: "finance_desk_compliance_program",
    name: "Finance Desk & Compliance Program",
    timing: "multi_tick",
    leadTimeTicks: { min: 2, max: 5 },
    capexFormula: "capex 10000..60000",
    opexFormula: "monthlyFixed 1000..6000",
    effects: [
      { key: "compliance_score", op: "add", range: [0.1, 0.25] },
      { key: "compliance_audit_passed", op: "set", value: true },
      {
        key: "unlock_products",
        op: "set",
        value: ["financing_contract_unit", "extended_warranty_unit"],
      },
    ],
    risk: {
      failureChancePctRange: [8, 16],
      variancePctRange: [6, 12],
      failureEffects: ["audit_failure_lockout_ticks 2..4"],
    },
  },
  {
    id: "reputation_reviews_flywheel",
    name: "Reputation & Reviews Flywheel",
    timing: "next_tick",
    leadTimeTicks: { min: 1, max: 1 },
    capexFormula: "capex 2000..20000",
    opexFormula: "monthlyFixed 500..2500",
    effects: [
      { key: "reputation_score", op: "add", range: [0.1, 0.3] },
      { key: "price_uplift", op: "mul", range: [1.01, 1.04] },
      { key: "returns_rate", op: "mul", range: [0.85, 0.95] },
    ],
    risk: {
      failureChancePctRange: [7, 15],
      variancePctRange: [6, 12],
      failureEffects: ["visibility_backlash_event"],
    },
  },
  {
    id: "manufacturer_dealership_agreement",
    name: "Manufacturer Dealership Agreement",
    timing: "multi_tick",
    leadTimeTicks: { min: 4, max: 10 },
    capexFormula: "capex 50000..250000",
    opexFormula: "monthlyFixed 2000..10000",
    effects: [
      { key: "unlock_products", op: "set", value: ["new_car_unit"] },
      { key: "new_car_supply_stability", op: "mul", range: [1.2, 1.4] },
      { key: "inventory_floorplan_apr", op: "mul", range: [0.9, 0.98] },
    ],
    risk: {
      failureChancePctRange: [10, 20],
      variancePctRange: [8, 15],
      failureEffects: ["sales_target_penalty_weeks 2..6"],
    },
  },
];

export function testCarDealerUpgrades(): boolean {
  const hasManufacturerUnlock = carDealerUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        effect.op === "set" &&
        Array.isArray(effect.value) &&
        effect.value.includes("new_car_unit")
    )
  );
  return carDealerUpgrades.length >= 5 && hasManufacturerUnlock;
}
