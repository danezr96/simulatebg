// src/core/persistence/holdingRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { Holding } from "../domain/holding";
import type { HoldingId, PlayerId, WorldId } from "../domain/common";

type HoldingRow = Database["public"]["Tables"]["holdings"]["Row"];
type HoldingInsert = Database["public"]["Tables"]["holdings"]["Insert"];
type HoldingUpdate = Database["public"]["Tables"]["holdings"]["Update"];

function mapRowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id as HoldingId,
    playerId: row.player_id as PlayerId,
    worldId: row.world_id as WorldId,

    name: row.name,
    baseCurrency: row.base_currency as Holding["baseCurrency"],
    status: row.status as Holding["status"],

    cashBalance: row.cash_balance as any,
    totalEquity: row.total_equity as any,
    totalDebt: row.total_debt as any,

    // ✅ Route B: prestigeLevel komt uit holdings
    prestigeLevel: Number(row.prestige_level ?? 0),

    createdAt: row.created_at as any,
  };
}

export const holdingRepo = {
  async getById(id: HoldingId): Promise<Holding | null> {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToHolding(data as HoldingRow) : null;
  },

  async getByPlayerAndWorld(playerId: PlayerId, worldId: WorldId): Promise<Holding | null> {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("player_id", playerId as unknown as string)
      .eq("world_id", worldId as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToHolding(data as HoldingRow) : null;
  },

  async listByPlayer(playerId: PlayerId): Promise<Holding[]> {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("player_id", playerId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: HoldingRow) => mapRowToHolding(r));
  },

  async listByPlayers(playerIds: PlayerId[]): Promise<Holding[]> {
    const unique = Array.from(new Set(playerIds.map((id) => String(id)))).filter(Boolean);
    if (unique.length === 0) return [];

    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .in("player_id", unique)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: HoldingRow) => mapRowToHolding(r));
  },
  async listByWorld(worldId: WorldId): Promise<Holding[]> {
    const { data, error } = await supabase
      .from("holdings")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: HoldingRow) => mapRowToHolding(r));
  },

  async create(input: {
    playerId: PlayerId;
    worldId: WorldId;
    name: string;
    baseCurrency?: string; // default in DB
    cashBalance?: number;  // optional override
    prestigeLevel?: number; // ✅ Route B
  }): Promise<Holding> {
    const payload: HoldingInsert = {
      player_id: input.playerId as unknown as string,
      world_id: input.worldId as unknown as string,
      name: input.name,
      base_currency: (input.baseCurrency ?? "EUR") as any,

      ...(input.cashBalance !== undefined
        ? { cash_balance: Number(input.cashBalance) as any }
        : {}),

      ...(input.prestigeLevel !== undefined
        ? { prestige_level: Number(input.prestigeLevel) }
        : {}),
    } as HoldingInsert;

    const { data, error } = await supabase
      .from("holdings")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapRowToHolding(data as HoldingRow);
  },

  async update(
    id: HoldingId,
    patch: Partial<{
      name: string;
      baseCurrency: string;
      status: Holding["status"];
      cashBalance: number;
      totalEquity: number;
      totalDebt: number;
      prestigeLevel: number; // ✅ Route B
    }>
  ): Promise<Holding> {
    const payload: HoldingUpdate = {} as HoldingUpdate;

    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.baseCurrency !== undefined) payload.base_currency = patch.baseCurrency as any;
    if (patch.status !== undefined) payload.status = patch.status as any;
    if (patch.cashBalance !== undefined) payload.cash_balance = Number(patch.cashBalance) as any;
    if (patch.totalEquity !== undefined) payload.total_equity = Number(patch.totalEquity) as any;
    if (patch.totalDebt !== undefined) payload.total_debt = Number(patch.totalDebt) as any;

    // ✅ Route B
    if (patch.prestigeLevel !== undefined) payload.prestige_level = Number(patch.prestigeLevel);

    const { data, error } = await supabase
      .from("holdings")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapRowToHolding(data as HoldingRow);
  },

  async delete(id: HoldingId): Promise<void> {
    const { error } = await supabase
      .from("holdings")
      .delete()
      .eq("id", id as unknown as string);

    if (error) throw error;
  },
};
