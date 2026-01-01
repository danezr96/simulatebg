import { formatCurrencyCompact } from "../../../utils/format";
import { cn } from "../../../utils/format";
import { Button } from "../Button";

export type StickySummaryBarProps = {
  safeToSpend?: number;
  expectedEndCash?: number;
  worstEndCash?: number;
  primaryLabel: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  disabled?: boolean;
};

export function StickySummaryBar({
  safeToSpend,
  expectedEndCash,
  worstEndCash,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  disabled,
}: StickySummaryBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[color:var(--bg)]/95 backdrop-blur">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-3 md:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 gap-3 text-xs text-[var(--text-muted)]">
          <div>
            <div className="uppercase tracking-wide">Safe to spend</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(safeToSpend ?? 0)}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wide">Expected end cash</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">
              {formatCurrencyCompact(expectedEndCash ?? 0)}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wide">Worst-case end cash</div>
            <div className={cn("mt-1 text-sm font-semibold", (worstEndCash ?? 0) < 0 ? "text-rose-600" : "text-[var(--text)]")}>
              {formatCurrencyCompact(worstEndCash ?? 0)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          {secondaryLabel ? (
            <Button variant="ghost" size="sm" onClick={onSecondary} disabled={disabled}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button size="md" onClick={onPrimary} disabled={disabled}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StickySummaryBar;
