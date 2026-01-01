import type { Company } from "../../../core/domain";
import { formatCurrencyCompact, formatNumber } from "../../../utils/format";
import Card from "../Card";

export type HoldingPolicyDraft = {
  riskAppetite?: "LOW" | "MEDIUM" | "HIGH";
  dividendPreference?: "HOLDING" | "REINVEST";
  maxLeverageRatio?: number;
};

export type HoldingDecisionPanelProps = {
  companies: Company[];
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
  draftHoldingAllocations,
  onAllocationChange,
  policy,
  onPolicyChange,
  safeToSpend,
  disabled,
}: HoldingDecisionPanelProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="text-sm font-semibold text-[var(--text)]">Holding controls</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          Allocate capital per company and set portfolio policy for the round.
        </div>
        <div className="mt-3 text-xs text-[var(--text-muted)]">
          Safe to spend: <span className="font-semibold text-[var(--text)]">{formatCurrencyCompact(safeToSpend ?? 0)}</span>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
        </Card>

        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
      </Card>

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
