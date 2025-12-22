// src/core/services/worldRoundService.ts
import type { WorldId, WorldRound } from "../domain";
import { worldRoundRepo } from "../persistence/worldRoundRepo";

export const worldRoundService = {
  async getLatestRound(worldId: WorldId): Promise<WorldRound | null> {
    return worldRoundRepo.getLatestByWorld(worldId);
  },
};
