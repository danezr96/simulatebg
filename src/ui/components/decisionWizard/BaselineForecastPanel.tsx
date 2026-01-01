import type { ProjectionSummary, WhatIfProjection } from "../../../core/projections/types";
import { formatCurrencyCompact } from "../../../utils/format";
import Card from "../Card";
import Sparkline from "../Sparkline";
import WhatIfDeltaRow from "./WhatIfDeltaRow";

export type BaselineForecastPanelProps = {
  baseline: ProjectionSummary | null;
  whatIf?: WhatIfProjection | null;
};

export function BaselineForecastPanel({ baseline, whatIf }: BaselineForecastPanelProps) {
  if (!baseline) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-[var(--text)]">Baseline forecast</div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">No baseline data available yet.</div>
      </Card>
    );
  }

  const deltas = whatIf?.deltas;
  const band = whatIf?.riskBandEndCash ?? baseline.riskBandEndCash;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">Baseline forecast</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            If you change nothing, this is the expected range.
          </div>
        </div>
        <div className="w-40">
          <Sparkline
            data={[band.worst, band.expected, band.best]}
            stroke="var(--accent)"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <WhatIfDeltaRow
          label="Expected revenue"
          value={baseline.expectedRevenue}
          delta={deltas?.revenue}
          format={formatCurrencyCompact}
        />
        <WhatIfDeltaRow
          label="Expected costs"
          value={baseline.expectedCosts}
          delta={deltas?.costs}
          format={formatCurrencyCompact}
        />
        <WhatIfDeltaRow
          label="Expected profit"
          value={baseline.expectedProfit}
          delta={deltas?.profit}
          format={formatCurrencyCompact}
        />
        <WhatIfDeltaRow
          label="Expected end cash"
          value={baseline.expectedEndCash}
          delta={deltas?.endCash}
          format={formatCurrencyCompact}
        />
      </div>
    </Card>
  );
}

export default BaselineForecastPanel;
