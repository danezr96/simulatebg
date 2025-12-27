// src/ui/components/CompanyMarketplace.tsx
import * as React from "react";
import { Filter, Search } from "lucide-react";

import type { Sector, Niche } from "../../core/domain/sector";
import type { StartupListing } from "../hooks/useStartupListings";
import { formatNumber, formatPercent } from "../../utils/format";
import { money } from "../../utils/money";
import { cn } from "../../utils/format";
import { Card } from "./Card";
import Button from "./Button";

type Props = {
  listings: StartupListing[];
  sectors: Sector[];
  niches: Niche[];
  loading?: boolean;
  error?: string | null;
  selectedId?: string | null;
  availableCash?: number;
  actionLabel?: string;
  onSelect?: (listing: StartupListing) => void;
};

const SORT_OPTIONS = [
  { value: "cost", label: "Sort by cost" },
  { value: "roi", label: "Sort by return" },
  { value: "payback", label: "Sort by payback" },
] as const;

export const CompanyMarketplace: React.FC<Props> = ({
  listings,
  sectors,
  niches,
  loading,
  error,
  selectedId,
  availableCash,
  actionLabel = "Select",
  onSelect,
}) => {
  const [query, setQuery] = React.useState("");
  const [sectorFilter, setSectorFilter] = React.useState("ALL");
  const [nicheFilter, setNicheFilter] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState<(typeof SORT_OPTIONS)[number]["value"]>("cost");

  const filteredNiches = React.useMemo(() => {
    if (sectorFilter === "ALL") return niches;
    return niches.filter((n) => String(n.sectorId) === sectorFilter);
  }, [niches, sectorFilter]);

  const filteredListings = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = listings.filter((listing) => {
      if (sectorFilter !== "ALL" && String(listing.sector.id) !== sectorFilter) return false;
      if (nicheFilter !== "ALL" && String(listing.niche.id) !== nicheFilter) return false;
      if (!q) return true;
      return (
        listing.niche.name.toLowerCase().includes(q) ||
        listing.sector.name.toLowerCase().includes(q) ||
        listing.niche.code.toLowerCase().includes(q) ||
        listing.sector.code.toLowerCase().includes(q)
      );
    });

    return rows.sort((a, b) => {
      if (sortBy === "roi") return b.pricing.roi - a.pricing.roi;
      if (sortBy === "payback") return a.pricing.paybackYears - b.pricing.paybackYears;
      return a.pricing.startupCost - b.pricing.startupCost;
    });
  }, [listings, query, sectorFilter, nicheFilter, sortBy]);

  const isAffordable = (listing: StartupListing) =>
    availableCash === undefined || availableCash >= listing.pricing.startupCost;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_200px]">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            className={cn(
              "w-full bg-transparent outline-none text-sm text-[var(--text)]",
              "placeholder:text-[var(--text-muted)]"
            )}
            placeholder="Search sector or niche"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <select
            className="w-full bg-transparent outline-none text-sm text-[var(--text)]"
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setNicheFilter("ALL");
            }}
          >
            <option value="ALL">All sectors</option>
            {sectors.map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <select
            className="w-full bg-transparent outline-none text-sm text-[var(--text)]"
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
          >
            <option value="ALL">All niches</option>
            {filteredNiches.map((n) => (
              <option key={String(n.id)} value={String(n.id)}>
                {n.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
          <Filter className="h-4 w-4 text-[var(--text-muted)]" />
          <select
            className="w-full bg-transparent outline-none text-sm text-[var(--text)]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <Card className="rounded-3xl p-4">
            <div className="text-sm text-[var(--text-muted)]">Loading listings...</div>
          </Card>
        ) : filteredListings.length === 0 ? (
          <Card className="rounded-3xl p-4">
            <div className="text-sm text-[var(--text-muted)]">No listings match your filters.</div>
          </Card>
        ) : (
          filteredListings.map((listing) => {
            const pricing = listing.pricing;
            const selected = selectedId === listing.id;
            const affordable = isAffordable(listing);
            const riskClass =
              pricing.riskLabel === "Low"
                ? "text-emerald-600"
                : pricing.riskLabel === "Medium"
                ? "text-amber-600"
                : "text-rose-600";

            return (
              <Card
                key={listing.id}
                className={cn(
                  "rounded-3xl p-4 border transition-colors",
                  selected ? "border-[color:var(--accent)] bg-[var(--card-2)]" : "border-[var(--border)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-[var(--text-muted)]">{listing.sector.name}</div>
                    <div className="text-base font-semibold text-[var(--text)]">{listing.niche.name}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{listing.niche.description}</div>
                  </div>
                  <div className={cn("text-xs font-semibold", riskClass)}>{pricing.riskLabel} risk</div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
                  <div>
                    <div>Startup cost</div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {money.compact(pricing.startupCost)}
                    </div>
                  </div>
                  <div>
                    <div>Expected revenue</div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {money.compact(pricing.annualRevenue)} / yr
                    </div>
                  </div>
                  <div>
                    <div>Profit range</div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {money.compact(pricing.annualProfitRange.min)} - {money.compact(pricing.annualProfitRange.max)}
                    </div>
                  </div>
                  <div>
                    <div>Expected ROI</div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {formatPercent(pricing.roi)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-[var(--text-muted)]">
                  <div>
                    <div>Capex</div>
                    <div className="text-[var(--text)]">{listing.niche.config.capexIntensity}</div>
                  </div>
                  <div>
                    <div>Ticket</div>
                    <div className="text-[var(--text)]">{listing.niche.config.ticketSize}</div>
                  </div>
                  <div>
                    <div>Demand</div>
                    <div className="text-[var(--text)]">
                      {formatNumber(Number(listing.niche.config.baseDemandLevel ?? 0))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-xs text-[var(--text-muted)]">
                    Payback: {pricing.paybackYears.toFixed(1)} yrs
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!affordable}
                    onClick={() => onSelect?.(listing)}
                  >
                    {affordable ? actionLabel : "Insufficient cash"}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompanyMarketplace;
