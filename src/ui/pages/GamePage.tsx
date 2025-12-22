// src/ui/pages/GamePage.tsx
import * as React from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";

import { MOTION } from "../../config/motion";
import { Card } from "../components/Card";

import { useWorldState } from "../hooks/useWorldState";

// ✅ check: GamePage is /ui/pages and WorldShell is /ui/layout
import WorldShell from "../layout/WorldShell";

import CreatePlayerCard from "../gates/CreatePlayerCard";
import StarterLoanCard from "../gates/StarterLoanCard";
import ChooseLoanCard from "../gates/ChooseLoanCard";

export const GamePage: React.FC = () => {
  const ws = useWorldState();

  const doRefetch = React.useCallback(async () => {
    try {
      await ws.refetch?.();
    } catch {
      // keep UI stable; error phase will be driven by hooks
    }
  }, [ws.refetch]);

  // Hard redirects (safety)
  if (!ws.isLoading && ws.phase === "needs_auth") return <Navigate to="/auth" replace />;
  if (!ws.isLoading && ws.phase === "needs_world") return <Navigate to="/worlds" replace />;

  // Loading only when actually loading
  if (ws.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card className="rounded-3xl p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Loading…</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">Loading last tick results.</div>
          <div className="mt-4 h-2 w-full rounded-full bg-[var(--card-2)] overflow-hidden">
            <motion.div
              className="h-full w-1/3 bg-[color:var(--accent)]"
              initial={{ x: "-120%" }}
              animate={{ x: "320%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Error gate
  if (ws.phase === "error") {
    const msg =
      ws.error && typeof ws.error === "object" && "message" in ws.error
        ? String((ws.error as { message?: unknown }).message ?? "Unknown error")
        : String(ws.error ?? "Unknown error");

    const canRetry = typeof ws.refetch === "function";

    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <motion.div initial="hidden" animate="show" variants={MOTION.page.variants}>
          <Card className="rounded-3xl p-6 border border-rose-200 bg-rose-50">
            <div className="text-sm font-semibold text-rose-800">Error</div>
            <div className="mt-1 text-sm text-rose-700">{msg}</div>

            <div className="mt-4">
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--card-2)] disabled:opacity-60"
                onClick={() => void doRefetch()}
                disabled={!canRetry}
                type="button"
              >
                Retry
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Gate: Create Player
  if (ws.phase === "needs_player") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <CreatePlayerCard worldId={ws.worldId ?? ""} onDone={doRefetch} />
      </div>
    );
  }

  // Gate: Holding
  if (ws.phase === "needs_holding") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <StarterLoanCard worldId={ws.worldId ?? ""} player={ws.player} onDone={doRefetch} />
      </div>
    );
  }

  // ✅ Gate: Loan + Sector/Niche + First Company
  if (ws.phase === "needs_loan") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <ChooseLoanCard worldId={ws.worldId ?? ""} holding={ws.holding} onDone={doRefetch} />
      </div>
    );
  }

  // Ready: WorldShell renders the nested <Outlet /> internally
  return <WorldShell />;
};

export default GamePage;
