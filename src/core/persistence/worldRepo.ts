// src/core/persistence/worldRepo.ts
import { supabase } from "./supabaseClient";
import type { World, WorldEconomyState } from "../domain/world";
import { asWorldId, asSeasonId, asTimestamp, type WorldId } from "../domain/common";
import { parseMacroModifiers } from "../domain/world";

/**
 * DB row shapes (snake_case)
 * (Later: replace with Database types if you want)
 */
type WorldRow = {
  id: string;
  name: string;
  mode: string;
  status: string;
  base_round_interval_seconds: number;
  season_id: string | null;
  created_at: string;
};

type WorldEconomyRow = {
  world_id: string;
  current_year: number;
  current_week: number;
  base_interest_rate: number;
  inflation_rate: number;
  base_wage_index: number;
  is_ticking: boolean | null;
  last_tick_started_at: string | null;
  last_tick_at: string | null;
  macro_modifiers: any;
};

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Mappers
 */
function mapWorld(row: WorldRow): World {
  return {
    id: asWorldId(row.id),
    name: row.name,
    mode: row.mode as World["mode"],
    status: row.status as World["status"],
    baseRoundIntervalSeconds: row.base_round_interval_seconds,
    seasonId: row.season_id ? asSeasonId(row.season_id) : undefined,
    createdAt: asTimestamp(row.created_at),
  };
}

function mapEconomy(row: WorldEconomyRow): WorldEconomyState {
  return {
    worldId: asWorldId(row.world_id),
    currentYear: row.current_year,
    currentWeek: row.current_week,
    baseInterestRate: row.base_interest_rate as any,
    inflationRate: row.inflation_rate as any,
    baseWageIndex: row.base_wage_index as any,
    lastTickAt: row.last_tick_at ? asTimestamp(row.last_tick_at) : undefined,
    lastTickStartedAt: row.last_tick_started_at ? asTimestamp(row.last_tick_started_at) : undefined,
    isTicking: row.is_ticking ?? false,
    macroModifiers: parseMacroModifiers(row.macro_modifiers ?? {}),
  };
}

export const worldRepo = {
  /* =========================
   * Worlds
   * ========================= */

  async getById(id: WorldId): Promise<World | null> {
    const { data, error } = await supabase
      .from("worlds")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWorld(data as WorldRow) : null;
  },

  async listActive(): Promise<World[]> {
    const { data, error } = await supabase
      .from("worlds")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r) => mapWorld(r as WorldRow));
  },

  async create(input: {
    name: string;
    mode?: World["mode"];
    baseRoundIntervalSeconds?: number;
    seasonId?: World["seasonId"]; // allow branded SeasonId
  }): Promise<World> {
    const payload = {
      name: input.name,
      mode: input.mode ?? "NORMAL",
      base_round_interval_seconds: input.baseRoundIntervalSeconds ?? 600,
      season_id: input.seasonId ? (input.seasonId as unknown as string) : null,
    };

    // ✅ insert always array
    const { data, error } = await supabase
      .from("worlds")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw error;
    return mapWorld(data as WorldRow);
  },

  async update(
    id: WorldId,
    patch: Partial<{
      name: string;
      mode: World["mode"];
      status: World["status"];
      baseRoundIntervalSeconds: number;
      seasonId: World["seasonId"] | null; // SeasonId or null
    }>
  ): Promise<World> {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.mode !== undefined) payload.mode = patch.mode;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.baseRoundIntervalSeconds !== undefined)
      payload.base_round_interval_seconds = patch.baseRoundIntervalSeconds;
    if (patch.seasonId !== undefined)
      payload.season_id = patch.seasonId ? (patch.seasonId as unknown as string) : null;

    const { data, error } = await supabase
      .from("worlds")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapWorld(data as WorldRow);
  },

  /* =========================
   * Economy state
   * ========================= */

  async getEconomyState(worldId: WorldId): Promise<WorldEconomyState | null> {
    const { data, error } = await supabase
      .from("world_economy_state")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapEconomy(data as WorldEconomyRow) : null;
  },

  async createEconomyState(input: {
    worldId: WorldId;
    currentYear?: number;
    currentWeek?: number;
  }): Promise<WorldEconomyState> {
    const payload = {
      world_id: input.worldId as unknown as string,
      current_year: input.currentYear ?? 1,
      current_week: input.currentWeek ?? 1,

      // ✅ ensure last_tick_at exists immediately (important for auto-progress logic)
      last_tick_at: nowIso(),
      is_ticking: false,
      last_tick_started_at: null,

      // keep jsonb explicit & safe (DB defaults also fine)
      macro_modifiers: {},
      // base_interest_rate / inflation_rate / base_wage_index use DB defaults
    };

    // ✅ insert always array
    const { data, error } = await supabase
      .from("world_economy_state")
      .insert([payload])
      .select("*")
      .single();

    if (error) throw error;
    return mapEconomy(data as WorldEconomyRow);
  },

  async updateEconomyState(
    worldId: WorldId,
    patch: Partial<{
      currentYear: number;
      currentWeek: number;
      baseInterestRate: number;
      inflationRate: number;
      baseWageIndex: number;
      lastTickAt: string | null; // pass iso string or null
      lastTickStartedAt: string | null;
      isTicking: boolean;
      macroModifiers: any;
    }>
  ): Promise<WorldEconomyState> {
    const payload: any = {};

    if (patch.currentYear !== undefined) payload.current_year = patch.currentYear;
    if (patch.currentWeek !== undefined) payload.current_week = patch.currentWeek;

    if (patch.baseInterestRate !== undefined) payload.base_interest_rate = patch.baseInterestRate;
    if (patch.inflationRate !== undefined) payload.inflation_rate = patch.inflationRate;
    if (patch.baseWageIndex !== undefined) payload.base_wage_index = patch.baseWageIndex;

    if (patch.lastTickAt !== undefined) payload.last_tick_at = patch.lastTickAt;
    if (patch.lastTickStartedAt !== undefined) payload.last_tick_started_at = patch.lastTickStartedAt;
    if (patch.isTicking !== undefined) payload.is_ticking = patch.isTicking;

    if (patch.macroModifiers !== undefined) payload.macro_modifiers = patch.macroModifiers;

    const { data, error } = await supabase
      .from("world_economy_state")
      .update(payload)
      .eq("world_id", worldId as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapEconomy(data as WorldEconomyRow);
  },

  async tryLockEconomyTick(worldId: WorldId): Promise<WorldEconomyState | null> {
    const { data, error } = await supabase
      .from("world_economy_state")
      .update({
        is_ticking: true,
        last_tick_started_at: nowIso(),
      })
      .eq("world_id", worldId as unknown as string)
      .or("is_ticking.is.null,is_ticking.eq.false")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data ? mapEconomy(data as WorldEconomyRow) : null;
  },

  async unlockEconomyTick(worldId: WorldId): Promise<void> {
    const { error } = await supabase
      .from("world_economy_state")
      .update({ is_ticking: false })
      .eq("world_id", worldId as unknown as string);

    if (error) throw error;
  },
};
