// src/core/services/scoreboardService.ts
import type { WorldId } from "../domain";
import { supabase } from "../persistence/supabaseClient";
import { holdingRepo } from "../persistence/holdingRepo";
import { playerRepo } from "../persistence/playerRepo";
import { companyRepo } from "../persistence/companyRepo";
import { sectorRepo } from "../persistence/sectorRepo";
import { worldRoundRepo } from "../persistence/worldRoundRepo";

export type NetWorthEntry = {
  holdingId: string;
  holdingName: string;
  playerId: string;
  playerName: string;
  netWorth: number;
  cash: number;
  equity: number;
  debt: number;
};

export type ProfitEntry = {
  holdingId: string;
  holdingName: string;
  playerId: string;
  playerName: string;
  totalProfit: number;
  tickCount: number;
};

export type ReputationEntry = {
  holdingId: string;
  holdingName: string;
  playerId: string;
  playerName: string;
  brandRepLevel: number;
  creditRepLevel: number;
  prestigeLevel: number;
  overallRep: number;
};

export type MarketShareLeader = {
  sectorId: string;
  sectorName: string;
  companyId: string;
  companyName: string;
  holdingId: string;
  holdingName: string;
  revenue: number;
  share: number;
};

export type HoldingSectorShare = {
  sectorId: string;
  sectorName: string;
  holdingId: string;
  holdingName: string;
  holdingRevenue: number;
  sectorRevenue: number;
  share: number;
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sortDesc<T>(rows: T[], getValue: (row: T) => number): T[] {
  return rows.sort((a, b) => getValue(b) - getValue(a));
}

export const scoreboardService = {
  async getNetWorthLeaderboard(worldId: WorldId, limit = 10): Promise<NetWorthEntry[]> {
    const holdings = await holdingRepo.listByWorld(worldId);
    if (holdings.length === 0) return [];

    const playerIds = Array.from(new Set(holdings.map((h) => String(h.playerId))));
    const players = await playerRepo.listByIds(playerIds as any);
    const playerById = new Map(players.map((p) => [String(p.id), p]));

    const rows = holdings.map((h) => {
      const cash = safeNumber(h.cashBalance);
      const equity = safeNumber(h.totalEquity);
      const debt = safeNumber(h.totalDebt);
      const netWorth = cash + equity - debt;
      const player = playerById.get(String(h.playerId));

      return {
        holdingId: String(h.id),
        holdingName: h.name,
        playerId: String(h.playerId),
        playerName: player?.name ?? "Unknown",
        netWorth,
        cash,
        equity,
        debt,
      } as NetWorthEntry;
    });

    return sortDesc(rows, (r) => r.netWorth).slice(0, limit);
  },

  async getProfitLeaderboard(worldId: WorldId, ticks = 4, limit = 10): Promise<ProfitEntry[]> {
    const rounds = await worldRoundRepo.listRecentByWorld(worldId, ticks, true);
    if (rounds.length === 0) return [];

    const orFilters = rounds
      .map((r) => `and(year.eq.${Number(r.year)},week.eq.${Number(r.week)})`)
      .join(",");

    const { data, error } = await supabase
      .from("company_financials")
      .select("company_id, net_profit")
      .eq("world_id", worldId as unknown as string)
      .or(orFilters);

    if (error) throw error;

    const companies = await companyRepo.listByWorld(worldId);
    const companyById = new Map(companies.map((c) => [String(c.id), c]));

    const totals = new Map<string, { profit: number; tickCount: number }>();
    (data ?? []).forEach((row: any) => {
      const company = companyById.get(String(row.company_id));
      if (!company || !company.holdingId) return;
      const holdingId = String(company.holdingId);
      const current = totals.get(holdingId) ?? { profit: 0, tickCount: 0 };
      current.profit += safeNumber(row.net_profit);
      current.tickCount += 1;
      totals.set(holdingId, current);
    });

    const holdings = await holdingRepo.listByWorld(worldId);
    const holdingById = new Map(holdings.map((h) => [String(h.id), h]));
    const playerIds = Array.from(new Set(holdings.map((h) => String(h.playerId))));
    const players = await playerRepo.listByIds(playerIds as any);
    const playerById = new Map(players.map((p) => [String(p.id), p]));

    const rows = Array.from(totals.entries()).map(([holdingId, info]) => {
      const holding = holdingById.get(holdingId);
      const player = holding ? playerById.get(String(holding.playerId)) : undefined;

      return {
        holdingId,
        holdingName: holding?.name ?? "Unknown",
        playerId: holding ? String(holding.playerId) : "",
        playerName: player?.name ?? "Unknown",
        totalProfit: info.profit,
        tickCount: info.tickCount,
      } as ProfitEntry;
    });

    return sortDesc(rows, (r) => r.totalProfit).slice(0, limit);
  },

  async getReputationLeaderboard(worldId: WorldId, limit = 10): Promise<ReputationEntry[]> {
    const holdings = await holdingRepo.listByWorld(worldId);
    if (holdings.length === 0) return [];

    const playerIds = Array.from(new Set(holdings.map((h) => String(h.playerId))));
    const players = await playerRepo.listByIds(playerIds as any);
    const holdingByPlayerId = new Map(holdings.map((h) => [String(h.playerId), h]));

    const rows = players.map((player) => {
      const holding = holdingByPlayerId.get(String(player.id));
      const overallRep = Math.round((player.brandRepLevel + player.creditRepLevel) / 2);
      return {
        holdingId: holding ? String(holding.id) : "",
        holdingName: holding?.name ?? "Holding",
        playerId: String(player.id),
        playerName: player.name,
        brandRepLevel: Number(player.brandRepLevel ?? 0),
        creditRepLevel: Number(player.creditRepLevel ?? 0),
        prestigeLevel: Number(player.prestigeLevel ?? 0),
        overallRep,
      } as ReputationEntry;
    });

    return sortDesc(rows, (r) => r.overallRep).slice(0, limit);
  },

  async getMarketShareBySector(worldId: WorldId, limitPerSector = 3): Promise<MarketShareLeader[]> {
    const latest = await worldRoundRepo.getLatestByWorld(worldId);
    if (!latest) return [];

    const { data, error } = await supabase
      .from("company_financials")
      .select("company_id, revenue")
      .eq("world_id", worldId as unknown as string)
      .eq("year", Number(latest.year))
      .eq("week", Number(latest.week));

    if (error) throw error;

    const companies = await companyRepo.listByWorld(worldId);
    const companyById = new Map(companies.map((c) => [String(c.id), c]));
    const sectors = await sectorRepo.listSectors();
    const sectorById = new Map(sectors.map((s) => [String(s.id), s]));
    const holdings = await holdingRepo.listByWorld(worldId);
    const holdingById = new Map(holdings.map((h) => [String(h.id), h]));

    const totalsBySector = new Map<string, number>();
    const rows = (data ?? []).map((row: any) => {
      const company = companyById.get(String(row.company_id));
      if (!company) return null;

      const sectorId = String(company.sectorId ?? "");
      const revenue = safeNumber(row.revenue);
      totalsBySector.set(sectorId, (totalsBySector.get(sectorId) ?? 0) + revenue);

      return {
        sectorId,
        companyId: String(company.id),
        companyName: company.name,
        holdingId: String(company.holdingId ?? ""),
        revenue,
      };
    });

    const leadersBySector = new Map<string, MarketShareLeader[]>();
    rows.forEach((row) => {
      if (!row) return;
      const sectorTotal = totalsBySector.get(row.sectorId) ?? 0;
      const share = sectorTotal > 0 ? row.revenue / sectorTotal : 0;
      const sector = sectorById.get(row.sectorId);
      const holding = holdingById.get(row.holdingId);

      const entry: MarketShareLeader = {
        sectorId: row.sectorId,
        sectorName: sector?.name ?? "Unknown sector",
        companyId: row.companyId,
        companyName: row.companyName,
        holdingId: row.holdingId,
        holdingName: holding?.name ?? "Unknown holding",
        revenue: row.revenue,
        share,
      };

      const list = leadersBySector.get(row.sectorId) ?? [];
      list.push(entry);
      leadersBySector.set(row.sectorId, list);
    });

    const finalRows: MarketShareLeader[] = [];
    for (const list of leadersBySector.values()) {
      const leaders = sortDesc(list, (r) => r.share).slice(0, limitPerSector);
      leaders.forEach((leader) => finalRows.push(leader));
    }

    return finalRows;
  },

  async getHoldingMarketShareBySector(
    worldId: WorldId,
    holdingId: string,
    limit = 6
  ): Promise<HoldingSectorShare[]> {
    const latest = await worldRoundRepo.getLatestByWorld(worldId);
    if (!latest) return [];

    const { data, error } = await supabase
      .from("company_financials")
      .select("company_id, revenue")
      .eq("world_id", worldId as unknown as string)
      .eq("year", Number(latest.year))
      .eq("week", Number(latest.week));

    if (error) throw error;

    const companies = await companyRepo.listByWorld(worldId);
    const companyById = new Map(companies.map((c) => [String(c.id), c]));

    const sectorTotals = new Map<string, number>();
    const holdingTotals = new Map<string, number>();

    (data ?? []).forEach((row: any) => {
      const company = companyById.get(String(row.company_id));
      if (!company) return;
      const sectorId = String(company.sectorId ?? "");
      const revenue = safeNumber(row.revenue);

      sectorTotals.set(sectorId, (sectorTotals.get(sectorId) ?? 0) + revenue);

      if (String(company.holdingId ?? "") === String(holdingId)) {
        holdingTotals.set(sectorId, (holdingTotals.get(sectorId) ?? 0) + revenue);
      }
    });

    const sectors = await sectorRepo.listSectors();
    const sectorById = new Map(sectors.map((s) => [String(s.id), s]));
    const holding = await holdingRepo.getById(holdingId as any);

    const rows = Array.from(holdingTotals.entries()).map(([sectorId, holdingRevenue]) => {
      const sectorRevenue = sectorTotals.get(sectorId) ?? 0;
      const share = sectorRevenue > 0 ? holdingRevenue / sectorRevenue : 0;
      const sector = sectorById.get(sectorId);

      return {
        sectorId,
        sectorName: sector?.name ?? "Unknown sector",
        holdingId: String(holdingId),
        holdingName: holding?.name ?? "Holding",
        holdingRevenue,
        sectorRevenue,
        share,
      } as HoldingSectorShare;
    });

    return sortDesc(rows, (r) => r.share).slice(0, limit);
  },
};
