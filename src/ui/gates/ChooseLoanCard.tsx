// src/ui/gates/ChooseLoanCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";
import CompanyMarketplace from "../components/CompanyMarketplace";

import type { WorldId, HoldingId } from "../../core/domain";
import { financeRepo } from "../../core/persistence/financeRepo";
import { companyService } from "../../core/services/companyService";

import { useStartupListings } from "../hooks/useStartupListings";
import type { StartupListing } from "../hooks/useStartupListings";
import { formatMoney } from "../../utils/money";
import { formatPercent } from "../../utils/format";

// Loan presets remain a simple onboarding choice.

type Props = {
  worldId: string;
  holding: unknown | null;
  onDone: () => void | Promise<void>;
};

type LoanPreset = {
  id: string;
  label: string;
  description: string;
  principal: number; // 0 => no loan
  interestRate: number;
  termWeeks: number;
  lenderName: string;
};

function readId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

const LOAN_PRESETS: LoanPreset[] = [
  {
    id: "no-loan",
    label: "No loan (bootstrap)",
    description: "Start lean. No debt, slower growth.",
    principal: 0,
    interestRate: 0,
    termWeeks: 0,
    lenderName: "Starter Bank",
  },
  {
    id: "starter",
    label: "Starter loan",
    description: "Balanced start. Moderate debt, manageable interest.",
    principal: 20_000,
    interestRate: 0.08,
    termWeeks: 52,
    lenderName: "Starter Bank",
  },
  {
    id: "aggressive",
    label: "Growth loan",
    description: "Fast expansion. Higher debt and interest.",
    principal: 75_000,
    interestRate: 0.12,
    termWeeks: 78,
    lenderName: "Venture Credit",
  },
];

export default function ChooseLoanCard({ worldId, holding, onDone }: Props) {
  const holdingIdStr = readId(holding);
  const holdingCash = Number((holding as any)?.cashBalance ?? 0);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [companyName, setCompanyName] = React.useState("");
  const [region, setRegion] = React.useState("EU-WEST");

  const [loanPresetId, setLoanPresetId] = React.useState<string>(LOAN_PRESETS[0].id);
  const preset = React.useMemo(
    () => LOAN_PRESETS.find((p) => p.id === loanPresetId) ?? LOAN_PRESETS[0],
    [loanPresetId]
  );

  const { listings, sectors, niches, loading: listingsLoading, error: listingsError } = useStartupListings();
  const [selectedListingId, setSelectedListingId] = React.useState<string | null>(null);

  const selectedListing = React.useMemo(
    () => listings.find((listing) => listing.id === selectedListingId) ?? null,
    [listings, selectedListingId]
  );

  const availableCash = holdingCash + Number(preset.principal ?? 0);
  const canAffordSetup = !!selectedListing && availableCash >= selectedListing.pricing.startupCost;

  const onSelectListing = (listing: StartupListing) => {
    setSelectedListingId(listing.id);
    if (!companyName.trim()) {
      setCompanyName(`${listing.niche.name} Co`);
    }
    setError(null);
  };

  async function runSetup() {
    setError(null);
    setSuccess(null);

    if (!holdingIdStr) return setError("Holding is missing.");
    if (!worldId) return setError("World is missing.");

    const trimmed = companyName.trim();
    if (!trimmed) return setError("Enter a company name.");
    if (!selectedListing) return setError("Select a company listing first.");
    if (!canAffordSetup) {
      return setError("Not enough cash for the selected company.");
    }

    setBusy(true);
    try {
      if (preset.principal > 0) {
        await financeRepo.createStarterHoldingLoan({
          worldId: worldId as unknown as WorldId,
          holdingId: holdingIdStr as unknown as HoldingId,
          principal: preset.principal,
          interestRate: preset.interestRate,
          termWeeks: preset.termWeeks,
          lenderName: preset.lenderName,
        });
      }

      await companyService.createCompany({
        holdingId: holdingIdStr as unknown as HoldingId,
        worldId: worldId as unknown as WorldId,
        sectorId: selectedListing.sector.id as any,
        nicheId: selectedListing.niche.id as any,
        name: trimmed,
        region,
        foundedYear: 1,
      });

      setSuccess("Setup complete! Entering the game...");
      await Promise.resolve(onDone());
    } catch (e: any) {
      setError(e?.message ?? "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !listingsLoading &&
    !!holdingIdStr &&
    !!worldId &&
    !!companyName.trim() &&
    !!selectedListing &&
    canAffordSetup;

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-xs text-[var(--text-muted)]">Step 3 of 3</div>
      <div className="text-lg font-semibold text-[var(--text)]">Purchase your first company</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        Pick a starter loan and a company listing to enter the game.
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Starter loan</label>
          <select
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={loanPresetId}
            onChange={(e) => setLoanPresetId(e.target.value)}
            disabled={busy}
          >
            {LOAN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <div className="mt-2 text-xs text-[var(--text-muted)]">{preset.description}</div>

          {preset.principal > 0 ? (
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Principal: {preset.principal.toLocaleString()} | Interest: {Math.round(preset.interestRate * 1000) / 10}% | Term: {preset.termWeeks} weeks
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Company name</label>
          <input
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Northwind Logistics BV"
            disabled={busy}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Region</label>
          <select
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
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
            Available after loan: {formatMoney(availableCash)}
          </div>
        </div>

        <CompanyMarketplace
          listings={listings}
          sectors={sectors}
          niches={niches}
          loading={listingsLoading}
          error={listingsError}
          selectedId={selectedListingId}
          availableCash={availableCash}
          actionLabel="Select"
          onSelect={onSelectListing}
        />

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="pt-2">
          <Button onClick={() => void runSetup()} disabled={!canSubmit} loading={busy}>
            Start game
          </Button>
        </div>
      </div>
    </Card>
  );
}

