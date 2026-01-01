// src/ui/hooks/useWorldState.ts
import { useCallback, useMemo } from "react";

import { useAuth } from "./useAuth";
import { useWorld } from "./useWorld";
import { useCurrentPlayer } from "./useCurrentPlayer";
import { useHolding } from "./useHolding";
import { useCompanies } from "./useCompany";

type Phase =
  | "needs_auth"
  | "needs_world"
  | "needs_player"
  | "needs_holding"
  | "needs_loan" // loan + sector/niche + first company
  | "needs_liquidation"
  | "ready"
  | "error";

type WorldStateResult = {
  phase: Phase;

  worldId?: string;
  world: unknown | null;
  economy: unknown | null;

  player: unknown | null;
  holding: unknown | null;
  companies: unknown[];

  activeWorlds: unknown[];

  isLoading: boolean;
  error: unknown | null;

  setWorld?: (worldId: string) => void;
  refetch?: () => Promise<void>;
};

function readBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

function readArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function readFn<T extends (...args: any[]) => any>(v: unknown): T | undefined {
  return typeof v === "function" ? (v as T) : undefined;
}

function readId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

export function useWorldState(): WorldStateResult {
  // -------------------------
  // Auth
  // -------------------------
  const auth = useAuth();
  const isAuthenticated = readBool((auth as any)?.isAuthenticated);
  const authLoading = readBool((auth as any)?.loading);

  // -------------------------
  // World
  // -------------------------
  const worldHook = useWorld();
  const world = (worldHook as any)?.world ?? null;
  const economy = (worldHook as any)?.economy ?? null;
  const activeWorlds = readArray((worldHook as any)?.activeWorlds);

  const worldLoading = readBool((worldHook as any)?.isLoading ?? (worldHook as any)?.loading);
  const worldError = (worldHook as any)?.error ?? null;
  const setWorld = readFn<(worldId: string) => void>((worldHook as any)?.setWorld);
  const worldRefetch = readFn<() => Promise<any> | void>((worldHook as any)?.refetch);

  const worldId = world ? readId(world) : undefined;

  // -------------------------
  // Player
  // -------------------------
  const playerHook = useCurrentPlayer();
  const player = (playerHook as any)?.player ?? null;
  const playerLoading = readBool((playerHook as any)?.isLoading ?? (playerHook as any)?.loading);
  const playerError = (playerHook as any)?.error ?? null;
  const playerRefresh = readFn<() => Promise<any> | void>(
    (playerHook as any)?.refresh ?? (playerHook as any)?.refetch
  );

  // -------------------------
  // Holding
  // -------------------------
  const holdingHook = useHolding();
  const holding = (holdingHook as any)?.holding ?? null;
  const holdingLoading = readBool((holdingHook as any)?.isLoading ?? (holdingHook as any)?.loading);
  const holdingError = (holdingHook as any)?.error ?? null;
  const holdingRefetch = readFn<() => Promise<any> | void>(
    (holdingHook as any)?.refetch ?? (holdingHook as any)?.refresh
  );

  // -------------------------
  // Companies (LIST)
  // -------------------------
  const companiesHook = useCompanies();
  const companiesRaw = (companiesHook as any)?.companies ?? (companiesHook as any)?.list ?? [];
  const companiesArr = readArray(companiesRaw);

  const companiesLoading = readBool((companiesHook as any)?.isLoading ?? (companiesHook as any)?.loading);
  const companiesError = (companiesHook as any)?.error ?? null;
  const companiesRefetch = readFn<() => Promise<any> | void>(
    (companiesHook as any)?.refetch ?? (companiesHook as any)?.refresh
  );

  // -------------------------
  // Aggregate loading/error
  // -------------------------
  const isLoading = authLoading || worldLoading || playerLoading || holdingLoading || companiesLoading;
  const error = worldError ?? playerError ?? holdingError ?? companiesError ?? null;

  // -------------------------
  // Phase machine (Player → Holding → Loan+Sector/Niche+Company)
  // -------------------------
  const phase: Phase = useMemo(() => {
    if (error) return "error";
    if (!isAuthenticated) return "needs_auth";
    if (!worldId) return "needs_world";
    if (!player) return "needs_player";
    if (!holding) return "needs_holding";
    const holdingCash = Number((holding as any)?.cashBalance ?? 0);
    if (holdingCash < 0) return "needs_liquidation";

    // This is now the combined gate step (ChooseLoanCard creates loan + company)
    if (companiesArr.length === 0) return "needs_loan";
    return "ready";
  }, [error, isAuthenticated, worldId, player, holding, companiesArr.length]);

  // -------------------------
  // Refetch whole stack
  // -------------------------
  const refetch = useCallback(async () => {
    const tasks: Array<Promise<any>> = [];

    if (worldRefetch) tasks.push(Promise.resolve().then(() => worldRefetch()));
    if (playerRefresh) tasks.push(Promise.resolve().then(() => playerRefresh()));
    if (holdingRefetch) tasks.push(Promise.resolve().then(() => holdingRefetch()));
    if (companiesRefetch) tasks.push(Promise.resolve().then(() => companiesRefetch()));

    await Promise.allSettled(tasks);
  }, [worldRefetch, playerRefresh, holdingRefetch, companiesRefetch]);

  return useMemo(
    () => ({
      phase,
      worldId,
      world,
      economy,
      player,
      holding,
      companies: companiesArr,
      activeWorlds,
      isLoading,
      error,
      setWorld,
      refetch,
    }),
    [phase, worldId, world, economy, player, holding, companiesArr, activeWorlds, isLoading, error, setWorld, refetch]
  );
}


