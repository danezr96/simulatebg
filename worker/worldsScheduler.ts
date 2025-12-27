// worker/worldsScheduler.ts
import type { World, WorldEconomyState } from "../src/core/domain";
import { worldRepo } from "../src/core/persistence/worldRepo";
import { runWorldTick } from "./runWorldTick";

export type SchedulerOptions = {
  pollIntervalMs?: number;
};

type WorldTickSnapshot = {
  world: World;
  economy: WorldEconomyState;
};

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logSchedulerError(message: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[worker] ${message}`, formatError(error));
}

function getPollIntervalMs(input?: number): number {
  const fallback = 5_000;
  if (!Number.isFinite(input)) return fallback;
  return Math.max(1_000, Math.floor(input ?? fallback));
}

function getStaleTickMs(intervalSec: number): number {
  const envMs = Number(process.env.WORKER_TICK_STALE_MS);
  if (Number.isFinite(envMs) && envMs > 0) return Math.floor(envMs);
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) return 10 * 60 * 1000;
  return Math.max(intervalSec * 2 * 1000, 5 * 60 * 1000);
}

function isStaleTick(snapshot: WorldTickSnapshot, nowMs: number): boolean {
  if (!snapshot.economy.isTicking) return false;
  const startedAtRaw = snapshot.economy.lastTickStartedAt;
  const startedAtMs = startedAtRaw ? Date.parse(startedAtRaw) : NaN;
  if (!Number.isFinite(startedAtMs)) return true;
  const intervalSec = Number((snapshot.world as any).baseRoundIntervalSeconds ?? 0);
  return nowMs - startedAtMs >= getStaleTickMs(intervalSec);
}

function isWorldDue(snapshot: WorldTickSnapshot, nowMs: number): boolean {
  const intervalSec = Number((snapshot.world as any).baseRoundIntervalSeconds ?? 0);
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) return false;
  if ((snapshot.economy as any).isTicking) return false;

  const lastTickAtRaw = (snapshot.economy as any).lastTickAt as string | undefined;
  const lastTickMs = lastTickAtRaw ? Date.parse(lastTickAtRaw) : NaN;
  if (!Number.isFinite(lastTickMs)) return true;

  return nowMs - lastTickMs >= intervalSec * 1000;
}

async function loadWorldSnapshots(): Promise<WorldTickSnapshot[]> {
  const worlds = await worldRepo.listActive();
  const snapshots: WorldTickSnapshot[] = [];

  for (const world of worlds) {
    const economy = (await worldRepo.getEconomyState(world.id)) ?? (await worldRepo.createEconomyState({ worldId: world.id }));
    snapshots.push({ world, economy });
  }

  return snapshots;
}

async function tickWorldsOnce(): Promise<void> {
  const nowMs = Date.now();
  const snapshots = await loadWorldSnapshots();

  for (const snapshot of snapshots) {
    let economy = snapshot.economy;
    if (isStaleTick(snapshot, nowMs)) {
      console.warn("[worker] stale tick detected, resetting lock", {
        worldId: String(snapshot.world.id),
        lastTickStartedAt: snapshot.economy.lastTickStartedAt ?? null,
      });
      try {
        economy = await worldRepo.updateEconomyState(snapshot.world.id, {
          isTicking: false,
          lastTickStartedAt: null,
        });
      } catch (error) {
        logSchedulerError("stale tick reset failed", error);
        continue;
      }
    }
    const updatedSnapshot = { ...snapshot, economy };
    if (!isWorldDue(updatedSnapshot, nowMs)) continue;
    try {
      const tickStartMs = Date.now();
      console.info("[worker] tick start", {
        worldId: String(updatedSnapshot.world.id),
        year: updatedSnapshot.economy.currentYear,
        week: updatedSnapshot.economy.currentWeek,
      });
      await runWorldTick(updatedSnapshot.world.id);
      console.info("[worker] tick done", {
        worldId: String(updatedSnapshot.world.id),
        durationMs: Date.now() - tickStartMs,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[worker] tick failed", {
        worldId: String(updatedSnapshot.world.id),
        error,
      });
    }
  }
}

export function startWorldsScheduler(options: SchedulerOptions = {}) {
  const pollIntervalMs = getPollIntervalMs(options.pollIntervalMs);
  let running = false;

  const runLoop = async () => {
    if (running) return;
    running = true;
    try {
      await tickWorldsOnce();
    } catch (error) {
      logSchedulerError("tick loop failed", error);
    } finally {
      running = false;
    }
  };

  // Kick once immediately, then poll.
  void runLoop();
  const timer = setInterval(() => {
    void runLoop();
  }, pollIntervalMs);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
