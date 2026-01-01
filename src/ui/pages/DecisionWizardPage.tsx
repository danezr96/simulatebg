// src/ui/pages/DecisionWizardPage.tsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  CompanyDecisionPayload,
  Holding,
  HoldingDecisionPayload,
  Niche,
  NicheProduct,
  Sector,
  World,
  WorldEconomyState,
} from "../../core/domain";
import type { BriefingEventSignal, BriefingMarketShare, BriefingScope } from "../../core/briefing/briefing.types";
import { asCompanyId, asHoldingId, asNicheId, asWorldId } from "../../core/domain";
import { isSectorPlayable } from "../../core/config/playableSectors";
import { decisionService } from "../../core/services/decisionService";
import { companyService } from "../../core/services/companyService";
import { upgradeService } from "../../core/services/upgradeService";
import { engineService } from "../../core/services/engineService";
import { scoreboardService } from "../../core/services/scoreboardService";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { nicheProductRepo } from "../../core/persistence/nicheProductRepo";
import { eventRepo } from "../../core/persistence/eventRepo";
import { buildBaselineProjection } from "../../core/projections/baseline";
import { buildWhatIfProjection } from "../../core/projections/whatIf";
import { generateBriefing } from "../../core/briefing/briefing.generator";
import { formatCurrencyCompact } from "../../utils/format";
import { estimateUpgradeCapex } from "../../utils/upgradeCost";

import { useWorldState } from "../hooks/useWorldState";
import { useWorld } from "../hooks/useWorld";
import { useDecisionDraft } from "../hooks/useDecisionDraft";

import Card from "../components/Card";
import { Button } from "../components/Button";
import WizardStepper from "../components/decisionWizard/WizardStepper";
import StickySummaryBar from "../components/decisionWizard/StickySummaryBar";
import MarketBriefingInbox from "../components/decisionWizard/MarketBriefingInbox";
import BaselineForecastPanel from "../components/decisionWizard/BaselineForecastPanel";
import CompanyDecisionPanel from "../components/decisionWizard/CompanyDecisionPanel";
import HoldingDecisionPanel from "../components/decisionWizard/HoldingDecisionPanel";
import UpgradeTimelinePanel from "../components/decisionWizard/UpgradeTimelinePanel";
import ReviewCommitPanel from "../components/decisionWizard/ReviewCommitPanel";

const STEPS = [
  { key: "briefing", label: "Briefing", description: "Story + alerts" },
  { key: "baseline", label: "Baseline", description: "If you change nothing" },
  { key: "companies", label: "Companies", description: "Operations decisions" },
  { key: "holding", label: "Holding", description: "Allocation + policy" },
  { key: "upgrades", label: "Upgrades", description: "Timeline + queue" },
  { key: "review", label: "Review & Submit", description: "Lock and submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type HoldingPolicyDraft = {
  riskAppetite?: "LOW" | "MEDIUM" | "HIGH";
  dividendPreference?: "HOLDING" | "REINVEST";
  maxLeverageRatio?: number;
};

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function decisionPayloadsFromRows(rows: Array<{ payload: any }>): CompanyDecisionPayload[] {
  return rows.map((row) => row.payload).filter(Boolean);
}

function previousRound(year: number, week: number): { year: number; week: number } {
  if (week > 1) return { year, week: week - 1 };
  return { year: Math.max(1, year - 1), week: 52 };
}

function deriveBriefing(input: {
  macroModifiers: any;
  sectorRows: Array<{
    sectorId: string;
    sectorName?: string | null;
    trendFactor?: number;
    volatility?: number;
    currentDemand?: number;
    lastRoundMetrics?: Record<string, unknown> | null;
  }>;
  companies: Array<{
    companyId: string;
    companyName: string;
    sectorCode?: string | null;
    sectorName?: string | null;
    nicheName?: string | null;
    revenue?: number;
    cogs?: number;
    opex?: number;
    interestCost?: number;
    marketingLevel?: number;
    capacity?: number;
    utilisationRate?: number;
    upgradeSpend?: number;
    profit?: number;
    cashChange?: number;
  }>;
  events: BriefingEventSignal[];
  marketShares?: BriefingMarketShare[];
}) {
  return generateBriefing({
    macroModifiers: input.macroModifiers ?? null,
    sectorSignals: input.sectorRows,
    companies: input.companies,
    events: input.events,
    marketShares: input.marketShares,
  });
}

function buildKeyRisks(niches: Niche[], max = 3) {
  const risks: string[] = [];
  for (const niche of niches) {
    const config = (niche as any)?.config ?? {};
    const demandVol = toNumber(config.demandVolatility, 0.18);
    const priceElasticity = toNumber(config.priceElasticity, 0.35);
    const defectVol = toNumber(config.defectVolatility ?? config.returnsVolatility, 0.12);
    if (demandVol >= 0.35) risks.push(`${niche.name}: demand volatility remains high.`);
    if (priceElasticity >= 0.5) risks.push(`${niche.name}: price sensitivity is elevated.`);
    if (defectVol >= 0.3) risks.push(`${niche.name}: quality risk needs monitoring.`);
    if (risks.length >= max) break;
  }
  return risks.slice(0, max);
}

export const DecisionWizardPage: React.FC = () => {
  const ws = useWorldState();
  const world = useWorld();

  const worldId = ws.worldId ? String(ws.worldId) : null;
  const worldRecord = ws.world as World | null;
  const economy = ws.economy as WorldEconomyState | null;
  const holding = ws.holding as Holding | null;
  const holdingId = holding?.id ? String(holding.id) : null;
  const currentYear = Number(economy?.currentYear ?? 0);
  const currentWeek = Number(economy?.currentWeek ?? 0);
  const isTicking = world.isTicking;

  const [activeStep, setActiveStep] = React.useState<StepKey>("briefing");
  const [compareMode, setCompareMode] = React.useState(true);
  const [commitError, setCommitError] = React.useState<string | null>(null);
  const [holdingPolicy, setHoldingPolicy] = React.useState<HoldingPolicyDraft>({
    riskAppetite: "MEDIUM",
    dividendPreference: "REINVEST",
    maxLeverageRatio: 1.5,
  });

  const companies = ws.companies as any[];
  const companyIds = React.useMemo(() => companies.map((c) => String(c.id)), [companies]);
  const companyIdsKey = companyIds.join("|");

  const sectorsQuery = useQuery({
    queryKey: ["wizardSectors"],
    queryFn: async () => sectorRepo.listSectors(),
    staleTime: 60_000,
  });

  const sectorsById = React.useMemo(() => {
    const map = new Map<string, Sector>();
    (sectorsQuery.data ?? []).forEach((sector) => map.set(String(sector.id), sector));
    return map;
  }, [sectorsQuery.data]);

  const playableCompanies = React.useMemo(() => {
    if (sectorsById.size === 0) return companies;
    return companies.filter((company) => {
      const sector = sectorsById.get(String(company.sectorId));
      return isSectorPlayable(sector?.code);
    });
  }, [companies, sectorsById]);

  const playerCompanyIds = React.useMemo(
    () => new Set(playableCompanies.map((company) => String(company.id))),
    [playableCompanies]
  );

  const companyNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    playableCompanies.forEach((company) => {
      map.set(String(company.id), String(company.name ?? "Company"));
    });
    return map;
  }, [playableCompanies]);

  const nicheIds = React.useMemo(
    () => Array.from(new Set(playableCompanies.map((c) => String(c.nicheId)).filter(Boolean))),
    [playableCompanies]
  );

  const nichesQuery = useQuery({
    queryKey: ["wizardNiches", nicheIds.join("|")],
    queryFn: async () => {
      if (nicheIds.length === 0) return [];
      return Promise.all(nicheIds.map((id) => sectorRepo.getNicheById(asNicheId(id))));
    },
    enabled: nicheIds.length > 0,
    staleTime: 60_000,
  });

  const nichesById = React.useMemo(() => {
    const map = new Map<string, Niche>();
    (nichesQuery.data ?? []).forEach((niche) => {
      if (niche) map.set(String(niche.id), niche as Niche);
    });
    return map;
  }, [nichesQuery.data]);

  const startupCostByNicheId = React.useMemo(() => {
    const map = new Map<string, number>();
    nichesById.forEach((niche, id) => {
      const startupCost = toNumber((niche as any).startupCostEur, toNumber((niche as any).startup_cost_eur, 0));
      map.set(id, startupCost);
    });
    return map;
  }, [nichesById]);

  const statesQuery = useQuery({
    queryKey: ["wizardStates", companyIdsKey],
    queryFn: async () => {
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          state: await companyService.getLatestState(asCompanyId(id)),
        }))
      );
    },
    enabled: companyIds.length > 0,
    staleTime: 5_000,
  });

  const financialsQuery = useQuery({
    queryKey: ["wizardFinancials", companyIdsKey],
    queryFn: async () => {
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          financials: await companyService.getLatestFinancials(asCompanyId(id)),
        }))
      );
    },
    enabled: companyIds.length > 0,
    staleTime: 5_000,
  });

  const decisionsQuery = useQuery({
    queryKey: ["wizardDecisions", worldId ?? "none", companyIdsKey, currentYear, currentWeek],
    queryFn: async () => {
      if (!worldId || companyIds.length === 0) return [];
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          decisions: await decisionService.listCompanyDecisions({
            worldId: asWorldId(worldId),
            companyId: asCompanyId(id),
            year: currentYear as any,
            week: currentWeek as any,
          }),
        }))
      );
    },
    enabled: !!worldId && companyIds.length > 0,
    staleTime: 2_500,
  });

  const holdingDecisionsQuery = useQuery({
    queryKey: ["wizardHoldingDecisions", worldId ?? "none", currentYear, currentWeek],
    queryFn: async () => {
      if (!worldId || !holdingId) return [];
      return decisionService.listHoldingDecisions({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year: currentYear as any,
        week: currentWeek as any,
      });
    },
    enabled: !!worldId && !!holdingId,
    staleTime: 2_500,
  });

  const upgradesQuery = useQuery({
    queryKey: ["wizardCompanyUpgrades", companyIdsKey],
    queryFn: async () => {
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          upgrades: await upgradeService.listCompanyUpgrades(asCompanyId(id)),
        }))
      );
    },
    enabled: companyIds.length > 0,
    staleTime: 60_000,
  });

  const nicheUpgradesQuery = useQuery({
    queryKey: ["wizardNicheUpgrades", nicheIds.join("|")],
    queryFn: async () => {
      if (nicheIds.length === 0) return [] as Array<{ nicheId: string; upgrades: any[] }>;
      return Promise.all(
        nicheIds.map(async (id) => ({
          nicheId: id,
          upgrades: await upgradeService.listNicheUpgrades(asNicheId(id)),
        }))
      );
    },
    enabled: nicheIds.length > 0,
    staleTime: 60_000,
  });

  const nicheProductsQuery = useQuery({
    queryKey: ["wizardNicheProducts", nicheIds.join("|")],
    queryFn: async () => {
      if (nicheIds.length === 0) return [] as Array<{ nicheId: string; products: any[] }>;
      return Promise.all(
        nicheIds.map(async (id) => ({
          nicheId: id,
          products: await nicheProductRepo.listByNiche(asNicheId(id)),
        }))
      );
    },
    enabled: nicheIds.length > 0,
    staleTime: 60_000,
  });

  const briefingQuery = useQuery({
    queryKey: ["wizardBriefing", worldId ?? "none"],
    queryFn: async () => {
      if (!worldId) return { sectorRows: [], events: [] };
      const [sectorStates, sectors, events] = await Promise.all([
        sectorRepo.listWorldSectorStates(asWorldId(worldId)),
        sectorRepo.listSectors(),
        eventRepo.listRecent({ worldId: asWorldId(worldId), limit: 30 }),
      ]);

      const sectorNameById: Record<string, string> = {};
      sectors.forEach((sector) => {
        sectorNameById[String(sector.id)] = sector.name;
      });

      const sectorRows = (sectorStates ?? []).map((row) => ({
        sectorId: String(row.sectorId),
        sectorName: sectorNameById[String(row.sectorId)],
        currentDemand: toNumber((row as any).currentDemand, 0),
        trendFactor: toNumber(row.trendFactor, 1),
        volatility: toNumber(row.volatility, 0.2),
        lastRoundMetrics: (row as any).lastRoundMetrics ?? {},
      }));

      return { sectorRows, events };
    },
    enabled: !!worldId,
    staleTime: 10_000,
  });

  const marketShareQuery = useQuery({
    queryKey: ["wizardMarketShare", worldId ?? "none", holdingId ?? "none"],
    queryFn: async () => {
      if (!worldId || !holdingId) return [];
      return scoreboardService.getHoldingMarketShareBySector(asWorldId(worldId), holdingId);
    },
    enabled: !!worldId && !!holdingId,
    staleTime: 10_000,
  });

  const stateById = React.useMemo(() => {
    const map = new Map<string, any>();
    (statesQuery.data ?? []).forEach((row) => map.set(row.companyId, row.state ?? null));
    return map;
  }, [statesQuery.data]);

  const financialsById = React.useMemo(() => {
    const map = new Map<string, any>();
    (financialsQuery.data ?? []).forEach((row) => map.set(row.companyId, row.financials ?? null));
    return map;
  }, [financialsQuery.data]);

  const marketShares = React.useMemo<BriefingMarketShare[]>(() => {
    return (marketShareQuery.data ?? []).map((row: any) => ({
      sectorName: String(row.sectorName ?? "Sector"),
      share: toNumber(row.share, 0),
      holdingRevenue: toNumber(row.holdingRevenue, 0),
      sectorRevenue: toNumber(row.sectorRevenue, 0),
    }));
  }, [marketShareQuery.data]);

  const eventSignals = React.useMemo<BriefingEventSignal[]>(() => {
    const events = briefingQuery.data?.events ?? [];
    return (events ?? []).map((event: any) => {
      const rawScope = String(event?.scope ?? "WORLD");
      let briefingScope: BriefingScope = "macro";

      if (rawScope === "SECTOR") {
        briefingScope = "sector";
      } else if (rawScope === "COMPANY") {
        briefingScope = playerCompanyIds.has(String(event?.companyId)) ? "company" : "competitor";
      } else if (rawScope === "HOLDING") {
        briefingScope = "company";
      }

      const payload =
        event?.payload && typeof event.payload === "object"
          ? (event.payload as Record<string, unknown>)
          : {};

      const sectorName = event?.sectorId ? sectorsById.get(String(event.sectorId))?.name : null;
      const companyName = event?.companyId ? companyNameById.get(String(event.companyId)) : null;
      const targetLabel =
        companyName ??
        sectorName ??
        (rawScope === "WORLD" ? "Global" : rawScope === "HOLDING" ? "Holding" : "Market");

      return {
        id: String(event?.id ?? `${rawScope}-${event?.type ?? "event"}-${event?.createdAt ?? "time"}`),
        scope: rawScope,
        type: event?.type ? String(event.type) : null,
        severity: Number(event?.severity ?? 1),
        title: payload.title != null ? String(payload.title) : null,
        summary:
          payload.summary != null ? String(payload.summary) : payload.note != null ? String(payload.note) : null,
        targetLabel,
        sectorId: event?.sectorId ? String(event.sectorId) : null,
        companyId: event?.companyId ? String(event.companyId) : null,
        holdingId: event?.holdingId ? String(event.holdingId) : null,
        briefingScope,
        payload,
      } as BriefingEventSignal;
    });
  }, [briefingQuery.data?.events, playerCompanyIds, sectorsById, companyNameById]);

  const decisionPayloadsByCompany = React.useMemo(() => {
    const map = new Map<string, CompanyDecisionPayload[]>();
    (decisionsQuery.data ?? []).forEach((row) => {
      map.set(row.companyId, decisionPayloadsFromRows(row.decisions ?? []));
    });
    return map;
  }, [decisionsQuery.data]);

  const baselineCompanyDecisions = React.useMemo(() => {
    const output: Record<string, CompanyDecisionPayload[]> = {};
    decisionPayloadsByCompany.forEach((payloads, companyId) => {
      output[companyId] = payloads.filter((payload) => payload.type !== "BUY_UPGRADE");
    });
    return output;
  }, [decisionPayloadsByCompany]);

  const baselineUpgradeQueue = React.useMemo(() => {
    const queue: Array<{ companyId: string; upgradeId: string }> = [];
    decisionPayloadsByCompany.forEach((payloads, companyId) => {
      payloads
        .filter((payload) => payload.type === "BUY_UPGRADE")
        .forEach((payload) => {
          const upgradeId = String((payload as any).upgradeId ?? "");
          if (upgradeId) queue.push({ companyId, upgradeId });
        });
    });
    return queue;
  }, [decisionPayloadsByCompany]);

  const ownedUpgradesByCompany = React.useMemo(() => {
    const map = new Map<string, any>();
    (upgradesQuery.data ?? []).forEach((row) => map.set(row.companyId, row.upgrades ?? []));
    return map;
  }, [upgradesQuery.data]);

  const nicheUpgradesByCompany = React.useMemo(() => {
    const upgradesByNiche = new Map<string, any[]>();
    (nicheUpgradesQuery.data ?? []).forEach((row) => {
      upgradesByNiche.set(row.nicheId, row.upgrades ?? []);
    });

    const map = new Map<string, any[]>();
    playableCompanies.forEach((company) => {
      const upgrades = upgradesByNiche.get(String(company.nicheId)) ?? [];
      map.set(String(company.id), upgrades);
    });
    return map;
  }, [nicheUpgradesQuery.data, playableCompanies]);

  const nicheProductsById = React.useMemo(() => {
    const map = new Map<string, NicheProduct[]>();
    (nicheProductsQuery.data ?? []).forEach((row) => {
      map.set(row.nicheId, row.products ?? []);
    });
    return map;
  }, [nicheProductsQuery.data]);

  const unlockedProductsByCompany = React.useMemo(() => {
    const map = new Map<string, Set<string>>();

    playableCompanies.forEach((company) => {
      const companyId = String(company.id);
      const niche = nichesById.get(String(company.nicheId));
      const config = (niche as any)?.config ?? {};
      const starting = Array.isArray(config?.startingLoadout?.unlockedProducts)
        ? config.startingLoadout.unlockedProducts.map((sku: unknown) => String(sku))
        : [];

      const unlocked = new Set<string>();
      if (starting.length > 0) {
        starting.forEach((sku: string) => unlocked.add(String(sku)));
      }

      const availableUpgrades = nicheUpgradesByCompany.get(companyId) ?? [];
      const upgradeById = new Map(availableUpgrades.map((upgrade) => [String(upgrade.id), upgrade]));
      const ownedUpgrades = ownedUpgradesByCompany.get(companyId) ?? [];

      ownedUpgrades.forEach((owned) => {
        const upgrade = upgradeById.get(String(owned.upgradeId));
        const effects = Array.isArray((upgrade as any)?.effects) ? (upgrade as any).effects : [];
        effects.forEach((effect: any) => {
          if (String(effect?.key ?? "") !== "unlock_products") return;
          const value = effect?.value;
          if (!Array.isArray(value)) return;
          value.forEach((sku: unknown) => unlocked.add(String(sku)));
        });
      });

      map.set(companyId, unlocked);
    });

    return map;
  }, [playableCompanies, nichesById, nicheUpgradesByCompany, ownedUpgradesByCompany]);

  const upgradesById = React.useMemo(() => {
    const map: Record<string, { cost?: number }> = {};
    (nicheUpgradesQuery.data ?? []).forEach((row) => {
      const startupCost = startupCostByNicheId.get(String(row.nicheId)) ?? 0;
      (row.upgrades ?? []).forEach((upgrade: any) => {
        const estimate = estimateUpgradeCapex({
          cost: upgrade.cost,
          capexFormula: upgrade.capexFormula,
          capexPctRange: upgrade.capexPctRange,
          startupCost,
        });
        map[String(upgrade.id)] = { cost: estimate };
      });
    });
    return map;
  }, [nicheUpgradesQuery.data, startupCostByNicheId]);

  const upgradeSpendByCompany = React.useMemo(() => {
    const map = new Map<string, number>();
    const prev = previousRound(currentYear, currentWeek);
    ownedUpgradesByCompany.forEach((upgrades, companyId) => {
      const total = (upgrades ?? [])
        .filter(
          (upgrade: any) =>
            Number(upgrade.purchasedYear ?? 0) === prev.year &&
            Number(upgrade.purchasedWeek ?? 0) === prev.week
        )
        .reduce((sum: number, upgrade: any) => {
          const upgradeId = String(upgrade.upgradeId ?? "");
          return sum + toNumber(upgradesById[upgradeId]?.cost, 0);
        }, 0);
      map.set(companyId, total);
    });
    return map;
  }, [ownedUpgradesByCompany, upgradesById, currentYear, currentWeek]);

  const projectionCompanies = React.useMemo(() => {
    return playableCompanies.map((company) => ({
      company: company as any,
      state: stateById.get(String(company.id)) ?? null,
      financials: financialsById.get(String(company.id)) ?? null,
      sectorCode: sectorsById.get(String(company.sectorId))?.code ?? null,
      nicheConfig: nichesById.get(String(company.nicheId))?.config ?? null,
      decisions: baselineCompanyDecisions[String(company.id)] ?? [],
    }));
  }, [playableCompanies, stateById, financialsById, sectorsById, nichesById, baselineCompanyDecisions]);

  const baselineProjection = React.useMemo(() => {
    if (!holding) return null;
    return buildBaselineProjection({
      world: worldRecord ?? null,
      economy,
      holding,
      companies: projectionCompanies,
      holdingDecisions: (holdingDecisionsQuery.data ?? []).map((d: any) => d.payload) as HoldingDecisionPayload[],
      upgradesById,
    });
  }, [worldRecord, economy, holding, projectionCompanies, holdingDecisionsQuery.data, upgradesById]);

  const decisionDraft = useDecisionDraft({
    worldId,
    baselineCompanyDecisions,
    baselineUpgradeQueue,
  });

  const { historyDepth, draftCompanyDecisions, draftUpgradeQueue } = decisionDraft;

  React.useEffect(() => {
    if (!baselineProjection) return;
    if (historyDepth > 0) return;
    if (Object.keys(draftCompanyDecisions).length > 0) return;
    if (draftUpgradeQueue.length > 0) return;
    decisionDraft.resetToBaseline();
  }, [baselineProjection, historyDepth, draftCompanyDecisions, draftUpgradeQueue, decisionDraft.resetToBaseline]);

  const whatIfProjection = React.useMemo(() => {
    if (!baselineProjection || !holding) return null;
    return buildWhatIfProjection({
      world: worldRecord ?? null,
      economy,
      holding,
      companies: projectionCompanies,
      holdingDecisions: (holdingDecisionsQuery.data ?? []).map((d: any) => d.payload) as HoldingDecisionPayload[],
      upgradesById,
      baseline: baselineProjection,
      draftCompanyDecisions: decisionDraft.draftCompanyDecisions,
      draftHoldingAllocations: decisionDraft.draftHoldingAllocations,
      draftUpgradeQueue: decisionDraft.draftUpgradeQueue,
    });
  }, [
    worldRecord,
    economy,
    holding,
    projectionCompanies,
    holdingDecisionsQuery.data,
    upgradesById,
    baselineProjection,
    decisionDraft.draftCompanyDecisions,
    decisionDraft.draftHoldingAllocations,
    decisionDraft.draftUpgradeQueue,
  ]);

  const briefingCards = React.useMemo(() => {
    const rows = briefingQuery.data?.sectorRows ?? [];
    const companyContexts = playableCompanies.map((company) => {
      const fin = financialsById.get(String(company.id));
      const state = stateById.get(String(company.id));
      const sector = sectorsById.get(String(company.sectorId));
      const niche = nichesById.get(String(company.nicheId));
      return {
        companyId: String(company.id),
        companyName: String(company.name),
        sectorCode: sector?.code ?? null,
        sectorName: sector?.name ?? null,
        nicheName: niche?.name ?? null,
        revenue: toNumber(fin?.revenue, 0),
        cogs: toNumber(fin?.cogs, 0),
        opex: toNumber(fin?.opex, 0),
        interestCost: toNumber(fin?.interestCost, 0),
        marketingLevel: toNumber(state?.marketingLevel, 0),
        capacity: toNumber(state?.capacity, 0),
        utilisationRate: toNumber(state?.utilisationRate, 0),
        upgradeSpend: toNumber(upgradeSpendByCompany.get(String(company.id)), 0),
        profit: toNumber(fin?.netProfit, 0),
        cashChange: toNumber(fin?.cashChange, 0),
      };
    });

    return deriveBriefing({
      macroModifiers: economy?.macroModifiers ?? null,
      sectorRows: rows,
      companies: companyContexts,
      events: eventSignals,
      marketShares,
    });
  }, [
    briefingQuery.data,
    ws.economy,
    playableCompanies,
    financialsById,
    stateById,
    sectorsById,
    nichesById,
    eventSignals,
    marketShares,
    upgradeSpendByCompany,
  ]);

  const keyRisks = React.useMemo(() => buildKeyRisks(Array.from(nichesById.values())), [nichesById]);

  const summaryProjection = compareMode ? whatIfProjection : baselineProjection;

  const onCommit = async () => {
    if (!worldId || !holdingId || !economy) return;
    setCommitError(null);

    const holdingPayloads: HoldingDecisionPayload[] = [];

    Object.entries(decisionDraft.draftHoldingAllocations).forEach(([companyId, amount]) => {
      if (!amount) return;
      if (amount > 0) {
        holdingPayloads.push({ type: "INJECT_CAPITAL", companyId: companyId as any, amount } as any);
      } else {
        holdingPayloads.push({ type: "WITHDRAW_DIVIDEND", companyId: companyId as any, amount: Math.abs(amount) } as any);
      }
    });

    if (holdingPolicy) {
      holdingPayloads.push({
        type: "SET_HOLDING_POLICY",
        maxLeverageRatio: holdingPolicy.maxLeverageRatio as any,
        dividendPreference: holdingPolicy.dividendPreference,
        riskAppetite: holdingPolicy.riskAppetite,
      } as any);
    }

    const year = currentYear as any;
    const week = currentWeek as any;

    await Promise.all(
      playableCompanies.map(async (company) => {
        const companyId = String(company.id);
        const decisions = decisionDraft.draftCompanyDecisions[companyId] ?? [];
        const upgradePayloads: CompanyDecisionPayload[] = decisionDraft.draftUpgradeQueue
          .filter((upgrade) => upgrade.companyId === companyId)
          .map((upgrade) => ({ type: "BUY_UPGRADE", upgradeId: upgrade.upgradeId } as any));

        const payloads = [...decisions, ...upgradePayloads];

        await decisionService.saveCompanyDecisions({
          companyId: asCompanyId(companyId),
          worldId: asWorldId(worldId),
          year,
          week,
          source: "PLAYER" as any,
          payloads,
        });
      })
    );

    if (holdingPayloads.length > 0) {
      await decisionService.clearHoldingDecisions({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
        year,
        week,
      });
      for (const payload of holdingPayloads) {
        await decisionService.submitHoldingDecision({
          worldId: asWorldId(worldId),
          holdingId: asHoldingId(holdingId),
          year,
          week,
          source: "PLAYER" as any,
          payload,
        });
      }
    }

    try {
      await engineService.runWorldTick(asWorldId(worldId));
    } catch (error) {
      setCommitError(String((error as Error)?.message ?? error ?? "Tick failed"));
    } finally {
      decisionDraft.setSoftCommit(false);
    }
  };

  const onSave = async () => {
    if (!worldId || !holdingId || !economy) return;
    setCommitError(null);

    const holdingPayloads: HoldingDecisionPayload[] = [];

    Object.entries(decisionDraft.draftHoldingAllocations).forEach(([companyId, amount]) => {
      if (!amount) return;
      if (amount > 0) {
        holdingPayloads.push({ type: "INJECT_CAPITAL", companyId: companyId as any, amount } as any);
      } else {
        holdingPayloads.push({ type: "WITHDRAW_DIVIDEND", companyId: companyId as any, amount: Math.abs(amount) } as any);
      }
    });

    if (holdingPolicy) {
      holdingPayloads.push({
        type: "SET_HOLDING_POLICY",
        maxLeverageRatio: holdingPolicy.maxLeverageRatio as any,
        dividendPreference: holdingPolicy.dividendPreference,
        riskAppetite: holdingPolicy.riskAppetite,
      } as any);
    }

    const year = currentYear as any;
    const week = currentWeek as any;

    try {
      await Promise.all(
        playableCompanies.map(async (company) => {
          const companyId = String(company.id);
          const decisions = decisionDraft.draftCompanyDecisions[companyId] ?? [];
          const upgradePayloads: CompanyDecisionPayload[] = decisionDraft.draftUpgradeQueue
            .filter((upgrade) => upgrade.companyId === companyId)
            .map((upgrade) => ({ type: "BUY_UPGRADE", upgradeId: upgrade.upgradeId } as any));

          const payloads = [...decisions, ...upgradePayloads];

          await decisionService.saveCompanyDecisions({
            companyId: asCompanyId(companyId),
            worldId: asWorldId(worldId),
            year,
            week,
            source: "PLAYER" as any,
            payloads,
          });
        })
      );

      if (holdingPayloads.length > 0) {
        await decisionService.clearHoldingDecisions({
          worldId: asWorldId(worldId),
          holdingId: asHoldingId(holdingId),
          year,
          week,
        });
        for (const payload of holdingPayloads) {
          await decisionService.submitHoldingDecision({
            worldId: asWorldId(worldId),
            holdingId: asHoldingId(holdingId),
            year,
            week,
            source: "PLAYER" as any,
            payload,
          });
        }
      }
    } catch (error) {
      setCommitError(String((error as Error)?.message ?? error ?? "Save failed"));
    }
  };

  if (ws.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Card className="p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Loading wizard...</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Preparing your decision flow.</div>
        </Card>
      </div>
    );
  }

  if (ws.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Card className="p-5 border border-rose-200 bg-rose-50">
          <div className="text-sm font-semibold text-rose-800">Unable to load decisions</div>
          <div className="mt-1 text-xs text-rose-700">{String(ws.error)}</div>
        </Card>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((step) => step.key === activeStep);
  const canGoBack = activeIndex > 0;
  const canGoNext = activeIndex < STEPS.length - 1;
  const safeToSpend = summaryProjection?.safeToSpendCash ?? 0;
  const worstEndCash = summaryProjection?.riskBandEndCash.worst ?? 0;
  const expectedEndCash = summaryProjection?.expectedEndCash ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--text)]">Decision Wizard</div>
          <div className="text-xs text-[var(--text-muted)]">
            Safe to spend {formatCurrencyCompact(safeToSpend)} - {compareMode ? "Comparing" : "Baseline view"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => decisionDraft.undo()} disabled={decisionDraft.historyDepth === 0}>
            Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => decisionDraft.resetToBaseline()}>
            Reset
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setCompareMode((prev) => !prev)}>
            {compareMode ? "Hide compare" : "Compare"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <WizardStepper
          steps={STEPS}
          activeKey={activeStep}
          onSelect={(key) => setActiveStep(key as StepKey)}
        />
      </div>

      <div className="mt-6 space-y-6">
        {activeStep === "briefing" ? <MarketBriefingInbox cards={briefingCards} /> : null}

        {activeStep === "baseline" ? (
          <BaselineForecastPanel baseline={baselineProjection} whatIf={compareMode ? whatIfProjection : null} />
        ) : null}

        {activeStep === "companies" ? (
          <CompanyDecisionPanel
            companies={playableCompanies as any}
            sectorsById={sectorsById}
            nichesById={nichesById}
            nicheProductsById={nicheProductsById}
            unlockedProductsByCompany={unlockedProductsByCompany}
            statesById={stateById}
            baseline={baselineProjection}
            whatIf={compareMode ? whatIfProjection : null}
            draftDecisions={decisionDraft.draftCompanyDecisions}
            onDecisionChange={decisionDraft.setCompanyDecision}
            onPreset={decisionDraft.setCompanyDecisions}
            disabled={decisionDraft.softCommitted || isTicking}
          />
        ) : null}

        {activeStep === "holding" ? (
          <HoldingDecisionPanel
            companies={playableCompanies as any}
            draftHoldingAllocations={decisionDraft.draftHoldingAllocations}
            onAllocationChange={decisionDraft.setHoldingAllocation}
            policy={holdingPolicy}
            onPolicyChange={setHoldingPolicy}
            safeToSpend={safeToSpend}
            disabled={decisionDraft.softCommitted || isTicking}
          />
        ) : null}

        {activeStep === "upgrades" ? (
          <UpgradeTimelinePanel
            companies={playableCompanies as any}
            upgradesByCompany={nicheUpgradesByCompany as any}
            ownedUpgradesByCompany={ownedUpgradesByCompany as any}
            draftUpgradeQueue={decisionDraft.draftUpgradeQueue}
            upgradeCostById={Object.fromEntries(
              Object.entries(upgradesById).map(([id, value]) => [id, toNumber(value?.cost, 0)])
            )}
            currentYear={currentYear}
            currentWeek={currentWeek}
            onToggleUpgrade={decisionDraft.toggleUpgrade}
            disabled={decisionDraft.softCommitted || isTicking}
          />
        ) : null}

        {activeStep === "review" ? (
          <div className="space-y-4">
            {commitError ? (
              <Card className="p-4 border border-rose-200 bg-rose-50">
                <div className="text-sm font-semibold text-rose-800">Submit failed</div>
                <div className="mt-1 text-xs text-rose-700">{commitError}</div>
              </Card>
            ) : null}
            <ReviewCommitPanel
              baseline={baselineProjection}
              whatIf={compareMode ? whatIfProjection : null}
              keyRisks={keyRisks}
              softCommitted={decisionDraft.softCommitted}
              onSoftCommit={() => decisionDraft.setSoftCommit(true)}
              onUnlock={() => decisionDraft.setSoftCommit(false)}
              onCommit={onCommit}
              disabled={isTicking}
              isTicking={isTicking}
            />
          </div>
        ) : null}
      </div>

      <StickySummaryBar
        safeToSpend={safeToSpend}
        expectedEndCash={expectedEndCash}
        worstEndCash={worstEndCash}
        primaryLabel={activeStep === "review" ? "Submit" : "Next step"}
        secondaryLabel={canGoBack ? "Back" : undefined}
        onSecondary={() => canGoBack && setActiveStep(STEPS[activeIndex - 1].key)}
        saveLabel="Save"
        onSave={() => void onSave()}
        onPrimary={() => {
          if (activeStep === "review") {
            if (decisionDraft.softCommitted) {
              void onCommit();
            } else {
              decisionDraft.setSoftCommit(true);
            }
            return;
          }
          if (canGoNext) {
            setActiveStep(STEPS[activeIndex + 1].key);
          }
        }}
        disabled={isTicking}
      />
    </div>
  );
};

export default DecisionWizardPage;
