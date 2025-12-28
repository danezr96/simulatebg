// src/core/config/nicheDecisions.ts
import type { CompanyDecisionPayload, Niche } from "../domain";
import type { CompanyEffectModifiers } from "../domain/programs";

export type DecisionModuleOption = {
  id: string;
  label: string;
  description?: string;
  payload: CompanyDecisionPayload;
};

export type DecisionModule = {
  id: string;
  label: string;
  description?: string;
  options: DecisionModuleOption[];
};

type ProgramOptionInput = {
  id: string;
  label: string;
  description?: string;
  programType: string;
  durationWeeks: number;
  effects: CompanyEffectModifiers;
  weeklyCost?: number;
};

function programOption(input: ProgramOptionInput): DecisionModuleOption {
  return {
    id: input.id,
    label: input.label,
    description: input.description,
    payload: {
      type: "START_PROGRAM",
      programType: input.programType,
      durationWeeks: input.durationWeeks,
      effects: input.effects,
      weeklyCost: input.weeklyCost as any,
      label: input.label,
    },
  };
}

function procurementModule(label: string, description: string): DecisionModule {
  return {
    id: "PROCUREMENT",
    label,
    description,
    options: [
      programOption({
        id: "PROC_LOW",
        label: "Budget sourcing",
        description: "Lower costs, slightly lower quality.",
        programType: "PROCUREMENT",
        durationWeeks: 4,
        effects: { variableCostMultiplier: 0.92 as any, qualityMultiplier: 0.97 as any },
        weeklyCost: 150,
      }),
      programOption({
        id: "PROC_BALANCED",
        label: "Balanced sourcing",
        description: "Stable quality and costs.",
        programType: "PROCUREMENT",
        durationWeeks: 4,
        effects: { variableCostMultiplier: 1 as any, qualityMultiplier: 1 as any },
        weeklyCost: 220,
      }),
      programOption({
        id: "PROC_PREMIUM",
        label: "Premium sourcing",
        description: "Higher quality, higher costs.",
        programType: "PROCUREMENT",
        durationWeeks: 4,
        effects: { variableCostMultiplier: 1.12 as any, qualityMultiplier: 1.08 as any },
        weeklyCost: 350,
      }),
    ],
  };
}

function marketingModule(label: string, description: string): DecisionModule {
  return {
    id: "MARKETING",
    label,
    description,
    options: [
      programOption({
        id: "MKT_LOCAL",
        label: "Local push",
        description: "Local ads + visibility.",
        programType: "MARKETING_CAMPAIGN",
        durationWeeks: 4,
        effects: { marketingLevelDelta: 200 as any, reputationMultiplier: 1.02 as any },
        weeklyCost: 200,
      }),
      programOption({
        id: "MKT_GROWTH",
        label: "Growth push",
        description: "Aggressive acquisition.",
        programType: "MARKETING_CAMPAIGN",
        durationWeeks: 4,
        effects: { marketingLevelDelta: 600 as any, reputationMultiplier: 1.03 as any },
        weeklyCost: 600,
      }),
      programOption({
        id: "MKT_BRAND",
        label: "Brand building",
        description: "Long-term brand equity.",
        programType: "MARKETING_CAMPAIGN",
        durationWeeks: 6,
        effects: { marketingLevelDelta: 400 as any, reputationMultiplier: 1.05 as any },
        weeklyCost: 450,
      }),
    ],
  };
}

function trainingModule(label: string, description: string): DecisionModule {
  return {
    id: "TRAINING",
    label,
    description,
    options: [
      programOption({
        id: "TRAIN_BASIC",
        label: "Basic training",
        description: "Small quality lift.",
        programType: "STAFF_TRAINING",
        durationWeeks: 3,
        effects: { qualityMultiplier: 1.03 as any, labourCostMultiplier: 1.02 as any },
        weeklyCost: 150,
      }),
      programOption({
        id: "TRAIN_ADV",
        label: "Advanced training",
        description: "Stronger quality boost.",
        programType: "STAFF_TRAINING",
        durationWeeks: 5,
        effects: { qualityMultiplier: 1.07 as any, labourCostMultiplier: 1.05 as any },
        weeklyCost: 350,
      }),
    ],
  };
}

function opsModule(label: string, description: string): DecisionModule {
  return {
    id: "OPS",
    label,
    description,
    options: [
      programOption({
        id: "OPS_LEAN",
        label: "Lean ops",
        description: "Reduce waste and overhead.",
        programType: "OPS_OPTIMIZATION",
        durationWeeks: 4,
        effects: { variableCostMultiplier: 0.95 as any, labourCostMultiplier: 0.98 as any },
        weeklyCost: 200,
      }),
      programOption({
        id: "OPS_AUTOMATE",
        label: "Automation push",
        description: "Lower costs, higher upfront effort.",
        programType: "OPS_OPTIMIZATION",
        durationWeeks: 6,
        effects: { variableCostMultiplier: 0.9 as any, labourCostMultiplier: 0.94 as any },
        weeklyCost: 450,
      }),
    ],
  };
}

export const decisionProfiles: Record<string, DecisionModule[]> = {
  DEFAULT: [
    marketingModule("Marketing campaigns", "Customer acquisition & awareness."),
    trainingModule("Team training", "Improve service quality & consistency."),
    opsModule("Ops optimization", "Reduce costs and improve throughput."),
  ],

  SECTOR_HORECA: [
    procurementModule("Ingredient sourcing", "Balance cost vs quality."),
    marketingModule("Local campaigns", "Drive foot traffic and demand."),
    trainingModule("Service training", "Improve service and consistency."),
  ],
  SECTOR_RETAIL: [
    procurementModule("Inventory strategy", "Control COGS vs quality."),
    marketingModule("Store campaigns", "Boost local demand."),
    trainingModule("Store staff training", "Upsell and service quality."),
  ],
  SECTOR_ECOM: [
    procurementModule("Fulfillment strategy", "Speed vs cost."),
    marketingModule("Performance marketing", "Growth across channels."),
    opsModule("Fulfillment ops", "Reduce shipping friction."),
  ],
  SECTOR_TECH: [
    marketingModule("Sales & growth", "Pipeline and acquisition."),
    trainingModule("Product team training", "Improve quality & velocity."),
    opsModule("Engineering ops", "Reduce rework and cost."),
  ],
  SECTOR_BUILD: [
    procurementModule("Materials sourcing", "Cost vs reliability."),
    trainingModule("Safety training", "Reduce mistakes and delays."),
    opsModule("Project ops", "Efficiency on-site."),
  ],
  SECTOR_LOGI: [
    procurementModule("Fleet sourcing", "Cost vs reliability."),
    opsModule("Route optimization", "Improve throughput."),
    trainingModule("Driver training", "Lower incident risk."),
  ],
  SECTOR_PROP: [
    marketingModule("Occupancy marketing", "Keep units filled."),
    opsModule("Maintenance ops", "Reduce downtime."),
    trainingModule("Tenant service", "Retention and reputation."),
  ],
  SECTOR_MANU: [
    procurementModule("Input sourcing", "Cost vs quality."),
    opsModule("Lean manufacturing", "Reduce waste."),
    trainingModule("Quality training", "Reduce defects."),
  ],
  SECTOR_AGRI: [
    procurementModule("Input strategy", "Yield vs cost."),
    opsModule("Yield optimization", "Improve output."),
    marketingModule("Distribution push", "Sell volume reliably."),
  ],
  SECTOR_ENER: [
    opsModule("Maintenance program", "Reliability improvements."),
    trainingModule("Safety training", "Reduce incident risk."),
    marketingModule("Stakeholder comms", "Reputation management."),
  ],
  SECTOR_HEAL: [
    trainingModule("Care training", "Improve quality of care."),
    opsModule("Compliance ops", "Reduce penalties."),
    marketingModule("Reputation program", "Trust and referrals."),
  ],
  SECTOR_MEDIA: [
    marketingModule("Audience growth", "Boost reach."),
    trainingModule("Talent development", "Quality and consistency."),
    opsModule("Production ops", "Lower content costs."),
  ],
  SECTOR_FIN: [
    trainingModule("Compliance training", "Reduce risk."),
    marketingModule("Client acquisition", "Pipeline and deals."),
    opsModule("Process efficiency", "Lower service costs."),
  ],
  SECTOR_AUTO: [
    procurementModule("Parts sourcing", "Cost vs availability."),
    marketingModule("Local marketing", "Service demand."),
    trainingModule("Technician training", "Quality repairs."),
  ],
  SECTOR_RECY: [
    opsModule("Sorting optimization", "Increase throughput."),
    trainingModule("Compliance training", "Reduce penalties."),
    marketingModule("Local partnerships", "Secure feedstock."),
  ],
};

function resolveProfileKey(niche: Niche | null | undefined): string {
  const explicit = String((niche as any)?.decisionProfile ?? (niche as any)?.config?.decisionProfile ?? "").trim();
  if (explicit) return explicit;

  const nicheCode = String(niche?.code ?? "");
  const sectorCode = nicheCode.includes("_") ? nicheCode.split("_")[0] : "";
  const sectorKey = `SECTOR_${sectorCode}`;
  return decisionProfiles[sectorKey] ? sectorKey : "DEFAULT";
}

export function getDecisionModulesForNiche(niche: Niche | null | undefined): DecisionModule[] {
  const profile = resolveProfileKey(niche);
  return decisionProfiles[profile] ?? decisionProfiles.DEFAULT;
}
