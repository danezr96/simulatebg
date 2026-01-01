import type {
  BriefingCard,
  BriefingCompanyContext,
  BriefingEventSignal,
  BriefingInput,
  BriefingMarketShare,
  BriefingSectorSignal,
  BriefingSeverity,
  BriefingScope,
  CompetitorSignal,
} from "./briefing.types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0%";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function severityFromTrend(trend: number, volatility: number): BriefingSeverity {
  if (trend >= 1.1 && volatility <= 0.35) return "opportunity";
  if (trend >= 1.05) return "info";
  if (trend <= 0.9 && volatility >= 0.35) return "critical";
  if (trend <= 0.95) return "warning";
  return "info";
}

function macroCards(macro: BriefingInput["macroModifiers"]): BriefingCard[] {
  if (!macro) return [];
  const demand = clamp(Number(macro.demandGlobalFactor ?? 1), 0.7, 1.4);
  const energy = clamp(Number(macro.costEnergyFactor ?? 1), 0.7, 1.5);
  const labour = clamp(Number(macro.costLabourFactor ?? 1), 0.7, 1.5);
  const risk = clamp(Number(macro.riskGlobalFactor ?? 1), 0.7, 1.5);

  const cards: BriefingCard[] = [];

  const severity: BriefingSeverity =
    demand >= 1.1 ? "opportunity" : demand <= 0.95 ? "warning" : "info";

  cards.push({
    id: "macro-overview",
    scope: "macro",
    severity,
    title: "Macro pulse",
    body:
      `Demand index ${demand.toFixed(2)} (${formatPct(demand - 1, 1)} vs baseline). ` +
      `Energy ${energy.toFixed(2)}, labor ${labour.toFixed(2)}, risk ${risk.toFixed(2)}.`,
    whyItMatters: [
      demand >= 1.05 ? "Higher demand supports premium pricing." : "Soft demand rewards disciplined costs.",
      risk >= 1.05 ? "Risk premia widen; capital gets more selective." : "Risk conditions are manageable.",
    ],
    suggestedLevers: ["pricing", "marketing", "capacity"],
  });

  const costSeverity: BriefingSeverity =
    energy >= 1.08 || labour >= 1.08 ? "warning" : energy <= 0.95 && labour <= 0.95 ? "opportunity" : "info";

  cards.push({
    id: "macro-costs",
    scope: "macro",
    severity: costSeverity,
    title: "Cost climate",
    body:
      `Energy costs are ${energy >= 1.05 ? "pressing" : energy <= 0.95 ? "easing" : "stable"} ` +
      `and labor markets look ${labour >= 1.05 ? "tight" : labour <= 0.95 ? "loose" : "balanced"}.`,
    whyItMatters: [
      energy >= 1.05 ? "Margins tighten in energy-heavy operations." : "Energy is not a major drag this week.",
      labour >= 1.05 ? "Staffing upgrades and overtime get costlier." : "Labor costs stay predictable.",
    ],
    suggestedLevers: ["costs", "automation", "pricing"],
  });

  if (Math.abs(risk - 1) >= 0.05) {
    cards.push({
      id: "macro-risk",
      scope: "macro",
      severity: risk >= 1.1 ? "warning" : risk <= 0.95 ? "opportunity" : "info",
      title: "Risk sentiment",
      body:
        `Risk appetite is ${risk >= 1.05 ? "cooling" : "warming"} (risk index ${risk.toFixed(2)}). ` +
        "Expect tighter credit and more cautious buyers when risk rises.",
      whyItMatters: [
        "Higher risk increases financing costs and churn.",
        "Lower risk favors expansion and new offers.",
      ],
      suggestedLevers: ["cash", "credit", "pricing"],
    });
  }

  return cards;
}

function roundRecapCards(
  companies: BriefingCompanyContext[] | undefined,
  marketShares: BriefingMarketShare[] | undefined
): BriefingCard[] {
  if (!companies?.length) return [];

  let revenue = 0;
  let cogs = 0;
  let opex = 0;
  let interest = 0;
  let profit = 0;
  let cash = 0;
  let marketing = 0;
  let upgrades = 0;
  let capacity = 0;
  let utilizationWeighted = 0;

  for (const company of companies) {
    const companyRevenue = Number(company.revenue ?? 0);
    const companyCapacity = Number(company.capacity ?? 0);
    const companyUtil = Number(company.utilisationRate ?? 0);
    revenue += companyRevenue;
    cogs += Number(company.cogs ?? 0);
    opex += Number(company.opex ?? 0);
    interest += Number(company.interestCost ?? 0);
    profit += Number(company.profit ?? 0);
    cash += Number(company.cashChange ?? 0);
    marketing += Number(company.marketingLevel ?? 0);
    upgrades += Number(company.upgradeSpend ?? 0);
    capacity += companyCapacity;
    utilizationWeighted += companyCapacity * companyUtil;
  }

  const avgUtil = capacity > 0 ? utilizationWeighted / capacity : 0;
  const throughput = capacity * avgUtil;
  const idleCapacity = Math.max(0, capacity - throughput);
  const utilizationLabel = `${Math.round(avgUtil * 100)}%`;

  const costParts = [
    `COGS ${formatCompact(cogs)} EUR`,
    `Opex ${formatCompact(opex)} EUR`,
    `Interest ${formatCompact(interest)} EUR`,
  ];
  if (marketing > 0) costParts.push(`Marketing ${formatCompact(marketing)} EUR`);
  if (upgrades > 0) costParts.push(`Upgrades ${formatCompact(upgrades)} EUR`);

  const severity: BriefingSeverity =
    profit < 0 || cash < 0 ? "warning" : revenue > 0 && profit / revenue >= 0.12 ? "opportunity" : "info";

  const cards: BriefingCard[] = [
    {
      id: "round-recap",
      scope: "company",
      severity,
      title: "Last round recap",
      body:
        `Revenue ${formatCompact(revenue)} EUR, profit ${formatCompact(profit)} EUR, cash ${formatCompact(cash)} EUR. ` +
        `Costs: ${costParts.join(", ")}. ` +
        `Output ${formatCompact(throughput)} units at ${utilizationLabel} utilization ` +
        `(idle capacity ${formatCompact(idleCapacity)} units as inventory proxy).`,
      whyItMatters: [
        profit < 0 ? "Losses compress your cash runway quickly." : "Healthy profits create optionality.",
        avgUtil < 0.55 ? "Low utilization hints at weak demand or overcapacity." : "High utilization can justify upgrades.",
      ],
      suggestedLevers: ["pricing", "costs", "capacity"],
    },
  ];

  if (marketShares && marketShares.length > 0) {
    const topShares = marketShares
      .slice(0, 4)
      .map((row) => `${row.sectorName} ${formatPct(row.share, 1).replace("+", "")}`)
      .join(", ");

    cards.push({
      id: "market-share-snapshot",
      scope: "sector",
      severity: "info",
      title: "Market share snapshot",
      body: `Holding share by sector: ${topShares}.`,
      whyItMatters: [
        "Share concentration reveals where to defend or press the advantage.",
        "Sector leaders earn better pricing and partnerships.",
      ],
      suggestedLevers: ["marketing", "capacity", "pricing"],
    });
  }

  return cards;
}

function sectorCards(sectors: BriefingSectorSignal[] | undefined): BriefingCard[] {
  if (!sectors?.length) return [];

  const enriched = sectors
    .map((row) => {
      const trend = Number(row.trendFactor ?? 1);
      const volatility = Number(row.volatility ?? 0.2);
      const metrics = (row.lastRoundMetrics ?? {}) as any;
      const demandDeltaPct = Number(metrics?.demandDeltaPct ?? metrics?.demand_delta_pct ?? NaN);
      const demandDelta = Number.isFinite(demandDeltaPct) ? demandDeltaPct : trend - 1;
      const volShock = Number(metrics?.volatilityShock ?? metrics?.volatility_shock ?? 0);
      const name = row.sectorName || row.sectorCode || "Sector";
      return {
        ...row,
        name,
        trend,
        volatility,
        demandDelta,
        volShock,
        signalScore: Math.abs(demandDelta) + volatility,
      };
    })
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 6);

  const cards: BriefingCard[] = [];

  enriched.forEach((row) => {
    const severity = severityFromTrend(row.trend, row.volatility);
    const demandLabel =
      row.demandDelta >= 0.05 ? "surging" : row.demandDelta <= -0.05 ? "cooling" : "steady";
    const volLabel =
      row.volatility >= 0.35 ? "high" : row.volatility <= 0.2 ? "low" : "moderate";

    cards.push({
      id: `sector-${row.sectorId}`,
      scope: "sector",
      severity,
      title: `${row.name} outlook`,
      body:
        `Demand looks ${demandLabel} (${formatPct(row.demandDelta, 1)} vs last week) ` +
        `with ${volLabel} volatility. Trend factor ${row.trend.toFixed(2)}.`,
      whyItMatters: [
        row.demandDelta >= 0.03 ? "Demand tailwinds favor growth actions." : "Demand headwinds reward efficiency.",
        row.volatility >= 0.35 ? "Expect wider swings in sales and pricing." : "Forecasts are relatively stable.",
      ],
      suggestedLevers: ["pricing", "marketing", "capacity"],
    });

    if (row.volatility >= 0.35 || Math.abs(row.volShock) >= 0.12) {
      cards.push({
        id: `sector-${row.sectorId}-volatility`,
        scope: "sector",
        severity: row.volatility >= 0.45 ? "critical" : "warning",
        title: `${row.name} volatility spike`,
        body:
          `Volatility is running hot (${row.volatility.toFixed(2)}). ` +
          (row.volShock ? `Recent shock: ${formatPct(row.volShock, 0)}.` : ""),
        whyItMatters: [
          "Volatile weeks punish overextended inventory and staffing.",
          "Use tighter controls and faster feedback loops.",
        ],
        suggestedLevers: ["capacity", "staffing", "pricing"],
      });
    } else if (Math.abs(row.demandDelta) >= 0.08) {
      cards.push({
        id: `sector-${row.sectorId}-demand`,
        scope: "sector",
        severity: row.demandDelta > 0 ? "opportunity" : "warning",
        title: `${row.name} demand shift`,
        body:
          `Demand moved ${formatPct(row.demandDelta, 1)} week over week. ` +
          "Re-evaluate price and volume targets.",
        whyItMatters: [
          row.demandDelta > 0 ? "Window to push share and premium mix." : "Protect cash and protect pricing.",
        ],
        suggestedLevers: ["pricing", "marketing", "inventory"],
      });
    }
  });

  return cards;
}

function nicheCards(companies: BriefingCompanyContext[] | undefined): BriefingCard[] {
  if (!companies?.length) return [];

  const byNiche = new Map<
    string,
    {
      nicheName: string;
      sectorName?: string | null;
      revenue: number;
      profit: number;
      cashChange: number;
      count: number;
    }
  >();

  for (const c of companies) {
    if (!c.nicheName) continue;
    const key = `${c.sectorName ?? ""}|${c.nicheName}`;
    const row = byNiche.get(key) ?? {
      nicheName: c.nicheName,
      sectorName: c.sectorName ?? null,
      revenue: 0,
      profit: 0,
      cashChange: 0,
      count: 0,
    };
    row.revenue += Number(c.revenue ?? 0);
    row.profit += Number(c.profit ?? 0);
    row.cashChange += Number(c.cashChange ?? 0);
    row.count += 1;
    byNiche.set(key, row);
  }

  const ranked = Array.from(byNiche.values())
    .map((row) => ({
      ...row,
      margin: row.revenue > 0 ? row.profit / row.revenue : 0,
      score: Math.abs(row.profit) + row.revenue * 0.2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return ranked.map((row, idx) => {
    const severity: BriefingSeverity =
      row.margin <= -0.05 ? "critical" : row.margin < 0.03 ? "warning" : row.margin >= 0.12 ? "opportunity" : "info";
    const sectorLabel = row.sectorName ? ` in ${row.sectorName}` : "";
    return {
      id: `niche-${row.nicheName}-${idx}`,
      scope: "niche",
      severity,
      title: `${row.nicheName} pulse`,
      body:
        `Portfolio exposure${sectorLabel}: ${row.count} ${row.count === 1 ? "company" : "companies"}. ` +
        `Revenue ${formatCompact(row.revenue)} EUR, margin ${formatPct(row.margin, 1)}, cash ${formatCompact(
          row.cashChange
        )} EUR.`,
      whyItMatters: [
        row.margin >= 0.1 ? "Healthy margin gives room to reinvest." : "Thin margins need tighter execution.",
        row.cashChange < 0 ? "Cash drawdown can slow upgrades." : "Cash support keeps options open.",
      ],
      suggestedLevers: ["pricing", "capacity", "quality"],
    };
  });
}

function companyCards(companies: BriefingCompanyContext[] | undefined): BriefingCard[] {
  if (!companies?.length) return [];

  const summaries = companies.map((c) => {
    const revenue = Number(c.revenue ?? 0);
    const profit = Number(c.profit ?? 0);
    const cashChange = Number(c.cashChange ?? 0);
    const margin = revenue > 0 ? profit / revenue : 0;
    const efficiency = revenue > 0 ? (Number(c.opex ?? 0) + Number(c.cogs ?? 0)) / revenue : 0;
    return {
      ...c,
      revenue,
      profit,
      cashChange,
      margin,
      efficiency,
    };
  });

  const risks = summaries
    .filter((c) => c.profit < 0 || c.cashChange < 0 || c.margin < 0.04)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 3);

  const wins = summaries
    .filter((c) => c.profit > 0 && c.cashChange > 0 && c.margin >= 0.08)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 2);

  const cards: BriefingCard[] = [];

  risks.forEach((c) => {
    const severity: BriefingSeverity =
      c.margin <= -0.1 || c.profit < 0 ? "warning" : c.cashChange < 0 ? "warning" : "info";
    const sectorLabel = c.sectorName ? `${c.sectorName}` : c.sectorCode ?? "Sector";
    const nicheLabel = c.nicheName ? ` / ${c.nicheName}` : "";
    cards.push({
      id: `company-${c.companyId}`,
      scope: "company",
      severity,
      title: `${c.companyName} needs attention`,
      body:
        `Revenue ${formatCompact(c.revenue)} EUR, profit ${formatCompact(c.profit)} EUR, ` +
        `cash ${formatCompact(c.cashChange)} EUR, margin ${formatPct(c.margin, 1)}. ` +
        `Sector: ${sectorLabel}${nicheLabel}.`,
      whyItMatters: [
        c.cashChange < 0 ? "Cash drawdown limits upgrades and buffers." : "Margin compression can widen losses quickly.",
        c.efficiency > 0.9 ? "Cost base is heavy relative to revenue." : "Lean up the cost stack before scaling.",
      ],
      suggestedLevers: ["costs", "pricing", "quality"],
    });
  });

  wins.forEach((c, idx) => {
    const sectorLabel = c.sectorName ? `${c.sectorName}` : c.sectorCode ?? "Sector";
    const nicheLabel = c.nicheName ? ` / ${c.nicheName}` : "";
    cards.push({
      id: `company-${c.companyId}-momentum-${idx}`,
      scope: "company",
      severity: "opportunity",
      title: `${c.companyName} has momentum`,
      body:
        `Margin ${formatPct(c.margin, 1)} with cash up ${formatCompact(c.cashChange)} EUR. ` +
        `Sector: ${sectorLabel}${nicheLabel}.`,
      whyItMatters: ["Strong weeks are the best time to expand or lock in share."],
      suggestedLevers: ["capacity", "marketing", "pricing"],
    });
  });

  return cards;
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

function mapEventScope(scope?: string | null): BriefingScope {
  switch (scope) {
    case "SECTOR":
      return "sector";
    case "COMPANY":
      return "competitor";
    case "HOLDING":
      return "company";
    case "WORLD":
    default:
      return "macro";
  }
}

function eventSeverity(event: BriefingEventSignal): BriefingSeverity {
  const sev = Number(event.severity ?? 1);
  const type = String(event.type ?? "").toLowerCase();
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const category = String((payload as any).category ?? "").toLowerCase();
  const positive =
    category === "positive" ||
    /boost|award|prize|incentive|innovation|boom|hype|relief|recovery/.test(type);
  const negative =
    category === "negative" ||
    /crash|fine|strike|shock|panic|crisis|scandal|shortage|bankrupt|recall/.test(type);

  if (positive) return sev >= 1.2 ? "opportunity" : "info";
  if (negative) return sev >= 1.35 ? "critical" : "warning";
  if (sev >= 1.3) return "warning";
  return "info";
}

function buildEventImpact(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) return "";
  const hint = (payload as any).effectHint ?? (payload as any).effect_hint;
  if (!hint || typeof hint !== "object") return "";
  const parts: string[] = [];
  const demandFactor = Number((hint as any).demandFactor ?? NaN);
  const costFactor = Number((hint as any).costFactor ?? NaN);
  const volatilityFactor = Number((hint as any).volatilityFactor ?? NaN);
  const reputationDelta = Number((hint as any).reputationDelta ?? NaN);
  const cashPenalty = Number((hint as any).cashPenalty ?? NaN);
  const costSpike = Number((hint as any).costSpike ?? NaN);
  const loanRateDelta = Number((hint as any).loanRateDelta ?? NaN);

  if (Number.isFinite(demandFactor)) parts.push(`demand ${formatPct(demandFactor - 1, 1)}`);
  if (Number.isFinite(costFactor)) parts.push(`costs ${formatPct(costFactor - 1, 1)}`);
  if (Number.isFinite(volatilityFactor)) parts.push(`volatility ${formatPct(volatilityFactor - 1, 1)}`);
  if (Number.isFinite(reputationDelta)) parts.push(`reputation ${formatPct(reputationDelta, 1)}`);
  if (Number.isFinite(cashPenalty)) parts.push(`cash ${formatCompact(-Math.abs(cashPenalty))} EUR`);
  if (Number.isFinite(costSpike)) parts.push(`cost spike ${formatPct(costSpike, 1)}`);
  if (Number.isFinite(loanRateDelta)) parts.push(`loan rates ${formatPct(loanRateDelta, 2)}`);

  return parts.length ? `Impact: ${parts.join(", ")}.` : "";
}

function eventCards(events: BriefingEventSignal[] | undefined): BriefingCard[] {
  if (!events?.length) return [];

  return events.slice(0, 10).map((event, idx) => {
    const scope = (event.briefingScope ?? mapEventScope(event.scope)) as BriefingScope;
    const severity = eventSeverity(event);
    const title = String(event.title ?? event.type ?? "Market signal");
    const summary = String(event.summary ?? event.title ?? event.type ?? "Market signal");
    const target = event.targetLabel ? `Target: ${event.targetLabel}.` : "";
    const impact = buildEventImpact(event.payload ?? null);
    const body = [summary, target, impact].filter(Boolean).join(" ");

    const whyItMatters =
      scope === "macro"
        ? ["Macro shocks change demand and financing quickly.", "Re-check pricing and cash buffers."]
        : scope === "sector"
        ? ["Sector shocks shift demand share and pricing power.", "Fast response preserves margin."]
        : scope === "company"
        ? ["Company-level shocks hit reputation and costs.", "Address operations before scaling."]
        : ["Competitor moves can steal share.", "Counter with tight positioning."];

    const suggestedLevers =
      impact.includes("cost") || impact.includes("cash")
        ? ["costs", "pricing"]
        : impact.includes("demand")
        ? ["marketing", "pricing"]
        : impact.includes("reputation")
        ? ["quality", "service"]
        : ["pricing", "marketing"];

    return {
      id: String(event.id ?? `event-${idx}`),
      scope,
      severity,
      title,
      body,
      whyItMatters,
      suggestedLevers,
    };
  });
}

export function generateBriefing(input: BriefingInput): BriefingCard[] {
  const cards: BriefingCard[] = [];
  cards.push(...macroCards(input.macroModifiers ?? null));
  cards.push(...roundRecapCards(input.companies, input.marketShares));
  cards.push(...eventCards(input.events));
  cards.push(...sectorCards(input.sectorSignals));
  cards.push(...nicheCards(input.companies));
  cards.push(...companyCards(input.companies));
  cards.push(...competitorCards(input.competitorSignals));

  return cards;
}
