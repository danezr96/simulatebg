const WEEKS_PER_YEAR = 52;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampWeek(weekOfYear: number): number {
  if (!Number.isFinite(weekOfYear)) {
    return 1;
  }
  const week = Math.floor(weekOfYear);
  const normalized = ((week - 1) % WEEKS_PER_YEAR + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
  return normalized + 1;
}

function hashSku(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getSeasonModifier(productSku: string, weekOfYear: number): number {
  const week = clampWeek(weekOfYear);
  const hash = hashSku(productSku);
  const amplitude = 0.05 + (hash % 16) / 100;
  const phase = ((hash % WEEKS_PER_YEAR) / WEEKS_PER_YEAR) * 2 * Math.PI;
  const angle = ((week - 1) / WEEKS_PER_YEAR) * 2 * Math.PI + phase;
  const modifier = 1 + amplitude * Math.sin(angle);
  return clamp(modifier, 0.7, 1.3);
}

export function testSeasonEngine(): boolean {
  const first = getSeasonModifier("TEST_SKU", 1);
  const repeat = getSeasonModifier("TEST_SKU", 1);
  const mid = getSeasonModifier("TEST_SKU", 26);
  return first === repeat && mid >= 0.7 && mid <= 1.3;
}
