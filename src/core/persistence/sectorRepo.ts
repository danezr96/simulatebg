// src/core/persistence/sectorRepo.ts
import { supabase } from "./supabaseClient";
import type { Database, Json } from "../../supabase/database.types";
import type { Sector, Niche, WorldSectorState } from "../domain/sector";
import type { SectorId, NicheId, WorldId } from "../domain/common";

/**
 * Tables:
 * - sectors
 * - niches
 * - world_sector_state
 */

type SectorRow = Database["public"]["Tables"]["sectors"]["Row"];
type NicheRow = Database["public"]["Tables"]["niches"]["Row"];
type WorldSectorStateRow = Database["public"]["Tables"]["world_sector_state"]["Row"];
type WorldSectorStateInsert =
  Database["public"]["Tables"]["world_sector_state"]["Insert"];

/**
 * Mappers
 */
function mapSector(row: SectorRow): Sector {
  return {
    id: row.id as SectorId,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
  };
}

function mapNiche(row: NicheRow): Niche {
  return {
    id: row.id as NicheId,
    sectorId: row.sector_id as SectorId,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    config: row.config as any, // jsonb -> domain config shape
  };
}

function mapWorldSectorState(row: WorldSectorStateRow): WorldSectorState {
  return {
    worldId: row.world_id as WorldId,
    sectorId: row.sector_id as SectorId,
    currentDemand: row.current_demand as any,
    trendFactor: row.trend_factor as any,
    volatility: row.volatility as any,
    lastRoundMetrics: (row.last_round_metrics ?? {}) as any,
  };
}

export const sectorRepo = {
  /* =========================
   * Static: sectors & niches
   * ========================= */

  async listSectors(): Promise<Sector[]> {
    const { data, error } = await supabase
      .from("sectors")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: SectorRow) => mapSector(r));
  },

  async listNichesBySector(sectorId: SectorId): Promise<Niche[]> {
    const { data, error } = await supabase
      .from("niches")
      .select("*")
      .eq("sector_id", sectorId as unknown as string)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: NicheRow) => mapNiche(r));
  },

  async getNicheById(nicheId: NicheId): Promise<Niche | null> {
    const { data, error } = await supabase
      .from("niches")
      .select("*")
      .eq("id", nicheId as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapNiche(data as NicheRow) : null;
  },

  async listAllNiches(): Promise<Niche[]> {
    const { data, error } = await supabase
      .from("niches")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: NicheRow) => mapNiche(r));
  },

  /* =========================
   * Dynamic: world sector state
   * ========================= */

  async getWorldSectorState(
    worldId: WorldId,
    sectorId: SectorId
  ): Promise<WorldSectorState | null> {
    const { data, error } = await supabase
      .from("world_sector_state")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .eq("sector_id", sectorId as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWorldSectorState(data as WorldSectorStateRow) : null;
  },

  async listWorldSectorStates(worldId: WorldId): Promise<WorldSectorState[]> {
    const { data, error } = await supabase
      .from("world_sector_state")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .order("sector_id", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: WorldSectorStateRow) => mapWorldSectorState(r));
  },

  async upsertWorldSectorState(input: {
    worldId: WorldId;
    sectorId: SectorId;
    currentDemand: number;
    trendFactor: number;
    volatility: number;
    lastRoundMetrics?: unknown; // keep flexible at repo-level
  }): Promise<WorldSectorState> {
    const payload: WorldSectorStateInsert = {
      world_id: input.worldId as unknown as string,
      sector_id: input.sectorId as unknown as string,
      current_demand: Number(input.currentDemand) as any,
      trend_factor: Number(input.trendFactor) as any,
      volatility: Number(input.volatility) as any,
      last_round_metrics: (input.lastRoundMetrics ?? {}) as unknown as Json,
    };

    const { data, error } = await supabase
      .from("world_sector_state")
      .upsert(payload, { onConflict: "world_id,sector_id" })
      .select("*")
      .single();

    if (error) throw error;
    return mapWorldSectorState(data as WorldSectorStateRow);
  },
};
