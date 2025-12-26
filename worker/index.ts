// worker/index.ts
import { startWorldsScheduler } from "./worldsScheduler";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const missingEnv: string[] = [];
if (!supabaseUrl) missingEnv.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
if (!supabaseServiceRoleKey)
  missingEnv.push("SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)");

if (missingEnv.length > 0) {
  // eslint-disable-next-line no-console
  console.error("[worker] Missing required env vars:", missingEnv.join(", "));
  process.exit(1);
}

const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5_000);

const scheduler = startWorldsScheduler({ pollIntervalMs });

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

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[worker] Unhandled rejection", formatError(reason));
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("[worker] Uncaught exception", formatError(error));
  process.exit(1);
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[worker] shutting down (${signal})`);
  scheduler.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
