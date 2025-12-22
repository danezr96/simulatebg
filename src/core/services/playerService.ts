// src/core/services/playerService.ts
import type { Player, PlayerId, World, WorldId, Holding } from "../domain";
import { playerRepo } from "../persistence/playerRepo";
import { holdingRepo } from "../persistence/holdingRepo";
import { worldRepo } from "../persistence/worldRepo";

/**
 * PlayerService responsibilities:
 * - Create/read/update player profile
 * - Bootstrap: ensure Player + Holding exist for a given world
 * - Provide helpers for UI flows
 */
export const playerService = {
  async getPlayerByUserId(userId: string): Promise<Player | null> {
    return playerRepo.getByUserId(userId);
  },

  async createPlayer(input: {
    userId: string;
    name: string;
    avatarUrl?: string;
    baseCurrency?: string;
  }): Promise<Player> {
    return playerRepo.create({
      userId: input.userId,
      name: input.name,
      avatarUrl: input.avatarUrl,
      baseCurrency: input.baseCurrency ?? "EUR",
    });
  },

  async updateProfile(
    playerId: PlayerId,
    patch: { name?: string; avatarUrl?: string | null; baseCurrency?: string }
  ): Promise<Player> {
    return playerRepo.updateProfile(playerId, patch);
  },

  /**
   * Bootstrap for v0:
   * - Ensure player exists for current Supabase user
   * - Ensure holding exists for (player, world)
   * - Ensure world has economy state row (world_economy_state)
   *
   * This is the "single button" you call after login OR after world-select.
   */
  async ensurePlayerAndHolding(input: {
    userId: string;
    userEmail?: string;
    worldId: WorldId;
    desiredPlayerName?: string; // used if player needs to be created
    desiredHoldingName?: string; // used if holding needs to be created
  }): Promise<{
    player: Player;
    world: World;
    holding: Holding;
  }> {
    // 1) World must exist
    const world = await worldRepo.getById(input.worldId);
    if (!world) throw new Error(`World not found: ${input.worldId}`);

    // 2) Ensure economy state exists
    const econ = await worldRepo.getEconomyState(input.worldId);
    if (!econ) {
      await worldRepo.createEconomyState({ worldId: input.worldId, currentYear: 1, currentWeek: 1 });
    }

    // 3) Ensure player exists
    let player = await playerRepo.getByUserId(input.userId);

    if (!player) {
      const fallbackName =
        input.desiredPlayerName ||
        (input.userEmail ? input.userEmail.split("@")[0] : "Tycoon");

      player = await playerRepo.create({
        userId: input.userId,
        name: fallbackName,
        baseCurrency: "EUR",
      });
    }

    // 4) Ensure holding exists for this world
    let holding = await holdingRepo.getByPlayerAndWorld(player.id, input.worldId);

    if (!holding) {
      const holdingName =
        input.desiredHoldingName ||
        `${player.name} Holdings`;

      holding = await holdingRepo.create({
        playerId: player.id,
        worldId: input.worldId,
        name: holdingName,
        baseCurrency: player.baseCurrency,
        cashBalance: 0,
      });
    }

    return { player, world, holding };
  },

  /* =========================
   * Convenience for UI
   * ========================= */

  async listHoldingsForPlayer(playerId: PlayerId): Promise<Holding[]> {
    return holdingRepo.listByPlayer(playerId);
  },

  async listActiveWorlds(): Promise<World[]> {
    return worldRepo.listActive();
  },
};
