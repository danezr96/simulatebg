// src/ui/gates/CreateFirstCompanyCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";
import CompanyMarketplace from "../components/CompanyMarketplace";

import type { WorldId, HoldingId } from "../../core/domain";
import { companyService } from "../../core/services/companyService";
import { useStartupListings } from "../hooks/useStartupListings";
import type { StartupListing } from "../hooks/useStartupListings";
import { formatMoney } from "../../utils/money";
import { formatPercent } from "../../utils/format";

// Optional legacy gate, kept in sync with purchase flow.

type Props = {
  worldId: string;
  holding: unknown | null;
  onDone: () => Promise<void> | void;
  initialName?: string;
  initialRegion?: string;
};

function readId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

export default function CreateFirstCompanyCard({
  worldId,
  holding,
  onDone,
  initialName,
  initialRegion,
}: Props) {
  const holdingIdStr = readId(holding);
  const holdingCash = Number((holding as any)?.cashBalance ?? 0);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [name, setName] = React.useState(initialName ?? "");
  const [region, setRegion] = React.useState(initialRegion ?? "EU-WEST");

  const { listings, sectors, niches, loading, error: listingsError } = useStartupListings();
  const [selectedListingId, setSelectedListingId] = React.useState<string | null>(null);

  const selectedListing = React.useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId]
  );

  const canAffordSetup = !!selectedListing && holdingCash >= selectedListing.pricing.startupCost;

  const onSelectListing = (listing: StartupListing) => {
    setSelectedListingId(listing.id);
    if (!name.trim()) {
      setName(`${listing.niche.name} Co`);
    }
    setError(null);
  };

  async function createCompany() {
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!holdingIdStr) return setError("Holding is missing.");
    if (!trimmed) return setError("Enter a company name.");
    if (!selectedListing) return setError("Select a listing first.");
    if (!canAffordSetup) return setError("Not enough cash to purchase this company.");

    setBusy(true);
    try {
      await companyService.createCompany({
        holdingId: holdingIdStr as unknown as HoldingId,
        worldId: worldId as unknown as WorldId,
        sectorId: selectedListing.sector.id as any,
        nicheId: selectedListing.niche.id as any,
        name: trimmed,
        region,
        foundedYear: 1,
      });

      setSuccess("Company purchased! Continuing...");
      await Promise.resolve(onDone());
    } catch (e: any) {
      setError(e?.message ?? "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !loading &&
    !!holdingIdStr &&
    name.trim().length > 0 &&
    !!selectedListing &&
    canAffordSetup;

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-lg font-semibold text-[var(--text)]">Purchase your first company</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        Choose a listing and create your first company.
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Company name</label>
          <input
            className="mt-2 w-full rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="e.g., Northwind Logistics BV"
            disabled={busy}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Region</label>
          <select
            className="mt-2 w-full rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={region}
            onChange={(ev) => setRegion(ev.target.value)}
            disabled={busy}
          >
            <option value="EU-WEST">EU-WEST</option>
            <option value="EU-CENTRAL">EU-CENTRAL</option>
            <option value="US-EAST">US-EAST</option>
          </select>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-xs text-[var(--text-muted)]">Selected listing</div>
          {selectedListing ? (
            <div className="mt-2 space-y-1 text-sm">
              <div className="font-semibold text-[var(--text)]">
                {selectedListing.niche.name} - {selectedListing.sector.name}
              </div>
              <div>Startup cost: {formatMoney(selectedListing.pricing.startupCost)}</div>
              <div>Expected ROI: {formatPercent(selectedListing.pricing.roi)}</div>
              <div>Payback: {selectedListing.pricing.paybackYears.toFixed(1)} yrs</div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-[var(--text-muted)]">Select a listing below.</div>
          )}
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Available cash: {formatMoney(holdingCash)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CompanyMarketplace
          listings={listings}
          sectors={sectors}
          niches={niches}
          loading={loading}
          error={listingsError}
          selectedId={selectedListingId}
          availableCash={holdingCash}
          actionLabel="Select"
          onSelect={onSelectListing}
        />
      </div>

      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        <Button onClick={createCompany} disabled={!canSubmit} loading={busy}>
          Purchase company
        </Button>
      </div>
    </Card>
  );
}

