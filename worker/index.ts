// worker/index.ts
import { startWorldsScheduler } from "./worldsScheduler";

const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5_000);

const scheduler = startWorldsScheduler({ pollIntervalMs });

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[worker] shutting down (${signal})`);
  scheduler.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
