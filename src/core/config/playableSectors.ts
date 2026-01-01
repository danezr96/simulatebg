import { ENABLED_SECTORS } from "../content/catalog.enabled";

export const PLAYABLE_SECTOR_CODES = ENABLED_SECTORS;

const PLAYABLE_SECTOR_CODE_SET = new Set<string>(PLAYABLE_SECTOR_CODES);

export type PlayableSectorCode = (typeof PLAYABLE_SECTOR_CODES)[number];

export function isSectorPlayable(code?: string | null): code is PlayableSectorCode {
  return !!code && PLAYABLE_SECTOR_CODE_SET.has(code);
}
