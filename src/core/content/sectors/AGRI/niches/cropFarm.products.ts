export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type StaffRequirement = {
  roleId: string;
  minFTE: number;
};

export type ProductFormulaSet = {
  yieldPerWeek: string;
  wasteRate: string;
  qualityScore: string;
};

export type NicheProduct = {
  sku: string;
  name: string;
  unit: string;
  priceRange: { min: number; max: number };
  cogsPercent: number;
  capacityDrivers: string[];
  requiredAssets: AssetRequirement[];
  requiredStaff: StaffRequirement[];
  formulas: ProductFormulaSet;
};

export const nicheProducts: NicheProduct[] = [
  {
    sku: "agri.crop.wheat",
    name: "Wheat",
    unit: "ton",
    priceRange: { min: 180, max: 320 },
    cogsPercent: 0.38,
    capacityDrivers: ["land_ha", "machinery_units", "storage_tons"],
    requiredAssets: [
      { assetId: "land_ha", minCount: 10 },
      { assetId: "tractor", minCount: 1 },
      { assetId: "harvester", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "field_worker", minFTE: 2 },
      { roleId: "machine_operator", minFTE: 1 },
    ],
    formulas: {
      yieldPerWeek:
        "baseYield * landHa * (1 + soilQuality * 0.12) * (1 + machineryLevel * 0.05)",
      wasteRate: "clamp(0.05 + (1 - storageQuality) * 0.08, 0.03, 0.18)",
      qualityScore: "clamp(0.7 + soilQuality * 0.15 + staffSkill * 0.05, 0.6, 1.1)",
    },
  },
  {
    sku: "agri.crop.corn",
    name: "Corn",
    unit: "ton",
    priceRange: { min: 160, max: 300 },
    cogsPercent: 0.36,
    capacityDrivers: ["land_ha", "machinery_units", "irrigation_level"],
    requiredAssets: [
      { assetId: "land_ha", minCount: 12 },
      { assetId: "tractor", minCount: 1 },
      { assetId: "irrigation_system", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "field_worker", minFTE: 3 },
      { roleId: "machine_operator", minFTE: 1 },
    ],
    formulas: {
      yieldPerWeek:
        "baseYield * landHa * (1 + irrigationLevel * 0.1) * (1 + weatherIndex * 0.05)",
      wasteRate: "clamp(0.04 + (1 - storageQuality) * 0.06, 0.02, 0.15)",
      qualityScore: "clamp(0.68 + soilQuality * 0.12 + staffSkill * 0.06, 0.6, 1.1)",
    },
  },
  {
    sku: "agri.crop.potato",
    name: "Potato",
    unit: "ton",
    priceRange: { min: 220, max: 380 },
    cogsPercent: 0.42,
    capacityDrivers: ["land_ha", "machinery_units", "storage_tons"],
    requiredAssets: [
      { assetId: "land_ha", minCount: 8 },
      { assetId: "tractor", minCount: 1 },
      { assetId: "cold_storage_tons", minCount: 20 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "field_worker", minFTE: 3 },
    ],
    formulas: {
      yieldPerWeek: "baseYield * landHa * (1 + soilQuality * 0.1)",
      wasteRate: "clamp(0.06 + (1 - storageQuality) * 0.1, 0.04, 0.22)",
      qualityScore: "clamp(0.65 + soilQuality * 0.18 + staffSkill * 0.04, 0.6, 1.05)",
    },
  },
  {
    sku: "agri.crop.soy",
    name: "Soy",
    unit: "ton",
    priceRange: { min: 250, max: 420 },
    cogsPercent: 0.35,
    capacityDrivers: ["land_ha", "machinery_units"],
    requiredAssets: [
      { assetId: "land_ha", minCount: 10 },
      { assetId: "tractor", minCount: 1 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "agronomist", minFTE: 0.5 },
    ],
    formulas: {
      yieldPerWeek:
        "baseYield * landHa * (1 + cropRotationIndex * 0.12) * (1 + weatherIndex * 0.04)",
      wasteRate: "clamp(0.04 + (1 - storageQuality) * 0.05, 0.02, 0.12)",
      qualityScore: "clamp(0.7 + soilQuality * 0.14 + staffSkill * 0.06, 0.6, 1.1)",
    },
  },
  {
    sku: "agri.crop.tomato",
    name: "Tomato",
    unit: "kg",
    priceRange: { min: 1.2, max: 2.8 },
    cogsPercent: 0.48,
    capacityDrivers: ["greenhouse_m2", "irrigation_level", "energy_kwh"],
    requiredAssets: [
      { assetId: "greenhouse_m2", minCount: 500 },
      { assetId: "irrigation_system", minCount: 1 },
      { assetId: "cold_storage_tons", minCount: 10 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "horticulturist", minFTE: 1 },
      { roleId: "field_worker", minFTE: 2 },
    ],
    formulas: {
      yieldPerWeek:
        "baseYield * greenhouseM2 * (1 + climateControlLevel * 0.08) * (1 + staffSkill * 0.05)",
      wasteRate: "clamp(0.08 + (1 - handlingQuality) * 0.12, 0.05, 0.25)",
      qualityScore: "clamp(0.7 + climateControlLevel * 0.1 + staffSkill * 0.08, 0.6, 1.2)",
    },
  },
  {
    sku: "agri.crop.apple",
    name: "Apple",
    unit: "kg",
    priceRange: { min: 0.8, max: 2.2 },
    cogsPercent: 0.4,
    capacityDrivers: ["orchard_ha", "storage_tons"],
    requiredAssets: [
      { assetId: "orchard_ha", minCount: 15 },
      { assetId: "tractor", minCount: 1 },
      { assetId: "cold_storage_tons", minCount: 15 },
    ],
    requiredStaff: [
      { roleId: "farm_manager", minFTE: 0.5 },
      { roleId: "field_worker", minFTE: 3 },
      { roleId: "horticulturist", minFTE: 0.5 },
    ],
    formulas: {
      yieldPerWeek:
        "baseYield * orchardHa * (1 + treeAgeIndex * 0.08) * (1 + weatherIndex * 0.05)",
      wasteRate: "clamp(0.05 + (1 - storageQuality) * 0.07, 0.03, 0.18)",
      qualityScore: "clamp(0.72 + orchardHealth * 0.12 + staffSkill * 0.04, 0.6, 1.1)",
    },
  },
];

export function testCropFarmProducts(): boolean {
  return (
    nicheProducts.length === 6 &&
    nicheProducts.every((product) => product.sku.length > 0)
  );
}
