import type { BriefingCard as BriefingCardType } from "../../../core/briefing/briefing.types";
import { cn } from "../../../utils/format";

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-slate-100 text-slate-700",
  opportunity: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

export type BriefingCardProps = {
  card: BriefingCardType;
};

export function BriefingCard({ card }: BriefingCardProps) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--text)]">{card.title}</div>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
            SEVERITY_STYLES[card.severity] ?? SEVERITY_STYLES.info
          )}
        >
          {card.severity}
        </span>
      </div>
      <div className="mt-2 text-xs text-[var(--text-muted)]">{card.body}</div>
      <div className="mt-3 text-xs font-semibold text-[var(--text)]">Why this matters</div>
      <ul className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
        {card.whyItMatters.map((item, idx) => (
          <li key={`${card.id}-why-${idx}`}>? {item}</li>
        ))}
      </ul>
      {card.suggestedLevers.length ? (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Suggested levers</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {card.suggestedLevers.map((lever) => (
              <span
                key={`${card.id}-${lever}`}
                className="rounded-full bg-[var(--card-2)] px-2 py-1 text-[10px] font-semibold text-[var(--text)]"
              >
                {lever}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BriefingCard;
