import type { Company, Loan } from "../../../core/domain";
import { formatCurrencyCompact, formatNumber } from "../../../utils/format";
import Card from "../Card";
import { CreditCard, Shield, TrendingUp, Wallet } from "lucide-react";

export type HoldingPolicyDraft = {
  riskAppetite?: "LOW" | "MEDIUM" | "HIGH";
  dividendPreference?: "HOLDING" | "REINVEST";
  maxLeverageRatio?: number;
};

export type HoldingDecisionPanelProps = {
  companies: Company[];
  loans?: Loan[];
  draftLoanPayments?: Record<string, number>;
  onLoanPaymentChange?: (loanId: string, amount: number) => void;
  draftHoldingAllocations: Record<string, number>;
  onAllocationChange: (companyId: string, amount: number) => void;
  policy: HoldingPolicyDraft;
  onPolicyChange: (next: HoldingPolicyDraft) => void;
  safeToSpend?: number;
  disabled?: boolean;
};

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function HoldingDecisionPanel({
  companies,
  loans,
  draftLoanPayments,
  onLoanPaymentChange,
  draftHoldingAllocations,
  onAllocationChange,
  policy,
  onPolicyChange,
  safeToSpend,
  disabled,
}: HoldingDecisionPanelProps) {
  const allocationsTotal = Object.values(draftHoldingAllocations).reduce(
    (sum, value) => sum + toNumber(value, 0),
    0
  );
  const allocationIntensity = Math.min(1, Math.abs(allocationsTotal) / 50_000);
  const activeLoans = (loans ?? []).filter((loan) => loan.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <Wallet className="h-4 w-4 text-[var(--accent)]" />
          Holding controls
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          Allocate capital, set guardrails, and choose how aggressive the holding behaves this round.
        </div>
        <div className="mt-3 grid gap-3 text-xs text-[var(--text-muted)] md:grid-cols-2">
          <div>
            Safe to spend:{" "}
            <span className="font-semibold text-[var(--text)]">
              {formatCurrencyCompact(safeToSpend ?? 0)}
            </span>
          </div>
          <div>
            Allocation drift:{" "}
            <span className="font-semibold text-[var(--text)]">
              {formatCurrencyCompact(allocationsTotal)}
            </span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${Math.round(allocationIntensity * 100)}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <Shield className="h-4 w-4 text-[var(--accent)]" />
            Risk appetite
          </div>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            value={policy.riskAppetite ?? "MEDIUM"}
            disabled={disabled}
            onChange={(event) =>
              onPolicyChange({
                ...policy,
                riskAppetite: event.target.value as HoldingPolicyDraft["riskAppetite"],
              })
            }
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Controls cash buffer sizing and how bold projections should be.
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
            Dividend policy
          </div>
          <select
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
            value={policy.dividendPreference ?? "REINVEST"}
            disabled={disabled}
            onChange={(event) =>
              onPolicyChange({
                ...policy,
                dividendPreference: event.target.value as HoldingPolicyDraft["dividendPreference"],
              })
            }
          >
            <option value="HOLDING">Route profit to holding</option>
            <option value="REINVEST">Reinvest by default</option>
          </select>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Guides default cash flow when companies overperform.
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <CreditCard className="h-4 w-4 text-[var(--accent)]" />
          Max leverage ratio
        </div>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={policy.maxLeverageRatio ?? 1.5}
          disabled={disabled}
          onChange={(event) =>
            onPolicyChange({
              ...policy,
              maxLeverageRatio: toNumber(event.target.value, 1.5),
            })
          }
          className="mt-3 w-full"
        />
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          Target leverage cap: {formatNumber(policy.maxLeverageRatio ?? 1.5, "nl-NL", 1)}x
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          Higher caps allow bigger loans; lower caps keep the holding defensive.
        </div>
      </Card>

      {activeLoans.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <CreditCard className="h-4 w-4 text-[var(--accent)]" />
            Extra loan payments
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Pay down holding loans immediately on the next tick.
          </div>
          <div className="mt-3 space-y-3">
            {activeLoans.map((loan) => {
              const loanId = String(loan.id);
              const outstanding = Math.max(0, Number(loan.outstandingBalance ?? 0));
              const principal = Math.max(outstanding, Number(loan.principal ?? outstanding));
              const payoffPct = principal > 0 ? 1 - outstanding / principal : 0;
              const paymentValue = Math.max(0, toNumber(draftLoanPayments?.[loanId], 0));

              return (
                <div key={loanId} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <div className="font-semibold text-[var(--text)]">{loan.lenderName}</div>
                    <div>{Math.round(Number(loan.interestRate ?? 0) * 1000) / 10}% APR</div>
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    Outstanding {formatCurrencyCompact(outstanding)} | Remaining {loan.remainingWeeks} weeks
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${Math.round(payoffPct * 100)}%` }}
                    />
                  </div>
                  <label className="mt-3 block text-xs text-[var(--text-muted)]">
                    Extra payment
                    <input
                      type="number"
                      min={0}
                      max={outstanding}
                      step={100}
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)]"
                      value={Number.isFinite(paymentValue) ? paymentValue : 0}
                      onChange={(event) =>
                        onLoanPaymentChange?.(
                          loanId,
                          Math.min(outstanding, toNumber(event.target.value, 0))
                        )
                      }
                      disabled={disabled}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div className="space-y-3">
        {companies.map((company) => {
          const companyId = String(company.id);
          const allocation = draftHoldingAllocations[companyId] ?? 0;
          return (
            <Card key={companyId} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{company.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">Capital allocation delta</div>
                </div>
                <div className="text-sm font-semibold text-[var(--text)]">
                  {formatCurrencyCompact(allocation)}
                </div>
              </div>
              <input
                type="range"
                min={-50000}
                max={50000}
                step={1000}
                value={allocation}
                disabled={disabled}
                onChange={(event) => onAllocationChange(companyId, toNumber(event.target.value, 0))}
                className="mt-3 w-full"
              />
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                Negative values withdraw cash, positive values inject capital.
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default HoldingDecisionPanel;
