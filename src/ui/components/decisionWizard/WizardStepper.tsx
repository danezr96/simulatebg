import type { ReactNode } from "react";
import { BarChart3, Compass, Factory, Landmark, Send, Wrench } from "lucide-react";
import { cn } from "../../../utils/format";

export type WizardStep = {
  key: string;
  label: string;
  description?: string;
};

export type WizardStepperProps = {
  steps: ReadonlyArray<WizardStep>;
  activeKey: string;
  onSelect?: (key: string) => void;
};

const stepIcons: Record<string, ReactNode> = {
  briefing: <Compass className="h-4 w-4" />,
  baseline: <BarChart3 className="h-4 w-4" />,
  companies: <Factory className="h-4 w-4" />,
  holding: <Landmark className="h-4 w-4" />,
  upgrades: <Wrench className="h-4 w-4" />,
  review: <Send className="h-4 w-4" />,
};

export function WizardStepper({ steps, activeKey, onSelect }: WizardStepperProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isActive = step.key === activeKey;
        const isComplete = steps.findIndex((s) => s.key === activeKey) > index;
        const progress = isComplete ? 1 : isActive ? 0.6 : 0.1;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onSelect?.(step.key)}
            className={cn(
              "flex min-w-[140px] flex-col gap-1 rounded-2xl border px-3 py-2 text-left",
              isActive
                ? "border-[var(--accent)] bg-[color:var(--card-2)]"
                : "border-[var(--border)] bg-[var(--card)]",
              isComplete ? "text-[var(--text)]" : "text-[var(--text-muted)]"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : isComplete
                    ? "bg-[var(--card-2)] text-[var(--text)]"
                    : "bg-[var(--card-2)] text-[var(--text-muted)]"
                )}
              >
                {index + 1}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--card-2)] text-[var(--text-muted)]"
                  )}
                >
                  {stepIcons[step.key] ?? <span>{index + 1}</span>}
                </span>
                {step.label}
              </div>
            </div>
            {step.description ? (
              <div className="text-xs text-[var(--text-muted)]">{step.description}</div>
            ) : null}
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default WizardStepper;
