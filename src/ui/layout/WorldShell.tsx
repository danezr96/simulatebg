// src/ui/layout/WorldShell.tsx
import * as React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Building2, SlidersHorizontal, LineChart, User2, Users, Wallet } from "lucide-react";

import { cn } from "../../utils/format";
import { MOTION } from "../../config/motion";

import Card from "../components/Card";
import Button from "../components/Button";
import KPIChip from "../components/KPIChip";

import { useWorld } from "../hooks/useWorld";
import { useHolding } from "../hooks/useHolding";
import { useCompanies } from "../hooks/useCompany";

import { formatMoney } from "../../utils/money";

/**
 * WorldShell
 * - In-world header (world + time + KPI toggle)
 * - Renders nested routes via <Outlet />
 * - Bottom tab navigation
 *
 * NOTE:
 * We compute KPIs locally from holding/companies to avoid dependency on useEmpireState/useWorldState.
 */

type Tab = { to: string; label: string; icon: React.ReactNode };

const tabs: Tab[] = [
  { to: "/game/overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { to: "/game/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  { to: "/game/decisions", label: "Decisions", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { to: "/game/market", label: "Market", icon: <LineChart className="h-4 w-4" /> },
  { to: "/game/finance", label: "Finance", icon: <Wallet className="h-4 w-4" /> },
  { to: "/game/social", label: "Social", icon: <Users className="h-4 w-4" /> },
  { to: "/game/profile", label: "Profile", icon: <User2 className="h-4 w-4" /> },
];

export default function WorldShell() {
  const { world, economy, isSyncing } = useWorld() as any;
  const { holding } = useHolding();
  const { companies } = useCompanies();

  const [showKpis, setShowKpis] = React.useState(true);

  const cash = Number(holding?.cashBalance ?? 0);
  const debt = Number(holding?.totalDebt ?? 0);
  const equity = Number(holding?.totalEquity ?? 0);
  const netWorth = cash + equity - debt;

  const kpis = React.useMemo(
    () => ({
      netWorthLabel: formatMoney(netWorth),
      cashLabel: formatMoney(cash),
      debtLabel: formatMoney(debt),
      companyCount: String(companies?.length ?? 0),
      // trends later when you have history; for now keep it stable
      netWorthTrend: "neutral" as const,
      cashTrend: "neutral" as const,
      debtTrend: "neutral" as const,
    }),
    [netWorth, cash, debt, companies]
  );

  return (
    <div className="min-h-[calc(100vh-72px)]">
      {/* Header */}
      <div className="mb-4">
        <Card className="rounded-3xl px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text)] truncate">
                {world?.name ?? "World"}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {economy
                  ? `Year ${economy.currentYear} · Week ${economy.currentWeek}`
                  : "Loading time…"}
              </div>
              {isSyncing ? (
                <div className="text-xs text-[var(--text-muted)]">Syncing with world...</div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowKpis((v) => !v)}>
                {showKpis ? "Hide KPIs" : "Show KPIs"}
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showKpis ? (
              <motion.div
                className="mt-4 flex flex-wrap gap-2"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={MOTION.panel.variants}
              >
                <KPIChip label="Net Worth" value={kpis.netWorthLabel} trend={kpis.netWorthTrend} />
                <KPIChip label="Cash" value={kpis.cashLabel} trend={kpis.cashTrend} subtle />
                <KPIChip label="Debt" value={kpis.debtLabel} trend={kpis.debtTrend} subtle />
                <KPIChip label="Companies" value={kpis.companyCount} trend="neutral" subtle />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Card>
      </div>

      {/* Nested route content */}
      <div className="pb-32">
        <Outlet />
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[color:var(--bg)]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 py-2">
          <nav className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition-colors",
                    isActive
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]"
                      : "text-[var(--text-muted)] hover:bg-[color:var(--card)] hover:text-[var(--text)]"
                  )
                }
              >
                <span className="opacity-90">{t.icon}</span>
                <span className="font-medium">{t.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
