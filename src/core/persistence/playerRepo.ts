// src/core/persistence/playerRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { Player } from "../domain/player";
import type { PlayerId } from "../domain/common";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

// src/core/persistence/playerRepo.ts (alleen mapRowToPlayer vervangen)
import type { Decimal, Timestamp } from "../domain/common";

function toDecimal(n: number | null | undefined): Decimal {
  // jouw Decimal is een branded number -> runtime is het gewoon number
  return (Number(n ?? 0) as unknown) as Decimal;
}

function toTimestamp(s: string | null | undefined): Timestamp {
  return (String(s ?? "") as unknown) as Timestamp;
}

function mapRowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id as PlayerId,
    userId: row.user_id,
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    playStyle: row.play_style ?? undefined,
    focusArea: row.focus_area ?? undefined,
    baseCurrency: row.base_currency as Player["baseCurrency"],

    brandRepLevel: row.brand_rep_level ?? 1,
    brandRepXp: toDecimal(row.brand_rep_xp),

    creditRepLevel: row.credit_rep_level ?? 1,
    creditRepXp: toDecimal(row.credit_rep_xp),

    prestigeLevel: row.prestige_level ?? 1,

    createdAt: toTimestamp(row.created_at),
  };
}
    

export const playerRepo = {
  async getById(id: PlayerId): Promise<Player | null> {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToPlayer(data as PlayerRow) : null;
  },

  async getByUserId(userId: string): Promise<Player | null> {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToPlayer(data as PlayerRow) : null;
  },

  async create(input: {
    userId: string;
    name: string;
    avatarUrl?: string;
    bio?: string;
    playStyle?: string;
    focusArea?: string;
    baseCurrency?: string; // default in DB is EUR
  }): Promise<Player> {
    const payload: PlayerInsert = {
      user_id: input.userId,
      name: input.name,
      avatar_url: input.avatarUrl ?? null,
      bio: input.bio ?? null,
      play_style: input.playStyle ?? null,
      focus_area: input.focusArea ?? null,
      base_currency: input.baseCurrency ?? "EUR",
      // brand_rep_level/xp, credit_rep_level/xp, prestige_level have DB defaults
    };

    const { data, error } = await supabase
      .from("players")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapRowToPlayer(data as PlayerRow);
  },

  async updateProfile(
    id: PlayerId,
    patch: {
      name?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      playStyle?: string | null;
      focusArea?: string | null;
      baseCurrency?: string;
    }
  ): Promise<Player> {
    const payload: PlayerUpdate = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
    if (patch.bio !== undefined) payload.bio = patch.bio;
    if (patch.playStyle !== undefined) payload.play_style = patch.playStyle;
    if (patch.focusArea !== undefined) payload.focus_area = patch.focusArea;
    if (patch.baseCurrency !== undefined) payload.base_currency = patch.baseCurrency;

    const { data, error } = await supabase
      .from("players")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapRowToPlayer(data as PlayerRow);
  },

  async updateReputation(
    id: PlayerId,
    patch: Partial<{
      brandRepLevel: number;
      brandRepXp: number;
      creditRepLevel: number;
      creditRepXp: number;
      prestigeLevel: number;
    }>
  ): Promise<Player> {
    const payload: PlayerUpdate = {};

    if (patch.brandRepLevel !== undefined) payload.brand_rep_level = patch.brandRepLevel;
    if (patch.brandRepXp !== undefined) payload.brand_rep_xp = patch.brandRepXp as any;

    if (patch.creditRepLevel !== undefined) payload.credit_rep_level = patch.creditRepLevel;
    if (patch.creditRepXp !== undefined) payload.credit_rep_xp = patch.creditRepXp as any;

    if (patch.prestigeLevel !== undefined) payload.prestige_level = patch.prestigeLevel;

    const { data, error } = await supabase
      .from("players")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapRowToPlayer(data as PlayerRow);
  },

  async listByIds(ids: PlayerId[]): Promise<Player[]> {
    const unique = Array.from(new Set(ids.map((id) => String(id)))).filter(Boolean);
    if (unique.length === 0) return [];

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .in("id", unique);

    if (error) throw error;
    return (data ?? []).map((r: PlayerRow) => mapRowToPlayer(r));
  },

  async searchByName(query: string, limit = 5): Promise<Player[]> {
    const term = String(query ?? "").trim();
    if (!term) return [];

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .ilike("name", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r: PlayerRow) => mapRowToPlayer(r));
  },
  async delete(id: PlayerId): Promise<void> {
    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", id as unknown as string);

    if (error) throw error;
  },
};
