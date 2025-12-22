// src/ui/components/KPIChip.tsx
import * as React from "react";
import { cn } from "../../utils/format";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/**
 * KPIChip
 * - Small, calm indicator for KPIs (Japandi style)
 * - Supports positive / negative / neutral trends
 * - Optional icon + subtle color accent
 */

export type KPITrend = "up" | "down" | "neutral";

export interface KPIChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: KPITrend;
  subtle?: boolean;
}

const trendConfig: Record<
  KPITrend,
  { icon: React.ReactNode; className: string }
> = {
  up: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    className: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  down: {
    icon: <ArrowDownRight className="h-4 w-4" />,
    className: "text-rose-600 bg-rose-50 border-rose-100",
  },
  neutral: {
    icon: <Minus className="h-4 w-4" />,
    className: "text-slate-600 bg-slate-50 border-slate-100",
  },
};

export const KPIChip = React.forwardRef<HTMLDivElement, KPIChipProps>(
  ({ label, value, trend = "neutral", subtle, className, ...props }, ref) => {
    const cfg = trendConfig[trend];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5",
          "text-xs font-medium transition-colors",
          subtle
            ? "bg-[var(--card)] text-[var(--text-muted)] border-[var(--border)]"
            : cfg.className,
          className
        )}
        {...props}
      >
        <span className="opacity-80">{cfg.icon}</span>
        <span className="uppercase tracking-wide">{label}</span>
        <span className="ml-1 font-semibold tabular-nums">{value}</span>
      </div>
    );
  }
);

KPIChip.displayName = "KPIChip";

export default KPIChip;
