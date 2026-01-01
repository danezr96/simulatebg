export type UpgradeTiming = "direct" | "next_tick" | "multi_tick";

export type UpgradeRisk = {
  failureChance: number;
  failureMode: string;
  downtimeWeeks?: number;
};

export type NicheUpgrade = {
  id: string;
  name: string;
  timing: UpgradeTiming;
  leadTimeWeeks: number;
  capexFormula: string;
  opexFormula: string;
  effects: string[];
  risk: UpgradeRisk;
};

export const nicheUpgrades: NicheUpgrade[] = [
  {
    id: "soil_rotation_program",
    name: "Soil Rotation Program",
    timing: "direct",
    leadTimeWeeks: 0,
    capexFormula: "landHa * 40",
    opexFormula: "landHa * 3",
    effects: ["yield +4%", "soilQuality +0.05"],
    risk: {
      failureChance: 0.05,
      failureMode: "Implementation delays reduce first-week benefit.",
    },
  },
  {
    id: "drip_irrigation",
    name: "Drip Irrigation",
    timing: "multi_tick",
    leadTimeWeeks: 4,
    capexFormula: "landHa * 800",
    opexFormula: "landHa * 5",
    effects: ["yield +8%", "waterUse -15%"],
    risk: {
      failureChance: 0.08,
      failureMode: "Installation overruns extend lead time.",
      downtimeWeeks: 2,
    },
  },
  {
    id: "precision_ag",
    name: "Precision Agriculture Suite",
    timing: "next_tick",
    leadTimeWeeks: 1,
    capexFormula: "machineryUnits * 2000",
    opexFormula: "machineryUnits * 15",
    effects: ["laborEfficiency +6%", "inputWaste -5%"],
    risk: {
      failureChance: 0.06,
      failureMode: "Calibration errors reduce expected savings.",
    },
  },
  {
    id: "cold_chain",
    name: "Cold Chain Expansion",
    timing: "multi_tick",
    leadTimeWeeks: 6,
    capexFormula: "storageTons * 1200",
    opexFormula: "storageTons * 8",
    effects: ["wasteRate -10%", "qualityScore +0.05"],
    risk: {
      failureChance: 0.1,
      failureMode: "Equipment failures create short-term losses.",
      downtimeWeeks: 1,
    },
  },
  {
    id: "orchard_establishment",
    name: "Orchard Establishment",
    timing: "multi_tick",
    leadTimeWeeks: 12,
    capexFormula: "orchardHa * 5000",
    opexFormula: "orchardHa * 12",
    effects: ["unlock apple production", "yield +6% after maturity"],
    risk: {
      failureChance: 0.12,
      failureMode: "Sapling losses delay full capacity.",
      downtimeWeeks: 4,
    },
  },
  {
    id: "greenhouse_expansion",
    name: "Greenhouse Expansion",
    timing: "multi_tick",
    leadTimeWeeks: 8,
    capexFormula: "greenhouseM2 * 300",
    opexFormula: "greenhouseM2 * 1.5",
    effects: ["capacity +15%", "qualityScore +0.04"],
    risk: {
      failureChance: 0.09,
      failureMode: "Supply delays increase costs.",
      downtimeWeeks: 2,
    },
  },
  {
    id: "organic_certification",
    name: "Organic Certification",
    timing: "next_tick",
    leadTimeWeeks: 2,
    capexFormula: "landHa * 150",
    opexFormula: "landHa * 4",
    effects: ["pricePremium +8%", "demand +5%"],
    risk: {
      failureChance: 0.07,
      failureMode: "Audit findings delay certification.",
      downtimeWeeks: 2,
    },
  },
];

export function testCropFarmUpgrades(): boolean {
  return (
    nicheUpgrades.length >= 6 &&
    nicheUpgrades.some((upgrade) => upgrade.timing === "direct")
  );
}
