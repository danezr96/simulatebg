// src/core/services/presenceService.ts
import type { PlayerId, WorldId } from "../domain";
import { presenceRepo } from "../persistence/presenceRepo";

export const presenceService = {
  async recordWorldEnter(playerId: PlayerId, worldId: WorldId): Promise<void> {
    await presenceRepo.upsertWorldEnter({ playerId, worldId });
  },

  async recordHeartbeat(playerId: PlayerId, worldId: WorldId): Promise<void> {
    await presenceRepo.updateHeartbeat({ playerId, worldId });
  },

  async countActivePlayers(worldId: WorldId, activeWithinMinutes = 5): Promise<number> {
    return presenceRepo.countActivePlayers({ worldId, activeWithinMinutes });
  },
};
