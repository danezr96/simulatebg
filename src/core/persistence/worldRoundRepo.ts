// src/core/persistence/worldRoundRepo.ts
import { supabase } from "./supabaseClient";
import type { Timestamp, WorldId, WorldRound, Year, WeekNumber } from "../domain";

type WorldRoundRow = {
  id: string;
  world_id: string;
  year: number;
  week: number;
  status: string;
  started_at: string;
  finished_at: string | null;
};

function mapWorldRound(row: WorldRoundRow): WorldRound {
  return {
    id: row.id as unknown as WorldRound["id"],
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    status: row.status as WorldRound["status"],
    startedAt: row.started_at as unknown as Timestamp,
    finishedAt: row.finished_at ? (row.finished_at as unknown as Timestamp) : undefined,
  };
}

export const worldRoundRepo = {
  async listRecentByWorld(
    worldId: WorldId,
    limit = 4,
    onlyCompleted = true
  ): Promise<WorldRound[]> {
    let query = supabase
      .from("world_rounds")
      .select("id, world_id, year, week, status, started_at, finished_at")
      .eq("world_id", worldId as unknown as string);

    if (onlyCompleted) {
      query = query.eq("status", "COMPLETED");
    }

    const { data, error } = await query
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r) => mapWorldRound(r as WorldRoundRow));
  },
  async getLatestByWorld(worldId: WorldId): Promise<WorldRound | null> {
    const { data, error } = await supabase
      .from("world_rounds")
      .select("id, world_id, year, week, status, started_at, finished_at")
      .eq("world_id", worldId as unknown as string)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWorldRound(data as WorldRoundRow) : null;
  },
};
