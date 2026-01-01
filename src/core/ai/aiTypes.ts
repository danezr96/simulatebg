export type AIArchetypeId =
  | "Conservative"
  | "Expansionist"
  | "CostCutter"
  | "ContractSpecialist"
  | "VerticalIntegrator"
  | "OrganicPurist";

export type AIDecisionIntent =
  | "hold"
  | "expand_capacity"
  | "optimize_costs"
  | "seek_contracts"
  | "integrate_supply"
  | "upgrade_quality"
  | "pay_down_debt";

export type AIArchetype = {
  id: AIArchetypeId;
  label: string;
  description: string;
  decisionBias: Partial<Record<AIDecisionIntent, number>>;
};

export type AIDecision = {
  companyId: string;
  intent: AIDecisionIntent;
  payload?: Record<string, unknown>;
  score?: number;
  reason?: string;
};

export type AICompanyBrain = {
  companyId: string;
  archetype: AIArchetypeId;
  cashSafetyThreshold: number;
  debtTolerance: number;
  utilizationTarget: number;
};

export type AICompanyContext = {
  companyId: string;
  cash: number;
  weeklyRevenue: number;
  weeklyCosts: number;
  debt: number;
  utilization: number;
  priceTrend: number;
};

export type AIWorldState = {
  companies: AICompanyContext[];
};

export type AIMarketState = {
  priceTrends: Record<string, number>;
};

export function testAITypes(): boolean {
  const brain: AICompanyBrain = {
    companyId: "test",
    archetype: "Conservative",
    cashSafetyThreshold: 100,
    debtTolerance: 0.3,
    utilizationTarget: 0.8,
  };
  return brain.cashSafetyThreshold === 100 && brain.archetype === "Conservative";
}
