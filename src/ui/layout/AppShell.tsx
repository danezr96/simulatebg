// src/ui/layout/AppShell.tsx
import * as React from "react";
import {
  LogOut,
  LayoutDashboard,
  Building2,
  LineChart,
  SlidersHorizontal,
  Users,
  Globe,
  User2,
  Shield,
  Clock,
} from "lucide-react";

import { cn } from "../../utils/format";
import { UI_CONFIG } from "../../config/ui";

import Button from "../components/Button";
import { Card } from "../components/Card";

import { useAuth } from "../hooks/useAuth";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";
import { useWorld } from "../hooks/useWorld";

import { getOverallReputationLevel } from "../../core/domain/player";
import type { World } from "../../core/domain";

type Props = {
  children?: React.ReactNode;
};

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  show?: boolean;
};

function isActivePath(to: string) {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (to === "/game") return path === "/game" || path.startsWith("/game/");
  return path === to || path.startsWith(to + "/");
}

function navigate(to: string) {
  window.location.href = to;
}

function formatSeconds(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

export default function AppShell({ children }: Props) {
  const { signOut } = useAuth();
  const { player } = useCurrentPlayer();

  // ✅ useWorld is the source of truth (prevents {} typing issues)
  const { world, economy, secondsUntilNextTick } = useWorld();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const brand = UI_CONFIG.brand ?? { appName: "Simulate" };

  const navItems: NavItem[] = [
    { to: "/game", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/game/companies", label: "Companies", icon: <Building2 className="h-4 w-4" /> },
    { to: "/game/decisions", label: "Decisions", icon: <SlidersHorizontal className="h-4 w-4" /> },
    { to: "/game/market", label: "Market", icon: <LineChart className="h-4 w-4" /> },
    { to: "/game/social", label: "Social", icon: <Users className="h-4 w-4" /> },
    { to: "/worlds", label: "Worlds", icon: <Globe className="h-4 w-4" /> },
    { to: "/game/profile", label: "Profile", icon: <User2 className="h-4 w-4" /> },
    { to: "/admin", label: "Admin", icon: <Shield className="h-4 w-4" />, show: true },
  ];

  const repOverall = player ? getOverallReputationLevel(player) : null;

  // ✅ null-safe header text
  const worldName = (world as World | null)?.name ? String(world!.name) : null;
  const intervalSec = world?.baseRoundIntervalSeconds ?? null;

  const worldLine = worldName ? `World: ${worldName}` : "No world selected";


  const timeLine =
    economy && Number.isFinite(economy.currentYear) && Number.isFinite(economy.currentWeek)
      ? `Year ${economy.currentYear} · Week ${economy.currentWeek}`
      : null;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg)]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <span className="text-lg leading-none">☰</span>
            </Button>

            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex items-center justify-center"
                aria-hidden
              >
                <span className="font-semibold text-[color:var(--accent)]">S</span>
              </div>

              <div className="leading-tight">
                <div className="text-sm font-semibold">{brand.appName}</div>

                <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                  <span>{worldLine}</span>

                  {timeLine ? (
                    <>
                      <span className="opacity-60">·</span>
                      <span>{timeLine}</span>
                    </>
                  ) : null}

                  {worldName && intervalSec != null ? (
                    <>
                      <span className="opacity-60">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{`Interval ${formatSeconds(intervalSec)} (next ${formatSeconds(
                          secondsUntilNextTick ?? null
                        )})`}</span>
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {player ? (
              <Card className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-2xl">
                <div className="text-xs">
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-[var(--text-muted)]">
                    Rep {repOverall} · Brand {player.brandRepLevel} · Credit {player.creditRepLevel} · Prestige{" "}
                    {player.prestigeLevel}
                  </div>
                </div>
              </Card>
            ) : null}

            <Button variant="ghost" size="md" leftIcon={<LogOut className="h-4 w-4" />} onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 py-4">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:block">
            <Card className="p-3 rounded-3xl sticky top-[72px]">
              <nav className="flex flex-col gap-1">
                {navItems
                  .filter((i) => i.show !== false)
                  .map((item) => {
                    const active = isActivePath(item.to);
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => navigate(item.to)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
                          "border border-transparent",
                          active
                            ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)] border-[color:var(--accent-soft-border)]"
                            : "hover:bg-[color:var(--card-2)] text-[var(--text)]"
                        )}
                      >
                        <span className="opacity-90">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
              </nav>
            </Card>
          </aside>

          {/* Main */}
          <main>{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onMouseDown={() => setMobileOpen(false)} />
          <div
            className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-[var(--card)] border-r border-[var(--border)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border)]">
              <div className="text-sm font-semibold">{brand.appName}</div>
              <div className="text-xs text-[var(--text-muted)]">{worldLine}</div>

              {timeLine ? <div className="mt-1 text-xs text-[var(--text-muted)]">{timeLine}</div> : null}

              {worldName && intervalSec != null ? (
                <div className="mt-1 text-xs text-[var(--text-muted)]">{`Interval ${formatSeconds(
                  intervalSec
                )} · Next ${formatSeconds(secondsUntilNextTick ?? null)}`}</div>
              ) : null}

              {player ? (
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Rep {repOverall} · Brand {player.brandRepLevel} · Credit {player.creditRepLevel} · Prestige{" "}
                  {player.prestigeLevel}
                </div>
              ) : null}
            </div>

            <div className="p-3">
              <nav className="flex flex-col gap-1">
                {navItems
                  .filter((i) => i.show !== false)
                  .map((item) => {
                    const active = isActivePath(item.to);
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          navigate(item.to);
                        }}
                        className={cn(
                          "w-full text-left flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
                          "border border-transparent",
                          active
                            ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)] border-[color:var(--accent-soft-border)]"
                            : "hover:bg-[color:var(--card-2)] text-[var(--text)]"
                        )}
                      >
                        <span className="opacity-90">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
              </nav>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  leftIcon={<LogOut className="h-4 w-4" />}
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
