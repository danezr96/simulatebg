import type {
  AIDecision,
  AIDecisionIntent,
  AICompanyBrain,
  AICompanyContext,
  AIMarketState,
  AIWorldState,
} from "./aiTypes";
import { scoreDecisions } from "./heuristics";

export type AITickInputs = {
  worldState: AIWorldState;
  marketState: AIMarketState;
  brains: AICompanyBrain[];
  rng: () => number;
};

const defaultRng = (): number => 0;

const defaultDecisions: AIDecisionIntent[] = [
  "hold",
  "expand_capacity",
  "optimize_costs",
  "seek_contracts",
  "integrate_supply",
  "upgrade_quality",
  "pay_down_debt",
];

function resolvePriceTrend(
  marketState: AIMarketState,
  company: AICompanyContext
): number {
  const trend = marketState.priceTrends[company.companyId];
  return Number.isFinite(trend) ? trend : company.priceTrend;
}

function pickTopDecision(decisions: AIDecision[], rng: () => number): AIDecision {
  if (decisions.length === 0) {
    return {
      companyId: "unknown",
      intent: "hold",
      reason: "no_decisions",
      score: 0,
    };
  }

  const topScore = decisions[0].score ?? 0;
  const top = decisions.filter((decision) => (decision.score ?? 0) === topScore);
  if (top.length === 1) {
    return top[0];
  }

  const roll = Math.max(0, Math.min(0.999999, rng()));
  const index = Math.floor(roll * top.length);
  return top[index];
}

export function runAITick(inputs: AITickInputs): AIDecision[] {
  const rng = inputs.rng ?? defaultRng;
  const companyById = new Map(
    inputs.worldState.companies.map((company) => [company.companyId, company])
  );

  return inputs.brains.map((brain) => {
    const company = companyById.get(brain.companyId);
    if (!company) {
      return {
        companyId: brain.companyId,
        intent: "hold",
        reason: "missing_company_state",
        score: 0,
      };
    }

    const enrichedCompany: AICompanyContext = {
      ...company,
      priceTrend: resolvePriceTrend(inputs.marketState, company),
    };

    const scored = scoreDecisions({
      brain,
      company: enrichedCompany,
      decisions: defaultDecisions,
    });
    return pickTopDecision(scored, rng);
  });
}

export function testAIEngine(): boolean {
  const decisions = runAITick({
    worldState: {
      companies: [
        {
          companyId: "A",
          cash: 400,
          weeklyRevenue: 200,
          weeklyCosts: 150,
          debt: 40,
          utilization: 0.85,
          priceTrend: 0.2,
        },
      ],
    },
    marketState: { priceTrends: {} },
    brains: [
      {
        companyId: "A",
        archetype: "Expansionist",
        cashSafetyThreshold: 100,
        debtTolerance: 0.3,
        utilizationTarget: 0.7,
      },
    ],
    rng: () => 0,
  });

  return decisions.length === 1 && decisions[0].intent !== "hold";
}
