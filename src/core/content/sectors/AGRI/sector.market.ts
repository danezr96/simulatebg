export type SectorMarketModifiers = {
  baseDemandMultiplier: number;
  priceVolatility: number;
  seasonalIntensity: number;
  qualityPremium: number;
  saturationImpact: number;
};

export type SectorMarketConfig = {
  sectorId: string;
  modifiers: SectorMarketModifiers;
};

export const sectorMarket: SectorMarketConfig = {
  sectorId: "AGRI",
  modifiers: {
    baseDemandMultiplier: 1.05,
    priceVolatility: 0.9,
    seasonalIntensity: 1.25,
    qualityPremium: 1.1,
    saturationImpact: 1.15,
  },
};

export function testSectorMarket(): boolean {
  return (
    sectorMarket.sectorId === "AGRI" &&
    sectorMarket.modifiers.seasonalIntensity > 1
  );
}
