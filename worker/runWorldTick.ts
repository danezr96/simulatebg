// worker/runWorldTick.ts
import type { WorldId } from "../src/core/domain";
import { runWorldTick as coreRunWorldTick } from "../src/core/engine/runWorldTick";

export async function runWorldTick(worldId: WorldId): Promise<void> {
  await coreRunWorldTick(worldId);
}
