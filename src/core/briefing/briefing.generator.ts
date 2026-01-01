import type {
  BriefingCard,
  BriefingCompanyContext,
  BriefingInput,
  BriefingSectorSignal,
  BriefingSeverity,
  CompetitorSignal,
} from "./briefing.types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function severityFromTrend(trend: number, volatility: number): BriefingSeverity {
  if (trend >= 1.1 && volatility <= 0.35) return "opportunity";
  if (trend >= 1.05) return "info";
  if (trend <= 0.9 && volatility >= 0.35) return "critical";
  if (trend <= 0.95) return "warning";
  return "info";
}

function macroCard(macro: BriefingInput["macroModifiers"]): BriefingCard | null {
  if (!macro) return null;
  const demand = clamp(Number(macro.demandGlobalFactor ?? 1), 0.7, 1.4);
  const energy = clamp(Number(macro.costEnergyFactor ?? 1), 0.7, 1.5);
  const labour = clamp(Number(macro.costLabourFactor ?? 1), 0.7, 1.5);
  const risk = clamp(Number(macro.riskGlobalFactor ?? 1), 0.7, 1.5);

  const severity: BriefingSeverity =
    demand >= 1.1 ? "opportunity" : demand <= 0.95 ? "warning" : "info";

  return {
    id: "macro-overview",
    scope: "macro",
    severity,
    title: "Macro pulse",
    body:
      "Global demand is running " +
      (demand >= 1.05 ? "above" : demand <= 0.95 ? "below" : "near") +
      " baseline this round. Energy costs are " +
      (energy >= 1.05 ? "elevated" : energy <= 0.95 ? "soft" : "steady") +
      " and labor costs look " +
      (labour >= 1.05 ? "tight" : labour <= 0.95 ? "loose" : "balanced") +
      ". Overall risk is " +
      (risk >= 1.05 ? "rising" : risk <= 0.95 ? "easing" : "stable") +
      ".",
    whyItMatters: [
      demand >= 1.05 ? "Higher demand supports premium pricing." : "Soft demand rewards disciplined costs.",
      energy >= 1.05 ? "Energy-heavy ops face margin pressure." : "Energy costs are not a key drag.",
      labour >= 1.05 ? "Hiring grows more expensive." : "Labor costs are manageable.",
    ],
    suggestedLevers: ["pricing", "marketing", "capacity"],
  };
}

function sectorCards(sectors: BriefingSectorSignal[] | undefined): BriefingCard[] {
  if (!sectors?.length) return [];
  return sectors.map((row) => {
    const trend = Number(row.trendFactor ?? 1);
    const volatility = Number(row.volatility ?? 0.2);
    const severity = severityFromTrend(trend, volatility);
    const name = row.sectorName || row.sectorCode || "Sector";

    return {
      id: `sector-${row.sectorId}`,
      scope: "sector",
      severity,
      title: `${name} outlook`,
      body:
        "Demand is " +
        (trend >= 1.05 ? "accelerating" : trend <= 0.95 ? "softening" : "steady") +
        " with volatility around " +
        (volatility >= 0.35 ? "high" : volatility <= 0.2 ? "low" : "moderate") +
        ". Expect " +
        (severity === "opportunity"
          ? "room to push volume"
          : severity === "critical"
          ? "more pricing pressure"
          : "stable conditions") +
        " this round.",
      whyItMatters: [
        trend >= 1.05 ? "Upside demand supports growth plays." : "Demand headwinds reward efficiency.",
        volatility >= 0.35 ? "Plan for wider performance swings." : "Forecasts are relatively stable.",
      ],
      suggestedLevers: ["pricing", "marketing", "capacity"],
    };
  });
}

function companyCards(companies: BriefingCompanyContext[] | undefined): BriefingCard[] {
  if (!companies?.length) return [];
  return companies
    .filter((c) => Number(c.profit ?? 0) <= 0 || Number(c.cashChange ?? 0) <= 0)
    .map((c) => {
      const profit = Number(c.profit ?? 0);
      const severity: BriefingSeverity = profit < 0 ? "warning" : "info";
      return {
        id: `company-${c.companyId}`,
        scope: "company",
        severity,
        title: `${c.companyName} needs attention`,
        body:
          "Recent results show " +
          (profit < 0 ? "negative profit" : "flat profit") +
          " momentum. Cash movement is " +
          (Number(c.cashChange ?? 0) < 0 ? "negative" : "flat") +
          ", so keep a tighter plan this round.",
        whyItMatters: [
          "Protect cash buffers before expanding.",
          "Focus on margin drivers to stabilize outcomes.",
        ],
        suggestedLevers: ["costs", "pricing", "quality"],
      };
    });
}

function competitorCards(signals: CompetitorSignal[] | undefined): BriefingCard[] {
  if (!signals?.length) return [];
  return signals.map((signal) => ({
    id: signal.id,
    scope: "competitor",
    severity: signal.severity ?? "info",
    title: signal.title,
    body: signal.body,
    whyItMatters: ["Competitor moves shift demand share.", "React with focused levers."],
    suggestedLevers: ["marketing", "pricing", "quality"],
  }));
}

export function generateBriefing(input: BriefingInput): BriefingCard[] {
  const cards: BriefingCard[] = [];
  const macro = macroCard(input.macroModifiers ?? null);
  if (macro) cards.push(macro);

  cards.push(...sectorCards(input.sectorSignals));
  cards.push(...companyCards(input.companies));
  cards.push(...competitorCards(input.competitorSignals));

  return cards;
}
