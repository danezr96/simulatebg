// src/ui/gates/StarterLoanCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";

import type { WorldId, PlayerId } from "../../core/domain";
import { holdingRepo } from "../../core/persistence/holdingRepo";

type Props = {
  worldId: string;
  player: unknown | null;
  onDone: () => Promise<void>;
};

function readId(obj: unknown): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const id = (obj as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function readErrMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    return typeof msg === "string" ? msg : "Create holding failed";
  }
  return "Create holding failed";
}

export default function StarterLoanCard({ worldId, player, onDone }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [holdingName, setHoldingName] = React.useState("");

  const playerIdStr = readId(player);
  const canSubmit = !!playerIdStr && holdingName.trim().length > 0 && !busy;

  async function createHolding() {
    setError(null);
    setSuccess(null);

    if (!playerIdStr) {
      setError("Player is missing.");
      return;
    }

    const name = holdingName.trim();
    if (!name) {
      setError("Please enter a holding name.");
      return;
    }

    setBusy(true);
    try {
      await holdingRepo.create({
        worldId: worldId as unknown as WorldId,
        playerId: playerIdStr as unknown as PlayerId,
        name,
        baseCurrency: "EUR",
      });

      setSuccess("Holding created! Refreshing…");

      // ✅ hard & reliable: wait until the state is actually refreshed
      await onDone();
    } catch (e) {
      setError(readErrMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-xs text-[var(--text-muted)]">Step 2 of 3</div>
      <div className="text-lg font-semibold text-[var(--text)]">Starter setup</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">
        Create your holding. (Loan + sector + niche selection comes next.)
      </div>

      <div className="mt-5">
        <label className="text-xs font-medium text-[var(--text-muted)]">Holding name</label>
        <input
          className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm outline-none"
          placeholder="e.g., Benda Capital BV"
          value={holdingName}
          onChange={(e) => setHoldingName(e.target.value)}
          disabled={busy}
          autoFocus
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
        <Button onClick={createHolding} disabled={!canSubmit} loading={busy}>
          Create Holding
        </Button>
      </div>
    </Card>
  );
}
