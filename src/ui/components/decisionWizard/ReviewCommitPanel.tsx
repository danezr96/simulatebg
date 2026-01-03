import type { ProjectionSummary, WhatIfProjection } from "../../../core/projections/types";
import { formatCurrencyCompact } from "../../../utils/format";
import Card from "../Card";
import { Button } from "../Button";

export type ReviewCommitPanelProps = {
  baseline: ProjectionSummary | null;
  whatIf: WhatIfProjection | null;
  keyRisks: string[];
  softCommitted: boolean;
  onSoftCommit: () => void;
  onUnlock: () => void;
  onCommit: () => void;
  disabled?: boolean;
  isTicking?: boolean;
};

export function ReviewCommitPanel({
  baseline,
  whatIf,
  keyRisks,
  softCommitted,
  onSoftCommit,
  onUnlock,
  onCommit,
  disabled,
  isTicking,
}: ReviewCommitPanelProps) {
  const summary = whatIf ?? baseline;

  if (!summary) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-[var(--text)]">Review & submit</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">No projection data yet.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">Review & submit</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Final check before you submit the round.
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">{isTicking ? "Tick running" : "Ready"}</div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Starting cash</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.startingCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Reserved ops cash</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.reservedOpsCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Reserved upgrades cash</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.reservedUpgradeCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Safety buffer</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.safetyBufferCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Safe to spend</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.safeToSpendCash)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Expected end cash</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.expectedEndCash)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Expected revenue</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.expectedRevenue)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Expected costs</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.expectedCosts)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-3">
            <div className="text-xs text-[var(--text-muted)]">Expected profit</div>
            <div className="text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(summary.expectedProfit)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Key risks
        </div>
        <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
          {keyRisks.length ? (
            keyRisks.map((risk, idx) => <div key={`risk-${idx}`}>? {risk}</div>)
          ) : (
            <div>No critical risks flagged.</div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {softCommitted ? (
          <Button variant="ghost" onClick={onUnlock} disabled={disabled}>
            Unlock preview
          </Button>
        ) : (
          <Button variant="secondary" onClick={onSoftCommit} disabled={disabled}>
            Lock preview
          </Button>
        )}
        <Button onClick={onCommit} disabled={disabled || !softCommitted}>
          Submit
        </Button>
      </div>
    </div>
  );
}

export default ReviewCommitPanel;
