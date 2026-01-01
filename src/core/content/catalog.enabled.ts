export const ENABLED_SECTORS = ["AGRI", "AUTO"] as const;

export type EnabledSectorCode = (typeof ENABLED_SECTORS)[number];

const ENABLED_SECTOR_SET = new Set<string>(ENABLED_SECTORS);

export function isSectorEnabled(code?: string | null): code is EnabledSectorCode {
  return !!code && ENABLED_SECTOR_SET.has(code);
}

export function isSectorIdEnabled(id?: string | null): boolean {
  return isSectorEnabled(id ?? undefined);
}
