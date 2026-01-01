import type { AssetRequirement, StaffRequirement } from "./cropFarm.products";
import { nicheProducts } from "./cropFarm.products";

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minQualityScore?: number;
};

export type NicheUnlock = {
  productSku: string;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export const nicheUnlocks: NicheUnlock[] = [
  {
    productSku: "agri.crop.wheat",
    startingUnlocked: true,
    requirements: {
      assets: [
        { assetId: "land_ha", minCount: 10 },
        { assetId: "tractor", minCount: 1 },
        { assetId: "harvester", minCount: 1 },
      ],
      staff: [
        { roleId: "field_worker", minFTE: 2 },
        { roleId: "machine_operator", minFTE: 1 },
      ],
    },
  },
  {
    productSku: "agri.crop.potato",
    startingUnlocked: true,
    requirements: {
      assets: [
        { assetId: "land_ha", minCount: 8 },
        { assetId: "cold_storage_tons", minCount: 10 },
      ],
      staff: [{ roleId: "field_worker", minFTE: 2 }],
    },
  },
  {
    productSku: "agri.crop.corn",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "land_ha", minCount: 12 },
        { assetId: "irrigation_system", minCount: 1 },
      ],
      staff: [{ roleId: "field_worker", minFTE: 3 }],
      upgrades: ["drip_irrigation"],
      minQualityScore: 0.75,
    },
  },
  {
    productSku: "agri.crop.soy",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "land_ha", minCount: 10 }],
      staff: [{ roleId: "agronomist", minFTE: 0.5 }],
      upgrades: ["soil_rotation_program"],
    },
  },
  {
    productSku: "agri.crop.tomato",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "greenhouse_m2", minCount: 500 },
        { assetId: "irrigation_system", minCount: 1 },
      ],
      staff: [{ roleId: "horticulturist", minFTE: 1 }],
      upgrades: ["greenhouse_expansion"],
      minQualityScore: 0.8,
    },
  },
  {
    productSku: "agri.crop.apple",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "orchard_ha", minCount: 15 },
        { assetId: "cold_storage_tons", minCount: 15 },
      ],
      staff: [{ roleId: "horticulturist", minFTE: 0.5 }],
      upgrades: ["orchard_establishment"],
      minQualityScore: 0.8,
    },
  },
];

export function testCropFarmUnlocks(): boolean {
  const productSkus = new Set(nicheProducts.map((product) => product.sku));
  const unlockSkus = new Set(nicheUnlocks.map((unlock) => unlock.productSku));
  return nicheUnlocks.length === 6 && productSkus.size === unlockSkus.size;
}
