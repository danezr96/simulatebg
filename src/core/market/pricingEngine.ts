function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeFinalPrice(
  basePrice: number,
  qualityScore: number,
  seasonMod: number,
  saturationMod: number
): number {
  const quality = clamp(qualityScore, 0.5, 1.5);
  const season = clamp(seasonMod, 0.5, 1.5);
  const saturation = clamp(saturationMod, 0.3, 1.5);
  const rawPrice = basePrice * quality * season * saturation;
  return Math.max(0, roundToCents(rawPrice));
}

export function testPricingEngine(): boolean {
  const base = computeFinalPrice(100, 1, 1, 1);
  const discounted = computeFinalPrice(100, 1, 0.8, 0.9);
  return base === 100 && discounted < base;
}
