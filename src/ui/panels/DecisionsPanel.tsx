// src/ui/panels/DecisionsPanel.tsx
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Save, RefreshCw, SlidersHorizontal, Building2 } from "lucide-react";

import { MOTION } from "../../config/motion";

import Card from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import Modal from "../components/Modal";
import { cn, formatNumber } from "../../utils/format";
import { money } from "../../utils/money";
import { useCompanies, useCompany } from "../hooks/useCompany";
import { useWorld } from "../hooks/useWorld";
import { decisionService } from "../../core/services/decisionService";
import { programService } from "../../core/services/programService";
import { upgradeService } from "../../core/services/upgradeService";
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

export const DecisionsPanel: React.FC = () => {
  const [params] = useSearchParams();
  const fromCompanyId = params.get("companyId") ?? undefined;

  const { world, economy, secondsUntilNextTick, isTicking } = useWorld();
  const worldId = world?.id ? String(world.id) : undefined;

  const { companies, isLoading: companiesLoading } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(fromCompanyId);

  const { company, state, isLoading: companyLoading, refetch } = useCompany(selectedCompanyId);

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

  const niche = nicheQuery.data ?? null;
  const sector = sectorQuery.data ?? null;
  const decisionModules = React.useMemo(() => getDecisionModulesForNiche(niche), [niche]);
  const decisionFields = React.useMemo(() => getDecisionFieldsForNiche(niche), [niche]);
  const guidance = React.useMemo(() => getDecisionGuidance(niche, sector, state), [niche, sector, state]);

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

  const currentYear = economy?.currentYear ?? 1;
  const currentWeek = economy?.currentWeek ?? 1;
  const tickStatus = isTicking ? "Tick running" : "Waiting for next tick";
  const canEdit = !!selectedCompanyId && !!worldId && !isTicking;
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
  };

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Decisions</div>
          <div className="text-sm text-[var(--text-muted)]">
            Current round: Year {currentYear} · Week {currentWeek}
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
            Edit & save
          </Button>
        </div>
      </div>

      {/* Select company */}
      <Card className="rounded-3xl p-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Building2 className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">Choose company</div>
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
            <option value="">{companiesLoading ? "Loading…" : "Select a company…"}</option>
            {companies.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name} ({c.region})
              </option>
            ))}
          </select>
        </div>

        {company ? (
          <div className="mt-3 text-xs text-[var(--text-muted)]">
            Editing: <span className="font-medium text-[var(--text)]">{company.name}</span>
          </div>
        ) : null}
      </Card>

      {/* Current state summary */}
      <Table
        caption="Current levers (from latest company state)"
        isEmpty={currentLeversEmpty}
        emptyMessage={currentLeversEmptyMessage}
      >
        <THead>
          <TR>
            <TH>Parameter</TH>
            <TH className="text-right">Current</TH>
          </TR>
        </THead>
        <TBody>
          {decisionFields.map((field) => {
            const value = getCurrentValueForField(field, state);
            return (
              <TR key={field.id}>
                <TD>{field.label}</TD>
                <TD className="text-right" mono>
                  {value == null ? "—" : formatNumber(value, "nl-NL", fieldDecimals(field))}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      {/* Queued decisions */}
      <Table
        caption={`Queued decisions this week (${queued.length})`}
        isEmpty={queuedLoading ? false : queued.length === 0}
        emptyMessage={queuedLoading ? "Loading…" : "No decisions queued yet for this week."}
      >
        <THead>
          <TR>
            <TH>Type</TH>
            <TH>Payload</TH>
            <TH className="text-right">Created</TH>
          </TR>
        </THead>
        <TBody>
          {queued.map((q, idx) => (
            <TR key={`${q.type}-${idx}`}>
              <TD className="font-semibold">{q.type}</TD>
              <TD mono className="text-xs">
                {JSON.stringify(q.payload ?? {})}
              </TD>
              <TD className="text-right text-xs text-[var(--text-muted)]">
                {q.createdAt ? new Date(q.createdAt).toLocaleString() : "—"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {/* Active programs */}
      <Table
        caption={`Active programs (${activePrograms.length})`}
        isEmpty={activePrograms.length === 0}
        emptyMessage="No active programs running."
      >
        <THead>
          <TR>
            <TH>Program</TH>
            <TH>Type</TH>
            <TH className="text-right">Remaining</TH>
          </TR>
        </THead>
        <TBody>
          {activePrograms.map((p) => {
            const payload = (p as any)?.payload ?? {};
            const label = String(payload?.label ?? p.programType);
            return (
              <TR key={String(p.id)}>
                <TD className="font-semibold">{label}</TD>
                <TD className="text-xs text-[var(--text-muted)]">{p.programType}</TD>
                <TD className="text-right text-xs text-[var(--text-muted)]">
                  {programRemainingWeeks(p, currentYear, currentWeek)}w
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      {/* Owned upgrades */}
      <Table
        caption={`Owned upgrades (${companyUpgrades.length})`}
        isEmpty={companyUpgrades.length === 0}
        emptyMessage="No upgrades purchased yet."
      >
        <THead>
          <TR>
            <TH>Upgrade</TH>
            <TH>Tree</TH>
            <TH className="text-right">Tier</TH>
          </TR>
        </THead>
        <TBody>
          {companyUpgrades.map((u) => {
            const def = nicheUpgrades.find((n) => String(n.id) === String(u.upgradeId));
            return (
              <TR key={String(u.id)}>
                <TD className="font-semibold">{def?.name ?? "Upgrade"}</TD>
                <TD className="text-xs text-[var(--text-muted)]">
                  {def?.treeKey ? formatTreeLabel(def.treeKey) : "--"}
                </TD>
                <TD className="text-right text-xs text-[var(--text-muted)]">
                  {def?.tier ?? "--"}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

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
                                  Tier {u.tier} · {status}
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
