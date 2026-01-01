import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Shield, Trophy, TrendingUp } from "lucide-react";

import Modal from "./Modal";
import { Card } from "./Card";
import KPIChip from "./KPIChip";

import { playerRepo } from "../../core/persistence/playerRepo";
import { holdingRepo } from "../../core/persistence/holdingRepo";
import { companyRepo } from "../../core/persistence/companyRepo";
import { companyService } from "../../core/services/companyService";
import { asHoldingId, asCompanyId } from "../../core/domain";

import { formatMoney, money } from "../../utils/money";
import { getCreditTier } from "../../utils/loan";
import { useSectorDirectory } from "../hooks/useSectorDirectory";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId?: string | null;
  worldId?: string | null;
};

export function PlayerProfileModal({ open, onOpenChange, playerId, worldId }: Props) {
  const { sectorById, nicheById } = useSectorDirectory();

  const playerQuery = useQuery({
    queryKey: ["profilePlayer", playerId],
    queryFn: () => (playerId ? playerRepo.getById(playerId as any) : Promise.resolve(null)),
    enabled: open && !!playerId,
  });

  const holdingQuery = useQuery({
    queryKey: ["profileHolding", playerId, worldId],
    queryFn: async () => {
      if (!playerId || !worldId) return null;
      return holdingRepo.getByPlayerAndWorld(playerId as any, worldId as any);
    },
    enabled: open && !!playerId && !!worldId,
  });

  const holdingId = holdingQuery.data?.id ? String(holdingQuery.data.id) : null;

  const companiesQuery = useQuery({
    queryKey: ["profileCompanies", holdingId],
    queryFn: async () => {
      if (!holdingId) return [];
      return companyRepo.listByHolding(asHoldingId(holdingId));
    },
    enabled: open && !!holdingId,
  });

  const companyIds = React.useMemo(
    () => (companiesQuery.data ?? []).map((c) => String(c.id)).filter(Boolean),
    [companiesQuery.data]
  );
  const companyIdsKey = companyIds.join("|");

  const financialsQuery = useQuery({
    queryKey: ["profileFinancials", companyIdsKey],
    queryFn: async () => {
      if (!companyIds.length) return [];
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          financials: await companyService.getLatestFinancials(asCompanyId(id)),
        }))
      );
    },
    enabled: open && companyIds.length > 0,
  });

  const player = playerQuery.data ?? null;
  const holding = holdingQuery.data ?? null;
  const companies = companiesQuery.data ?? [];
  const financials = financialsQuery.data ?? [];

  const netWorth =
    Number(holding?.cashBalance ?? 0) +
    Number(holding?.totalEquity ?? 0) -
    Number(holding?.totalDebt ?? 0);

  const totals = financials.reduce(
    (acc, row) => {
      const fin = row.financials;
      if (!fin) return acc;
      acc.revenue += Number(fin.revenue ?? 0);
      acc.netProfit += Number(fin.netProfit ?? 0);
      return acc;
    },
    { revenue: 0, netProfit: 0 }
  );

  const companyRows = companies.map((company) => {
    const fin = financials.find((row) => row.companyId === String(company.id))?.financials;
    return {
      id: String(company.id),
      name: company.name,
      sector: sectorById.get(String(company.sectorId)),
      niche: nicheById.get(String(company.nicheId)),
      revenue: Number(fin?.revenue ?? 0),
      netProfit: Number(fin?.netProfit ?? 0),
    };
  });

  const topCompanies = [...companyRows].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const creditTier = getCreditTier(Number(player?.creditRepLevel ?? 1));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={player ? `${player.name}` : "Player profile"}
      description={holding ? `${holding.name} in ${holding.baseCurrency}` : "Profile snapshot"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="rounded-3xl p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Shield className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Holding snapshot</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <KPIChip label="Net worth" value={formatMoney(netWorth)} trend="neutral" />
              <KPIChip label="Cash" value={formatMoney(holding?.cashBalance ?? 0)} trend="neutral" subtle />
              <KPIChip label="Debt" value={formatMoney(holding?.totalDebt ?? 0)} trend="neutral" subtle />
            </div>
            <div className="mt-3 text-xs text-[var(--text-muted)]">
              Companies: <span className="text-[var(--text)]">{companies.length}</span>
            </div>
          </Card>

          <Card className="rounded-3xl p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <TrendingUp className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Latest performance</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <KPIChip label="Revenue" value={money.compact(totals.revenue)} trend="neutral" />
              <KPIChip
                label="Net profit"
                value={money.compact(totals.netProfit)}
                trend={totals.netProfit >= 0 ? "up" : "down"}
                subtle
              />
            </div>
            <div className="mt-3 text-xs text-[var(--text-muted)]">
              Credit rating: <span className="text-[var(--text)]">{creditTier.label}</span>{" "}
              ({creditTier.note})
            </div>
          </Card>

          <Card className="rounded-3xl p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Trophy className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text)]">Highlights</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <div className="text-[var(--text-muted)]">Prestige</div>
                <div className="text-sm font-semibold">{player?.prestigeLevel ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <div className="text-[var(--text-muted)]">Brand rep</div>
                <div className="text-sm font-semibold">{player?.brandRepLevel ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <div className="text-[var(--text-muted)]">Credit rep</div>
                <div className="text-sm font-semibold">{player?.creditRepLevel ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                <div className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Crown className="h-3.5 w-3.5" />
                  Achievements
                </div>
                <div className="text-sm font-semibold">In progress</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Company snapshot</div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Top companies by revenue in this holding.
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {topCompanies.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">No companies yet.</div>
            ) : (
              topCompanies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3"
                >
                  <div className="text-sm font-semibold text-[var(--text)]">{company.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    {company.sector?.name ?? "Sector"} - {company.niche?.name ?? "Niche"}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span>Revenue {money.compact(company.revenue)}</span>
                    <span className={company.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      Profit {money.compact(Math.abs(company.netProfit))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export default PlayerProfileModal;
