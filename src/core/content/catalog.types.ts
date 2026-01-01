export type CatalogSector = {
  id: string;
  name: string;
};

export type CatalogNiche = {
  id: string;
  sectorId: string;
  name: string;
};

export type CatalogProduct = {
  sku: string;
  nicheId: string;
  name: string;
};

export type CatalogData = {
  sectors: CatalogSector[];
  niches: CatalogNiche[];
  products: CatalogProduct[];
};
