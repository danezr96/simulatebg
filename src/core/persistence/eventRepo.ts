// src/core/persistence/eventRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type {
  GameEvent,
  PendingEvent,
  EventId,
  WorldId,
  SectorId,
  CompanyId,
  HoldingId,
} from "../domain";

/**
 * Table:
 * - events
 */

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];

function mapEvent(row: EventRow): GameEvent {
  return {
    id: row.id as EventId,
    worldId: row.world_id as WorldId,
    sectorId: (row.sector_id ?? undefined) as any,
    companyId: (row.company_id ?? undefined) as any,
    holdingId: (row.holding_id ?? undefined) as any,
    scope: row.scope as any,
    type: row.type as any,
    severity: row.severity as any,
    payload: (row.payload ?? {}) as any,
    year: row.year as any,
    week: row.week as any,
    createdAt: row.created_at as any,
  };
}

export const eventRepo = {
  async listByWorldWeek(input: {
    worldId: WorldId;
    year: number;
    week: number;
  }): Promise<GameEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("world_id", input.worldId)
      .eq("year", input.year)
      .eq("week", input.week)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },

  async listByCompany(input: {
    companyId: CompanyId;
    limit?: number;
  }): Promise<GameEvent[]> {
    const limit = input.limit ?? 50;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("company_id", input.companyId)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },

  async listByHolding(input: {
    holdingId: HoldingId;
    limit?: number;
  }): Promise<GameEvent[]> {
    const limit = input.limit ?? 50;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("holding_id", input.holdingId)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },

  async listBySector(input: {
    worldId: WorldId;
    sectorId: SectorId;
    limit?: number;
  }): Promise<GameEvent[]> {
    const limit = input.limit ?? 100;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("world_id", input.worldId)
      .eq("sector_id", input.sectorId)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },

  async listRecent(input: { worldId: WorldId; limit?: number }): Promise<GameEvent[]> {
    const limit = input.limit ?? 20;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("world_id", input.worldId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },
  async insert(input: PendingEvent): Promise<GameEvent> {
    const payload: EventInsert = {
      world_id: input.worldId as any,
      sector_id: (input.sectorId ?? null) as any,
      company_id: (input.companyId ?? null) as any,
      holding_id: (input.holdingId ?? null) as any,
      scope: input.scope as any,
      type: input.type as any,
      severity: Number(input.severity),
      payload: (input.payload ?? {}) as any,
      year: Number(input.year),
      week: Number(input.week),
    };

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapEvent(data as EventRow);
  },

  async insertMany(inputs: PendingEvent[]): Promise<GameEvent[]> {
    if (inputs.length === 0) return [];

    const rows: EventInsert[] = inputs.map((e) => ({
      world_id: e.worldId as any,
      sector_id: (e.sectorId ?? null) as any,
      company_id: (e.companyId ?? null) as any,
      holding_id: (e.holdingId ?? null) as any,
      scope: e.scope as any,
      type: e.type as any,
      severity: Number(e.severity),
      payload: (e.payload ?? {}) as any,
      year: Number(e.year),
      week: Number(e.week),
    }));

    const { data, error } = await supabase.from("events").insert(rows).select("*");
    if (error) throw error;

    return (data ?? []).map((r: EventRow) => mapEvent(r));
  },

  async deleteByWorldWeek(input: {
    worldId: WorldId;
    year: number;
    week: number;
  }): Promise<void> {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("world_id", input.worldId)
      .eq("year", input.year)
      .eq("week", input.week);

    if (error) throw error;
  },
};
