// src/ui/pages/WorldSelectPage.tsx
import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Globe2, RefreshCw, CheckCircle2 } from "lucide-react";

import { MOTION } from "../../config/motion";
import { Card } from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";

import { useWorld } from "../hooks/useWorld";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";

import { worldService } from "../../core/services/worldService";
import { presenceService } from "../../core/services/presenceService";

import type { World } from "../../core/domain";

type WorldHookCompat = {
  world: World | null;
  economy: { currentYear: number; currentWeek: number } | null;
  activeWorlds?: World[] | null;
  isLoading?: boolean;
  loading?: boolean;
  error?: unknown;
  setWorld: (id: string) => Promise<void> | void;
  refetch?: () => Promise<void>;
  refresh?: () => Promise<void>;
};

function formatSeconds(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "--";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

function formatCountdown(totalSeconds: number | null | undefined) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "--:--";
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function getSecondsUntilNextTick(lastTickAt: string | null | undefined, intervalSec: number | null | undefined) {
  if (!intervalSec || !Number.isFinite(intervalSec) || intervalSec <= 0) return null;
  const lastTickMs = lastTickAt ? Date.parse(lastTickAt) : NaN;
  const baseMs = Number.isFinite(lastTickMs) ? lastTickMs : Date.now();
  const elapsedSec = Math.max(0, (Date.now() - baseMs) / 1000);
  return Math.max(0, Math.ceil(intervalSec - elapsedSec));
}

export const WorldSelectPage: React.FC = () => {
  const {
    player,
    loading: playerLoading,
    // compat aliases bestaan door onze useCurrentPlayer fix:
    // refetch / refresh / ensureBootstrap
  } = useCurrentPlayer();

  const worldHook = useWorld() as unknown as WorldHookCompat;

  const world = worldHook.world ?? null;
  const economy = worldHook.economy ?? null;
  const error = worldHook.error ?? null;
  const setWorld = worldHook.setWorld;

  const worldLoading = Boolean(worldHook.isLoading ?? worldHook.loading ?? false);

  const refetch = worldHook.refetch ?? worldHook.refresh;

  const [busy, setBusy] = React.useState(false);

  const worlds: World[] = React.useMemo(() => {
    const list = worldHook.activeWorlds;
    if (Array.isArray(list) && list.length > 0) return list;
    return world ? [world] : [];
  }, [worldHook.activeWorlds, world]);

  const selectedWorldId = world?.id ? String((world as any).id) : null;

  const economyQueries = useQueries({
    queries: worlds.map((w) => ({
      queryKey: ["worldEconomy", String((w as any).id)],
      queryFn: async () => {
        const worldId = (w as any).id;
        if (!worldId) return null;
        try {
          return await worldService.getEconomyState(worldId as any);
        } catch {
          return null;
        }
      },
      enabled: !!(w as any).id,
      staleTime: 2_500,
      refetchInterval: 5_000,
    })),
  });

  const presenceQueries = useQueries({
    queries: worlds.map((w) => ({
      queryKey: ["worldPresenceCount", String((w as any).id)],
      queryFn: async () => {
        const worldId = (w as any).id;
        if (!worldId) return 0;
        try {
          return await presenceService.countActivePlayers(worldId as any, 5);
        } catch {
          return 0;
        }
      },
      enabled: !!(w as any).id,
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  });

  const economyByWorldId = React.useMemo(() => {
    const map: Record<string, any> = {};
    economyQueries.forEach((q, idx) => {
      const w = worlds[idx];
      const worldId = w ? String((w as any).id) : null;
      if (!worldId) return;
      if (q.data) map[worldId] = q.data;
    });
    return map;
  }, [economyQueries, worlds]);

  const presenceCountByWorldId = React.useMemo(() => {
    const map: Record<string, number> = {};
    presenceQueries.forEach((q, idx) => {
      const w = worlds[idx];
      const worldId = w ? String((w as any).id) : null;
      if (!worldId) return;
      if (typeof q.data === "number") map[worldId] = q.data;
    });
    return map;
  }, [presenceQueries, worlds]);

  const onRefresh = async () => {
    if (!refetch) return;
    setBusy(true);
    try {
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const onSelectWorld = async (worldId: string) => {
    setBusy(true);
    try {
      await Promise.resolve(setWorld(worldId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="show"
      variants={MOTION.page.variants}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Worlds</div>
          <div className="text-sm text-[var(--text-muted)]">
            {playerLoading
              ? "Loading playerâ€¦"
              : player
              ? `Signed in as ${player.name ?? "Player"}`
              : "Not signed in"}
            {economy ? ` Â· Year ${economy.currentYear} Week ${economy.currentWeek}` : ""}
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={onRefresh}
          loading={busy || worldLoading}
          disabled={!refetch}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="rounded-3xl p-5 border border-rose-200 bg-rose-50">
          <div className="text-sm text-rose-700">
            {(error as any)?.message ?? String(error)}
          </div>
        </Card>
      ) : null}

      <Card className="rounded-3xl p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Globe2 className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">Select a world</div>
        </div>

        <div className="mt-4">
          <Table
            caption={`Available worlds (${worlds.length})`}
            isEmpty={!worldLoading && worlds.length === 0}
            emptyMessage="No worlds found yet. Create/seed a world first."
          >
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Interval</TH>
                <TH>Next tick</TH>
                <TH className="text-right">Players</TH>
                <TH>Status</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {worlds.map((w) => {
                const wid = String((w as any).id);
                const isSelected = selectedWorldId === wid;
                const economyRow = economyByWorldId[wid];
                const intervalSec = Number((w as any).baseRoundIntervalSeconds ?? 0) || null;
                const nextTick = getSecondsUntilNextTick(economyRow?.lastTickAt ?? null, intervalSec);
                const players = presenceCountByWorldId[wid];
                const playersLabel = typeof players === "number" ? String(players) : "--";

                return (
                  <TR key={wid}>
                    <TD className="font-semibold">{(w as any).name ?? wid}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{formatSeconds(intervalSec)}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{formatCountdown(nextTick)}</TD>
                    <TD className="text-right text-xs text-[var(--text-muted)]">{playersLabel}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Selected
                        </span>
                      ) : (
                        "â€”"
                      )}
                    </TD>
                    <TD className="text-right">
                      <Button
                        size="sm"
                        variant={isSelected ? "secondary" : "primary"}
                        onClick={() => onSelectWorld(wid)}
                        disabled={!player || isSelected}
                        loading={busy}
                      >
                        {isSelected ? "Current" : "Select"}
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
};

export default WorldSelectPage;






