// src/ui/panels/SocialPanel.tsx
import * as React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Users, Trophy, RefreshCw, UserPlus, Check, X, Globe2, TrendingUp, LineChart } from "lucide-react";

import { MOTION } from "../../config/motion";
import Card from "../components/Card";
import Button from "../components/Button";
import Table, { TBody, TD, TH, THead, TR } from "../components/Table";

import { useWorld } from "../hooks/useWorld";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";

import { scoreboardService } from "../../core/services/scoreboardService";
import { friendService } from "../../core/services/friendService";
import { eventRepo } from "../../core/persistence/eventRepo";
import { money } from "../../utils/money";

const LEADERBOARD_LIMIT = 10;
const PROFIT_WINDOW = 4;
const SHARE_LIMIT = 3;

export const SocialPanel: React.FC = () => {
  const { world, effectiveWorldId, setWorld } = useWorld();
  const { player } = useCurrentPlayer();

  const worldId = world?.id ? String(world.id) : effectiveWorldId ?? null;

  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Array<{ id: string; name: string }>>([]);
  const [searching, setSearching] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  const netWorthQuery = useQuery({
    queryKey: ["scoreboard", "netWorth", worldId],
    queryFn: async () => scoreboardService.getNetWorthLeaderboard(worldId as any, LEADERBOARD_LIMIT),
    enabled: !!worldId,
  });

  const profitQuery = useQuery({
    queryKey: ["scoreboard", "profit", worldId, PROFIT_WINDOW],
    queryFn: async () => scoreboardService.getProfitLeaderboard(worldId as any, PROFIT_WINDOW, LEADERBOARD_LIMIT),
    enabled: !!worldId,
  });

  const marketShareQuery = useQuery({
    queryKey: ["scoreboard", "marketShare", worldId],
    queryFn: async () => scoreboardService.getMarketShareBySector(worldId as any, SHARE_LIMIT),
    enabled: !!worldId,
  });

  const friendsQuery = useQuery({
    queryKey: ["friends", player?.id],
    queryFn: async () => friendService.listFriendships(player!.id as any),
    enabled: !!player?.id,
  });

  const friendWorldsQuery = useQuery({
    queryKey: ["friendWorlds", player?.id],
    queryFn: async () => friendService.listFriendWorlds(player!.id as any),
    enabled: !!player?.id,
  });

  const feedQuery = useQuery({
    queryKey: ["worldFeed", worldId],
    queryFn: async () => eventRepo.listRecent({ worldId: worldId as any, limit: 20 }),
    enabled: !!worldId,
  });

  const onSearch = async () => {
    const term = search.trim();
    setActionError(null);
    if (!term) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await friendService.searchPlayersByName(term, 6);
      const filtered = results.filter((p) => String(p.id) !== String(player?.id));
      setSearchResults(filtered.map((p) => ({ id: String(p.id), name: p.name })));
      if (filtered.length === 0) setActionError("No players found.");
    } catch (e: any) {
      setActionError(e?.message ?? "Search failed.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSendRequest = async (friendId: string) => {
    if (!player?.id) return;
    setActionError(null);
    setSendingId(friendId);
    try {
      await friendService.sendFriendRequest(player.id as any, friendId as any);
      await friendsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Could not send request.");
    } finally {
      setSendingId(null);
    }
  };

  const onAccept = async (requestId: string) => {
    setActionError(null);
    try {
      await friendService.acceptFriendRequest(requestId);
      await friendsQuery.refetch();
      await friendWorldsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Could not accept request.");
    }
  };

  const onRemove = async (requestId: string) => {
    setActionError(null);
    try {
      await friendService.removeFriendship(requestId);
      await friendsQuery.refetch();
      await friendWorldsQuery.refetch();
    } catch (e: any) {
      setActionError(e?.message ?? "Could not remove friend.");
    }
  };

  const onJoinWorld = async (joinWorldId: string) => {
    if (!setWorld) return;
    await setWorld(joinWorldId);
  };

  const netWorthRows = netWorthQuery.data ?? [];
  const profitRows = profitQuery.data ?? [];
  const shareRows = marketShareQuery.data ?? [];

  const friends = friendsQuery.data ?? [];
  const acceptedFriends = friends.filter((f) => f.status === "ACCEPTED");
  const pendingIncoming = friends.filter((f) => f.status === "PENDING" && f.direction === "incoming");
  const pendingOutgoing = friends.filter((f) => f.status === "PENDING" && f.direction === "outgoing");

  const friendWorlds = friendWorldsQuery.data ?? [];
  const feed = feedQuery.data ?? [];

  return (
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={MOTION.page.variants}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[var(--text)]">Social & scoreboards</div>
          <div className="text-sm text-[var(--text-muted)]">
            Compare your progress and connect with other players in {world?.name ?? "this world"}.
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            void Promise.all([
              netWorthQuery.refetch(),
              profitQuery.refetch(),
              marketShareQuery.refetch(),
              friendsQuery.refetch(),
              friendWorldsQuery.refetch(),
              feedQuery.refetch(),
            ]);
          }}
          loading={
            netWorthQuery.isFetching ||
            profitQuery.isFetching ||
            marketShareQuery.isFetching ||
            friendsQuery.isFetching ||
            friendWorldsQuery.isFetching ||
            feedQuery.isFetching
          }
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-3xl p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Trophy className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Net worth leaderboard</div>
          </div>

          <div className="mt-3">
            <Table
              caption={`Top ${LEADERBOARD_LIMIT} holdings`}
              isEmpty={!netWorthQuery.isLoading && netWorthRows.length === 0}
              emptyMessage="No holdings in this world yet."
            >
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Player</TH>
                  <TH>Holding</TH>
                  <TH className="text-right">Net worth</TH>
                </TR>
              </THead>
              <TBody>
                {netWorthRows.map((row, idx) => (
                  <TR key={row.holdingId}>
                    <TD className="text-xs text-[var(--text-muted)]">#{idx + 1}</TD>
                    <TD className="font-semibold">{row.playerName}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{row.holdingName}</TD>
                    <TD className="text-right" mono>
                      {money.format(row.netWorth)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>

        <Card className="rounded-3xl p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Profit (last {PROFIT_WINDOW} ticks)</div>
          </div>

          <div className="mt-3">
            <Table
              caption={`Top ${LEADERBOARD_LIMIT} holdings`}
              isEmpty={!profitQuery.isLoading && profitRows.length === 0}
              emptyMessage="No profit data yet. Run a few ticks first."
            >
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Player</TH>
                  <TH>Holding</TH>
                  <TH className="text-right">Total profit</TH>
                </TR>
              </THead>
              <TBody>
                {profitRows.map((row, idx) => (
                  <TR key={row.holdingId}>
                    <TD className="text-xs text-[var(--text-muted)]">#{idx + 1}</TD>
                    <TD className="font-semibold">{row.playerName}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{row.holdingName}</TD>
                    <TD className="text-right" mono>
                      {money.format(row.totalProfit)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl p-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <LineChart className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">Market share by sector</div>
        </div>

        <div className="mt-3">
          <Table
            caption={`Top ${SHARE_LIMIT} companies per sector (latest tick)`}
            isEmpty={!marketShareQuery.isLoading && shareRows.length === 0}
            emptyMessage="No market share data yet."
          >
            <THead>
              <TR>
                <TH>Sector</TH>
                <TH>Company</TH>
                <TH>Holding</TH>
                <TH className="text-right">Share</TH>
                <TH className="text-right">Revenue</TH>
              </TR>
            </THead>
            <TBody>
              {shareRows.map((row) => (
                <TR key={`${row.sectorId}-${row.companyId}`}>
                  <TD className="text-xs text-[var(--text-muted)]">{row.sectorName}</TD>
                  <TD className="font-semibold">{row.companyName}</TD>
                  <TD className="text-xs text-[var(--text-muted)]">{row.holdingName}</TD>
                  <TD className="text-right" mono>
                    {`${Math.round(row.share * 1000) / 10}%`}
                  </TD>
                  <TD className="text-right" mono>
                    {money.format(row.revenue)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-3xl p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Users className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Friends</div>
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Find players</label>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
                  placeholder="Search by player name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={onSearch}
                  loading={searching}
                >
                  Find
                </Button>
              </div>
              {actionError ? <div className="text-xs text-rose-600">{actionError}</div> : null}
            </div>

            {searchResults.length > 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
                <div className="text-xs font-semibold text-[var(--text)]">Search results</div>
                <div className="mt-2 space-y-2">
                  {searchResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between">
                      <div className="text-sm">{r.name}</div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => void onSendRequest(r.id)}
                        loading={sendingId === r.id}
                      >
                        Add friend
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {pendingIncoming.length > 0 ? (
              <div>
                <div className="text-xs font-semibold text-[var(--text)]">Requests</div>
                <div className="mt-2 space-y-2">
                  {pendingIncoming.map((req) => (
                    <div key={req.id} className="flex items-center justify-between">
                      <div className="text-sm">{req.friend.name}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="primary" onClick={() => void onAccept(req.id)} leftIcon={<Check className="h-4 w-4" />}
                        >
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void onRemove(req.id)} leftIcon={<X className="h-4 w-4" />}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Table
              caption={`Friends (${acceptedFriends.length})`}
              isEmpty={!friendsQuery.isLoading && acceptedFriends.length === 0}
              emptyMessage="No friends yet. Search a player to get started."
            >
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {acceptedFriends.map((friend) => (
                  <TR key={friend.id}>
                    <TD className="font-semibold">{friend.friend.name}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void onRemove(friend.id)}>
                        Remove
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {pendingOutgoing.length > 0 ? (
              <div className="text-xs text-[var(--text-muted)]">
                Pending requests: {pendingOutgoing.map((p) => p.friend.name).join(", ")}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-3xl p-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Globe2 className="h-4 w-4" />
            <div className="text-sm font-semibold text-[var(--text)]">Friend worlds</div>
          </div>

          <div className="mt-3">
            <Table
              caption={`Worlds with friends (${friendWorlds.length})`}
              isEmpty={!friendWorldsQuery.isLoading && friendWorlds.length === 0}
              emptyMessage="No friend worlds yet."
            >
              <THead>
                <TR>
                  <TH>Friend</TH>
                  <TH>World</TH>
                  <TH>Holding</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {friendWorlds.map((fw) => (
                  <TR key={`${fw.friendId}-${fw.worldId}-${fw.holdingId}`}>
                    <TD className="font-semibold">{fw.friendName}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{fw.worldName}</TD>
                    <TD className="text-xs text-[var(--text-muted)]">{fw.holdingName}</TD>
                    <TD className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void onJoinWorld(fw.worldId)}
                        disabled={!fw.isActive || String(worldId) === String(fw.worldId)}
                      >
                        {String(worldId) === String(fw.worldId) ? "Here" : fw.isActive ? "Join" : "Inactive"}
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl p-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Users className="h-4 w-4" />
          <div className="text-sm font-semibold text-[var(--text)]">World feed</div>
        </div>

        <div className="mt-3">
          <Table
            caption="Recent world events"
            isEmpty={!feedQuery.isLoading && feed.length === 0}
            emptyMessage="No events yet."
          >
            <THead>
              <TR>
                <TH>Scope</TH>
                <TH>Type</TH>
                <TH>Target</TH>
                <TH className="text-right">Severity</TH>
                <TH className="text-right">Year/Week</TH>
              </TR>
            </THead>
            <TBody>
              {feed.map((e) => (
                <TR key={String(e.id)}>
                  <TD className="text-xs text-[var(--text-muted)]">{String(e.scope ?? "WORLD")}</TD>
                  <TD className="font-semibold">{String(e.type ?? "EVENT")}</TD>
                  <TD className="text-xs text-[var(--text-muted)]">
                    {String((e as any).companyId ?? (e as any).sectorId ?? (e as any).holdingId ?? "-")}
                  </TD>
                  <TD className="text-right" mono>
                    {Math.round(Number((e as any).severity ?? 0) * 100) / 100}
                  </TD>
                  <TD className="text-right" mono>
                    {`${e.year}/${e.week}`}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
};

export default SocialPanel;
