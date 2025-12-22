// src/core/persistence/friendRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { PlayerId } from "../domain/common";

type FriendRow = Database["public"]["Tables"]["player_friends"]["Row"];
type FriendInsert = Database["public"]["Tables"]["player_friends"]["Insert"];
type FriendUpdate = Database["public"]["Tables"]["player_friends"]["Update"];

export type FriendStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export type FriendRecord = {
  id: string;
  playerId: PlayerId;
  friendId: PlayerId;
  status: FriendStatus;
  createdAt: string;
  updatedAt: string;
};

function mapFriend(row: FriendRow): FriendRecord {
  return {
    id: row.id,
    playerId: row.player_id as PlayerId,
    friendId: row.friend_id as PlayerId,
    status: row.status as FriendStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const friendRepo = {
  async listByPlayer(playerId: PlayerId): Promise<FriendRecord[]> {
    const { data, error } = await supabase
      .from("player_friends")
      .select("*")
      .or(`player_id.eq.${playerId},friend_id.eq.${playerId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((r) => mapFriend(r as FriendRow));
  },

  async createRequest(input: { playerId: PlayerId; friendId: PlayerId }): Promise<FriendRecord> {
    const payload: FriendInsert = {
      player_id: input.playerId as unknown as string,
      friend_id: input.friendId as unknown as string,
      status: "PENDING",
    };

    const { data, error } = await supabase
      .from("player_friends")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapFriend(data as FriendRow);
  },

  async updateStatus(id: string, status: FriendStatus): Promise<FriendRecord> {
    const payload: FriendUpdate = { status } as FriendUpdate;

    const { data, error } = await supabase
      .from("player_friends")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapFriend(data as FriendRow);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("player_friends")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
