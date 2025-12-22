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
import { cn } from "../../utils/format";
import { money } from "../../utils/money";
import { useCompanies, useCompany } from "../hooks/useCompany";
import { useWorld } from "../hooks/useWorld";
import { decisionService } from "../../core/services/decisionService";
import { programService } from "../../core/services/programService";
import { upgradeService } from "../../core/services/upgradeService";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { getDecisionModulesForNiche } from "../../core/config/nicheDecisions";
import type { CompanyDecisionPayload, CompanyProgram, NicheUpgrade, CompanyUpgrade } from "../../core/domain";
import { asWorldId, asCompanyId, asNicheId } from "../../core/domain";

/**
 * DecisionsPanel (v0)
 * - Select a company
 * - Edit weekly knobs (price/marketing/staffing/operations)
 * - Save decisions for the current world week (company_decisions)
 * - Show queued decisions this week
 */

type Knobs = {
  priceLevel: number;
  marketingLevel: number;
  employeesDelta: number; // + hire / - fire
  capacityDelta: number; // + invest capacity (placeholder)
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const defaultKnobs: Knobs = {
  priceLevel: 1.0,
  marketingLevel: 0.0,
  employeesDelta: 0,
  capacityDelta: 0,
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

  const niche = nicheQuery.data ?? null;
  const decisionModules = React.useMemo(() => getDecisionModulesForNiche(niche), [niche]);

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
  const [knobs, setKnobs] = React.useState<Knobs>(defaultKnobs);
  const [moduleSelections, setModuleSelections] = React.useState<Record<string, string>>({});
  const [selectedUpgradeIds, setSelectedUpgradeIds] = React.useState<string[]>([]);

  const [queued, setQueued] = React.useState<Array<{ type: string; payload: any; createdAt?: string }>>([]);
  const [queuedLoading, setQueuedLoading] = React.useState(false);

  // Initialize knobs from latest state
  React.useEffect(() => {
    if (!state) return;
    setKnobs({
      priceLevel: state.priceLevel ?? 1.0,
      marketingLevel: state.marketingLevel ?? 0.0,
      employeesDelta: 0,
      capacityDelta: 0,
    });
  }, [state?.companyId]);

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
      const payloads: CompanyDecisionPayload[] = [
        { type: "SET_PRICE", priceLevel: clamp(knobs.priceLevel, 0.5, 3.0) } as any,
        { type: "SET_MARKETING", marketingLevel: clamp(knobs.marketingLevel, 0, 10_000) } as any,
      ];

      if (knobs.employeesDelta !== 0) {
        const baseEmployees = state?.employees ?? 0;
        const targetEmployees = Math.max(
          0,
          Math.floor(baseEmployees + Math.trunc(clamp(knobs.employeesDelta, -50, 50)))
        );

        payloads.push({ type: "SET_STAFFING", targetEmployees } as any);
      }

      if (knobs.capacityDelta !== 0) {
        payloads.push({ type: "INVEST_CAPACITY", addCapacity: clamp(knobs.capacityDelta, -1_000, 10_000) } as any);
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
        caption="Current knobs (from latest company state)"
        isEmpty={!state}
        emptyMessage="No state found yet (create a company and run a tick)."
      >
        <THead>
          <TR>
            <TH>Parameter</TH>
            <TH className="text-right">Current</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Price level</TD>
            <TD className="text-right" mono>
              {state ? (Math.round(state.priceLevel * 100) / 100).toFixed(2) : "—"}
            </TD>
          </TR>
          <TR>
            <TD>Marketing level</TD>
            <TD className="text-right" mono>
              {state ? (Math.round(state.marketingLevel * 100) / 100).toFixed(2) : "—"}
            </TD>
          </TR>
          <TR>
            <TD>Employees</TD>
            <TD className="text-right" mono>
              {state ? state.employees : "—"}
            </TD>
          </TR>
          <TR>
            <TD>Capacity</TD>
            <TD className="text-right" mono>
              {state ? (Math.round(state.capacity * 100) / 100).toFixed(2) : "—"}
            </TD>
          </TR>
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
                <TD className="text-xs text-[var(--text-muted)]">{def?.treeKey ?? "--"}</TD>
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <SlidersHorizontal className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Knobs</div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)]">Price level (0.5–3.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min={0.5}
                  max={3}
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                  value={knobs.priceLevel}
                  onChange={(e) => setKnobs((k) => ({ ...k, priceLevel: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)]">Marketing level (budget-ish)</label>
                <input
                  type="number"
                  step="10"
                  min={0}
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                  value={knobs.marketingLevel}
                  onChange={(e) => setKnobs((k) => ({ ...k, marketingLevel: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)]">Employees Δ (-50..+50)</label>
                <input
                  type="number"
                  step="1"
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                  value={knobs.employeesDelta}
                  onChange={(e) => setKnobs((k) => ({ ...k, employeesDelta: Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-muted)]">Capacity Δ (placeholder)</label>
                <input
                  type="number"
                  step="10"
                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
                  value={knobs.capacityDelta}
                  onChange={(e) => setKnobs((k) => ({ ...k, capacityDelta: Number(e.target.value) }))}
                />
              </div>
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

          {nicheUpgrades.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Upgrades</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Purchased upgrades are permanent and apply every tick.
              </div>

              <div className="mt-4 space-y-2">
                {nicheUpgrades.map((u) => {
                  const upgradeId = String(u.id);
                  const owned = ownedUpgradeIds.has(upgradeId);
                  const queued = selectedUpgradeIds.includes(upgradeId);
                  return (
                    <div
                      key={upgradeId}
                      className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {u.name} <span className="text-xs text-[var(--text-muted)]">({u.treeKey} T{u.tier})</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {u.description ?? "Upgrade effect applied each tick."}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-[var(--text-muted)]">
                          Cost {money.format(Number(u.cost ?? 0))}
                        </div>
                        <Button
                          variant={queued ? "primary" : "secondary"}
                          size="sm"
                          disabled={owned || isTicking}
                          onClick={() =>
                            setSelectedUpgradeIds((prev) =>
                              prev.includes(upgradeId)
                                ? prev.filter((id) => id !== upgradeId)
                                : [...prev, upgradeId]
                            )
                          }
                        >
                          {owned ? "Owned" : queued ? "Queued" : "Queue"}
                        </Button>
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
