// src/ui/gates/CreateFirstCompanyCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";

import type { WorldId, HoldingId } from "../../core/domain";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { companyRepo } from "../../core/persistence/companyRepo";

type Props = {
  worldId: string;
  holding: unknown | null;
  onDone: () => Promise<void> | void;
  // optional: allow ChooseLoanCard to prefill
  initialName?: string;
  initialRegion?: string;
};

type Sector = { id: string; name: string };
type Niche = { id: string; sectorId: string; name: string };

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

  const [busy, setBusy] = React.useState(false);
  const [listsLoading, setListsLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [sectors, setSectors] = React.useState<Sector[]>([]);
  const [niches, setNiches] = React.useState<Niche[]>([]);

  const [name, setName] = React.useState(initialName ?? "");
  const [region, setRegion] = React.useState(initialRegion ?? "EU-WEST");
  const [sectorId, setSectorId] = React.useState("");
  const [nicheId, setNicheId] = React.useState("");

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

        // pick first sector
        if (mappedS.length > 0) {
          const firstSectorId = mappedS[0].id;
          setSectorId(firstSectorId);

          // pick first niche for that sector (if any)
          const firstNiche = mappedN.find((nn) => nn.sectorId === firstSectorId);
          setNicheId(firstNiche ? firstNiche.id : "");
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

  // when sector changes, ensure niche is valid
  React.useEffect(() => {
    if (!sectorId) {
      if (nicheId) setNicheId("");
      return;
    }
    if (availableNiches.length === 0) {
      if (nicheId) setNicheId("");
      return;
    }
    if (!availableNiches.some((n) => n.id === nicheId)) {
      setNicheId(availableNiches[0].id);
    }
  }, [sectorId, availableNiches, nicheId]);

  async function createCompany() {
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!holdingIdStr) return setError("Holding is missing.");
    if (!trimmed) return setError("Enter a company name.");
    if (!sectorId) return setError("Pick a sector.");
    if (!nicheId) return setError("Pick a niche.");

    setBusy(true);
    try {
      await companyRepo.create({
        holdingId: holdingIdStr as unknown as HoldingId,
        worldId: worldId as unknown as WorldId,
        sectorId,
        nicheId,
        name: trimmed,
        region,
        foundedYear: 1, // game-year; can be replaced later (economy.currentYear)
      });

      setSuccess("Company created! Continuing…");
      await Promise.resolve(onDone());
    } catch (e: any) {
      setError(e?.message ?? "Create company failed");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !listsLoading &&
    !!holdingIdStr &&
    name.trim().length > 0 &&
    !!sectorId &&
    !!nicheId;

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-lg font-semibold text-[var(--text)]">Buy your first company</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        Choose a sector and niche. This determines your market segment.
      </div>

      <div className="mt-5 grid gap-4">
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

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Sector</label>
          <select
            className="mt-2 w-full rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={sectorId}
            onChange={(ev) => setSectorId(ev.target.value)}
            disabled={busy || listsLoading || sectors.length === 0}
          >
            {listsLoading ? (
              <option value="">Loading sectors…</option>
            ) : sectors.length === 0 ? (
              <option value="">No sectors</option>
            ) : null}

            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-muted)]">Niche</label>
          <select
            className="mt-2 w-full rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
            value={nicheId}
            onChange={(ev) => setNicheId(ev.target.value)}
            disabled={busy || listsLoading || availableNiches.length === 0}
          >
            {listsLoading ? (
              <option value="">Loading niches…</option>
            ) : availableNiches.length === 0 ? (
              <option value="">No niches for this sector</option>
            ) : null}

            {availableNiches.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
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
          Create company
        </Button>
      </div>
    </Card>
  );
}
