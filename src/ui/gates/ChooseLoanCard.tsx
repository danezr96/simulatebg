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
import { cn, formatPercent } from "../../utils/format";

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
    description: "Balanced start. Access to small businesses and franchised shops.",
    principal: 750_000,
    interestRate: 0.075,
    termWeeks: 156,
    lenderName: "Starter Bank",
  },
  {
    id: "aggressive",
    label: "Growth loan",
    description: "Bigger jump. Fits asset-heavy or regulated niches.",
    principal: 2_500_000,
    interestRate: 0.095,
    termWeeks: 208,
    lenderName: "Venture Credit",
  },
  {
    id: "expansion",
    label: "Expansion loan",
    description: "Go large from day one. High leverage, long-term debt.",
    principal: 6_000_000,
    interestRate: 0.12,
    termWeeks: 260,
    lenderName: "Atlas Capital",
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
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {LOAN_PRESETS.map((p) => {
              const selected = p.id === loanPresetId;
              const principalLabel = p.principal > 0 ? formatMoney(p.principal) : "No debt";
              const interestLabel = p.principal > 0 ? formatPercent(p.interestRate) : "0%";
              const termLabel = p.principal > 0 ? `${p.termWeeks} weeks` : "None";

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLoanPresetId(p.id)}
                  disabled={busy}
                  className={cn(
                    "rounded-3xl border p-4 text-left transition-colors",
                    selected ? "border-[color:var(--accent)] bg-[var(--card-2)]" : "border-[var(--border)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{p.label}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{p.description}</div>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">{p.lenderName}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
                    <div>
                      <div>Principal</div>
                      <div className="text-sm font-semibold text-[var(--text)]">{principalLabel}</div>
                    </div>
                    <div>
                      <div>Interest</div>
                      <div className="text-sm font-semibold text-[var(--text)]">{interestLabel}</div>
                    </div>
                    <div>
                      <div>Term</div>
                      <div className="text-sm font-semibold text-[var(--text)]">{termLabel}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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

