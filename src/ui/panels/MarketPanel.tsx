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

type SectorMetricRow = {
  sectorId: string;
  sectorName?: string;
  currentDemand: number;
  trendFactor: number;
  volatility: number;
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
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    if (!world) return;

    setLoading(true);
    setErr(null);

    try {
      // 1) recent events
      // Pas de methodnaam aan als jouw repo anders heet.
      const recent = await eventRepo.listRecent({ worldId: world.id as any, limit: 20 });
      setEvents(Array.isArray(recent) ? recent : []);

      // 2) sector snapshot from world_sector_state + sector names
      const [worldSectorStates, sectors] = await Promise.all([
        (sectorRepo as any).listWorldSectorStates?.(world.id),
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

      {err ? (
        <Card className="rounded-3xl p-5 border border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            <div className="text-sm">{err}</div>
          </div>
        </Card>
      ) : null}

      {/* Sector state table */}
      <Table
        caption="Sector snapshot"
        isEmpty={!loading && sectorRows.length === 0}
        emptyMessage="No sector state found yet. (Seed sectors + run a tick.)"
      >
        <THead>
          <TR>
            <TH>Sector</TH>
            <TH className="text-right">Demand</TH>
            <TH className="text-right">Trend</TH>
            <TH className="text-right">Volatility</TH>
          </TR>
        </THead>
        <TBody>
          {sectorRows.map((r) => (
            <TR key={r.sectorId}>
              <TD className="font-semibold">{r.sectorName ?? r.sectorId}</TD>
              <TD className="text-right" mono>{Math.round(r.currentDemand * 100) / 100}</TD>
              <TD className="text-right" mono>{Math.round(r.trendFactor * 1000) / 1000}</TD>
              <TD className="text-right" mono>{Math.round(r.volatility * 1000) / 1000}</TD>
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
            <TH>Scope</TH>
            <TH>Type</TH>
            <TH>Target</TH>
            <TH className="text-right">Severity</TH>
          </TR>
        </THead>
        <TBody>
          {events.map((e) => (
            <TR key={String(e.id)}>
              <TD>{e.scope}</TD>
              <TD className="font-semibold">{e.type}</TD>
              <TD className="text-xs text-[var(--text-muted)]">
                {e.company_id ?? e.sector_id ?? e.holding_id ?? "—"}
              </TD>
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
