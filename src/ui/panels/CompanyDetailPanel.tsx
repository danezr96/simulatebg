// src/ui/panels/CompanyDetailPanel.tsx
import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Settings2, TrendingUp, Wallet } from "lucide-react";

import { MOTION } from "../../config/motion";

import Card from "../components/Card";
import Button from "../components/Button";
import KPIChip from "../components/KPIChip";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import Sparkline from "../components/Sparkline";
import { useCompany } from "../hooks/useCompany";
import { money } from "../../utils/money";
import { companyService } from "../../core/services/companyService";
import { asCompanyId } from "../../core/domain";

/**
 * CompanyDetailPanel
 * - Shows company + latest state + latest financials
 * - v0: edit knobs will be wired to DecisionsPanel later
 */

export const CompanyDetailPanel: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const nav = useNavigate();

  const { company, state, financials, isLoading, error, refetch } = useCompany(companyId);

  const financialsHistoryQuery = useQuery({
    queryKey: ["companyFinancialsHistory", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return companyService.listFinancials(asCompanyId(companyId), 26);
    },
    enabled: !!companyId,
    staleTime: 10_000,
  });

  const financialsHistory = financialsHistoryQuery.data ?? [];
  const orderedHistory = React.useMemo(() => [...financialsHistory].reverse(), [financialsHistory]);
  const revenueSeries = orderedHistory.map((row) => Number(row.revenue ?? 0));
  const profitSeries = orderedHistory.map((row) => Number(row.netProfit ?? 0));
  const cashSeries = orderedHistory.map((row) => Number(row.cashChange ?? 0));

  const onRefresh = async () => {
    await refetch();
  };

  const kpiRevenue = financials?.revenue ?? 0;
  const kpiProfit = financials?.netProfit ?? 0;
  const kpiMargin =
    kpiRevenue > 0 ? `${Math.round((kpiProfit / kpiRevenue) * 1000) / 10}%` : "—";

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={MOTION.page.variants}

    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => nav("/game/companies")}
          >
            Back
          </Button>

          <div>
            <div className="text-base font-semibold text-[var(--text)]">
              {company?.name ?? "Company"}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {(company as any)?.sectorId ?? "—"} · {(company as any)?.nicheId ?? "—"} ·{" "}
              {company?.region ?? "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={onRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Settings2 className="h-4 w-4" />}
            onClick={() => (window.location.href = `/game/decisions?companyId=${companyId}`)}
          >
            Adjust
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-3xl p-5 border border-rose-200 bg-rose-50">
          <div className="text-sm text-rose-700">
            {(error as any)?.message ?? "Failed to load company."}
          </div>
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Performance</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip label="Revenue" value={money.format(kpiRevenue)} trend="neutral" />
            <KPIChip label="Profit" value={money.format(kpiProfit)} trend="neutral" subtle />
            <KPIChip label="Margin" value={kpiMargin} trend="neutral" subtle />
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Latest simulated week snapshot.
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Wallet className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Operations</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Price level</div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {state ? (Math.round(state.priceLevel * 100) / 100).toFixed(2) : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Marketing</div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {state ? (Math.round(state.marketingLevel * 100) / 100).toFixed(2) : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Capacity</div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {state ? (Math.round(state.capacity * 100) / 100).toFixed(2) : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="text-xs text-[var(--text-muted)]">Employees</div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {state ? state.employees : "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Meta</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Status:{" "}
            <span className="font-medium text-[var(--text)]">
              {company?.status ?? "—"}
            </span>
          </div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            Founded year:{" "}
            <span className="font-medium text-[var(--text)]">
              {company?.foundedYear ?? "—"}
            </span>
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Next: decisions + projects + upgrades.
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-3xl p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Revenue trend</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Last 26 weeks</div>
          {revenueSeries.length > 1 ? (
            <>
              <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                {money.compact(revenueSeries[revenueSeries.length - 1] ?? 0)}
              </div>
              <div className="mt-2">
                <Sparkline data={revenueSeries} />
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-[var(--text-muted)]">No trend data yet.</div>
          )}
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Profit trend</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Last 26 weeks</div>
          {profitSeries.length > 1 ? (
            <>
              <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                {money.compact(profitSeries[profitSeries.length - 1] ?? 0)}
              </div>
              <div className="mt-2">
                <Sparkline data={profitSeries} stroke="var(--success)" />
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-[var(--text-muted)]">No trend data yet.</div>
          )}
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="text-sm font-semibold text-[var(--text)]">Cash change trend</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Last 26 weeks</div>
          {cashSeries.length > 1 ? (
            <>
              <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                {money.compact(cashSeries[cashSeries.length - 1] ?? 0)}
              </div>
              <div className="mt-2">
                <Sparkline data={cashSeries} stroke="var(--warning)" />
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-[var(--text-muted)]">No trend data yet.</div>
          )}
        </Card>
      </div>

      {/* Financial breakdown */}
      <Table
        caption="Latest financials"
        isEmpty={!financials}
        emptyMessage="No financials recorded yet (run a world tick first)."
      >
        <THead>
          <TR>
            <TH>Metric</TH>
            <TH className="text-right">Value</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Revenue</TD>
            <TD className="text-right" mono>
              {money.format(financials?.revenue ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>COGS</TD>
            <TD className="text-right" mono>
              {money.format(financials?.cogs ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>OPEX</TD>
            <TD className="text-right" mono>
              {money.format(financials?.opex ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>Interest</TD>
            <TD className="text-right" mono>
              {money.format(financials?.interestCost ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>Tax</TD>
            <TD className="text-right" mono>
              {money.format(financials?.taxExpense ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD className="font-semibold">Net profit</TD>
            <TD className="text-right font-semibold" mono>
              {money.format(financials?.netProfit ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>Assets</TD>
            <TD className="text-right" mono>
              {money.format(financials?.assets ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>Liabilities</TD>
            <TD className="text-right" mono>
              {money.format(financials?.liabilities ?? 0)}
            </TD>
          </TR>
          <TR>
            <TD>Equity</TD>
            <TD className="text-right" mono>
              {money.format(financials?.equity ?? 0)}
            </TD>
          </TR>
        </TBody>
      </Table>
    </motion.div>
  );
};

export default CompanyDetailPanel;
