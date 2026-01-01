import type { AIArchetype } from "./aiTypes";

export const archetypes: AIArchetype[] = [
  {
    id: "Conservative",
    label: "Conservative",
    description: "Protects cash buffers and avoids aggressive expansion.",
    decisionBias: {
      hold: 0.4,
      optimize_costs: 0.2,
      pay_down_debt: 0.3,
    },
  },
  {
    id: "Expansionist",
    label: "Expansionist",
    description: "Favors growth when utilization and trends are positive.",
    decisionBias: {
      expand_capacity: 0.5,
      upgrade_quality: 0.2,
    },
  },
  {
    id: "CostCutter",
    label: "Cost Cutter",
    description: "Focuses on efficiency and lean operations.",
    decisionBias: {
      optimize_costs: 0.6,
      hold: 0.2,
    },
  },
  {
    id: "ContractSpecialist",
    label: "Contract Specialist",
    description: "Prefers stable demand via contracts.",
    decisionBias: {
      seek_contracts: 0.5,
      hold: 0.1,
    },
  },
  {
    id: "VerticalIntegrator",
    label: "Vertical Integrator",
    description: "Invests in upstream control and resilience.",
    decisionBias: {
      integrate_supply: 0.5,
      expand_capacity: 0.1,
    },
  },
  {
    id: "OrganicPurist",
    label: "Organic Purist",
    description: "Prioritizes quality upgrades over aggressive scaling.",
    decisionBias: {
      upgrade_quality: 0.5,
      hold: 0.1,
    },
  },
];

export const archetypeById: Record<string, AIArchetype> = Object.fromEntries(
  archetypes.map((archetype) => [archetype.id, archetype])
);

export function testArchetypes(): boolean {
  return (
    archetypes.length === 6 &&
    archetypes.every((archetype) => archetype.id.length > 0)
  );
}
