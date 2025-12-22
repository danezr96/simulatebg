// src/core/persistence/botRepo.ts
import { supabase } from "./supabaseClient";

import type { Database } from "../../supabase/database.types";


import type { Bot, BotProfile } from "../domain/bots";
import type { BotId, BotProfileId, WorldId, HoldingId } from "../domain/common";

/**
 * Tables:
 * - bot_profiles
 * - bots
 */

type BotProfileRow = Database["public"]["Tables"]["bot_profiles"]["Row"];
type BotRow = Database["public"]["Tables"]["bots"]["Row"];

function mapBotProfile(row: BotProfileRow): BotProfile {
  return {
    id: row.id as BotProfileId,
    name: row.name,
    archetype: row.archetype as any,
    behaviorConfig: (row.behavior_config ?? {}) as any,
  };
}

function mapBot(row: BotRow): Bot {
  return {
    id: row.id as BotId,
    worldId: row.world_id as WorldId,
    botProfileId: row.bot_profile_id as BotProfileId,
    holdingId: row.holding_id as HoldingId,
    active: row.active,
    createdAt: row.created_at as any,
  };
}

export const botRepo = {
  /* =========================
   * Bot profiles
   * ========================= */

  async listProfiles(): Promise<BotProfile[]> {
    const { data, error } = await supabase
      .from("bot_profiles")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    const rows: BotProfileRow[] = (data ?? []) as BotProfileRow[];
    return rows.map((r: BotProfileRow) => mapBotProfile(r));
  },

  async getProfileById(id: BotProfileId): Promise<BotProfile | null> {
    const { data, error } = await supabase
      .from("bot_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBotProfile(data as BotProfileRow) : null;
  },

  /* =========================
   * Bots
   * ========================= */

  async listByWorld(worldId: WorldId): Promise<Bot[]> {
    const { data, error } = await supabase
      .from("bots")
      .select("*")
      .eq("world_id", worldId)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows: BotRow[] = (data ?? []) as BotRow[];
    return rows.map((r: BotRow) => mapBot(r));
  },

  async createBot(input: {
    worldId: WorldId;
    botProfileId: BotProfileId;
    holdingId: HoldingId;
    active?: boolean;
  }): Promise<Bot> {
    const payload: Database["public"]["Tables"]["bots"]["Insert"] = {
      world_id: input.worldId as any,
      bot_profile_id: input.botProfileId as any,
      holding_id: input.holdingId as any,
      active: input.active ?? true,
    };

    const { data, error } = await supabase
      .from("bots")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapBot(data as BotRow);
  },

  async setActive(id: BotId, active: boolean): Promise<Bot> {
    const payload: Database["public"]["Tables"]["bots"]["Update"] = { active };

    const { data, error } = await supabase
      .from("bots")
      .update(payload)
      .eq("id", id as any)
      .select("*")
      .single();

    if (error) throw error;
    return mapBot(data as BotRow);
  },
};
