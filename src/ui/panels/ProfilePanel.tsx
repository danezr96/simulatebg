// src/ui/panels/ProfilePanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { User, Trophy, LogOut, Shield, Sparkles, RefreshCw, Crown } from "lucide-react";

import { MOTION } from "../../config/motion";

import { Card } from "../components/Card";
import Button from "../components/Button";
import KPIChip from "../components/KPIChip";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";
import Modal from "../components/Modal";

import { useAuth } from "../hooks/useAuth";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";
import { useHolding } from "../hooks/useHolding";
import { useCompanies } from "../hooks/useCompany";

import { formatMoney } from "../../utils/money";
import { getOverallReputationLevel } from "../../core/domain/player";

/**
 * ProfilePanel
 * - Player overview (rep/prestige)
 * - Holding summary
 * - Logout action
 */

export const ProfilePanel: React.FC = () => {
  const { signOut } = useAuth();

  const playerHook = useCurrentPlayer() as any;
  const { player } = playerHook;
  const refetchPlayer =
    playerHook.refetch ?? playerHook.refresh ?? playerHook.ensureBootstrap ?? (async () => {});

  const holdingHook = useHolding() as any;
  const { holding } = holdingHook;
  const refetchHolding = holdingHook.refetch ?? holdingHook.refresh ?? (async () => {});

  const companiesHook = useCompanies() as any;
  const { companies } = companiesHook;
  const refetchCompanies = companiesHook.refetch ?? companiesHook.refresh ?? (async () => {});

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [openLogout, setOpenLogout] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPlayer(), refetchHolding(), refetchCompanies()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      window.location.href = "/auth";
    } finally {
      setLoggingOut(false);
      setOpenLogout(false);
    }
  };

  const netWorth =
    (holding?.cashBalance ?? 0) + (holding?.totalEquity ?? 0) - (holding?.totalDebt ?? 0);

  const repOverall = player ? getOverallReputationLevel(player) : null;
  const avatarUrl = player?.avatarUrl ?? "";
  const avatarInitial = (player?.name ?? "?").slice(0, 1).toUpperCase();

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={MOTION.page.variants}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Profile</div>
          <div className="text-sm text-[var(--text-muted)]">
            Your tycoon identity, progress, and account settings.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            loading={refreshing}
            onClick={onRefresh}
          >
            Refresh
          </Button>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => setOpenLogout(true)}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Player summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <User className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Player</div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full border border-[var(--border)] bg-[var(--card-2)] overflow-hidden flex items-center justify-center text-sm font-semibold text-[var(--text)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Player avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold">{player?.name ?? "—"}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Prestige:{" "}
                <span className="font-medium text-[var(--text)]">
                  {player?.prestigeLevel ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm text-[var(--text-muted)]">
            {player?.bio ?? "No bio yet."}
          </div>

          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <div>
              Play style:{" "}
              <span className="font-medium text-[var(--text)]">
                {player?.playStyle ?? "—"}
              </span>
            </div>
            <div>
              Focus area:{" "}
              <span className="font-medium text-[var(--text)]">
                {player?.focusArea ?? "—"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip
              label="Reputation"
              value={repOverall ? String(repOverall) : "—"}
              trend="neutral"
            />
            <KPIChip
              label="Brand"
              value={String(player?.brandRepLevel ?? 0)}
              trend="neutral"
              subtle
            />
            <KPIChip
              label="Credit"
              value={String(player?.creditRepLevel ?? 0)}
              trend="neutral"
              subtle
            />
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Skills & perks: next module. Achievements: next module.
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Shield className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Holding</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <KPIChip label="Net worth" value={formatMoney(netWorth)} trend="neutral" />
            <KPIChip
              label="Cash"
              value={formatMoney(holding?.cashBalance ?? 0)}
              trend="neutral"
              subtle
            />
            <KPIChip
              label="Debt"
              value={formatMoney(holding?.totalDebt ?? 0)}
              trend="neutral"
              subtle
            />
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            Companies:{" "}
            <span className="font-medium text-[var(--text)]">
              {Array.isArray(companies) ? companies.length : 0}
            </span>
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Sparkles className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Progress</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Trophy className="h-4 w-4" />
                Achievements
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">0</div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Crown className="h-4 w-4" />
                Prestige
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {player?.prestigeLevel ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-[var(--text-muted)]">
            When we implement achievements, this will show unlock history and meta-perks.
          </div>
        </Card>
      </div>

      {/* Placeholder table for achievements */}
      <Table
        caption="Achievements (coming next)"
        isEmpty={true}
        emptyMessage="Achievements not implemented yet."
      >
        <THead>
          <TR>
            <TH>Achievement</TH>
            <TH>Description</TH>
            <TH className="text-right">Unlocked</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD className="font-semibold">—</TD>
            <TD className="text-sm text-[var(--text-muted)]">—</TD>
            <TD className="text-right text-sm">—</TD>
          </TR>
        </TBody>
      </Table>

      {/* Logout confirm */}
      <Modal
        open={openLogout}
        onOpenChange={setOpenLogout}
        title="Logout"
        description="You will be signed out from this device."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpenLogout(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={loggingOut} onClick={onLogout}>
              Logout
            </Button>
          </div>
        }
      >
        <div className="text-sm text-[var(--text-muted)]">
          Your progress is saved in Supabase (player, holding, companies, weekly states).
        </div>
      </Modal>
    </motion.div>
  );
};

export default ProfilePanel;
