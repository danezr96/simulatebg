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
import TutorialModal from "../components/TutorialModal";

import { useWorld } from "../hooks/useWorld";
import { useHolding } from "../hooks/useHolding";
import { useCompanies } from "../hooks/useCompany";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";
import { useNotifications } from "../hooks/useNotifications";

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
type BadgeTone = "default" | "warning";
type BadgeConfig = { count: number; tone: BadgeTone; label: string };

const tabs: Tab[] = [
  { to: "/game/overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { to: "/game/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
  { to: "/game/decisions", label: "Decisions", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { to: "/game/market", label: "Market", icon: <LineChart className="h-4 w-4" /> },
  { to: "/game/finance", label: "Finance", icon: <Wallet className="h-4 w-4" /> },
  { to: "/game/social", label: "Social", icon: <Users className="h-4 w-4" /> },
  { to: "/game/profile", label: "Profile", icon: <User2 className="h-4 w-4" /> },
];

const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

export default function WorldShell() {
  const { world, economy, isSyncing } = useWorld() as any;
  const { player } = useCurrentPlayer();
  const { holding } = useHolding();
  const { companies } = useCompanies();
  const { counts } = useNotifications();

  const [showKpis, setShowKpis] = React.useState(true);
  const [tutorialOpen, setTutorialOpen] = React.useState(false);

  const tutorialKey = player?.userId ? `simulatebg:tutorial:v1:${player.userId}` : null;

  const hasSeenTutorial = React.useCallback(() => {
    if (!tutorialKey) return false;
    try {
      if (localStorage.getItem(tutorialKey)) return true;
    } catch {
      // ignore
    }
    try {
      if (sessionStorage.getItem(tutorialKey)) return true;
    } catch {
      // ignore
    }
    return false;
  }, [tutorialKey]);

  const markTutorialSeen = React.useCallback(() => {
    if (tutorialKey) {
      try {
        localStorage.setItem(tutorialKey, "1");
      } catch {
        // ignore localStorage errors
      }
      try {
        sessionStorage.setItem(tutorialKey, "1");
      } catch {
        // ignore localStorage errors
      }
    }
    setTutorialOpen(false);
  }, [tutorialKey]);

  React.useEffect(() => {
    if (!tutorialKey) return;
    if (!companies || companies.length === 0) return;
    if (hasSeenTutorial()) return;
    setTutorialOpen(true);
  }, [tutorialKey, companies?.length, companies, hasSeenTutorial]);

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

  const badgeByRoute = React.useMemo<Record<string, BadgeConfig>>(
    () => ({
      "/game/decisions": {
        count: counts.decisions,
        tone: counts.budgetWarning > 0 ? "warning" : "default",
        label: "decision alerts",
      },
      "/game/finance": {
        count: counts.offers,
        tone: "default",
        label: "offer alerts",
      },
      "/game/social": {
        count: counts.friendRequests,
        tone: "default",
        label: "friend requests",
      },
    }),
    [counts]
  );

  const badgeClasses = (tone: BadgeTone) =>
    cn(
      "absolute -right-2 -top-1 flex h-5 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold",
      tone === "warning"
        ? "bg-amber-500 text-amber-950"
        : "bg-[color:var(--accent)] text-[color:var(--accent-ink)]"
    );

  return (
    <div className="min-h-[calc(100vh-72px)]">
      <TutorialModal open={tutorialOpen} onComplete={markTutorialSeen} />
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
                <span className="relative opacity-90">
                  {t.icon}
                  {badgeByRoute[t.to]?.count ? (
                    <span
                      className={badgeClasses(badgeByRoute[t.to]?.tone ?? "default")}
                      title={`${badgeByRoute[t.to]?.count} ${badgeByRoute[t.to]?.label}`}
                    >
                      {formatBadgeCount(badgeByRoute[t.to]?.count ?? 0)}
                    </span>
                  ) : null}
                </span>
                <span className="font-medium">{t.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
