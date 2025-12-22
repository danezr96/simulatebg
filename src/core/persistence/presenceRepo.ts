// src/core/persistence/presenceRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { PlayerId, Timestamp, WorldId } from "../domain";

type PlayerWorldPresenceRow = Database["public"]["Tables"]["player_world_presence"]["Row"];

function nowIso(): Timestamp {
  return new Date().toISOString() as unknown as Timestamp;
}

function asTimestamp(value: string | null | undefined): Timestamp | null {
  return value ? (value as unknown as Timestamp) : null;
}

export const presenceRepo = {
  async upsertWorldEnter(input: { playerId: PlayerId; worldId: WorldId }): Promise<void> {
    const timestamp = nowIso();

    const { error } = await supabase
      .from("player_world_presence")
      .upsert(
        {
          player_id: input.playerId as unknown as string,
          world_id: input.worldId as unknown as string,
          joined_at: timestamp as unknown as string,
          last_seen_at: timestamp as unknown as string,
        },
        { onConflict: "player_id,world_id" }
      );

    if (error) throw error;
  },

  async updateHeartbeat(input: { playerId: PlayerId; worldId: WorldId }): Promise<void> {
    const timestamp = nowIso();

    const { error } = await supabase
      .from("player_world_presence")
      .update({ last_seen_at: timestamp as unknown as string })
      .eq("player_id", input.playerId as unknown as string)
      .eq("world_id", input.worldId as unknown as string);

    if (error) throw error;
  },

  async listEligiblePlayerIds(input: {
    worldId: WorldId;
    tickStartAt: Timestamp;
    minMinutes: number;
  }): Promise<string[]> {
    const tickMs = Date.parse(String(input.tickStartAt));
    const cutoffMs = Number.isFinite(tickMs) ? tickMs - input.minMinutes * 60 * 1000 : Date.now();
    const joinedBefore = new Date(cutoffMs).toISOString();

    const { data, error } = await supabase
      .from("player_world_presence")
      .select("player_id, joined_at, last_seen_at")
      .eq("world_id", input.worldId as unknown as string)
      .lte("joined_at", joinedBefore)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as PlayerWorldPresenceRow[];
    return rows.map((row) => String(row.player_id));
  },

  async countActivePlayers(input: { worldId: WorldId; activeWithinMinutes: number }): Promise<number> {
    const cutoff = new Date(Date.now() - input.activeWithinMinutes * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("player_world_presence")
      .select("player_id", { count: "exact", head: true })
      .eq("world_id", input.worldId as unknown as string)
      .gte("last_seen_at", cutoff);

    if (error) throw error;
    return count ?? 0;
  },

  async getPresence(input: { playerId: PlayerId; worldId: WorldId }): Promise<{
    joinedAt: Timestamp | null;
    lastSeenAt: Timestamp | null;
  } | null> {
    const { data, error } = await supabase
      .from("player_world_presence")
      .select("joined_at, last_seen_at")
      .eq("player_id", input.playerId as unknown as string)
      .eq("world_id", input.worldId as unknown as string)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      joinedAt: asTimestamp((data as any).joined_at),
      lastSeenAt: asTimestamp((data as any).last_seen_at),
    };
  },
};
