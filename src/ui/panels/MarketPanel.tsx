// src/ui/panels/MarketPanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, AlertTriangle, BarChart3, RefreshCw } from "lucide-react";

import { MOTION } from "../../config/motion";

import { Card } from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import KPIChip from "../components/KPIChip";
import { useWorld } from "../hooks/useWorld";
import { useCompanies } from "../hooks/useCompany";

import { eventRepo } from "../../core/persistence/eventRepo";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { companyRepo } from "../../core/persistence/companyRepo";
import { holdingRepo } from "../../core/persistence/holdingRepo";
import { describeEvent, formatEventScope } from "../../utils/events";

type SectorMetricRow = {
  sectorId: string;
  sectorName?: string;
  sectorDescription?: string;
  currentDemand: number;
  trendFactor: number;
  volatility: number;
  lastRoundMetrics?: any;
};

function formatMoney(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(x);
}

export const MarketPanel: React.FC = () => {
  const { world, economy, refetch: refetchWorld } = useWorld();
  const { companies } = useCompanies();

  const [events, setEvents] = React.useState<any[]>([]);
  const [sectorRows, setSectorRows] = React.useState<SectorMetricRow[]>([]);
  const [sectorById, setSectorById] = React.useState<Record<string, { name: string; description?: string }>>({});
  const [companyById, setCompanyById] = React.useState<Record<string, { name: string }>>({});
  const [holdingById, setHoldingById] = React.useState<Record<string, { name: string }>>({});
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const currentYear = economy?.currentYear ?? 1;
  const currentWeek = economy?.currentWeek ?? 1;

  const nextRound = React.useMemo(() => {
    if (!economy) return null;
    const nextWeek = economy.currentWeek + 1;
    if (nextWeek > 52) {
      return { year: economy.currentYear + 1, week: 1 };
    }
    return { year: economy.currentYear, week: nextWeek };
  }, [economy?.currentYear, economy?.currentWeek]);

  const currentEvents = React.useMemo(
    () => events.filter((e) => Number(e.year ?? 0) === currentYear && Number(e.week ?? 0) === currentWeek),
    [events, currentYear, currentWeek]
  );

  const outlookRows = React.useMemo(() => {
    const rows = sectorRows.map((row) => {
      const metrics = row.lastRoundMetrics as any;
      const demandDeltaPct = Number(metrics?.demandDeltaPct ?? metrics?.demand_delta_pct ?? NaN);
      const delta = Number.isFinite(demandDeltaPct) ? demandDeltaPct : Number(row.trendFactor ?? 1) - 1;
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

    return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  }, [sectorRows]);

  const sectorSnapshot = React.useMemo(() => {
    return sectorRows.map((row) => {
      const metrics = row.lastRoundMetrics as any;
      const demandDeltaPct = Number(metrics?.demandDeltaPct ?? metrics?.demand_delta_pct ?? NaN);
      const demandDelta = Number(metrics?.demandDelta ?? metrics?.demand_delta ?? NaN);
      const deltaPct = Number.isFinite(demandDeltaPct) ? demandDeltaPct : Number(row.trendFactor ?? 1) - 1;
      const deltaAbs = Number.isFinite(demandDelta) ? demandDelta : row.currentDemand * deltaPct;
      const direction = deltaPct >= 0.03 ? "Tailwind" : deltaPct <= -0.03 ? "Headwind" : "Stable";
      const volatility = Number(row.volatility ?? 0);
      const volatilityLabel = volatility >= 0.12 ? "High" : volatility >= 0.06 ? "Medium" : "Low";

      return {
        ...row,
        deltaPct,
        deltaAbs,
        direction,
        volatilityLabel,
      };
    });
  }, [sectorRows]);

  const resolveTarget = React.useCallback(
    (event: any) => {
      const companyId = String(event?.companyId ?? event?.company_id ?? "");
      if (companyId && companyById[companyId]) return companyById[companyId].name;
      const sectorId = String(event?.sectorId ?? event?.sector_id ?? "");
      if (sectorId && sectorById[sectorId]) return sectorById[sectorId].name;
      const holdingId = String(event?.holdingId ?? event?.holding_id ?? "");
      if (holdingId && holdingById[holdingId]) return holdingById[holdingId].name;
      return "World";
    },
    [companyById, sectorById, holdingById]
  );

  const loadAll = React.useCallback(async () => {
    if (!world) return;

    setLoading(true);
    setErr(null);

    try {
      // 1) recent events
      // Pas de methodnaam aan als jouw repo anders heet.
      const recent = await eventRepo.listRecent({ worldId: world.id as any, limit: 20 });
      setEvents(Array.isArray(recent) ? recent : []);

      // 2) sector snapshot + lookup names
      const [worldSectorStates, sectors, companiesRows, holdingsRows] = await Promise.all([
        (sectorRepo as any).listWorldSectorStates?.(world.id),
        (sectorRepo as any).listSectors?.(),
        companyRepo.listByWorld(world.id as any),
        holdingRepo.listByWorld(world.id as any),
      ]);

      const sectorMap: Record<string, { name: string; description?: string }> = {};
      for (const s of Array.isArray(sectors) ? sectors : []) {
        sectorMap[String((s as any).id)] = {
          name: String((s as any).name ?? (s as any).id),
          description: (s as any).description ?? undefined,
        };
      }
      setSectorById(sectorMap);

      const companyMap: Record<string, { name: string }> = {};
      for (const c of Array.isArray(companiesRows) ? companiesRows : []) {
        companyMap[String((c as any).id)] = { name: String((c as any).name ?? "Company") };
      }
      setCompanyById(companyMap);

      const holdingMap: Record<string, { name: string }> = {};
      for (const h of Array.isArray(holdingsRows) ? holdingsRows : []) {
        holdingMap[String((h as any).id)] = { name: String((h as any).name ?? "Holding") };
      }
      setHoldingById(holdingMap);

      const rows: SectorMetricRow[] = (Array.isArray(worldSectorStates) ? worldSectorStates : []).map((ss: any) => ({
        sectorId: String(ss.sectorId ?? ss.sector_id ?? ""),
        sectorName: sectorMap[String(ss.sectorId ?? ss.sector_id ?? "")]?.name,
        sectorDescription: sectorMap[String(ss.sectorId ?? ss.sector_id ?? "")]?.description,
        currentDemand: Number(ss.currentDemand ?? ss.current_demand ?? 0),
        trendFactor: Number(ss.trendFactor ?? ss.trend_factor ?? 1),
        volatility: Number(ss.volatility ?? 0),
        lastRoundMetrics: ss.lastRoundMetrics ?? ss.last_round_metrics ?? {},
      }));

      setSectorRows(rows);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, [world]);

  React.useEffect(() => {
    loadAll().catch(() => void 0);
  }, [loadAll]);

  const onRefresh = async () => {
    await refetchWorld();
    await loadAll();
  };

  const netWorthApprox = 0; // placeholder: je echte net worth zit waarschijnlijk in Holding/OverviewPanel
  const featuredEvent = currentEvents[0] ?? events[0] ?? null;
  const featuredStory = featuredEvent ? describeEvent(featuredEvent) : null;
  const featuredTarget = featuredEvent ? resolveTarget(featuredEvent) : "World";

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={MOTION.page.variants}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Market</div>
          <div className="text-sm text-[var(--text-muted)]">
            {world?.name ?? "World"} ·{" "}
            {economy ? `Year ${economy.currentYear} Week ${economy.currentWeek}` : "—"}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Macro chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Activity className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Macro</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip
              label="Interest"
              value={economy ? `${Math.round((Number(economy.baseInterestRate ?? 0) * 1000)) / 10}%` : "—"}
              trend="neutral"
            />
            <KPIChip
              label="Inflation"
              value={economy ? `${Math.round((Number(economy.inflationRate ?? 0) * 1000)) / 10}%` : "—"}
              trend="neutral"
              subtle
            />
            <KPIChip
              label="Wage index"
              value={economy ? `${Math.round((Number(economy.baseWageIndex ?? 1) * 100)) / 100}` : "—"}
              trend="neutral"
              subtle
            />
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Portfolio</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip label="Companies" value={`${companies.length}`} trend="neutral" />
            <KPIChip label="Net worth" value={formatMoney(netWorthApprox)} trend="neutral" subtle />
            <KPIChip label="Events" value={`${events.length}`} trend="neutral" subtle />
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <BarChart3 className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Sectors</div>
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Live demand + volatility per sector (world sector state).
          </div>
          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Tip: events shift these metrics.
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Activity className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">Market pulse</div>
        </div>
        <div className="mt-2 text-sm text-[var(--text-muted)]">
          {currentEvents.length > 0
            ? `This week logged ${currentEvents.length} event${currentEvents.length === 1 ? "" : "s"}.`
            : "Quiet week so far."}
        </div>
        <div className="mt-3 text-sm text-[var(--text)]">
          {featuredStory
            ? `${featuredStory.headline} in ${featuredTarget}.`
            : "No major market story yet."}
        </div>
        {featuredStory ? (
          <div className="mt-1 text-xs text-[var(--text-muted)]">{featuredStory.detail}</div>
        ) : null}
      </Card>

      {err ? (
        <Card className="rounded-3xl p-5 border border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            <div className="text-sm">{err}</div>
          </div>
        </Card>
      ) : null}

      {/* Current round events */}
      <Table
        caption={`Events this round (${currentEvents.length})`}
        isEmpty={!loading && currentEvents.length === 0}
        emptyMessage="No events recorded for the current round."
      >
        <THead>
          <TR>
            <TH>Story</TH>
            <TH>Scope</TH>
            <TH>Target</TH>
            <TH className="text-right">Severity</TH>
          </TR>
        </THead>
        <TBody>
          {currentEvents.map((e) => (
            <TR key={`round-${String(e.id)}`}>
              <TD className="font-semibold">{describeEvent(e).headline}</TD>
              <TD className="text-xs text-[var(--text-muted)]">{formatEventScope(e.scope)}</TD>
              <TD className="text-xs text-[var(--text-muted)]">{resolveTarget(e)}</TD>
              <TD className="text-right" mono>
                {Math.round((Number(e.severity ?? 1) * 100)) / 100}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {/* Next round outlook */}
      <Card className="rounded-3xl p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Activity className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">
            Outlook for next round
          </div>
        </div>
        <div className="mt-2 text-sm text-[var(--text-muted)]">
          {nextRound ? `Year ${nextRound.year} Week ${nextRound.week}` : "Next round"}
        </div>

        <div className="mt-4 space-y-2">
          {outlookRows.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">No sector outlook yet.</div>
          ) : (
            outlookRows.map((row) => (
              <div
                key={`outlook-${row.sectorId}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-[var(--text)]">
                    {row.sectorName ?? row.sectorId}
                  </div>
                  {row.sectorDescription ? (
                    <div className="text-xs text-[var(--text-muted)]">{row.sectorDescription}</div>
                  ) : null}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {row.direction} · {row.volatilityLabel}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Sector state table */}
      <Table
        caption="Sector snapshot"
        isEmpty={!loading && sectorSnapshot.length === 0}
        emptyMessage="No sector state found yet. (Seed sectors + run a tick.)"
      >
        <THead>
          <TR>
            <TH>Sector</TH>
            <TH className="text-right">Demand</TH>
            <TH className="text-right">Momentum</TH>
            <TH className="text-right">Volatility</TH>
          </TR>
        </THead>
        <TBody>
          {sectorSnapshot.map((r) => (
            <TR key={r.sectorId}>
              <TD>
                <div className="font-semibold">{r.sectorName ?? r.sectorId}</div>
                {r.sectorDescription ? (
                  <div className="text-xs text-[var(--text-muted)]">{r.sectorDescription}</div>
                ) : null}
              </TD>
              <TD className="text-right" mono>
                {Math.round(r.currentDemand * 100) / 100}
                <div className="text-[10px] text-[var(--text-muted)]">
                  {r.deltaAbs >= 0 ? "+" : ""}
                  {Math.round(r.deltaAbs * 100) / 100}
                </div>
              </TD>
              <TD className="text-right">
                <div className="text-sm font-semibold">{r.direction}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {r.deltaPct >= 0 ? "+" : ""}
                  {Math.round(r.deltaPct * 1000) / 10}%
                </div>
              </TD>
              <TD className="text-right" mono>
                {r.volatilityLabel}
                <div className="text-[10px] text-[var(--text-muted)]">
                  {Math.round(r.volatility * 1000) / 1000}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {/* Events table */}
      <Table
        caption="Recent events"
        isEmpty={!loading && events.length === 0}
        emptyMessage="No events yet."
      >
        <THead>
          <TR>
            <TH>Story</TH>
            <TH>Scope</TH>
            <TH>Target</TH>
            <TH className="text-right">Severity</TH>
          </TR>
        </THead>
        <TBody>
          {events.map((e) => (
            <TR key={String(e.id)}>
              <TD className="font-semibold">{describeEvent(e).headline}</TD>
              <TD className="text-xs text-[var(--text-muted)]">{formatEventScope(e.scope)}</TD>
              <TD className="text-xs text-[var(--text-muted)]">{resolveTarget(e)}</TD>
              <TD className="text-right" mono>
                {Math.round((Number(e.severity ?? 1) * 100)) / 100}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </motion.div>
  );
};

export default MarketPanel;
