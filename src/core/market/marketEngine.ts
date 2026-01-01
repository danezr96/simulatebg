import type { MarketState, PricePoint, ProductMarket } from "./marketTypes";
import { createSampleMarketState } from "./marketTypes";
import { computeFinalPrice } from "./pricingEngine";
import { getSeasonModifier } from "./seasonEngine";

export type MarketTickInputs = {
  state: MarketState;
};

export type MarketTickResult = {
  state: MarketState;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWeek(weekOfYear: number): number {
  if (!Number.isFinite(weekOfYear)) {
    return 1;
  }
  const week = Math.floor(weekOfYear);
  const normalized = ((week - 1) % 52 + 52) % 52;
  return normalized + 1;
}

export function runMarketTick(inputs: MarketTickInputs): MarketTickResult {
  const weekOfYear = normalizeWeek(inputs.state.weekOfYear);
  const nextProducts: Record<string, ProductMarket> = {};
  const nextPrices: Record<string, PricePoint> = {};

  for (const [sku, product] of Object.entries(inputs.state.products)) {
    const demand = Math.max(0, product.demand);
    const supply = Math.max(0, product.supply);
    const saturation = demand > 0 ? supply / demand : 1;
    const saturationMod =
      1 - clamp((saturation - 1) * product.impactFactor, 0, 0.7);
    const seasonMod = getSeasonModifier(product.sku, weekOfYear);
    const qualityScore =
      typeof product.qualityScore === "number" ? product.qualityScore : 1;
    const finalPrice = computeFinalPrice(
      product.basePrice,
      qualityScore,
      seasonMod,
      saturationMod
    );

    nextProducts[sku] = {
      ...product,
      lastPrice: finalPrice,
    };

    nextPrices[sku] = {
      sku,
      basePrice: product.basePrice,
      qualityScore,
      seasonMod,
      saturationMod,
      saturation,
      finalPrice,
    };
  }

  return {
    state: {
      ...inputs.state,
      weekOfYear,
      products: nextProducts,
      prices: nextPrices,
    },
  };
}

export function testMarketEngine(): boolean {
  const sample = createSampleMarketState();
  const result = runMarketTick({ state: sample }).state;
  const price = result.prices.TEST_SKU;
  return (
    typeof price.finalPrice === "number" &&
    price.finalPrice > 0 &&
    result.products.TEST_SKU.lastPrice === price.finalPrice
  );
}
