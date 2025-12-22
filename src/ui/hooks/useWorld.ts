// src/ui/hooks/useWorld.ts
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { World, WorldEconomyState, WorldRound } from "../../core/domain";
import { worldService } from "../../core/services/worldService";
import { presenceService } from "../../core/services/presenceService";
import { worldRoundService } from "../../core/services/worldRoundService";
import { useCurrentPlayer } from "./useCurrentPlayer";

const STORAGE_KEY = "simulatebg:selectedWorldId";

const QK = {
  worlds: () => ["worlds"] as const,
  world: (worldId?: string | null) => ["world", worldId ?? "none"] as const,
  economy: (worldId?: string | null) => ["worldEconomy", worldId ?? "none"] as const,
  worldRound: (worldId?: string | null) => ["worldRound", worldId ?? "none"] as const,
};

function isWorld(x: unknown): x is World {
  return !!x && typeof x === "object" && typeof (x as any).id === "string" && typeof (x as any).name === "string";
}

function isEconomy(x: unknown): x is WorldEconomyState {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as any).worldId === "string" &&
    typeof (x as any).currentYear === "number" &&
    typeof (x as any).currentWeek === "number"
  );
}

function getStoredWorldId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredWorldId(worldId: string | null) {
  try {
    if (!worldId) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, worldId);
  } catch {
    // ignore
  }
}

export function useWorld() {
  const qc = useQueryClient();
  const { player } = useCurrentPlayer();

  // 1) list active worlds
  const worldsQuery = useQuery({
    queryKey: QK.worlds(),
    queryFn: async () => worldService.listActiveWorlds(),
    enabled: true,
    staleTime: 30_000,
  });

  // 2) pick selected world (localStorage) or first active
  const selectedWorldId = getStoredWorldId();
  const activeWorlds = worldsQuery.data ?? [];

  const effectiveWorldId =
    selectedWorldId && activeWorlds.some((w) => String((w as any).id) === String(selectedWorldId))
      ? selectedWorldId
      : activeWorlds[0]?.id
      ? String((activeWorlds[0] as any).id)
      : null;

  // 2b) when world changes: ensure runtime rows exist (econ + sector state)
  const ensureReadyQuery = useQuery({
    queryKey: ["worldReady", effectiveWorldId ?? "none"],
    queryFn: async () => {
      if (!effectiveWorldId) return null;
      return worldService.ensureWorldReady(effectiveWorldId as any);
    },
    enabled: !!effectiveWorldId,
    staleTime: 10_000,
  });

  // 3) load world detail
  const worldQuery = useQuery({
    queryKey: QK.world(effectiveWorldId),
    queryFn: async () => {
      if (!effectiveWorldId) return null;
      return worldService.getWorld(effectiveWorldId as any);
    },
    enabled: !!effectiveWorldId,
    staleTime: 10_000,
  });

  // 4) load economy
  const economyQuery = useQuery({
    queryKey: QK.economy(effectiveWorldId),
    queryFn: async () => {
      if (!effectiveWorldId) return null;
      // ensureEconomyState makes sure it exists, then returns it
      return worldService.ensureEconomyState(effectiveWorldId as any);
    },
    enabled: !!effectiveWorldId,
    staleTime: 2_500,
    refetchInterval: 5_000,
  });

  const worldRoundQuery = useQuery({
    queryKey: QK.worldRound(effectiveWorldId),
    queryFn: async () => {
      if (!effectiveWorldId) return null;
      return worldRoundService.getLatestRound(effectiveWorldId as any);
    },
    enabled: !!effectiveWorldId,
    staleTime: 2_500,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!player?.id || !effectiveWorldId) return;
    const worldId = effectiveWorldId as any;
    let active = true;

    const onEnter = async () => {
      try {
        await presenceService.recordWorldEnter(player.id, worldId);
      } catch (error) {
        if (!active) return;
        // eslint-disable-next-line no-console
        console.error("[useWorld] presence enter failed", error);
      }
    };

    void onEnter();

    const timer = window.setInterval(() => {
      void presenceService.recordHeartbeat(player.id, worldId).catch((error) => {
        // eslint-disable-next-line no-console
        console.error("[useWorld] presence heartbeat failed", error);
      });
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [player?.id, effectiveWorldId]);

  // 5) set selected world (client-side)
  const setWorldMutation = useMutation({
    mutationFn: async (nextWorldId: string) => {
      setStoredWorldId(nextWorldId);
      return nextWorldId;
    },
    onSuccess: async (nextWorldId) => {
      await qc.invalidateQueries({ queryKey: QK.world(nextWorldId) });
      await qc.invalidateQueries({ queryKey: QK.economy(nextWorldId) });
      await qc.invalidateQueries({ queryKey: ["worldReady", nextWorldId] });
    },
  });

  const refetchAll = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: QK.worlds() });
      if (effectiveWorldId) {
        await qc.invalidateQueries({ queryKey: QK.world(effectiveWorldId) });
        await qc.invalidateQueries({ queryKey: QK.economy(effectiveWorldId) });
        await qc.invalidateQueries({ queryKey: QK.worldRound(effectiveWorldId) });
        await qc.invalidateQueries({ queryKey: ["worldReady", effectiveWorldId] });
      }
    },
  });

  // Hard guard: never return {} as World/Economy
  const world: World | null = isWorld(worldQuery.data) ? (worldQuery.data as World) : null;
  const economy: WorldEconomyState | null = isEconomy(economyQuery.data)
    ? (economyQuery.data as WorldEconomyState)
    : null;
  const worldRound: WorldRound | null = (worldRoundQuery.data ?? null) as WorldRound | null;

  const [secondsUntilNextTick, setSecondsUntilNextTick] = useState<number | null>(null);

  useEffect(() => {
    if (!world || !economy) {
      setSecondsUntilNextTick(null);
      return;
    }

    const intervalSec = Number((world as any).baseRoundIntervalSeconds ?? 0);
    if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
      setSecondsUntilNextTick(null);
      return;
    }

    const getRemaining = () => {
      const lastTickAtRaw = (economy as any).lastTickAt as string | undefined;
      const lastTickMs = lastTickAtRaw ? Date.parse(lastTickAtRaw) : NaN;
      const baseMs = Number.isFinite(lastTickMs) ? lastTickMs : Date.now();
      const elapsedSec = Math.max(0, (Date.now() - baseMs) / 1000);
      const remaining = Math.max(0, Math.ceil(intervalSec - elapsedSec));
      setSecondsUntilNextTick(remaining);
    };

    getRemaining();
    const timer = window.setInterval(getRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [world?.id, economy?.lastTickAt, (world as any)?.baseRoundIntervalSeconds]);

  // TEMP debug logs (remove later)
  useEffect(() => {
    if (worldQuery.isFetching || economyQuery.isFetching) return;
    // eslint-disable-next-line no-console
    console.log("[useWorld] world", worldQuery.data);
    // eslint-disable-next-line no-console
    console.log("[useWorld] economy", economyQuery.data);
  }, [worldQuery.data, economyQuery.data, worldQuery.isFetching, economyQuery.isFetching]);

  const isSyncing =
    worldsQuery.isFetching ||
    ensureReadyQuery.isFetching ||
    worldQuery.isFetching ||
    economyQuery.isFetching ||
    worldRoundQuery.isFetching;

  const isLoading =
    worldsQuery.isLoading ||
    ensureReadyQuery.isLoading ||
    worldQuery.isLoading ||
    economyQuery.isLoading ||
    worldRoundQuery.isLoading;

  const error =
    worldsQuery.error ??
    ensureReadyQuery.error ??
    worldQuery.error ??
    economyQuery.error ??
    worldRoundQuery.error ??
    null;

  return useMemo(
    () => ({
      player,
      activeWorlds,
      effectiveWorldId,

      world,
      economy,
      worldRound,
      secondsUntilNextTick,
      isTicking: (economy as any)?.isTicking === true || worldRound?.status === "RUNNING",

      isLoading,
      isSyncing,
      error,

      setWorld: (id: string) => setWorldMutation.mutateAsync(id),
      refetch: () => refetchAll.mutateAsync(),
    }),
    [
      player,
      activeWorlds,
      effectiveWorldId,
      world,
      economy,
      worldRound,
      secondsUntilNextTick,
      isLoading,
      isSyncing,
      error,
      setWorldMutation,
      refetchAll,
    ]
  );
}

export default useWorld;
