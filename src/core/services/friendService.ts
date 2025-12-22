// src/core/services/friendService.ts
import type { Player, PlayerId } from "../domain";
import { holdingRepo } from "../persistence/holdingRepo";
import { playerRepo } from "../persistence/playerRepo";
import { friendRepo, type FriendRecord, type FriendStatus } from "../persistence/friendRepo";
import { worldService } from "./worldService";

type FriendDirection = "incoming" | "outgoing" | "accepted";

export type FriendSummary = {
  id: string;
  status: FriendStatus;
  direction: FriendDirection;
  friend: Player;
  createdAt: string;
};

export type FriendWorld = {
  worldId: string;
  worldName: string;
  friendId: string;
  friendName: string;
  holdingId: string;
  holdingName: string;
  isActive: boolean;
};

function getFriendId(row: FriendRecord, playerId: PlayerId): PlayerId {
  return (row.playerId === playerId ? row.friendId : row.playerId) as PlayerId;
}

function getDirection(row: FriendRecord, playerId: PlayerId): FriendDirection {
  if (row.status === "ACCEPTED") return "accepted";
  return row.playerId === playerId ? "outgoing" : "incoming";
}

export const friendService = {
  async listFriendships(playerId: PlayerId): Promise<FriendSummary[]> {
    const rows = await friendRepo.listByPlayer(playerId);
    if (rows.length === 0) return [];

    const friendIds = Array.from(new Set(rows.map((r) => String(getFriendId(r, playerId))))) as PlayerId[];
    const friends = await playerRepo.listByIds(friendIds);
    const byId = new Map(friends.map((p) => [String(p.id), p]));

    return rows
      .map((row) => {
        const fid = String(getFriendId(row, playerId));
        const friend = byId.get(fid);
        if (!friend) return null;
        return {
          id: row.id,
          status: row.status,
          direction: getDirection(row, playerId),
          friend,
          createdAt: row.createdAt,
        } as FriendSummary;
      })
      .filter((x): x is FriendSummary => !!x);
  },

  async searchPlayersByName(query: string, limit = 5): Promise<Player[]> {
    return playerRepo.searchByName(query, limit);
  },

  async sendFriendRequest(playerId: PlayerId, friendId: PlayerId): Promise<void> {
    const pid = String(playerId);
    const fid = String(friendId);
    if (!pid || !fid) throw new Error("Missing player id.");
    if (pid === fid) throw new Error("You cannot add yourself.");

    const existing = await friendRepo.listByPlayer(playerId);
    const match = existing.find(
      (row) =>
        (String(row.playerId) === pid && String(row.friendId) === fid) ||
        (String(row.playerId) === fid && String(row.friendId) === pid)
    );

    if (match) {
      if (match.status === "ACCEPTED") throw new Error("You are already friends.");
      if (match.status === "PENDING" && String(match.playerId) === pid) {
        throw new Error("Friend request already sent.");
      }
      if (match.status === "PENDING" && String(match.friendId) === pid) {
        throw new Error("You already have a pending request from this player.");
      }
      throw new Error("Unable to send friend request.");
    }

    await friendRepo.createRequest({ playerId, friendId });
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    await friendRepo.updateStatus(requestId, "ACCEPTED");
  },

  async removeFriendship(requestId: string): Promise<void> {
    await friendRepo.delete(requestId);
  },

  async listFriendWorlds(playerId: PlayerId): Promise<FriendWorld[]> {
    const friendships = await this.listFriendships(playerId);
    const accepted = friendships.filter((f) => f.status === "ACCEPTED");
    if (accepted.length === 0) return [];

    const friendIds = accepted.map((f) => f.friend.id) as PlayerId[];
    const holdings = await holdingRepo.listByPlayers(friendIds);
    const worlds = await worldService.listActiveWorlds();
    const worldById = new Map(worlds.map((w) => [String(w.id), w]));
    const friendById = new Map(accepted.map((f) => [String(f.friend.id), f.friend]));

    return holdings.map((h) => {
      const worldId = String(h.worldId);
      const world = worldById.get(worldId);
      const friend = friendById.get(String(h.playerId));

      return {
        worldId,
        worldName: world?.name ?? "Unknown world",
        friendId: String(h.playerId),
        friendName: friend?.name ?? "Unknown player",
        holdingId: String(h.id),
        holdingName: h.name,
        isActive: !!world,
      };
    });
  },
};
