// src/ui/hooks/useNotifications.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useWorld } from "./useWorld";
import { useHolding } from "./useHolding";
import { useCompanies } from "./useCompany";
import { useCurrentPlayer } from "./useCurrentPlayer";

import { decisionService } from "../../core/services/decisionService";
import { friendService } from "../../core/services/friendService";
import { acquisitionRepo } from "../../core/persistence/acquisitionRepo";
import { upgradeService } from "../../core/services/upgradeService";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { companyService } from "../../core/services/companyService";
import { getStartupPricing } from "../../core/config/companyPricing";
import { asCompanyId, asHoldingId, asNicheId, asWorldId, type NicheUpgrade } from "../../core/domain";

const WEEKS_PER_MONTH = 52 / 12;

const toNumber = (value: unknown, fallback = 0) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const resolveUpgradeCosts = (
  upgrade: NicheUpgrade | null | undefined,
  startupCost: number,
  monthlyRevenue: number
) => {
  const capexPctMin = toNumber((upgrade as any)?.capexPctRange?.min, NaN);
  const capexPctMax = toNumber((upgrade as any)?.capexPctRange?.max, NaN);
  const opexPctMin = toNumber((upgrade as any)?.opexPctRange?.min, NaN);
  const opexPctMax = toNumber((upgrade as any)?.opexPctRange?.max, NaN);

  let capexMin = 0;
  let capexMax = 0;
  if (Number.isFinite(startupCost) && startupCost > 0 && Number.isFinite(capexPctMin) && Number.isFinite(capexPctMax)) {
    capexMin = startupCost * Math.min(capexPctMin, capexPctMax);
    capexMax = startupCost * Math.max(capexPctMin, capexPctMax);
  } else if (upgrade) {
    const fallback = toNumber(upgrade.cost, 0);
    capexMin = fallback;
    capexMax = fallback;
  }

  let opexWeeklyMin = 0;
  let opexWeeklyMax = 0;
  if (Number.isFinite(monthlyRevenue) && Number.isFinite(opexPctMin) && Number.isFinite(opexPctMax)) {
    const lo = Math.min(opexPctMin, opexPctMax);
    const hi = Math.max(opexPctMin, opexPctMax);
    opexWeeklyMin = (monthlyRevenue * lo) / WEEKS_PER_MONTH;
    opexWeeklyMax = (monthlyRevenue * hi) / WEEKS_PER_MONTH;
  }

  return {
    capexMid: (capexMin + capexMax) / 2,
    opexWeeklyMid: (opexWeeklyMin + opexWeeklyMax) / 2,
  };
};

export type NotificationCounts = {
  offers: number;
  decisions: number;
  decisionsMissing: number;
  budgetWarning: number;
  friendRequests: number;
  total: number;
};

export function useNotifications() {
  const { world, economy } = useWorld();
  const { holding } = useHolding();
  const { companies } = useCompanies();
  const { player } = useCurrentPlayer();

  const worldId = world?.id ? String(world.id) : undefined;
  const holdingId = holding?.id ? String(holding.id) : undefined;
  const playerId = player?.id ? String(player.id) : undefined;
  const currentYear = Number(economy?.currentYear ?? 0);
  const currentWeek = Number(economy?.currentWeek ?? 0);
  const hasEconomy = Number.isFinite(currentYear) && Number.isFinite(currentWeek) && currentYear > 0 && currentWeek > 0;

  const companyIds = useMemo(
    () => Array.from(new Set(companies.map((c) => String(c.id)))).sort(),
    [companies]
  );
  const companyIdsKey = companyIds.join("|");

  const portfolioNicheIds = useMemo(
    () => Array.from(new Set(companies.map((c) => String((c as any).nicheId ?? "")).filter(Boolean))).sort(),
    [companies]
  );

  const offersQuery = useQuery({
    queryKey: ["notificationsOffers", worldId, holdingId],
    queryFn: async () => {
      if (!worldId || !holdingId) return [];
      return acquisitionRepo.listByHolding({
        worldId: asWorldId(worldId),
        holdingId: asHoldingId(holdingId),
      });
    },
    enabled: !!worldId && !!holdingId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const decisionsQuery = useQuery({
    queryKey: ["notificationsDecisions", companyIdsKey, worldId, currentYear, currentWeek],
    queryFn: async () => {
      if (!worldId || !companyIds.length || !hasEconomy) return [];
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          decisions: await decisionService.listCompanyDecisions({
            worldId: asWorldId(worldId),
            companyId: asCompanyId(id),
            year: currentYear as any,
            week: currentWeek as any,
          }),
        }))
      );
    },
    enabled: !!worldId && companyIds.length > 0 && hasEconomy,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const friendsQuery = useQuery({
    queryKey: ["notificationsFriends", playerId],
    queryFn: async () => {
      if (!playerId) return [];
      return friendService.listFriendships(playerId as any);
    },
    enabled: !!playerId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const portfolioNichesQuery = useQuery({
    queryKey: ["notificationsNiches", portfolioNicheIds.join("|")],
    queryFn: async () => {
      if (!portfolioNicheIds.length) return [];
      return Promise.all(portfolioNicheIds.map((id) => sectorRepo.getNicheById(asNicheId(id))));
    },
    enabled: portfolioNicheIds.length > 0,
    staleTime: 60_000,
  });

  const portfolioSectorsQuery = useQuery({
    queryKey: ["notificationsSectors"],
    queryFn: async () => sectorRepo.listSectors(),
    staleTime: 60_000,
  });

  const portfolioUpgradesQuery = useQuery({
    queryKey: ["notificationsUpgrades", portfolioNicheIds.join("|")],
    queryFn: async () => {
      if (!portfolioNicheIds.length) return [] as NicheUpgrade[];
      const rows = await Promise.all(
        portfolioNicheIds.map((id) => upgradeService.listNicheUpgrades(asNicheId(id)))
      );
      return rows.flat();
    },
    enabled: portfolioNicheIds.length > 0,
    staleTime: 60_000,
  });

  const companyFinancialsQuery = useQuery({
    queryKey: ["notificationsFinancials", companyIdsKey],
    queryFn: async () => {
      if (!companyIds.length) return [];
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          financials: await companyService.getLatestFinancials(asCompanyId(id)),
        }))
      );
    },
    enabled: companyIds.length > 0,
    staleTime: 30_000,
  });

  const counts = useMemo<NotificationCounts>(() => {
    const offers = offersQuery.data ?? [];
    const actionableOffers = offers.filter((offer) => {
      const isOpen = offer.status === "OPEN" || offer.status === "COUNTERED";
      if (!isOpen) return false;
      const isSellerTurn = String(offer.sellerHoldingId) === String(holdingId) && offer.turn === "SELLER";
      const isBuyerTurn = String(offer.buyerHoldingId) === String(holdingId) && offer.turn === "BUYER";
      return isSellerTurn || isBuyerTurn;
    });

    const queuedByCompany = new Map<string, any[]>();
    for (const row of decisionsQuery.data ?? []) {
      queuedByCompany.set(row.companyId, row.decisions ?? []);
    }

    let decisionsMissing = 0;
    for (const companyId of companyIds) {
      const decisions = queuedByCompany.get(companyId) ?? [];
      if (decisions.length === 0) decisionsMissing += 1;
    }

    const upgradeById = new Map<string, NicheUpgrade>();
    for (const upgrade of portfolioUpgradesQuery.data ?? []) {
      upgradeById.set(String(upgrade.id), upgrade);
    }

    const nicheById = new Map<string, any>();
    for (const row of portfolioNichesQuery.data ?? []) {
      if (!row) continue;
      nicheById.set(String((row as any).id), row);
    }

    const sectorById = new Map<string, any>();
    for (const row of portfolioSectorsQuery.data ?? []) {
      if (!row) continue;
      sectorById.set(String((row as any).id), row);
    }

    const companyById = new Map<string, { nicheId?: string; sectorId?: string }>();
    for (const c of companies) {
      companyById.set(String(c.id), {
        nicheId: String((c as any).nicheId ?? ""),
        sectorId: String((c as any).sectorId ?? ""),
      });
    }

    const financialsByCompanyId = new Map<string, any>();
    for (const row of companyFinancialsQuery.data ?? []) {
      financialsByCompanyId.set(row.companyId, row.financials ?? null);
    }

    const resolveUpgradeCostForCompany = (upgradeId: string, companyId: string) => {
      const upgrade = upgradeById.get(upgradeId);
      if (!upgrade) return null;
      const company = companyById.get(companyId);
      const niche = company?.nicheId ? nicheById.get(company.nicheId) : null;
      const sector = company?.sectorId ? sectorById.get(company.sectorId) : null;
      if (!niche || !sector) return null;
      const pricing = getStartupPricing(sector, niche);
      const startupCost = toNumber((niche as any)?.startupCostEur, pricing?.startupCost ?? 0);
      const weeklyRevenue = toNumber(financialsByCompanyId.get(companyId)?.revenue, 0);
      const monthlyRevenue = weeklyRevenue ? weeklyRevenue * WEEKS_PER_MONTH : toNumber(pricing?.annualRevenue, 0) / 12;
      return resolveUpgradeCosts(upgrade, startupCost, monthlyRevenue);
    };

    let upgradeCapexEstimate = 0;
    let programCommitSpend = 0;

    for (const [companyId, decisions] of queuedByCompany.entries()) {
      for (const decision of decisions ?? []) {
        const payload = (decision as any)?.payload ?? {};
        switch (payload.type) {
          case "BUY_UPGRADE": {
            const upgradeId = String(payload.upgradeId ?? "");
            const costs = resolveUpgradeCostForCompany(upgradeId, companyId);
            if (costs) upgradeCapexEstimate += costs.capexMid;
            break;
          }
          case "START_PROGRAM": {
            const weekly = Number(payload.weeklyCost ?? 0);
            const duration = Math.max(1, Number(payload.durationWeeks ?? 1));
            programCommitSpend += weekly * duration;
            break;
          }
          default:
            break;
        }
      }
    }

    const totalCommitSpend = upgradeCapexEstimate + programCommitSpend;
    const cash = Number(holding?.cashBalance ?? 0);
    const budgetWarning = totalCommitSpend > 0 && totalCommitSpend > cash ? 1 : 0;

    const friendRequests =
      (friendsQuery.data ?? []).filter((f) => f.status === "PENDING" && f.direction === "incoming").length || 0;

    const offersCount = actionableOffers.length;
    const decisions = decisionsMissing + budgetWarning;
    const total = offersCount + decisions + friendRequests;

    return {
      offers: offersCount,
      decisions,
      decisionsMissing,
      budgetWarning,
      friendRequests,
      total,
    };
  }, [
    offersQuery.data,
    decisionsQuery.data,
    friendsQuery.data,
    portfolioUpgradesQuery.data,
    portfolioNichesQuery.data,
    portfolioSectorsQuery.data,
    companyFinancialsQuery.data,
    holding?.cashBalance,
    holdingId,
    companyIds,
    companies,
  ]);

  const isLoading =
    offersQuery.isLoading ||
    decisionsQuery.isLoading ||
    friendsQuery.isLoading ||
    portfolioNichesQuery.isLoading ||
    portfolioUpgradesQuery.isLoading ||
    companyFinancialsQuery.isLoading;

  return useMemo(
    () => ({
      counts,
      isLoading,
    }),
    [counts, isLoading]
  );
}

export default useNotifications;
