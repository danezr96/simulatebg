// src/ui/hooks/useHolding.ts
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Holding } from "../../core/domain";
import { asPlayerId, asWorldId } from "../../core/domain";
import { holdingService } from "../../core/services/holdingService";

import { useWorld } from "./useWorld";
import { useCurrentPlayer } from "./useCurrentPlayer";

const QK = {
  holding: (playerId?: string, worldId?: string) => ["holding", playerId, worldId] as const,
};

export function useHolding() {
  const qc = useQueryClient();
  const { world } = useWorld();
  const { player } = useCurrentPlayer();

  const worldId = world?.id ? String(world.id) : undefined;
  const playerId = (player as any)?.id ? String((player as any).id) : undefined;

  const q = useQuery({
    queryKey: QK.holding(playerId, worldId),
    queryFn: async () => {
      if (!playerId || !worldId) return null;

      // ✅ branded ids here
      return holdingService.getHoldingByPlayerAndWorld(
        asPlayerId(playerId),
        asWorldId(worldId)
      );
    },
    enabled: !!playerId && !!worldId,
    staleTime: 5_000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: QK.holding(playerId, worldId) });
    },
  });

  const holding: Holding | null = (q.data ?? null) as any;

  return useMemo(
    () => ({
      holding,
      isLoading: q.isLoading,
      error: (q.error ?? null) as Error | null,

      // ✅ keep existing name your UI expects
      refetch: () => refresh.mutateAsync(),

      // (optional alias if some files use refresh)
      refresh: () => refresh.mutateAsync(),
    }),
    [holding, q.isLoading, q.error, refresh]
  );
}
