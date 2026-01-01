import * as React from "react";

import type { BriefingCard as BriefingCardType, BriefingScope } from "../../../core/briefing/briefing.types";
import { cn } from "../../../utils/format";
import BriefingCard from "./BriefingCard";

const SCOPE_LABELS: Record<string, string> = {
  macro: "Macro",
  sector: "Sector",
  niche: "Niche",
  company: "Your company",
  competitor: "Competitors",
};

export type MarketBriefingInboxProps = {
  cards: BriefingCardType[];
};

export function MarketBriefingInbox({ cards }: MarketBriefingInboxProps) {
  const [activeScope, setActiveScope] = React.useState<BriefingScope | "all">("all");

  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-xs text-[var(--text-muted)]">
        No briefing cards available yet.
      </div>
    );
  }

  const scopes = React.useMemo(() => {
    const set = new Set(cards.map((card) => card.scope));
    return ["all", ...Array.from(set)] as Array<BriefingScope | "all">;
  }, [cards]);

  const filtered = React.useMemo(() => {
    if (activeScope === "all") return cards;
    return cards.filter((card) => card.scope === activeScope);
  }, [cards, activeScope]);

  const grouped = React.useMemo(() => {
    if (activeScope !== "all") return { [activeScope]: filtered } as Record<string, BriefingCardType[]>;
    return filtered.reduce((acc, card) => {
      const key = card.scope;
      acc[key] = acc[key] ?? [];
      acc[key].push(card);
      return acc;
    }, {} as Record<string, BriefingCardType[]>);
  }, [filtered, activeScope]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {scopes.map((scope) => (
          <button
            key={scope}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              activeScope === scope
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--card-2)] text-[var(--text)]"
            )}
            onClick={() => setActiveScope(scope)}
          >
            {scope === "all" ? "All" : SCOPE_LABELS[scope] ?? scope}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([scope, scopeCards]) => (
        <div key={scope} className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {SCOPE_LABELS[scope] ?? scope}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {scopeCards.map((card) => (
              <div
                key={card.id}
                className="min-w-[75%] max-w-[75%] snap-center md:min-w-[45%] md:max-w-[45%]"
              >
                <BriefingCard card={card} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MarketBriefingInbox;
