// src/core/services/worldService.ts
import type { World, WorldEconomyState, WorldId, SeasonId } from "../domain";
import { asSeasonId } from "../domain";
import { worldRepo } from "../persistence/worldRepo";
import { sectorRepo } from "../persistence/sectorRepo";

/**
 * WorldService responsibilities:
 * - Provide world list & detail (always mapped World objects)
 * - Ensure per-world dynamic rows exist (economy state, world_sector_state)
 * - Admin helpers (create/update world)
 */
export const worldService = {
  /* =========================
   * Read
   * ========================= */

  async listActiveWorlds(): Promise<World[]> {
    // worldRepo already maps DB rows -> World
    return worldRepo.listActive();
  },

  async getWorld(worldId: WorldId): Promise<World> {
    const world = await worldRepo.getById(worldId);
    if (!world) throw new Error(`World not found: ${String(worldId)}`);
    return world;
  },

  async getEconomyState(worldId: WorldId): Promise<WorldEconomyState> {
    const econ = await worldRepo.getEconomyState(worldId);
    if (!econ) throw new Error(`World economy state missing for worldId=${String(worldId)}`);
    return econ;
  },

  async ensureEconomyState(worldId: WorldId): Promise<WorldEconomyState> {
    const econ = await worldRepo.getEconomyState(worldId);
    if (econ) return econ;
    return worldRepo.createEconomyState({ worldId, currentYear: 1, currentWeek: 1 });
  },

  /**
   * Ensures `world_sector_state` rows exist for every sector in the DB.
   * Call this once when a world is created OR first time world is played.
   */
  async ensureWorldSectorState(worldId: WorldId): Promise<void> {
    const sectors = await sectorRepo.listSectors();
    const existing = await sectorRepo.listWorldSectorStates(worldId);
    const existingSet = new Set(existing.map((s) => String((s as any).sectorId)));

    const missing = sectors.filter((s) => !existingSet.has(String((s as any).id)));
    if (missing.length === 0) return;

    // Create default rows (engine will populate on first tick)
    for (const s of missing) {
      await sectorRepo.upsertWorldSectorState({
        worldId,
        sectorId: (s as any).id,
        currentDemand: 0,
        trendFactor: 1,
        volatility: 0.1,
        lastRoundMetrics: {},
      } as any);
    }
  },

  /**
   * Convenience: ensure all “runtime” rows exist for a world.
   * Useful to call right after selecting a world in the UI (or on world entry).
   */
  async ensureWorldReady(worldId: WorldId): Promise<{
    world: World;
    economy: WorldEconomyState;
  }> {
    const world = await this.getWorld(worldId);
    const economy = await this.ensureEconomyState(worldId);
    await this.ensureWorldSectorState(worldId);
    return { world, economy };
  },

  /* =========================
   * Admin helpers
   * ========================= */

  async createWorld(input: {
    name: string;
    mode?: World["mode"];
    baseRoundIntervalSeconds?: number;
    seasonId?: string;
  }): Promise<World> {
    const seasonId: SeasonId | undefined = input.seasonId ? asSeasonId(input.seasonId) : undefined;

    const world = await worldRepo.create({
      name: input.name,
      mode: input.mode ?? "NORMAL",
      baseRoundIntervalSeconds: input.baseRoundIntervalSeconds ?? 600,
      seasonId,
    });

    // bootstrap economy + sector state
    await worldRepo.createEconomyState({ worldId: world.id, currentYear: 1, currentWeek: 1 });
    await this.ensureWorldSectorState(world.id);

    return world;
  },

  async updateWorld(
    worldId: WorldId,
    patch: Partial<{
      name: string;
      mode: World["mode"];
      status: World["status"];
      baseRoundIntervalSeconds: number;
      seasonId: string | null;
    }>
  ): Promise<World> {
    const fixedPatch: Partial<{
      name: string;
      mode: World["mode"];
      status: World["status"];
      baseRoundIntervalSeconds: number;
      seasonId: SeasonId | null;
    }> = {
      ...patch,
      seasonId:
        patch.seasonId === null
          ? null
          : patch.seasonId
          ? asSeasonId(patch.seasonId)
          : undefined,
    };

    return worldRepo.update(worldId, fixedPatch as any);
  },
};
