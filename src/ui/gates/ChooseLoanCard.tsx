// src/ui/gates/ChooseLoanCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";

import type { WorldId, HoldingId } from "../../core/domain";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { financeRepo } from "../../core/persistence/financeRepo";
import { companyService } from "../../core/services/companyService";
import { economyConfig } from "../../config/economy";
import { formatMoney } from "../../utils/money";

type Props = {
  worldId: string;
  holding: unknown | null;
  onDone: () => void | Promise<void>;
};

type Sector = { id: string; name: string };
type Niche = { id: string; sectorId: string; name: string };

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
    lenderName: "—",
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

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [sectors, setSectors] = React.useState<Sector[]>([]);
  const [niches, setNiches] = React.useState<Niche[]>([]);
  const [listsLoading, setListsLoading] = React.useState(false);

  // company fields
  const [companyName, setCompanyName] = React.useState("");
  const [region, setRegion] = React.useState("EU-WEST");
  const [sectorId, setSectorId] = React.useState("");
  const [nicheId, setNicheId] = React.useState("");

  // loan choice
  const [loanPresetId, setLoanPresetId] = React.useState<string>(LOAN_PRESETS[0].id);

  const preset = React.useMemo(
    () => LOAN_PRESETS.find((p) => p.id === loanPresetId) ?? LOAN_PRESETS[0],
    [loanPresetId]
  );

  const holdingCash = Number((holding as any)?.cashBalance ?? 0);
  const creationCost = Number(economyConfig.company.creationCost ?? 0);
  const projectedCash = holdingCash + Number(preset.principal ?? 0);
  const canAffordSetup = projectedCash >= creationCost;

  // load sectors + niches
  React.useEffect(() => {
    let alive = true;

    (async () => {
      setListsLoading(true);
      setError(null);

      try {
        const s = await sectorRepo.listSectors();
        const n = await sectorRepo.listAllNiches();
        if (!alive) return;

        const mappedS: Sector[] = (s ?? []).map((x: any) => ({
          id: String(x.id),
          name: String(x.name ?? x.label ?? x.code ?? x.id),
        }));

        const mappedN: Niche[] = (n ?? []).map((x: any) => ({
          id: String(x.id),
          sectorId: String(x.sectorId ?? x.sector_id ?? ""),
          name: String(x.name ?? x.label ?? x.code ?? x.id),
        }));

        setSectors(mappedS);
        setNiches(mappedN);

        // sensible defaults
        if (mappedS.length > 0) {
          const firstSectorId = mappedS[0].id;
          setSectorId((prev) => prev || firstSectorId);

          const firstNicheId =
            mappedN.find((nn) => nn.sectorId === firstSectorId)?.id ?? "";
          setNicheId((prev) => prev || firstNicheId);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load sectors/niches");
      } finally {
        if (!alive) return;
        setListsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const availableNiches = React.useMemo(() => {
    if (!sectorId) return [];
    return niches.filter((n) => n.sectorId === sectorId);
  }, [niches, sectorId]);

  // keep niche valid when sector changes
  React.useEffect(() => {
    if (!sectorId) {
      if (nicheId) setNicheId("");
      return;
    }
    if (availableNiches.length === 0) {
      if (nicheId) setNicheId("");
      return;
    }
    if (nicheId && !availableNiches.some((n) => n.id === nicheId)) {
      setNicheId(availableNiches[0].id);
    }
    if (!nicheId) {
      setNicheId(availableNiches[0].id);
    }
  }, [sectorId, availableNiches, nicheId]);

  async function runSetup() {
    setError(null);
    setSuccess(null);

    if (!holdingIdStr) return setError("Holding is missing.");
    if (!worldId) return setError("World is missing.");

    const trimmed = companyName.trim();
    if (!trimmed) return setError("Enter a company name.");
    if (!sectorId) return setError("Pick a sector.");
    if (!nicheId) return setError("Pick a niche.");
    if (!canAffordSetup) {
      return setError(`Not enough cash to cover the startup cost (${formatMoney(creationCost)}).`);
    }

    setBusy(true);
    try {
      // 1) Create holding-level starter loan (optional)
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

      // 2) Create first company
      await companyService.createCompany({
        holdingId: holdingIdStr as unknown as HoldingId,
        worldId: worldId as unknown as WorldId,
        sectorId: sectorId as any,
        nicheId: nicheId as any,
        name: trimmed,
        region,
        foundedYear: 1, // keep consistent with your game-year model
      });

      setSuccess("Setup complete! Entering the game…");
      await Promise.resolve(onDone());
    } catch (e: any) {
      setError(e?.message ?? "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !listsLoading &&
    !!holdingIdStr &&
    !!worldId &&
    !!companyName.trim() &&
    !!sectorId &&
    !!nicheId &&
    canAffordSetup;

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-xs text-[var(--text-muted)]">Step 3 of 3</div>
      <div className="text-lg font-semibold text-[var(--text)]">Choose your start</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        Pick a starter loan and your first market (sector + niche).
      </div>

      <div className="mt-6 grid gap-4">
        {/* Loan */}
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
              Principal: {preset.principal.toLocaleString()} • Interest:{" "}
              {Math.round(preset.interestRate * 1000) / 10}% • Term: {preset.termWeeks} weeks
            </div>
          ) : null}

          {creationCost > 0 ? (
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Startup cost: {formatMoney(creationCost)} | Available after loan: {formatMoney(projectedCash)}
            </div>
          ) : null}
        </div>

        {/* Company name */}
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

        {/* Region */}
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

        {/* Sector */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Sector</label>
          <select
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            disabled={busy || listsLoading || sectors.length === 0}
          >
            {listsLoading ? <option value="">Loading…</option> : null}
            {!listsLoading && sectors.length === 0 ? <option value="">No sectors</option> : null}
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Niche */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Niche</label>
          <select
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={nicheId}
            onChange={(e) => setNicheId(e.target.value)}
            disabled={busy || listsLoading || availableNiches.length === 0}
          >
            {listsLoading ? <option value="">Loading…</option> : null}
            {!listsLoading && availableNiches.length === 0 ? (
              <option value="">No niches for this sector</option>
            ) : null}
            {availableNiches.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>

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
