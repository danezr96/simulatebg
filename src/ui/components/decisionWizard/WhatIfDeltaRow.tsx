import { cn, formatCurrencyCompact } from "../../../utils/format";

export type WhatIfDeltaRowProps = {
  label: string;
  value: number;
  delta?: number;
  format?: (value: number) => string;
};

export function WhatIfDeltaRow({ label, value, delta, format }: WhatIfDeltaRowProps) {
  const formatter = format ?? formatCurrencyCompact;
  const deltaValue = Number.isFinite(delta as number) ? (delta as number) : 0;
  const showDelta = typeof delta === "number";
  const deltaLabel = deltaValue >= 0 ? `+${formatter(deltaValue)}` : formatter(deltaValue);

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-[var(--text-muted)]">{label}</div>
      <div className="flex items-center gap-2">
        <div className="font-semibold text-[var(--text)]">{formatter(value)}</div>
        {showDelta ? (
          <div className={cn("text-xs font-semibold", deltaValue >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {deltaLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default WhatIfDeltaRow;
