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

function getPollIntervalMs(input?: number): number {
  const fallback = 5_000;
  if (!Number.isFinite(input)) return fallback;
  return Math.max(1_000, Math.floor(input ?? fallback));
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
    if (!isWorldDue(snapshot, nowMs)) continue;
    try {
      await runWorldTick(snapshot.world.id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[worker] tick failed", {
        worldId: String(snapshot.world.id),
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
