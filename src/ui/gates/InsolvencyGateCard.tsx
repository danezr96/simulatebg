import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import Card from "../components/Card";
import Button from "../components/Button";

import { asCompanyId, asHoldingId } from "../../core/domain";
import { companyService } from "../../core/services/companyService";
import { holdingService } from "../../core/services/holdingService";
import { holdingRepo } from "../../core/persistence/holdingRepo";
import { estimateCompanyLiquidationValue } from "../../utils/valuation";
import { formatMoney } from "../../utils/money";

type Props = {
  worldId: string;
  holding: unknown | null;
  companies: unknown[];
  onDone: () => Promise<void>;
};

function readId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

export default function InsolvencyGateCard({ worldId, holding, companies, onDone }: Props) {
  const holdingId = readId(holding);
  const holdingCash = Number((holding as any)?.cashBalance ?? 0);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [resetBusy, setResetBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const companyIds = React.useMemo(
    () => companies.map((company: any) => String(company.id)).filter(Boolean),
    [companies]
  );

  const financialsQuery = useQuery({
    queryKey: ["insolvencyFinancials", worldId, companyIds.join("|")],
    queryFn: async () => {
      return Promise.all(
        companyIds.map(async (id) => ({
          companyId: id,
          financials: await companyService.getLatestFinancials(asCompanyId(id)),
        }))
      );
    },
    enabled: companyIds.length > 0,
    staleTime: 5_000,
  });

  const financialsById = React.useMemo(() => {
    const map = new Map<string, any>();
    (financialsQuery.data ?? []).forEach((row) => map.set(row.companyId, row.financials ?? null));
    return map;
  }, [financialsQuery.data]);

  const liquidationRows = React.useMemo(() => {
    return companies.map((company: any) => {
      const companyId = String(company.id);
      const fin = financialsById.get(companyId);
      const saleValue = estimateCompanyLiquidationValue(fin ?? null);
      return {
        companyId,
        name: String(company.name ?? "Company"),
        revenue: Number(fin?.revenue ?? 0),
        profit: Number(fin?.netProfit ?? 0),
        saleValue,
        cashAfterSale: holdingCash + saleValue,
      };
    });
  }, [companies, financialsById, holdingCash]);

  const totalRecovery = liquidationRows.reduce((sum, row) => sum + row.saleValue, holdingCash);
  const canReset = liquidationRows.length === 0 || totalRecovery < 0;

  const onSell = async (companyId: string) => {
    if (!holdingId || !companyId) return;
    setError(null);
    setBusyId(companyId);
    try {
      await holdingService.liquidateCompany({
        holdingId: asHoldingId(holdingId),
        companyId,
      });
      await onDone();
    } catch (err) {
      setError(String((err as Error)?.message ?? err ?? "Liquidation failed"));
    } finally {
      setBusyId(null);
    }
  };

  const onResetHolding = async () => {
    if (!holdingId) return;
    setError(null);
    setResetBusy(true);
    try {
      await holdingRepo.delete(asHoldingId(holdingId));
      await onDone();
    } catch (err) {
      setError(String((err as Error)?.message ?? err ?? "Reset failed"));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-xs text-[var(--text-muted)]">Emergency recovery</div>
      <div className="text-lg font-semibold text-[var(--text)]">Holding cash is below zero</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        You must sell a company to restore positive cash and continue. If liquidation still
        leaves you negative, you will need to start a new holding.
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          Current cash: <span className="font-semibold text-rose-600">{formatMoney(holdingCash)}</span>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          Max recovery after liquidation:{" "}
          <span className={totalRecovery >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
            {formatMoney(totalRecovery)}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {liquidationRows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm text-[var(--text-muted)]">
            No companies available to sell.
          </div>
        ) : (
          liquidationRows.map((row) => (
            <div
              key={row.companyId}
              className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{row.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Revenue {formatMoney(row.revenue)} - Profit {formatMoney(row.profit)}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--text-muted)]">
                  <div>Est. sale value</div>
                  <div className="text-sm font-semibold text-[var(--text)]">{formatMoney(row.saleValue)}</div>
                  <div className={row.cashAfterSale >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    Cash after sale {formatMoney(row.cashAfterSale)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={() => void onSell(row.companyId)}
                  disabled={!!busyId || resetBusy}
                  loading={busyId === row.companyId}
                >
                  Sell company
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {canReset ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Even after selling everything you remain underwater. Start a new holding to keep playing.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => void onResetHolding()}
          disabled={!canReset || !!busyId || resetBusy}
          loading={resetBusy}
        >
          Start new holding
        </Button>
      </div>
    </Card>
  );
}
