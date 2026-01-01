import type { CatalogData } from "./catalog.types";
import { isSectorIdEnabled } from "./catalog.enabled";

export function loadCatalog(data?: CatalogData): CatalogData {
  const fallback: CatalogData = { sectors: [], niches: [], products: [] };
  const source = data ?? fallback;
  const enabledSectors = source.sectors.filter((sector) => isSectorIdEnabled(sector.id));
  const enabledSectorIds = new Set(enabledSectors.map((sector) => String(sector.id)));
  const enabledNiches = source.niches.filter((niche) =>
    enabledSectorIds.has(String(niche.sectorId))
  );
  const enabledNicheIds = new Set(enabledNiches.map((niche) => String(niche.id)));
  const enabledProducts = source.products.filter((product) =>
    enabledNicheIds.has(String(product.nicheId))
  );

  return {
    sectors: enabledSectors,
    niches: enabledNiches,
    products: enabledProducts,
  };
}
