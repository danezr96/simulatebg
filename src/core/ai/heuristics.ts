import type {
  AIDecision,
  AIDecisionIntent,
  AICompanyBrain,
  AICompanyContext,
} from "./aiTypes";
import { archetypeById } from "./archetypes";

export type HeuristicInput = {
  brain: AICompanyBrain;
  company: AICompanyContext;
  decisions: AIDecisionIntent[];
};

type SignalScores = {
  cashSafety: number;
  utilization: number;
  priceTrend: number;
  debt: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTrend(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(value, -1, 1);
}

function computeSignals(
  brain: AICompanyBrain,
  company: AICompanyContext
): SignalScores {
  const cashGap = company.cash - brain.cashSafetyThreshold;
  const cashSafety = clamp(cashGap / Math.max(1, brain.cashSafetyThreshold), -1, 1);
  const utilizationDelta = clamp(company.utilization - brain.utilizationTarget, -1, 1);
  const priceTrend = normalizeTrend(company.priceTrend);
  const buffer = Math.max(1, company.cash + company.weeklyRevenue);
  const debtRatio = clamp(company.debt / buffer, 0, 1);
  const debt = clamp(debtRatio - brain.debtTolerance, -1, 1);

  return { cashSafety, utilization: utilizationDelta, priceTrend, debt };
}

function baseScoreForDecision(
  intent: AIDecisionIntent,
  signals: SignalScores
): number {
  switch (intent) {
    case "expand_capacity":
      return signals.utilization * 0.6 + signals.priceTrend * 0.4 + signals.cashSafety * 0.2;
    case "upgrade_quality":
      return signals.priceTrend * 0.6 + signals.cashSafety * 0.2;
    case "seek_contracts":
      return signals.priceTrend * 0.2 + Math.abs(signals.utilization) * 0.3;
    case "integrate_supply":
      return signals.cashSafety * 0.2 + signals.priceTrend * 0.2 - signals.debt * 0.3;
    case "optimize_costs":
      return -signals.cashSafety * 0.4 - signals.priceTrend * 0.2 + signals.debt * 0.3;
    case "pay_down_debt":
      return signals.debt * 0.6 - signals.cashSafety * 0.2;
    case "hold":
      return -Math.abs(signals.utilization) * 0.2 - Math.abs(signals.priceTrend) * 0.1;
    default:
      return 0;
  }
}

export function scoreDecisions(input: HeuristicInput): AIDecision[] {
  const signals = computeSignals(input.brain, input.company);
  const archetype = archetypeById[input.brain.archetype];
  const decisions = input.decisions.map((intent) => {
    const baseScore = baseScoreForDecision(intent, signals);
    const bias = archetype?.decisionBias[intent] ?? 0;
    const score = baseScore + bias;
    return {
      companyId: input.brain.companyId,
      intent,
      score,
      reason: "heuristic",
    };
  });

  return decisions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function testHeuristics(): boolean {
  const decisions = scoreDecisions({
    brain: {
      companyId: "A",
      archetype: "Expansionist",
      cashSafetyThreshold: 100,
      debtTolerance: 0.3,
      utilizationTarget: 0.7,
    },
    company: {
      companyId: "A",
      cash: 500,
      weeklyRevenue: 200,
      weeklyCosts: 150,
      debt: 50,
      utilization: 0.9,
      priceTrend: 0.3,
    },
    decisions: ["expand_capacity", "optimize_costs", "hold"],
  });

  return decisions.length === 3 && decisions[0].intent === "expand_capacity";
}
