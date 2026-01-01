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

export function WizardStepper({ steps, activeKey, onSelect }: WizardStepperProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const isActive = step.key === activeKey;
        const isComplete = steps.findIndex((s) => s.key === activeKey) > index;
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
              <div className="text-sm font-semibold">{step.label}</div>
            </div>
            {step.description ? (
              <div className="text-xs text-[var(--text-muted)]">{step.description}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default WizardStepper;
