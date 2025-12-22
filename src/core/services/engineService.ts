// src/core/services/engineService.ts
import type { WorldId } from "../domain";
import { runWorldTick } from "../engine/runWorldTick";

/**
 * Thin wrapper for server/worker tick triggers without importing engine internals.
 */
export const engineService = {
  async runWorldTick(worldId: WorldId) {
    return runWorldTick(worldId);
  },
};
