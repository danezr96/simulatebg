// src/ui/panels/DecisionsPanel.tsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Save, RefreshCw, SlidersHorizontal } from "lucide-react";

import { MOTION } from "../../config/motion";

import Card from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import Modal from "../components/Modal";
import KPIChip from "../components/KPIChip";
import { cn, formatNumber } from "../../utils/format";
import { money } from "../../utils/money";
import { useCompanies, useCompany } from "../hooks/useCompany";
import { useWorld } from "../hooks/useWorld";
import { useHolding } from "../hooks/useHolding";
import { decisionService } from "../../core/services/decisionService";
import { programService } from "../../core/services/programService";
import { upgradeService } from "../../core/services/upgradeService";
import { companyService } from "../../core/services/companyService";
import { eventRepo } from "../../core/persistence/eventRepo";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { getDecisionModulesForNiche } from "../../core/config/nicheDecisions";
import { getDecisionFieldsForNiche } from "../../core/config/nicheDecisionFields";
import { getDecisionGuidance } from "../../core/config/decisionGuidance";
import type { CompanyDecisionPayload, CompanyProgram, NicheUpgrade, CompanyUpgrade, CompanyState } from "../../core/domain";
import type { DecisionField } from "../../core/config/nicheDecisionFields";
import { asWorldId, asCompanyId, asNicheId, asSectorId } from "../../core/domain";

/**
 * DecisionsPanel (v0)
 * - Select a company
 * - Edit weekly levers (price/marketing/staffing/operations)
 * - Save decisions for the current world week (company_decisions)
 * - Show queued decisions this week
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const formatRange = (min: number, max: number, decimals = 0) => {
  const formatValue = (value: number) =>
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return `${formatValue(min)} - ${formatValue(max)}`;
};
const trendFromValue = (value: number) => (value > 0 ? "up" : value < 0 ? "down" : "neutral");

const TREE_LABELS: Record<string, string> = {
  EXPERIENCE: "Guest experience",
  LOCAL_MARKETING: "Local visibility",
  PROCESS: "Process discipline",
  GROWTH: "Growth engine",
  PRODUCT: "Product polish",
  AUTOMATION: "Automation",
  THROUGHPUT: "Throughput",
  EFFICIENCY: "Efficiency",
  SAFETY: "Safety systems",
  COMPLIANCE: "Compliance",
  RELIABILITY: "Reliability",
  COST_CONTROL: "Cost control",
};

const formatTreeLabel = (treeKey: string) => {
  if (TREE_LABELS[treeKey]) return TREE_LABELS[treeKey];
  return treeKey.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const fieldDecimals = (field: DecisionField) =>
  field.kind === "PRICE" || field.kind === "QUALITY" ? 2 : 0;

const getCurrentValueForField = (
  field: DecisionField,
  state: CompanyState | null | undefined
): number | null => {
  if (!state) return null;
  switch (field.kind) {
    case "PRICE":
      return Number(state.priceLevel ?? 1);
    case "MARKETING":
      return Number(state.marketingLevel ?? 0);
    case "STAFFING":
      return Number(state.employees ?? 0);
    case "CAPACITY":
      return Number(state.capacity ?? 0);
    case "QUALITY":
      return Number(state.qualityScore ?? 1);
    default:
      return null;
  }
};

const getDefaultValueForField = (
  field: DecisionField,
  state: CompanyState | null | undefined
): number => {
  const current = getCurrentValueForField(field, state);
  switch (field.kind) {
    case "PRICE":
    case "MARKETING":
      return current ?? 0;
    case "STAFFING":
    case "CAPACITY":
    case "QUALITY":
      return 0;
    default:
      return current ?? 0;
  }
};

const formatSeconds = (totalSeconds: number | null | undefined) => {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "--";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
};

const weekIndex = (year: number, week: number) => (year - 1) * 52 + week;

const isProgramActive = (program: CompanyProgram, year: number, week: number) => {
  const start = weekIndex(Number(program.startYear), Number(program.startWeek));
  const current = weekIndex(year, week);
  const duration = Math.max(1, Number(program.durationWeeks ?? 1));
  return program.status === "ACTIVE" && current >= start && current < start + duration;
};

const programRemainingWeeks = (program: CompanyProgram, year: number, week: number) => {
  const start = weekIndex(Number(program.startYear), Number(program.startWeek));
  const current = weekIndex(year, week);
  const duration = Math.max(1, Number(program.durationWeeks ?? 1));
  const remaining = start + duration - current;
  return Math.max(0, remaining);
};

type SectorMetricRow = {
  sectorId: string;
  sectorName?: string;
  currentDemand: number;
  trendFactor: number;
  volatility: number;
};

const getPreviousWeek = (year: number, week: number) => {
  if (week <= 1) {
    return { year: Math.max(1, year - 1), week: 52 };
  }
  return { year, week: week - 1 };
};

const getNextWeek = (year: number, week: number) => {
  if (week >= 52) {
    return { year: year + 1, week: 1 };
  }
  return { year, week: week + 1 };
};

const buildOutlookRows = (rows: SectorMetricRow[]) => {
  const enriched = rows.map((row) => {
    const delta = Number(row.trendFactor ?? 1) - 1;
    const direction = delta >= 0.03 ? "Tailwind" : delta <= -0.03 ? "Headwind" : "Stable";
    const volatility = Number(row.volatility ?? 0);
    const volatilityLabel = volatility >= 0.12 ? "High" : volatility >= 0.06 ? "Medium" : "Low";
    return {
      ...row,
      delta,
      direction,
      volatilityLabel,
    };
  });

  return enriched.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
};

export const DecisionsPanel: React.FC = () => {
  const [params] = useSearchParams();
  const fromCompanyId = params.get("companyId") ?? undefined;

  const { world, economy, secondsUntilNextTick, isTicking } = useWorld();
  const { holding } = useHolding();
  const worldId = world?.id ? String(world.id) : undefined;
  const currentYear = Number(economy?.currentYear ?? 1);
  const currentWeek = Number(economy?.currentWeek ?? 1);

  const { companies, isLoading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(fromCompanyId);
  const [activeStep, setActiveStep] = React.useState<"briefing" | "decisions" | "review">("briefing");

  const { company, state, isLoading: companyLoading, refetch } = useCompany(selectedCompanyId);


  const companyIds = React.useMemo(
    () => Array.from(new Set(companies.map((c) => String(c.id)))).sort(),
    [companies]
  );
  const companyIdsKey = companyIds.join("|");

  const nicheQuery = useQuery({
    queryKey: ["niche", company?.nicheId],
    queryFn: async () => {
      if (!company?.nicheId) return null;
      return sectorRepo.getNicheById(asNicheId(String(company.nicheId)));
    },
    enabled: !!company?.nicheId,
    staleTime: 30_000,
  });

  const sectorQuery = useQuery({
    queryKey: ["sector", company?.sectorId],
    queryFn: async () => {
      if (!company?.sectorId) return null;
      return sectorRepo.getSectorById(asSectorId(String(company.sectorId)));
    },
    enabled: !!company?.sectorId,
    staleTime: 60_000,
  });

  const briefingQuery = useQuery({
    queryKey: ["worldBriefing", worldId],
    queryFn: async () => {
      if (!worldId) {
        return { events: [] as any[], sectorRows: [] as SectorMetricRow[] };
      }

      const [recentEvents, worldSectorStates, sectors] = await Promise.all([
        eventRepo.listRecent({ worldId: worldId as any, limit: 40 }),
        (sectorRepo as any).listWorldSectorStates?.(worldId),
        (sectorRepo as any).listSectors?.(),
      ]);

      const sectorNameById: Record<string, string> = {};
      for (const s of Array.isArray(sectors) ? sectors : []) {
        sectorNameById[String((s as any).id)] = String((s as any).name ?? (s as any).id);
      }

      const rows: SectorMetricRow[] = (Array.isArray(worldSectorStates) ? worldSectorStates : []).map((ss: any) => ({
        sectorId: String(ss.sectorId ?? ss.sector_id ?? ""),
        sectorName: sectorNameById[String(ss.sectorId ?? ss.sector_id ?? "")],
        currentDemand: Number(ss.currentDemand ?? ss.current_demand ?? 0),
        trendFactor: Number(ss.trendFactor ?? ss.trend_factor ?? 1),
        volatility: Number(ss.volatility ?? 0),
      }));

      return {
        events: Array.isArray(recentEvents) ? recentEvents : [],
        sectorRows: rows,
      };
    },
    enabled: !!worldId,
    staleTime: 10_000,
  });

  const companyFinancialsQuery = useQuery({
    queryKey: ["companyLatestFinancials", companyIdsKey],
    queryFn: async () => {
      if (!companyIds.length) return [];
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

  const queuedSummaryQuery = useQuery({
    queryKey: ["companyQueuedDecisions", companyIdsKey, worldId, currentYear, currentWeek],
    queryFn: async () => {
      if (!worldId || !companyIds.length) return [];
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

  const portfolioNicheIds = React.useMemo(
    () => Array.from(new Set(companies.map((c) => String(c.nicheId ?? "")).filter(Boolean))).sort(),
    [companies]
  );

  const portfolioUpgradesQuery = useQuery({
    queryKey: ["portfolioUpgrades", portfolioNicheIds.join("|")],
    queryFn: async () => {
      if (!portfolioNicheIds.length) return [] as NicheUpgrade[];
      const rows = await Promise.all(
        portfolioNicheIds.map((id) => upgradeService.listNicheUpgrades(asNicheId(id)))
      );
      return rows.flat();
    },
    enabled: portfolioNicheIds.length > 0,
    staleTime: 60_000,
  });

  const niche = nicheQuery.data ?? null;
  const sector = sectorQuery.data ?? null;
  const decisionModules = React.useMemo(() => getDecisionModulesForNiche(niche), [niche]);
  const decisionFields = React.useMemo(() => getDecisionFieldsForNiche(niche), [niche]);
  const guidance = React.useMemo(() => getDecisionGuidance(niche, sector, state), [niche, sector, state]);
  const briefing = briefingQuery.data ?? { events: [], sectorRows: [] };
  const previousWeek = React.useMemo(() => getPreviousWeek(currentYear, currentWeek), [currentYear, currentWeek]);
  const nextWeek = React.useMemo(() => getNextWeek(currentYear, currentWeek), [currentYear, currentWeek]);
  const eventsLastWeek = React.useMemo(
    () =>
      (briefing.events ?? []).filter(
        (e: any) =>
          Number(e.year ?? 0) === previousWeek.year && Number(e.week ?? 0) === previousWeek.week
      ),
    [briefing.events, previousWeek.year, previousWeek.week]
  );
  const outlookRows = React.useMemo(
    () => buildOutlookRows(briefing.sectorRows ?? []),
    [briefing.sectorRows]
  );
  const companyFinancialsMap = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const row of companyFinancialsQuery.data ?? []) {
      map.set(row.companyId, row.financials ?? null);
    }
    return map;
  }, [companyFinancialsQuery.data]);
  const portfolioTotals = React.useMemo(() => {
    let revenue = 0;
    let netProfit = 0;
    let cashChange = 0;
    for (const fin of companyFinancialsMap.values()) {
      if (!fin) continue;
      revenue += Number(fin.revenue ?? 0);
      netProfit += Number(fin.netProfit ?? 0);
      cashChange += Number(fin.cashChange ?? 0);
    }
    return { revenue, netProfit, cashChange };
  }, [companyFinancialsMap]);
  const queuedByCompany = React.useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of queuedSummaryQuery.data ?? []) {
      map.set(row.companyId, row.decisions ?? []);
    }
    return map;
  }, [queuedSummaryQuery.data]);
  const queueCountByCompanyId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const [companyId, decisions] of queuedByCompany.entries()) {
      map.set(companyId, decisions.length);
    }
    return map;
  }, [queuedByCompany]);
  const queuedDecisionsAll = React.useMemo(() => {
    const rows: Array<{ companyId: string; decision: any }> = [];
    for (const [companyId, decisions] of queuedByCompany.entries()) {
      for (const decision of decisions) {
        rows.push({ companyId, decision });
      }
    }
    return rows;
  }, [queuedByCompany]);
  const upgradeByIdForPortfolio = React.useMemo(() => {
    const map = new Map<string, { name: string; cost: number }>();
    for (const upgrade of portfolioUpgradesQuery.data ?? []) {
      map.set(String(upgrade.id), {
        name: String(upgrade.name ?? "Upgrade"),
        cost: Number(upgrade.cost ?? 0),
      });
    }
    return map;
  }, [portfolioUpgradesQuery.data]);
  const budgetSummary = React.useMemo(() => {
    let upgradeSpend = 0;
    let unknownUpgradeCount = 0;
    let programWeeklySpend = 0;
    let programCommitSpend = 0;
    let marketingIndexTotal = 0;

    for (const { decision } of queuedDecisionsAll) {
      const payload = (decision as any)?.payload ?? {};
      switch (payload.type) {
        case "BUY_UPGRADE": {
          const upgradeId = String(payload.upgradeId ?? "");
          const upgrade = upgradeByIdForPortfolio.get(upgradeId);
          if (upgrade) upgradeSpend += upgrade.cost;
          else unknownUpgradeCount += 1;
          break;
        }
        case "START_PROGRAM": {
          const weekly = Number(payload.weeklyCost ?? 0);
          const duration = Math.max(1, Number(payload.durationWeeks ?? 1));
          programWeeklySpend += weekly;
          programCommitSpend += weekly * duration;
          break;
        }
        case "SET_MARKETING": {
          marketingIndexTotal += Number(payload.marketingLevel ?? 0);
          break;
        }
        default:
          break;
      }
    }

    return {
      upgradeSpend,
      unknownUpgradeCount,
      programWeeklySpend,
      programCommitSpend,
      marketingIndexTotal,
    };
  }, [queuedDecisionsAll, upgradeByIdForPortfolio]);
  const companyById = React.useMemo(() => {
    const map = new Map<string, { name: string; region?: string }>();
    for (const c of companies) {
      map.set(String(c.id), { name: String(c.name ?? "Company"), region: String(c.region ?? "") });
    }
    return map;
  }, [companies]);
  const formatDecisionSummary = React.useCallback(
    (payload: any) => {
      if (!payload || typeof payload !== "object") return "Decision";
      switch (payload.type) {
        case "SET_PRICE":
          return `Price level ${Number(payload.priceLevel ?? 0).toFixed(2)}x`;
        case "SET_MARKETING":
          return `Marketing level ${Math.round(Number(payload.marketingLevel ?? 0))}`;
        case "SET_STAFFING":
          return `Staff target ${Number(payload.targetEmployees ?? 0)}`;
        case "INVEST_CAPACITY":
          return `Invest capacity +${Math.round(Number(payload.addCapacity ?? 0))}`;
        case "INVEST_QUALITY":
          return `Invest quality +${Number(payload.addQuality ?? 0).toFixed(2)}`;
        case "START_PROGRAM":
          return String(payload.label ?? payload.programType ?? "Program");
        case "BUY_UPGRADE": {
          const upgrade = upgradeByIdForPortfolio.get(String(payload.upgradeId ?? ""));
          return upgrade?.name ?? "Upgrade";
        }
        default:
          return String(payload.type ?? "Decision");
      }
    },
    [upgradeByIdForPortfolio]
  );
  const formatDecisionCost = React.useCallback(
    (payload: any) => {
      if (!payload || typeof payload !== "object") return "--";
      switch (payload.type) {
        case "BUY_UPGRADE": {
          const upgrade = upgradeByIdForPortfolio.get(String(payload.upgradeId ?? ""));
          return upgrade ? money.format(upgrade.cost) : "Unknown";
        }
        case "START_PROGRAM": {
          const weekly = Number(payload.weeklyCost ?? 0);
          return weekly > 0 ? `${money.format(weekly)} / week` : "--";
        }
        default:
          return "--";
      }
    },
    [upgradeByIdForPortfolio]
  );
  const selectedFinancials = selectedCompanyId ? companyFinancialsMap.get(selectedCompanyId) : null;
  const selectedQueueCount = selectedCompanyId ? queueCountByCompanyId.get(selectedCompanyId) ?? 0 : 0;

  const programsQuery = useQuery({
    queryKey: ["companyPrograms", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return programService.listCompanyPrograms(asCompanyId(selectedCompanyId));
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 5_000,
  });

  const upgradesQuery = useQuery({
    queryKey: ["nicheUpgrades", niche?.id],
    queryFn: async () => {
      if (!niche?.id) return [];
      return upgradeService.listNicheUpgrades(asNicheId(String(niche.id)));
    },
    enabled: !!niche?.id,
    staleTime: 60_000,
  });

  const companyUpgradesQuery = useQuery({
    queryKey: ["companyUpgrades", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return upgradeService.listCompanyUpgrades(asCompanyId(selectedCompanyId));
    },
    enabled: !!selectedCompanyId,
    staleTime: 10_000,
  });

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldValues, setFieldValues] = React.useState<Record<string, number>>({});
  const [moduleSelections, setModuleSelections] = React.useState<Record<string, string>>({});
  const [selectedUpgradeIds, setSelectedUpgradeIds] = React.useState<string[]>([]);

  const [queued, setQueued] = React.useState<Array<{ type: string; payload: any; createdAt?: string }>>([]);
  const [queuedLoading, setQueuedLoading] = React.useState(false);

  // Initialize decision fields from latest state
  React.useEffect(() => {
    if (!decisionFields.length) {
      setFieldValues({});
      return;
    }

    setFieldValues(() => {
      const next: Record<string, number> = {};
      for (const field of decisionFields) {
        next[field.id] = getDefaultValueForField(field, state);
      }
      return next;
    });
  }, [decisionFields, state?.companyId]);

  React.useEffect(() => {
    setModuleSelections({});
    setSelectedUpgradeIds([]);
  }, [selectedCompanyId]);

  React.useEffect(() => {
    if (fromCompanyId) setSelectedCompanyId(fromCompanyId);
  }, [fromCompanyId]);

  const tickStatus = isTicking ? "Tick running" : "Waiting for next tick";
  const canEdit = !!selectedCompanyId && !!worldId && !isTicking;
  const cash = Number(holding?.cashBalance ?? 0);
  const debt = Number(holding?.totalDebt ?? 0);
  const equity = Number(holding?.totalEquity ?? 0);
  const netWorth = cash + equity - debt;
  const totalCommitSpend = budgetSummary.upgradeSpend + budgetSummary.programCommitSpend;
  const budgetOverCash = totalCommitSpend > cash;
  const remainingCash = cash - totalCommitSpend;
  const currentLeversEmpty = !state || decisionFields.length === 0;
  const currentLeversEmptyMessage = !state
    ? "No state found yet (create a company and run a tick)."
    : "No levers available for this niche.";
  const editDisabledReason = !selectedCompanyId
    ? "Select a company first."
    : !worldId
    ? "World not loaded yet."
    : isTicking
    ? "Tick running; edits locked."
    : undefined;

  const activePrograms = React.useMemo(() => {
    const programs = (programsQuery.data ?? []) as CompanyProgram[];
    return programs.filter((p) => isProgramActive(p, currentYear, currentWeek));
  }, [programsQuery.data, currentYear, currentWeek]);

  const nicheUpgrades = (upgradesQuery.data ?? []) as NicheUpgrade[];
  const companyUpgrades = (companyUpgradesQuery.data ?? []) as CompanyUpgrade[];

  const ownedUpgradeIds = React.useMemo(() => {
    return new Set(companyUpgrades.map((u) => String(u.upgradeId)));
  }, [companyUpgrades]);

  const upgradeById = React.useMemo(() => {
    const map = new Map<string, NicheUpgrade>();
    for (const upgrade of nicheUpgrades) {
      map.set(String(upgrade.id), upgrade);
    }
    return map;
  }, [nicheUpgrades]);

  const upgradesByTree = React.useMemo(() => {
    const map = new Map<string, NicheUpgrade[]>();
    for (const upgrade of nicheUpgrades) {
      const key = upgrade.treeKey ?? "GENERAL";
      const list = map.get(key) ?? [];
      list.push(upgrade);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => Number(a.tier ?? 0) - Number(b.tier ?? 0));
    }
    return Array.from(map.entries()).map(([treeKey, upgrades]) => ({ treeKey, upgrades }));
  }, [nicheUpgrades]);

  const ownedTierByTree = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const upgrade of companyUpgrades) {
      const def = upgradeById.get(String(upgrade.upgradeId));
      if (!def) continue;
      const current = map.get(def.treeKey) ?? 0;
      map.set(def.treeKey, Math.max(current, Number(def.tier ?? 0)));
    }
    return map;
  }, [companyUpgrades, upgradeById]);

  const queuedTierByTree = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const upgradeId of selectedUpgradeIds) {
      const def = upgradeById.get(String(upgradeId));
      if (!def) continue;
      map.set(def.treeKey, String(upgradeId));
    }
    return map;
  }, [selectedUpgradeIds, upgradeById]);

  const resolveRangeForField = React.useCallback(
    (field: DecisionField) => {
      const guidanceRange = field.guidanceKey ? guidance?.ranges[field.guidanceKey] : undefined;
      const min = Number(guidanceRange?.min ?? field.min ?? 0);
      const max = Number(guidanceRange?.max ?? field.max ?? min + 1);
      const step = Number(field.step ?? (field.kind === "PRICE" ? 0.05 : 1));
      const unit = field.unit ?? guidanceRange?.unit ?? "";
      const note = guidanceRange?.note ?? field.description ?? "";
      return {
        min,
        max: Math.max(min, max),
        step,
        unit,
        note,
      };
    },
    [guidance]
  );

  const setFieldValue = React.useCallback((fieldId: string, value: number) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const loadQueued = React.useCallback(async () => {
    setError(null);

    if (!worldId || !selectedCompanyId || !economy) {
      setQueued([]);
      return;
    }

    setQueuedLoading(true);
    try {
      const rows = await decisionService.listCompanyDecisions({
        worldId: asWorldId(worldId),
        companyId: selectedCompanyId as any,
        year: currentYear as any,
        week: currentWeek as any,
      });

      setQueued(
        (rows ?? []).map((d: any) => ({
          // Decisions no longer have d.type; type lives in payload.type
          type: String(d.payload?.type ?? "UNKNOWN"),
          payload: d.payload ?? {},
          createdAt: d.createdAt ? String(d.createdAt) : undefined,
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to load queued decisions.");
      setQueued([]);
    } finally {
      setQueuedLoading(false);
    }
  }, [worldId, selectedCompanyId, economy, currentYear, currentWeek]);

  React.useEffect(() => {
    void loadQueued();
  }, [loadQueued]);

  const onSave = async () => {
    setError(null);

    if (!selectedCompanyId) {
      setError("Select a company first.");
      return;
    }
    if (!economy || !worldId) {
      setError("World not loaded yet.");
      return;
    }
    if (isTicking) {
      setError("Tick running; decisions are locked until the next tick.");
      return;
    }

    setSaving(true);
    try {
      const payloads: CompanyDecisionPayload[] = [];

      for (const field of decisionFields) {
        const raw = Number(fieldValues[field.id] ?? 0);
        const range = resolveRangeForField(field);
        const value = clamp(raw, range.min, range.max);

        switch (field.kind) {
          case "PRICE":
            payloads.push({ type: "SET_PRICE", priceLevel: value } as any);
            break;
          case "MARKETING":
            payloads.push({ type: "SET_MARKETING", marketingLevel: value } as any);
            break;
          case "STAFFING": {
            if (value === 0) break;
            const baseEmployees = state?.employees ?? 0;
            const targetEmployees = Math.max(0, Math.floor(baseEmployees + Math.trunc(value)));
            payloads.push({ type: "SET_STAFFING", targetEmployees } as any);
            break;
          }
          case "CAPACITY":
            if (value !== 0) {
              payloads.push({ type: "INVEST_CAPACITY", addCapacity: value } as any);
            }
            break;
          case "QUALITY":
            if (value !== 0) {
              payloads.push({ type: "INVEST_QUALITY", addQuality: value } as any);
            }
            break;
          default:
            break;
        }
      }

      for (const module of decisionModules) {
        const selected = moduleSelections[module.id];
        if (!selected) continue;
        const option = module.options.find((o) => o.id === selected);
        if (option) payloads.push(option.payload);
      }

      for (const upgradeId of selectedUpgradeIds) {
        if (!upgradeId || ownedUpgradeIds.has(upgradeId)) continue;
        payloads.push({ type: "BUY_UPGRADE", upgradeId } as any);
      }

      await decisionService.saveCompanyDecisions({
        companyId: selectedCompanyId as any,
        worldId: asWorldId(worldId),
        year: currentYear as any,
        week: currentWeek as any,
        source: "PLAYER" as any,
        payloads,
      });

      await refetch();
      await loadQueued();
      await queuedSummaryQuery.refetch();
      setOpen(false);
      setSelectedUpgradeIds([]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save decisions.");
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    await refetch();
    await loadQueued();
    await companyFinancialsQuery.refetch();
    await queuedSummaryQuery.refetch();
    await briefingQuery.refetch();
  };

  const steps = [
    {
      key: "briefing" as const,
      label: "Briefing",
      description: "What happened last week and what to expect next.",
    },
    {
      key: "decisions" as const,
      label: "Decisions",
      description: "Plan actions for each company.",
    },
    {
      key: "review" as const,
      label: "Review",
      description: "Check queued actions and budget.",
    },
  ];
  const stepOrder = steps.map((step) => step.key);
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const goNext = () => {
    const next = stepOrder[Math.min(activeStepIndex + 1, stepOrder.length - 1)];
    setActiveStep(next);
  };
  const goPrev = () => {
    const prev = stepOrder[Math.max(activeStepIndex - 1, 0)];
    setActiveStep(prev);
  };

  const activeCompany = React.useMemo(() => {
    if (company) return company;
    if (!selectedCompanyId) return null;
    return companies.find((c) => String(c.id) === String(selectedCompanyId)) ?? null;
  }, [company, companies, selectedCompanyId]);

  const lastWeekSummary = React.useMemo(() => {
    const label = `Year ${previousWeek.year} Week ${previousWeek.week}`;
    if (!eventsLastWeek.length) {
      return `Last week (${label}) was steady with no major events logged.`;
    }
    const highlight = (eventsLastWeek[0] as any) ?? {};
    const payload = highlight.payload ?? {};
    const headline = String(payload.title ?? payload.summary ?? highlight.type ?? "Notable event");
    const suffix = eventsLastWeek.length === 1 ? "" : "s";
    return `Last week (${label}) logged ${eventsLastWeek.length} event${suffix}. Highlight: ${headline}.`;
  }, [eventsLastWeek, previousWeek.year, previousWeek.week]);

  const outlookSummary = React.useMemo(() => {
    const label = `Year ${nextWeek.year} Week ${nextWeek.week}`;
    if (!outlookRows.length) {
      return `No outlook signals yet for ${label}.`;
    }
    const top = outlookRows[0];
    const sectorName = String(top.sectorName ?? top.sectorId ?? "Sector");
    const direction = String(top.direction ?? "Stable").toLowerCase();
    return `Next week (${label}) shows ${direction} pressure in ${sectorName}.`;
  }, [outlookRows, nextWeek.year, nextWeek.week]);

  const eventRows = React.useMemo(() => eventsLastWeek.slice(0, 6), [eventsLastWeek]);

  const ownedUpgradeLabels = React.useMemo(() => {
    return companyUpgrades
      .map((u) => upgradeById.get(String(u.upgradeId))?.name)
      .filter((name): name is string => Boolean(name));
  }, [companyUpgrades, upgradeById]);

  const ownedUpgradePreview = ownedUpgradeLabels.slice(0, 3);
  const ownedUpgradeRemaining = Math.max(ownedUpgradeLabels.length - ownedUpgradePreview.length, 0);

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Weekly flow</div>
          <div className="text-sm text-[var(--text-muted)]">
            {world ? world.name : "World"} | Year {currentYear} Week {currentWeek}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Next tick in <span className="text-[var(--text)]">{formatSeconds(secondsUntilNextTick)}</span>{" "}
            <span className="opacity-60">|</span> {tickStatus}
          </div>
          {isTicking ? (
            <div className="mt-1 text-xs text-[var(--text-muted)]">Editing is locked while the tick runs.</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={onRefresh}
            loading={companyLoading || queuedLoading}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => setOpen(true)}
            disabled={!canEdit}
            title={editDisabledReason}
          >
            Open decision editor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <KPIChip label="Net worth" value={money.format(netWorth)} trend={trendFromValue(netWorth)} />
        <KPIChip label="Cash" value={money.format(cash)} trend="neutral" subtle />
        <KPIChip label="Debt" value={money.format(debt)} trend="neutral" subtle />
        <KPIChip
          label="Queued actions"
          value={queuedDecisionsAll.length}
          trend={queuedDecisionsAll.length > 0 ? "up" : "neutral"}
          subtle
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const isActive = step.key === activeStep;
          const isDone = idx < activeStepIndex;
          const statusLabel = isDone ? "Complete" : isActive ? "Active" : "Upcoming";
          const metaLabel =
            step.key === "briefing"
              ? `${eventsLastWeek.length} event${eventsLastWeek.length === 1 ? "" : "s"}`
              : step.key === "decisions"
              ? `${queuedDecisionsAll.length} action${queuedDecisionsAll.length === 1 ? "" : "s"} queued`
              : budgetOverCash
              ? "Budget at risk"
              : "Budget ok";
          return (
            <Card
              key={step.key}
              className={cn(
                "rounded-3xl p-4 border cursor-pointer transition",
                isActive ? "bg-[var(--card-2)] border-[var(--text)]" : "bg-[var(--card)] border-[var(--border)]"
              )}
              onClick={() => setActiveStep(step.key)}
            >
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Step {idx + 1}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                    isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : isActive
                      ? "border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--text-muted)]"
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--text)]">{step.label}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{step.description}</div>
              <div className="mt-3 text-xs text-[var(--text)]">{metaLabel}</div>
            </Card>
          );
        })}
      </div>

      {activeStep === "briefing" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-3xl p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Week story</div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">{lastWeekSummary}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <KPIChip
                  label="Revenue"
                  value={money.format(portfolioTotals.revenue)}
                  trend={trendFromValue(portfolioTotals.revenue)}
                />
                <KPIChip
                  label="Net profit"
                  value={money.format(portfolioTotals.netProfit)}
                  trend={trendFromValue(portfolioTotals.netProfit)}
                />
                <KPIChip
                  label="Cash delta"
                  value={money.format(portfolioTotals.cashChange)}
                  trend={trendFromValue(portfolioTotals.cashChange)}
                />
              </div>
              <div className="mt-4 text-xs text-[var(--text-muted)]">{outlookSummary}</div>
            </Card>

            <Card className="rounded-3xl p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Next week outlook</div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                Focus sectors with the biggest momentum shifts.
              </div>
              <div className="mt-4">
                <Table
                  caption="Top sector signals"
                  isEmpty={outlookRows.length === 0}
                  emptyMessage="No sector outlook yet."
                >
                  <THead>
                    <TR>
                      <TH>Sector</TH>
                      <TH>Signal</TH>
                      <TH className="text-right">Trend</TH>
                      <TH className="text-right">Volatility</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {outlookRows.map((row) => {
                      const deltaPct = row.delta * 100;
                      const deltaLabel = `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;
                      const trendClass =
                        row.delta >= 0.03
                          ? "text-emerald-600"
                          : row.delta <= -0.03
                          ? "text-rose-600"
                          : "text-[var(--text-muted)]";
                      return (
                        <TR key={row.sectorId}>
                          <TD className="font-semibold">{row.sectorName ?? row.sectorId}</TD>
                          <TD>{row.direction}</TD>
                          <TD className={cn("text-right text-sm font-semibold", trendClass)}>{deltaLabel}</TD>
                          <TD className="text-right text-xs text-[var(--text-muted)]">{row.volatilityLabel}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </Card>

            <Card className="rounded-3xl p-5">
              <div className="text-sm font-semibold text-[var(--text)]">Decision readiness</div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                Queue actions per company, then review budget before the tick.
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                  <div className="text-xs text-[var(--text-muted)]">Companies</div>
                  <div className="mt-1 text-base font-semibold">{companies.length}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                  <div className="text-xs text-[var(--text-muted)]">Queued actions</div>
                  <div className="mt-1 text-base font-semibold">{queuedDecisionsAll.length}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                  <div className="text-xs text-[var(--text-muted)]">Upgrade spend</div>
                  <div className="mt-1 text-base font-semibold">{money.format(budgetSummary.upgradeSpend)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                  <div className="text-xs text-[var(--text-muted)]">Program weekly</div>
                  <div className="mt-1 text-base font-semibold">
                    {money.format(budgetSummary.programWeeklySpend)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Table
            caption={`Last week events (Year ${previousWeek.year} Week ${previousWeek.week})`}
            isEmpty={eventRows.length === 0}
            emptyMessage="No events recorded last week."
          >
            <THead>
              <TR>
                <TH>Event</TH>
                <TH>Scope</TH>
                <TH>Target</TH>
                <TH className="text-right">Severity</TH>
              </TR>
            </THead>
            <TBody>
              {eventRows.map((event: any) => {
                const payload = event?.payload ?? {};
                const title = String(payload.title ?? payload.summary ?? event.type ?? "Event");
                const scope = String(event.scope ?? "GLOBAL");
                const target = event.companyId
                  ? companyById.get(String(event.companyId))?.name ?? "Company"
                  : event.sectorId
                  ? String(event.sectorId)
                  : "Global";
                return (
                  <TR key={String(event.id ?? `${event.type}-${event.createdAt}`)}>
                    <TD className="font-semibold">{title}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{scope}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{target}</TD>
                    <TD className="text-right text-xs text-[var(--text-muted)]">
                      {formatNumber(Number(event.severity ?? 0), "nl-NL", 0)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--text-muted)]">Review the story, then plan decisions.</div>
            <Button variant="primary" onClick={goNext}>
              Start decisions
            </Button>
          </div>
        </div>
      ) : null}

      {activeStep === "decisions" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4">
            <Card className="rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">Decision board</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Click a company card to edit its weekly levers.
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)]">{companies.length} companies</div>
              </div>

              <div className="mt-3">
                <select
                  className={cn(
                    "w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2",
                    "text-sm outline-none"
                  )}
                  value={selectedCompanyId ?? ""}
                  onChange={(e) => setSelectedCompanyId(e.target.value || undefined)}
                  disabled={companiesLoading}
                >
                  <option value="">{companiesLoading ? "Loading..." : "Select a company..."}</option>
                  {companies.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name} ({c.region})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {companies.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">
                    No companies yet. Purchase one to unlock decisions.
                  </div>
                ) : null}

                {companies.map((c) => {
                  const id = String(c.id);
                  const isActive = id === selectedCompanyId;
                  const financials = companyFinancialsMap.get(id);
                  const netProfit = Number(financials?.netProfit ?? 0);
                  const revenue = Number(financials?.revenue ?? 0);
                  const queueCount = queueCountByCompanyId.get(id) ?? 0;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "rounded-2xl border p-3 cursor-pointer transition",
                        isActive
                          ? "border-[var(--text)] bg-[var(--card-2)]"
                          : "border-[var(--border)] bg-[var(--card)]"
                      )}
                      onClick={() => setSelectedCompanyId(id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text)]">{c.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{c.region}</div>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">Queued {queueCount}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <KPIChip
                          label="Net profit"
                          value={money.format(netProfit)}
                          trend={trendFromValue(netProfit)}
                          subtle
                        />
                        <KPIChip label="Revenue" value={money.format(revenue)} trend="neutral" subtle />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-3xl p-5">
              {activeCompany ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-[var(--text)]">{activeCompany.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {sector?.name ?? "Sector"} | {niche?.name ?? "Niche"} | {activeCompany.region}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Save className="h-4 w-4" />}
                      onClick={() => setOpen(true)}
                      disabled={!canEdit}
                      title={editDisabledReason}
                    >
                      Open editor
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <KPIChip
                      label="Queued"
                      value={selectedQueueCount}
                      trend={selectedQueueCount > 0 ? "up" : "neutral"}
                      subtle
                    />
                    <KPIChip
                      label="Cash change"
                      value={money.format(Number(selectedFinancials?.cashChange ?? 0))}
                      trend={trendFromValue(Number(selectedFinancials?.cashChange ?? 0))}
                      subtle
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-xs font-semibold text-[var(--text)]">Latest financials</div>
                      {selectedFinancials ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <KPIChip
                            label="Revenue"
                            value={money.format(Number(selectedFinancials.revenue ?? 0))}
                            trend="neutral"
                            subtle
                          />
                          <KPIChip
                            label="Net profit"
                            value={money.format(Number(selectedFinancials.netProfit ?? 0))}
                            trend={trendFromValue(Number(selectedFinancials.netProfit ?? 0))}
                            subtle
                          />
                          <KPIChip
                            label="Cash delta"
                            value={money.format(Number(selectedFinancials.cashChange ?? 0))}
                            trend={trendFromValue(Number(selectedFinancials.cashChange ?? 0))}
                            subtle
                          />
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">No financials yet.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-xs font-semibold text-[var(--text)]">Current levers</div>
                      {currentLeversEmpty ? (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">{currentLeversEmptyMessage}</div>
                      ) : (
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                          {decisionFields.map((field) => {
                            const value = getCurrentValueForField(field, state);
                            return (
                              <div key={field.id} className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">{field.label}</span>
                                <span className="font-semibold">
                                  {value == null ? "--" : formatNumber(value, "nl-NL", fieldDecimals(field))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-xs font-semibold text-[var(--text)]">Active programs</div>
                      {activePrograms.length === 0 ? (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">No active programs.</div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activePrograms.map((p) => {
                            const payload = (p as any)?.payload ?? {};
                            const label = String(payload?.label ?? p.programType);
                            return (
                              <span
                                key={String(p.id)}
                                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs"
                              >
                                {label} ({programRemainingWeeks(p, currentYear, currentWeek)}w)
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                      <div className="text-xs font-semibold text-[var(--text)]">Owned upgrades</div>
                      {ownedUpgradePreview.length === 0 ? (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">No upgrades yet.</div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ownedUpgradePreview.map((name) => (
                            <span
                              key={name}
                              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs"
                            >
                              {name}
                            </span>
                          ))}
                          {ownedUpgradeRemaining > 0 ? (
                            <span className="text-xs text-[var(--text-muted)]">
                              +{ownedUpgradeRemaining} more
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <Table
                    caption={`Queued actions for ${activeCompany.name} (${queued.length})`}
                    isEmpty={queuedLoading ? false : queued.length === 0}
                    emptyMessage={queuedLoading ? "Loading..." : "No actions queued yet."}
                  >
                    <THead>
                      <TR>
                        <TH>Action</TH>
                        <TH>Details</TH>
                        <TH className="text-right">Created</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {queued.map((q, idx) => (
                        <TR key={`${q.type}-${idx}`}>
                          <TD className="font-semibold">{formatDecisionSummary(q.payload)}</TD>
                          <TD className="text-xs text-[var(--text-muted)]">{formatDecisionCost(q.payload)}</TD>
                          <TD className="text-right text-xs text-[var(--text-muted)]">
                            {q.createdAt ? new Date(q.createdAt).toLocaleString() : "--"}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-[var(--text-muted)]">
                  Select a company to review and edit its decisions.
                </div>
              )}
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={goPrev}>
              Back to briefing
            </Button>
            <Button variant="primary" onClick={goNext}>
              Review budget
            </Button>
          </div>
        </div>
      ) : null}

      {activeStep === "review" ? (
        <div className="space-y-4">
          <Card className="rounded-3xl p-5">
            <div className="text-sm font-semibold text-[var(--text)]">Budget guard</div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Check committed spend before the tick applies your actions.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <KPIChip label="Cash" value={money.format(cash)} trend="neutral" subtle />
              <KPIChip
                label="Upgrade spend"
                value={money.format(budgetSummary.upgradeSpend)}
                trend={budgetSummary.upgradeSpend > 0 ? "down" : "neutral"}
                subtle
              />
              <KPIChip
                label="Program commits"
                value={money.format(budgetSummary.programCommitSpend)}
                trend={budgetSummary.programCommitSpend > 0 ? "down" : "neutral"}
                subtle
              />
              <KPIChip
                label="Remaining cash"
                value={money.format(remainingCash)}
                trend={remainingCash >= 0 ? "up" : "down"}
              />
            </div>
            {budgetOverCash ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Over budget by {money.format(Math.abs(remainingCash))}. Adjust decisions before the tick.
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Budget looks safe for the queued actions.
              </div>
            )}
          </Card>

          <Table
            caption={`Queued actions across portfolio (${queuedDecisionsAll.length})`}
            isEmpty={queuedDecisionsAll.length === 0}
            emptyMessage="No actions queued yet."
          >
            <THead>
              <TR>
                <TH>Company</TH>
                <TH>Action</TH>
                <TH>Cost</TH>
                <TH className="text-right">Created</TH>
              </TR>
            </THead>
            <TBody>
              {queuedDecisionsAll.map(({ companyId, decision }, idx) => {
                const companyLabel = companyById.get(companyId)?.name ?? companyId;
                const payload = (decision as any)?.payload ?? {};
                const createdAt = (decision as any)?.createdAt as string | undefined;
                return (
                  <TR key={`${companyId}-${idx}`}>
                    <TD className="font-semibold">{companyLabel}</TD>
                    <TD>{formatDecisionSummary(payload)}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{formatDecisionCost(payload)}</TD>
                    <TD className="text-right text-xs text-[var(--text-muted)]">
                      {createdAt ? new Date(createdAt).toLocaleString() : "--"}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={goPrev}>
              Adjust decisions
            </Button>
            <div className="text-xs text-[var(--text-muted)]">
              Decisions apply on the next tick. Review budget before then.
            </div>
          </div>
        </div>
      ) : null}
      {/* Edit modal */}
      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setError(null);
        }}
        title="Weekly decisions"
        description="These are queued for the current round and applied when the world ticks."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={onSave} disabled={isTicking} title={editDisabledReason}>
              Save decisions
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {guidance ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Niche guidance</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{guidance.summary}</div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {guidance.drivers.map((driver) => (
                  <div
                    key={driver.label}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[var(--text-muted)]"
                  >
                    {driver.label}: <span className="text-[var(--text)]">{driver.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Price level</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {formatRange(guidance.ranges.priceLevel.min, guidance.ranges.priceLevel.max, 2)}{" "}
                    {guidance.ranges.priceLevel.unit ?? ""}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{guidance.ranges.priceLevel.note}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Marketing level</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {formatRange(guidance.ranges.marketingLevel.min, guidance.ranges.marketingLevel.max, 0)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {guidance.ranges.marketingLevel.note}
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Employees change</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {formatRange(guidance.ranges.employeesDelta.min, guidance.ranges.employeesDelta.max, 0)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{guidance.ranges.employeesDelta.note}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-xs text-[var(--text-muted)]">Capacity change</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">
                    {formatRange(guidance.ranges.capacityDelta.min, guidance.ranges.capacityDelta.max, 0)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{guidance.ranges.capacityDelta.note}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <SlidersHorizontal className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Decision levers</div>
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Levers are tailored to this niche. Suggested ranges update with market guidance.
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {decisionFields.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No decision levers available.</div>
              ) : (
                decisionFields.map((field) => {
                  const range = resolveRangeForField(field);
                  const decimals = fieldDecimals(field);
                  const rawValue = Number(fieldValues[field.id] ?? getDefaultValueForField(field, state));
                  const value = Number.isFinite(rawValue) ? rawValue : 0;
                  const currentValue = getCurrentValueForField(field, state);
                  const isDelta = field.kind === "STAFFING" || field.kind === "CAPACITY" || field.kind === "QUALITY";
                  const targetValue =
                    isDelta && currentValue != null
                      ? currentValue + value
                      : null;
                  const mid = (range.min + range.max) / 2;
                  const snap = (v: number) => {
                    const stepped = Math.round(v / range.step) * range.step;
                    return Number(stepped.toFixed(decimals));
                  };

                  const quickSets = [
                    ...(isDelta ? [{ label: "Zero", value: 0 }] : []),
                    ...(currentValue != null && !isDelta ? [{ label: "Current", value: currentValue }] : []),
                    { label: "Min", value: range.min },
                    { label: "Mid", value: mid },
                    { label: "Max", value: range.max },
                  ];

                  return (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                    >
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text)]">{field.label}</div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {field.description}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Suggested: {formatRange(range.min, range.max, decimals)} {range.unit}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px] md:items-center">
                        <input
                          type="range"
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          value={clamp(value, range.min, range.max)}
                          onChange={(e) => setFieldValue(field.id, Number(e.target.value))}
                        />
                        <input
                          type="number"
                          step={range.step}
                          min={range.min}
                          max={range.max}
                          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                          value={value}
                          onChange={(e) => setFieldValue(field.id, Number(e.target.value))}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        {currentValue != null ? (
                          <span>
                            Current:{" "}
                            <span className="text-[var(--text)]">
                              {formatNumber(currentValue, "nl-NL", decimals)}
                            </span>
                          </span>
                        ) : null}
                        {targetValue != null ? (
                          <span>
                            Target:{" "}
                            <span className="text-[var(--text)]">
                              {formatNumber(targetValue, "nl-NL", decimals)}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {quickSets.map((item) => (
                          <button
                            key={`${field.id}-${item.label}`}
                            type="button"
                            className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--card)]"
                            onClick={() => setFieldValue(field.id, snap(item.value))}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {range.note ? (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">{range.note}</div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {decisionModules.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Niche programs</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Programs run for multiple weeks and apply while active.
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {decisionModules.map((module) => (
                  <div key={module.id}>
                    <label className="text-xs font-medium text-[var(--text-muted)]">
                      {module.label}
                    </label>
                    <select
                      className={cn(
                        "mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2",
                        "text-sm outline-none"
                      )}
                      value={moduleSelections[module.id] ?? ""}
                      onChange={(e) =>
                        setModuleSelections((prev) => ({ ...prev, [module.id]: e.target.value }))
                      }
                    >
                      <option value="">No program</option>
                      {module.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {module.description ? (
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {module.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {upgradesByTree.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Upgrades</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Purchased upgrades are permanent and apply every tick. Each tree unlocks in order.
              </div>

              <div className="mt-4 space-y-4">
                {upgradesByTree.map(({ treeKey, upgrades }) => {
                  const ownedTier = ownedTierByTree.get(treeKey) ?? 0;
                  const queuedId = queuedTierByTree.get(treeKey);
                  return (
                    <div
                      key={treeKey}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatTreeLabel(treeKey)}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            Tier {ownedTier} of {upgrades.length} unlocked
                          </div>
                        </div>
                        {queuedId ? (
                          <div className="text-xs text-[var(--text-muted)]">
                            Upgrade queued this week
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {upgrades.map((u) => {
                          const upgradeId = String(u.id);
                          const owned = ownedUpgradeIds.has(upgradeId);
                          const queued = selectedUpgradeIds.includes(upgradeId);
                          const isUnlocked = Number(u.tier ?? 0) === 1 || ownedTier >= Number(u.tier ?? 1) - 1;
                          const blockedByQueue = !!queuedId && queuedId !== upgradeId;
                          const locked = !isUnlocked || blockedByQueue;
                          const status = owned
                            ? "Owned"
                            : queued
                            ? "Queued"
                            : locked
                            ? "Locked"
                            : "Available";
                          const lockReason = !isUnlocked
                            ? `Requires T${Number(u.tier ?? 1) - 1}`
                            : blockedByQueue
                            ? "Queued in this tree"
                            : null;

                          return (
                            <div
                              key={upgradeId}
                              className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
                            >
                              <div>
                                <div className="text-sm font-semibold text-[var(--text)]">
                                  {u.name}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {u.description ?? "Upgrade effect applied each tick."}
                                </div>
                                <div className="mt-2 text-xs text-[var(--text-muted)]">
                                  Tier {u.tier} | {status}
                                </div>
                                {lockReason ? (
                                  <div className="mt-1 text-xs text-[var(--text-muted)]">{lockReason}</div>
                                ) : null}
                              </div>

                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-[var(--text-muted)]">
                                  Cost {money.format(Number(u.cost ?? 0))}
                                </div>
                                <Button
                                  variant={queued ? "primary" : "secondary"}
                                  size="sm"
                                  disabled={owned || isTicking || locked}
                                  onClick={() =>
                                    setSelectedUpgradeIds((prev) =>
                                      prev.includes(upgradeId)
                                        ? prev.filter((id) => id !== upgradeId)
                                        : [...prev, upgradeId]
                                    )
                                  }
                                >
                                  {owned ? "Owned" : queued ? "Queued" : locked ? "Locked" : "Queue"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </Modal>
    </motion.div>
  );
};

export default DecisionsPanel;


