// src/ui/panels/OverviewPanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, TrendingUp, Wallet, Landmark, Clock, Timer } from "lucide-react";

import { MOTION } from "../../config/motion";

import Card from "../components/Card";
import Button from "../components/Button";
import KPIChip from "../components/KPIChip";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import { useWorld } from "../hooks/useWorld";
import { useHolding } from "../hooks/useHolding";
import { useCompanies } from "../hooks/useCompany";
import { money } from "../../utils/money";

function formatSeconds(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

function formatIso(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/**
 * OverviewPanel
 * - High-level empire overview:
 *   - world time (year/week)
 *   - interval + countdown + lastTickAt
 *   - holding KPIs
 *   - companies list snapshot
 */
export const OverviewPanel: React.FC = () => {
  const { world, economy, worldRound, secondsUntilNextTick, isTicking, refetch: refetchWorld } = useWorld();
  const { holding, refetch: refetchHolding } = useHolding();
  const { companies, refetch: refetchCompanies } = useCompanies();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchWorld(), refetchHolding(), refetchCompanies()]);
    } finally {
      setRefreshing(false);
    }
  };

  const netWorth = (holding?.cashBalance ?? 0) + (holding?.totalEquity ?? 0) - (holding?.totalDebt ?? 0);

  const intervalSec = world?.baseRoundIntervalSeconds ?? null;
  const lastRoundAt = worldRound?.finishedAt ?? worldRound?.startedAt ?? null;
  const lastTickResults = worldRound
    ? `Year ${worldRound.year} Week ${worldRound.week} | ${worldRound.status}${lastRoundAt ? ` | ${formatIso(lastRoundAt)}` : ""}`
    : "No ticks yet";

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      {/* Top KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Empire */}
        <Card className="rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">Empire</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {world ? world.name : "World"} ·{" "}
                {economy ? `Year ${economy.currentYear} Week ${economy.currentWeek}` : "—"}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Clock className="h-4 w-4" />
                  <span>
                    Interval: <span className="text-[var(--text)] font-semibold">{formatSeconds(intervalSec)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Timer className="h-4 w-4" />
                  <span>
                    Next tick in:{" "}
                    <span className="text-[var(--text)] font-semibold">
                      {formatSeconds(secondsUntilNextTick ?? null)}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-[var(--text-muted)]">
                  Last tick: <span className="text-[var(--text)]">{formatIso(economy?.lastTickAt)}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Last tick results: <span className="text-[var(--text)]">{lastTickResults}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {isTicking ? "Tick running…" : "Waiting for next tick"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={refreshing}
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={onRefresh}
              >
                Refresh
              </Button>
              
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip label="Net Worth" value={money.format(netWorth)} trend="neutral" />
            <KPIChip label="Cash" value={money.format(holding?.cashBalance ?? 0)} trend="neutral" subtle />
            <KPIChip label="Debt" value={money.format(holding?.totalDebt ?? 0)} trend="neutral" subtle />
          </div>
        </Card>

        {/* Holding snapshot */}
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wallet className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Holding snapshot</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Cash</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{money.format(holding?.cashBalance ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Debt</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{money.format(holding?.totalDebt ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Equity</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{money.format(holding?.totalEquity ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Companies</div>
              <div className="mt-1 text-base font-semibold tabular-nums">{companies.length}</div>
            </div>
          </div>
        </Card>

        {/* Next actions */}
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Landmark className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Next actions</div>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="primary"
              className="w-full"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                alert("Create company modal comes next (CompaniesPanel).");
              }}
            >
              Create new company
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<TrendingUp className="h-4 w-4" />}
              onClick={() => {
                window.location.href = "/game/decisions";
              }}
            >
              Review decisions
            </Button>
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Auto-tick runs on <span className="font-semibold text-[var(--text)]">{formatSeconds(intervalSec)}</span>.
          </div>
        </Card>
      </div>

      {/* Companies list */}
      <div>
        <Table
          caption="Your companies"
          isEmpty={companies.length === 0}
          emptyMessage="No companies yet. Create one to start."
        >
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Sector</TH>
              <TH>Niche</TH>
              <TH>Region</TH>
              <TH className="text-right">Status</TH>
            </TR>
          </THead>
          <TBody>
            {companies.map((c) => (
              <TR
                key={String(c.id)}
                interactive
                onClick={() => (window.location.href = `/game/companies/${c.id}`)}
                className="cursor-pointer"
              >
                <TD className="font-semibold">{c.name}</TD>
                <TD>{String((c as any).sectorId ?? "—")}</TD>
                <TD>{String((c as any).nicheId ?? "—")}</TD>
                <TD>{c.region}</TD>
                <TD className="text-right">
                  <span className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1 text-xs">
                    {c.status}
                  </span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default OverviewPanel;
