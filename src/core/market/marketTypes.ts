export type PricePoint = {
  sku: string;
  basePrice: number;
  qualityScore: number;
  seasonMod: number;
  saturationMod: number;
  saturation: number;
  finalPrice: number;
};

export type ProductMarket = {
  sku: string;
  basePrice: number;
  lastPrice: number;
  qualityScore: number;
  demand: number;
  supply: number;
  impactFactor: number;
};

export type MarketState = {
  weekOfYear: number;
  products: Record<string, ProductMarket>;
  prices: Record<string, PricePoint>;
};

export function createSampleMarketState(): MarketState {
  return {
    weekOfYear: 1,
    products: {
      TEST_SKU: {
        sku: "TEST_SKU",
        basePrice: 100,
        lastPrice: 100,
        qualityScore: 1,
        demand: 100,
        supply: 100,
        impactFactor: 0.2,
      },
    },
    prices: {},
  };
}

export function testMarketTypes(): boolean {
  const state = createSampleMarketState();
  const product = state.products.TEST_SKU;
  return state.weekOfYear === 1 && product.basePrice === 100 && product.impactFactor === 0.2;
}
