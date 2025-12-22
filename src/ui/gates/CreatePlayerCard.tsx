// src/ui/gates/CreatePlayerCard.tsx
import * as React from "react";
import { Card } from "../components/Card";
import Button from "../components/Button";

import { supabase } from "../../core/persistence/supabaseClient";
import { playerRepo } from "../../core/persistence/playerRepo";

type Props = {
  worldId: string;
  onDone: () => void;
};

export default function CreatePlayerCard({ onDone }: Props) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function create() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a player name.");
      return;
    }

    setBusy(true);
    try {
      const { data, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const userId = data.user?.id;
      if (!userId) throw new Error("No authenticated user.");

      await playerRepo.create({ userId, name: trimmed, baseCurrency: "EUR" });
      onDone();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message ?? "Create player failed")
          : "Create player failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl p-6">
      <div className="text-xs text-[var(--text-muted)]">Step 1 of 3</div>
      <div className="text-lg font-semibold text-[var(--text)]">Create your player</div>
      <div className="mt-1 text-sm text-[var(--text-muted)]">This is your identity across worlds.</div>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-[var(--text-muted)]">Player name</label>
        <input
          className="mt-2 w-full rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm outline-none"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="e.g., Daniel"
        />
      </div>

      {error ? <div className="mt-4 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-6 flex gap-2">
        <Button onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Create Player"}
        </Button>
      </div>
    </Card>
  );
}
