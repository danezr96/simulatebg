import type { CatalogData } from "./catalog.types";
import { isSectorEnabled } from "./catalog.enabled";
import { DairyNicheConfig } from "./sectors/AGRI/niches/dairy.niche";
import { dairyProducts, getBaselineMargin } from "./sectors/AGRI/niches/dairy.products";
import { dairyUnlocks } from "./sectors/AGRI/niches/dairy.unlocks";
import { dairyUpgrades } from "./sectors/AGRI/niches/dairy.upgrades";
import { FoodProcessingNicheConfig } from "./sectors/AGRI/niches/foodProcessing.niche";
import {
  foodProcessingProducts,
  getBaselineMargin as getFoodProcessingMargin,
} from "./sectors/AGRI/niches/foodProcessing.products";
import { foodProcessingUnlocks } from "./sectors/AGRI/niches/foodProcessing.unlocks";
import { foodProcessingUpgrades } from "./sectors/AGRI/niches/foodProcessing.upgrades";
import { GreenhouseNicheConfig } from "./sectors/AGRI/niches/greenhouse.niche";
import {
  getBaselineMargin as getGreenhouseMargin,
  greenhouseProducts,
} from "./sectors/AGRI/niches/greenhouse.products";
import { greenhouseUnlocks } from "./sectors/AGRI/niches/greenhouse.unlocks";
import { greenhouseUpgrades } from "./sectors/AGRI/niches/greenhouse.upgrades";
import { LivestockNicheConfig } from "./sectors/AGRI/niches/livestock.niche";
import {
  getBaselineMargin as getLivestockMargin,
  livestockProducts,
} from "./sectors/AGRI/niches/livestock.products";
import { livestockUnlocks } from "./sectors/AGRI/niches/livestock.unlocks";
import { livestockUpgrades } from "./sectors/AGRI/niches/livestock.upgrades";
import { OrganicFarmingNicheConfig } from "./sectors/AGRI/niches/organicFarming.niche";
import {
  getBaselineMargin as getOrganicMargin,
  organicFarmingProducts,
} from "./sectors/AGRI/niches/organicFarming.products";
import { organicFarmingUnlocks } from "./sectors/AGRI/niches/organicFarming.unlocks";
import { organicFarmingUpgrades } from "./sectors/AGRI/niches/organicFarming.upgrades";
import { CarDealerNicheConfig } from "./sectors/AUTO/niches/carDealer.niche";
import { carDealerProducts } from "./sectors/AUTO/niches/carDealer.products";
import { carDealerUnlocks } from "./sectors/AUTO/niches/carDealer.unlocks";
import { carDealerUpgrades } from "./sectors/AUTO/niches/carDealer.upgrades";
import { EvServicesNicheConfig } from "./sectors/AUTO/niches/evServices.niche";
import { evServicesProducts } from "./sectors/AUTO/niches/evServices.products";
import { evServicesUnlocks } from "./sectors/AUTO/niches/evServices.unlocks";
import { evServicesUpgrades } from "./sectors/AUTO/niches/evServices.upgrades";
import { RepairShopNicheConfig } from "./sectors/AUTO/niches/repairShop.niche";
import { repairShopProducts } from "./sectors/AUTO/niches/repairShop.products";
import { repairShopUnlocks } from "./sectors/AUTO/niches/repairShop.unlocks";
import { repairShopUpgrades } from "./sectors/AUTO/niches/repairShop.upgrades";
import { MobilityNicheConfig } from "./sectors/AUTO/niches/mobility.niche";
import { mobilityProducts } from "./sectors/AUTO/niches/mobility.products";
import { mobilityUnlocks } from "./sectors/AUTO/niches/mobility.unlocks";
import { mobilityUpgrades } from "./sectors/AUTO/niches/mobility.upgrades";
import { CommercialBuildNicheConfig } from "./sectors/BUILD/niches/commercialBuild.niche";
import { commercialBuildProducts } from "./sectors/BUILD/niches/commercialBuild.products";
import { commercialBuildUnlocks } from "./sectors/BUILD/niches/commercialBuild.unlocks";
import { commercialBuildUpgrades } from "./sectors/BUILD/niches/commercialBuild.upgrades";
import { ElectricalNicheConfig } from "./sectors/BUILD/niches/electrical.niche";
import { electricalProducts } from "./sectors/BUILD/niches/electrical.products";
import { electricalUnlocks } from "./sectors/BUILD/niches/electrical.unlocks";
import { electricalUpgrades } from "./sectors/BUILD/niches/electrical.upgrades";
import { EngineeringNicheConfig } from "./sectors/BUILD/niches/engineering.niche";
import { engineeringProducts } from "./sectors/BUILD/niches/engineering.products";
import { engineeringUnlocks } from "./sectors/BUILD/niches/engineering.unlocks";
import { engineeringUpgrades } from "./sectors/BUILD/niches/engineering.upgrades";
import { PlumbingNicheConfig } from "./sectors/BUILD/niches/plumbing.niche";
import { plumbingProducts } from "./sectors/BUILD/niches/plumbing.products";
import { plumbingUnlocks } from "./sectors/BUILD/niches/plumbing.unlocks";
import { plumbingUpgrades } from "./sectors/BUILD/niches/plumbing.upgrades";
import { RenovationNicheConfig } from "./sectors/BUILD/niches/renovation.niche";
import { renovationProducts } from "./sectors/BUILD/niches/renovation.products";
import { renovationUnlocks } from "./sectors/BUILD/niches/renovation.unlocks";
import { renovationUpgrades } from "./sectors/BUILD/niches/renovation.upgrades";

export type CatalogValidationIssue = {
  code: string;
  message: string;
};

export type NicheValidationIssue = {
  code: string;
  message: string;
};

export type NicheFormulaSet = {
  yieldPerWeek: string;
  wasteRate: string;
  qualityScore: string;
};

export type NicheProductValidation = {
  sku: string;
  unit: string;
  formulas: NicheFormulaSet;
  requiredAssets: { assetId: string }[];
  requiredStaff: { roleId: string }[];
};

export type NicheUnlockValidation = {
  productSku: string;
  requirements: {
    assets?: { assetId: string }[];
    staff?: { roleId: string }[];
    upgrades?: string[];
  };
};

export type NicheUpgradeValidation = {
  id: string;
};

export type NicheValidationInput = {
  nicheId: string;
  products: NicheProductValidation[];
  unlocks: NicheUnlockValidation[];
  upgrades: NicheUpgradeValidation[];
  allowedUnits: string[];
  allowedAssetIds?: string[];
  allowedRoleIds?: string[];
};

export function validateCatalog(data: CatalogData): CatalogValidationIssue[] {
  if (data.sectors.length + data.niches.length + data.products.length < 0) {
    return [{ code: "INVALID", message: "Catalog counts are invalid." }];
  }
  return [];
}

function shouldValidateSector(code: string): boolean {
  return isSectorEnabled(code);
}

function compileFormula(expression: string): boolean {
  if (!expression || expression.trim().length === 0) {
    return false;
  }

  try {
    const evaluator = new Function("clamp", `return ${expression};`);
    return typeof evaluator === "function";
  } catch {
    return false;
  }
}

export function validateNicheContent(input: NicheValidationInput): NicheValidationIssue[] {
  const issues: NicheValidationIssue[] = [];
  const allowedUnits = new Set(input.allowedUnits);

  if (input.products.length !== 6) {
    issues.push({
      code: "PRODUCT_COUNT",
      message: `${input.nicheId} must define 6 products.`,
    });
  }

  const productSkus = new Set<string>();
  const assetIds = new Set<string>(input.allowedAssetIds ?? []);
  const roleIds = new Set<string>(input.allowedRoleIds ?? []);

  input.products.forEach((product) => {
    productSkus.add(product.sku);
    product.requiredAssets.forEach((asset) => assetIds.add(asset.assetId));
    product.requiredStaff.forEach((staff) => roleIds.add(staff.roleId));

    if (!allowedUnits.has(product.unit)) {
      issues.push({
        code: "UNIT_INVALID",
        message: `${input.nicheId} product ${product.sku} has invalid unit ${product.unit}.`,
      });
    }

    if (!compileFormula(product.formulas.yieldPerWeek)) {
      issues.push({
        code: "FORMULA_INVALID",
        message: `${input.nicheId} product ${product.sku} yield formula invalid.`,
      });
    }
    if (!compileFormula(product.formulas.wasteRate)) {
      issues.push({
        code: "FORMULA_INVALID",
        message: `${input.nicheId} product ${product.sku} waste formula invalid.`,
      });
    }
    if (!compileFormula(product.formulas.qualityScore)) {
      issues.push({
        code: "FORMULA_INVALID",
        message: `${input.nicheId} product ${product.sku} quality formula invalid.`,
      });
    }
  });

  const upgradeIds = new Set(input.upgrades.map((upgrade) => upgrade.id));
  const unlockSkus = new Set<string>();

  input.unlocks.forEach((unlock) => {
    unlockSkus.add(unlock.productSku);
    if (!productSkus.has(unlock.productSku)) {
      issues.push({
        code: "UNLOCK_PRODUCT_MISSING",
        message: `${input.nicheId} unlock references missing product ${unlock.productSku}.`,
      });
    }

    unlock.requirements.assets?.forEach((asset) => {
      if (!assetIds.has(asset.assetId)) {
        issues.push({
          code: "UNLOCK_ASSET_MISSING",
          message: `${input.nicheId} unlock ${unlock.productSku} references unknown asset ${asset.assetId}.`,
        });
      }
    });

    unlock.requirements.staff?.forEach((staff) => {
      if (!roleIds.has(staff.roleId)) {
        issues.push({
          code: "UNLOCK_STAFF_MISSING",
          message: `${input.nicheId} unlock ${unlock.productSku} references unknown staff ${staff.roleId}.`,
        });
      }
    });

    unlock.requirements.upgrades?.forEach((upgradeId) => {
      if (!upgradeIds.has(upgradeId)) {
        issues.push({
          code: "UNLOCK_UPGRADE_MISSING",
          message: `${input.nicheId} unlock ${unlock.productSku} references unknown upgrade ${upgradeId}.`,
        });
      }
    });
  });

  if (unlockSkus.size !== productSkus.size) {
    issues.push({
      code: "UNLOCK_COUNT",
      message: `${input.nicheId} must provide unlocks for each product.`,
    });
  }

  return issues;
}

function assertDairy(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`DAIRY_VALIDATION: ${message}`);
  }
}

export function validateDairyNiche(): void {
  if (!shouldValidateSector("AGRI")) return;
  assertDairy(DairyNicheConfig.id === "dairy", "Dairy niche id must be 'dairy'.");
  assertDairy(
    DairyNicheConfig.sectorId === "AGRI",
    "Dairy niche must belong to AGRI sector."
  );

  assertDairy(dairyProducts.length === 6, "Dairy must define exactly 6 products.");

  const allowedStaffRoles = new Set([
    "livestock_caretaker",
    "milking_operator",
    "processing_operator",
    "quality_compliance",
    "logistics_staff",
    "dairy_manager",
  ]);
  const allowedVehicleTypes = new Set(["milk_truck", "refrigerated_truck"]);
  const allowedMachineTypes = new Set([
    "milking_robots",
    "pasteurizer",
    "cheese_vat",
    "fermentation_tank",
    "butter_churn",
    "cooling_tank_liters",
  ]);
  const allowedAssetIds = new Set([
    "cows_lactating",
    "barn_m2",
    "feed_ton",
    "cold_storage_kg",
    "cows_total",
    "cows_dry",
    "feed_storage_ton",
    ...allowedMachineTypes,
  ]);

  dairyProducts.forEach((product) => {
    product.requiredStaff.forEach((role) => {
      assertDairy(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
    product.requiredVehicles.forEach((vehicle) => {
      assertDairy(
        allowedVehicleTypes.has(vehicle.vehicleId),
        `Product ${product.sku} references unknown vehicle ${vehicle.vehicleId}.`
      );
    });
    product.requiredAssets.forEach((asset) => {
      assertDairy(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
  });

  const hasLossProduct = dairyProducts.some((product) => getBaselineMargin(product) < 0);
  assertDairy(hasLossProduct, "At least one Dairy product must be loss-making.");

  const processingUnlock = dairyUpgrades.some((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        Array.isArray(effect.value) &&
        (effect.value.includes("cheese_kg") || effect.value.includes("butter_kg"))
    )
  );
  assertDairy(
    processingUnlock,
    "At least one Dairy upgrade must unlock processing products."
  );

  const upgradeIds = new Set(dairyUpgrades.map((upgrade) => upgrade.id));
  dairyUnlocks.forEach((unlock) => {
    const requirements = unlock.requirements as {
      assets?: { assetId: string }[];
      upgrades?: string[];
    };
    requirements.assets?.forEach((asset) => {
      assertDairy(
        allowedAssetIds.has(asset.assetId),
        `Unlock ${unlock.productSku} references unknown asset ${asset.assetId}.`
      );
    });
    requirements.upgrades?.forEach((upgradeId) => {
      assertDairy(
        upgradeIds.has(upgradeId),
        `Unlock ${unlock.productSku} references unknown upgrade ${upgradeId}.`
      );
    });
  });
}

function assertFoodProcessing(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FOOD_PROCESSING_VALIDATION: ${message}`);
  }
}

export function validateFoodProcessingNiche(): void {
  if (!shouldValidateSector("AGRI")) return;
  assertFoodProcessing(
    FoodProcessingNicheConfig.id === "foodProcessing",
    "Food Processing niche id must be 'foodProcessing'."
  );
  assertFoodProcessing(
    FoodProcessingNicheConfig.sectorId === "AGRI",
    "Food Processing niche must belong to AGRI sector."
  );

  assertFoodProcessing(
    foodProcessingProducts.length === 6,
    "Food Processing must define exactly 6 products."
  );

  const allowedStaffRoles = new Set([
    "processing_operator",
    "maintenance_technician",
    "quality_compliance",
    "logistics_staff",
    "production_manager",
  ]);
  const allowedMachineTypes = new Set([
    "milling_line",
    "baking_line",
    "mixing_line",
    "cooking_line",
    "freezing_line",
    "packaging_line",
  ]);
  const allowedAssetIds = new Set([
    "processing_m2",
    "cold_storage_kg",
    "dry_storage_kg",
    "packaging_capacity_units",
    "energy_capacity_kwh",
    ...allowedMachineTypes,
  ]);

  foodProcessingProducts.forEach((product) => {
    assertFoodProcessing(
      product.requiredInputs.length > 0,
      `Product ${product.sku} must declare raw input dependencies.`
    );
    product.requiredStaff.forEach((role) => {
      assertFoodProcessing(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
    product.requiredMachines.forEach((machine) => {
      assertFoodProcessing(
        allowedMachineTypes.has(machine.machineId),
        `Product ${product.sku} references unknown machine ${machine.machineId}.`
      );
    });
    product.requiredAssets.forEach((asset) => {
      assertFoodProcessing(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
  });

  const hasLossProduct = foodProcessingProducts.some(
    (product) => getFoodProcessingMargin(product) < 0
  );
  assertFoodProcessing(
    hasLossProduct,
    "At least one Food Processing product must be loss-making."
  );

  const requiresColdStorage = foodProcessingProducts.some((product) =>
    product.requiredAssets.some((asset) => asset.assetId === "cold_storage_kg")
  );
  assertFoodProcessing(
    requiresColdStorage,
    "At least one Food Processing product must require cold storage."
  );

  const upgradeIds = new Set(foodProcessingUpgrades.map((upgrade) => upgrade.id));
  const privateLabelUnlock = foodProcessingUnlocks.find(
    (unlock) => unlock.productSku === "private_label_batch"
  );
  assertFoodProcessing(!!privateLabelUnlock, "Private label unlock must exist.");
  if (privateLabelUnlock) {
    const upgrades = privateLabelUnlock.requirements.upgrades ?? [];
    assertFoodProcessing(
      upgrades.includes("contract_production_line"),
      "Private label requires contract production upgrade."
    );
    upgrades.forEach((upgradeId) => {
      assertFoodProcessing(
        upgradeIds.has(upgradeId),
        `Unlock private_label_batch references unknown upgrade ${upgradeId}.`
      );
    });
  }
}

function assertGreenhouse(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`GREENHOUSE_VALIDATION: ${message}`);
  }
}

export function validateGreenhouseNiche(): void {
  if (!shouldValidateSector("AGRI")) return;
  assertGreenhouse(
    GreenhouseNicheConfig.id === "greenhouse",
    "Greenhouse niche id must be 'greenhouse'."
  );
  assertGreenhouse(
    GreenhouseNicheConfig.sectorId === "AGRI",
    "Greenhouse niche must belong to AGRI sector."
  );

  assertGreenhouse(
    greenhouseProducts.length === 6,
    "Greenhouse must define exactly 6 products."
  );

  const allowedStaffRoles = new Set([
    "grower",
    "picking_staff",
    "packaging_operator",
    "quality_compliance",
    "maintenance_technician",
    "logistics_staff",
  ]);
  const allowedMachineTypes = new Set([
    "climate_control_system",
    "led_lighting_system",
    "sorting_line",
    "packaging_line",
    "pest_management_system",
  ]);
  const allowedAssetIds = new Set([
    "greenhouse_m2",
    "climate_control_level",
    "irrigation_capacity_lph",
    "lighting_kw_capacity",
    "co2_injection_enabled",
    "cold_storage_kg",
    "packaging_capacity_units",
  ]);

  greenhouseProducts.forEach((product) => {
    product.requiredAssets.forEach((asset) => {
      assertGreenhouse(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
    product.requiredMachines.forEach((machine) => {
      assertGreenhouse(
        allowedMachineTypes.has(machine.machineId),
        `Product ${product.sku} references unknown machine ${machine.machineId}.`
      );
    });
    product.requiredStaff.forEach((role) => {
      assertGreenhouse(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
  });

  const hasPackagingLine = greenhouseProducts.some((product) =>
    product.requiredMachines.some((machine) => machine.machineId === "packaging_line")
  );
  assertGreenhouse(
    hasPackagingLine,
    "At least one Greenhouse product must require packaging_line."
  );

  const microgreensUnlock = greenhouseUnlocks.find(
    (unlock) => unlock.productSku === "microgreens_kg"
  );
  assertGreenhouse(!!microgreensUnlock, "Microgreens unlock must exist.");
  if (microgreensUnlock) {
    const requirements = microgreensUnlock.requirements as {
      machines?: { machineId: string }[];
      assets?: { assetId: string }[];
      complianceAuditPassed?: boolean;
      co2InjectionRequired?: boolean;
    };
    const hasLed = requirements.machines?.some(
      (machine) => machine.machineId === "led_lighting_system"
    );
    const hasCo2Asset = requirements.assets?.some(
      (asset) => asset.assetId === "co2_injection_enabled"
    );
    assertGreenhouse(
      !!hasLed && (requirements.co2InjectionRequired || !!hasCo2Asset),
      "Microgreens requires LED lighting and CO2 injection."
    );
    assertGreenhouse(
      requirements.complianceAuditPassed === true,
      "Microgreens requires compliance audit."
    );
  }

  const hasLossProduct = greenhouseProducts.some(
    (product) => getGreenhouseMargin(product) < 0
  );
  assertGreenhouse(
    hasLossProduct,
    "At least one Greenhouse product must be loss-making."
  );

  const hasEnergyIncrease = greenhouseUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "energy_use")
  );
  const hasRiskModel = greenhouseUpgrades.some(
    (upgrade) =>
      Array.isArray(upgrade.risk.failureEffects) && upgrade.risk.failureEffects.length > 0
  );
  assertGreenhouse(
    hasEnergyIncrease && hasRiskModel,
    "At least one Greenhouse upgrade must increase energy use and include a risk model."
  );
}

function assertLivestock(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`LIVESTOCK_VALIDATION: ${message}`);
  }
}

export function validateLivestockNiche(): void {
  if (!shouldValidateSector("AGRI")) return;
  assertLivestock(
    LivestockNicheConfig.id === "livestock",
    "Livestock niche id must be 'livestock'."
  );
  assertLivestock(
    LivestockNicheConfig.sectorId === "AGRI",
    "Livestock niche must belong to AGRI sector."
  );

  assertLivestock(
    livestockProducts.length === 6,
    "Livestock must define exactly 6 products."
  );

  const allowedStaffRoles = new Set([
    "animal_caretaker",
    "feed_manager",
    "vet_health_officer",
    "processing_operator",
    "quality_compliance",
    "logistics_staff",
  ]);
  const allowedVehicleTypes = new Set([
    "feed_truck",
    "livestock_trailer",
    "refrigerated_truck",
  ]);
  const allowedMachineTypes = new Set([
    "slaughter_line",
    "egg_sorting_line",
    "rendering_unit",
  ]);
  const allowedAssetIds = new Set([
    "animals_total",
    "animals_growing",
    "animals_market_ready",
    "breeding_stock",
    "mortality_rate",
    "health_score",
    "welfare_score",
    "biosecurity_level",
    "barn_m2",
    "pens_capacity_animals",
    "manure_capacity_ton",
    "waste_processing_enabled",
    "cold_storage_kg",
    "feed_storage_ton",
    "contract_processing",
  ]);

  livestockProducts.forEach((product) => {
    product.requiredAssets.forEach((asset) => {
      assertLivestock(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
    product.requiredVehicles.forEach((vehicle) => {
      assertLivestock(
        allowedVehicleTypes.has(vehicle.vehicleId),
        `Product ${product.sku} references unknown vehicle ${vehicle.vehicleId}.`
      );
    });
    product.requiredMachines.forEach((machine) => {
      assertLivestock(
        allowedMachineTypes.has(machine.machineId),
        `Product ${product.sku} references unknown machine ${machine.machineId}.`
      );
    });
    product.requiredStaff.forEach((role) => {
      assertLivestock(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
  });

  const hasWelfareGate = livestockUnlocks.some(
    (unlock) => unlock.requirements.minWelfareScore !== undefined
  );
  assertLivestock(
    hasWelfareGate,
    "At least one Livestock product must require welfare_score threshold."
  );

  const hasDiseaseUpgrade = livestockUpgrades.some((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "disease_chance")
  );
  const hasRiskModel = livestockUpgrades.some(
    (upgrade) =>
      Array.isArray(upgrade.risk.failureEffects) && upgrade.risk.failureEffects.length > 0
  );
  assertLivestock(
    hasDiseaseUpgrade && hasRiskModel,
    "At least one Livestock upgrade must reduce disease chance and include a risk model."
  );

  const byproductsUnlock = livestockUnlocks.find(
    (unlock) => unlock.productSku === "byproducts_rendered_kg"
  );
  assertLivestock(!!byproductsUnlock, "Byproducts unlock must exist.");
  if (byproductsUnlock) {
    const requirements = byproductsUnlock.requirements as {
      assets?: { assetId: string }[];
      machines?: { machineId: string }[];
    };
    const hasWasteProcessing = requirements.assets?.some(
      (asset) => asset.assetId === "waste_processing_enabled"
    );
    const hasProcessingMachine = requirements.machines?.some((machine) =>
      ["rendering_unit", "slaughter_line"].includes(machine.machineId)
    );
    assertLivestock(
      !!hasWasteProcessing && !!hasProcessingMachine,
      "Byproducts require waste processing and processing equipment."
    );
  }

  const hasLossProduct = livestockProducts.some(
    (product) => getLivestockMargin(product) < 0
  );
  assertLivestock(
    hasLossProduct,
    "At least one Livestock product must be loss-making."
  );
}

function assertOrganic(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ORGANIC_VALIDATION: ${message}`);
  }
}

export function validateOrganicFarmingNiche(): void {
  if (!shouldValidateSector("AGRI")) return;
  assertOrganic(
    OrganicFarmingNicheConfig.id === "organicFarming",
    "Organic Farming niche id must be 'organicFarming'."
  );
  assertOrganic(
    OrganicFarmingNicheConfig.sectorId === "AGRI",
    "Organic Farming niche must belong to AGRI sector."
  );

  assertOrganic(
    organicFarmingProducts.length === 6,
    "Organic Farming must define exactly 6 products."
  );

  const allowedStaffRoles = new Set([
    "farm_worker",
    "farm_manager",
    "logistics_staff",
    "sales_staff",
    "quality_compliance",
    "livestock_caretaker",
  ]);
  const allowedAssetIds = new Set([
    "organic_arable_m2",
    "soil_health_score",
    "rotation_compliance_score",
    "organic_certified",
    "audit_readiness_score",
    "brand_reputation_score",
    "synthetic_input_used_last_ticks",
    "compost_capacity_ton",
    "irrigation_system",
    "storage_ton",
    "cold_storage_kg",
    "packaging_line",
    "csa_subscribers",
    "farmers_market_slots",
    "dairy_module_enabled",
    "cooling_tank_liters",
    "welfare_score",
    "tractor",
    "seeder",
  ]);

  organicFarmingProducts.forEach((product) => {
    product.requiredAssets.forEach((asset) => {
      assertOrganic(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
    product.requiredStaff.forEach((role) => {
      assertOrganic(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
  });

  const requiresCertification = organicFarmingProducts.some((product) =>
    product.requiredAssets.some((asset) => asset.assetId === "organic_certified")
  );
  assertOrganic(
    requiresCertification,
    "At least one Organic Farming product must require organic_certified."
  );

  const hasChannelCap = organicFarmingProducts.some(
    (product) =>
      product.productionType === "channel" && product.yieldParams.channelCapPerTick > 0
  );
  assertOrganic(
    hasChannelCap,
    "At least one Organic Farming product must use channel caps."
  );

  const contractUnlock = organicFarmingUnlocks.find(
    (unlock) => unlock.productSku === "premium_organic_contract_batch"
  );
  assertOrganic(!!contractUnlock, "Premium organic contract unlock must exist.");
  if (contractUnlock) {
    const requirements = contractUnlock.requirements as {
      minAuditReadinessScore?: number;
      minTicksSinceSyntheticInput?: number;
      requiresOrganicCertified?: boolean;
    };
    assertOrganic(
      (requirements.minAuditReadinessScore ?? 0) >= 0.75,
      "Premium contract must require audit_readiness_score threshold."
    );
    assertOrganic(
      (requirements.minTicksSinceSyntheticInput ?? 0) >= 1,
      "Premium contract must require no synthetic inputs for recent ticks."
    );
    assertOrganic(
      requirements.requiresOrganicCertified === true,
      "Premium contract must require organic certification."
    );
  }

  const certificationUpgrade = organicFarmingUpgrades.find(
    (upgrade) => upgrade.id === "organic_certification_program"
  );
  assertOrganic(!!certificationUpgrade, "Certification upgrade must exist.");
  if (certificationUpgrade) {
    assertOrganic(
      certificationUpgrade.timing === "multi_tick",
      "Certification upgrade must be multi_tick."
    );
    const hasRiskModel =
      Array.isArray(certificationUpgrade.risk.failureEffects) &&
      certificationUpgrade.risk.failureEffects.length > 0;
    assertOrganic(
      hasRiskModel,
      "Certification upgrade must include a risk model."
    );
  }

  const hasLossProduct = organicFarmingProducts.some(
    (product) => getOrganicMargin(product) < 0
  );
  assertOrganic(
    hasLossProduct,
    "At least one Organic Farming product must be loss-making."
  );
}

function assertCarDealer(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`CAR_DEALER_VALIDATION: ${message}`);
  }
}

export function validateCarDealerNiche(): void {
  if (!shouldValidateSector("AUTO")) return;
  assertCarDealer(
    CarDealerNicheConfig.id === "carDealer",
    "Car Dealer niche id must be 'carDealer'."
  );
  assertCarDealer(
    CarDealerNicheConfig.sectorId === "AUTO",
    "Car Dealer niche must belong to AUTO sector."
  );

  type CarDealerSku = typeof carDealerProducts[number]["sku"];
  const expectedSkus: CarDealerSku[] = [
    "used_car_unit",
    "new_car_unit",
    "trade_in_unit",
    "financing_contract_unit",
    "extended_warranty_unit",
    "detailing_service_unit",
  ];
  const expectedSkuSet = new Set<CarDealerSku>(expectedSkus);
  const productSkus = new Set<CarDealerSku>(
    carDealerProducts.map((product) => product.sku)
  );
  assertCarDealer(
    productSkus.size === 6,
    "Car Dealer must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertCarDealer(
      productSkus.has(sku),
      `Car Dealer missing required product SKU ${sku}.`
    );
  });
  carDealerProducts.forEach((product) => {
    assertCarDealer(
      expectedSkuSet.has(product.sku),
      `Car Dealer has unexpected product SKU ${product.sku}.`
    );
  });

  const allowedStaffRoles = new Set([
    "sales_staff",
    "service_staff",
    "finance_staff",
    "service_manager",
    "manager",
  ]);
  const allowedAssetIds = new Set([
    "showroom_m2",
    "inventory_slots",
    "storage_slots",
    "reconditioning_bays",
    "service_hours_capacity_per_tick",
    "appraisal_tools",
    "compliance_score",
    "reputation_score",
    "inventory_floorplan_apr",
  ]);

  carDealerProducts.forEach((product) => {
    product.requiredAssets.forEach((asset) => {
      assertCarDealer(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
    product.requiredStaff.forEach((role) => {
      assertCarDealer(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
    product.requiredStaffAnyOf?.forEach((group) => {
      group.forEach((role) => {
        assertCarDealer(
          allowedStaffRoles.has(role.roleId),
          `Product ${product.sku} references unknown staff role ${role.roleId}.`
        );
      });
    });
  });

  const unlocksBySku = new Map(
    carDealerUnlocks.map((unlock) => [unlock.productSku, unlock])
  );
  expectedSkus.forEach((sku) => {
    assertCarDealer(
      unlocksBySku.has(sku),
      `Car Dealer missing unlock definition for ${sku}.`
    );
  });

  carDealerUnlocks.forEach((unlock) => {
    unlock.requirements.assets?.forEach((asset) => {
      assertCarDealer(
        allowedAssetIds.has(asset.assetId),
        `Unlock ${unlock.productSku} references unknown asset ${asset.assetId}.`
      );
    });
    unlock.requirements.staff?.forEach((role) => {
      assertCarDealer(
        allowedStaffRoles.has(role.roleId),
        `Unlock ${unlock.productSku} references unknown staff role ${role.roleId}.`
      );
    });
    unlock.requirements.anyOf?.forEach((group) => {
      group.staff?.forEach((role) => {
        assertCarDealer(
          allowedStaffRoles.has(role.roleId),
          `Unlock ${unlock.productSku} references unknown staff role ${role.roleId}.`
        );
      });
      group.assets?.forEach((asset) => {
        assertCarDealer(
          allowedAssetIds.has(asset.assetId),
          `Unlock ${unlock.productSku} references unknown asset ${asset.assetId}.`
        );
      });
    });
  });

  const hasFloorplanProduct = carDealerProducts.some(
    (product) => product.requiresFloorplanFinancing === true
  );
  assertCarDealer(
    hasFloorplanProduct,
    "At least one Car Dealer product must require floorplan financing."
  );
  const hasFloorplanAsset = CarDealerNicheConfig.startingLoadout.assets.some(
    (asset) => asset.assetId === "inventory_floorplan_apr" && asset.count > 0
  );
  assertCarDealer(
    hasFloorplanAsset,
    "Car Dealer starting loadout must include inventory_floorplan_apr."
  );

  const tradeInProduct = carDealerProducts.find(
    (product) => product.sku === "trade_in_unit"
  );
  assertCarDealer(!!tradeInProduct, "Trade-in product must exist.");
  if (tradeInProduct?.inventoryFlow) {
    assertCarDealer(
      tradeInProduct.inventoryFlow.cashflowDirection === "outflow",
      "Trade-in must be configured as negative cashflow."
    );
    assertCarDealer(
      (tradeInProduct.inventoryFlow.inventoryUsedUnitsDelta ?? 0) > 0,
      "Trade-in must increase used inventory."
    );
  } else {
    assertCarDealer(false, "Trade-in must define inventory flow configuration.");
  }

  const financeUnlock = unlocksBySku.get("financing_contract_unit");
  assertCarDealer(!!financeUnlock, "Financing contract unlock must exist.");
  if (financeUnlock) {
    assertCarDealer(
      (financeUnlock.requirements.minComplianceScore ?? 0) >= 0.7,
      "Financing contract must require compliance score gate."
    );
    assertCarDealer(
      financeUnlock.requirements.complianceAuditPassed === true,
      "Financing contract must require compliance audit passed."
    );
  }

  const warrantyUnlock = unlocksBySku.get("extended_warranty_unit");
  assertCarDealer(!!warrantyUnlock, "Extended warranty unlock must exist.");
  if (warrantyUnlock) {
    assertCarDealer(
      (warrantyUnlock.requirements.minComplianceScore ?? 0) >= 0.7,
      "Extended warranty must require compliance score gate."
    );
  }

  const newCarUnlock = unlocksBySku.get("new_car_unit");
  assertCarDealer(!!newCarUnlock, "New car unlock must exist.");
  if (newCarUnlock) {
    const upgrades = newCarUnlock.requirements.upgrades ?? [];
    assertCarDealer(
      upgrades.includes("manufacturer_dealership_agreement"),
      "New car must require Manufacturer Dealership Agreement upgrade."
    );
    const upgradeIds = new Set(carDealerUpgrades.map((upgrade) => upgrade.id));
    upgrades.forEach((upgradeId) => {
      assertCarDealer(
        upgradeIds.has(upgradeId),
        `New car unlock references unknown upgrade ${upgradeId}.`
      );
    });
  }
}

function assertEvServices(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`EV_SERVICES_VALIDATION: ${message}`);
  }
}

export function validateEvServicesNiche(): void {
  if (!shouldValidateSector("AUTO")) return;
  assertEvServices(
    EvServicesNicheConfig.id === "evServices",
    "EV Services niche id must be 'evServices'."
  );
  assertEvServices(
    EvServicesNicheConfig.sectorId === "AUTO",
    "EV Services niche must belong to AUTO sector."
  );

  type EvServicesSku = typeof evServicesProducts[number]["sku"];
  const expectedSkus: EvServicesSku[] = [
    "ac_charge_session_unit",
    "dc_fast_charge_session_unit",
    "kwh_energy_sale_kwh",
    "charging_membership_monthly_unit",
    "fleet_charging_contract_unit",
    "installation_service_unit",
  ];
  const productSkus = new Set<EvServicesSku>(
    evServicesProducts.map((product) => product.sku)
  );
  assertEvServices(
    productSkus.size === 6,
    "EV Services must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertEvServices(
      productSkus.has(sku),
      `EV Services missing required product SKU ${sku}.`
    );
  });

  const allowedStaffRoles = new Set([
    "operations_tech",
    "support_agent",
    "certified_installer",
  ]);
  const allowedAssetIds = new Set([
    "chargers_ac_count",
    "chargers_dc_count",
    "charger_power_ac_kw",
    "charger_power_dc_kw",
    "site_count",
    "parking_bays_count",
    "grid_capacity_kw",
    "uptime_score",
    "utilization_rate",
    "location_quality_score",
    "metering_enabled",
  ]);

  evServicesProducts.forEach((product) => {
    product.requiredAssets.forEach((asset) => {
      assertEvServices(
        allowedAssetIds.has(asset.assetId),
        `Product ${product.sku} references unknown asset ${asset.assetId}.`
      );
    });
    product.requiredStaff.forEach((role) => {
      assertEvServices(
        allowedStaffRoles.has(role.roleId),
        `Product ${product.sku} references unknown staff role ${role.roleId}.`
      );
    });
  });

  const infrastructureAssets = new Set(
    EvServicesNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["chargers_ac_count", "chargers_dc_count", "grid_capacity_kw", "uptime_score", "utilization_rate"].forEach(
    (assetId) => {
      assertEvServices(
        infrastructureAssets.has(assetId),
        `EV Services starting loadout missing ${assetId}.`
      );
    }
  );

  const sessionSkus = new Set(["ac_charge_session_unit", "dc_fast_charge_session_unit"]);
  evServicesProducts
    .filter((product) => sessionSkus.has(product.sku))
    .forEach((product) => {
      assertEvServices(
        product.cogsModel.model === "energy_cost",
        `Product ${product.sku} must use energy_cost cogs model.`
      );
      if (product.cogsModel.model === "energy_cost") {
        assertEvServices(
          product.cogsModel.gridFeeEurPerKwhRange.min >= 0,
          `Product ${product.sku} must define grid fee range.`
        );
        assertEvServices(
          product.cogsModel.demandChargeModel.feeEurPerKwRange.min >= 0,
          `Product ${product.sku} must define demand charge model.`
        );
      }
    });

  const unlocksBySku = new Map(
    evServicesUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const meteringUnlock = unlocksBySku.get("kwh_energy_sale_kwh");
  assertEvServices(!!meteringUnlock, "Metered energy unlock must exist.");
  if (meteringUnlock) {
    const anyOf = meteringUnlock.requirements.anyOf ?? [];
    const hasMeterAsset = anyOf.some((group) =>
      group.assets?.some((asset) => asset.assetId === "metering_enabled")
    );
    const hasMeterUpgrade = anyOf.some((group) =>
      group.upgrades?.includes("smart_metering_dynamic_pricing")
    );
    assertEvServices(
      hasMeterAsset || hasMeterUpgrade,
      "kwh_energy_sale_kwh must be gated by metering enabled or smart metering upgrade."
    );
  }

  const dcUnlock = unlocksBySku.get("dc_fast_charge_session_unit");
  assertEvServices(!!dcUnlock, "DC fast charge unlock must exist.");
  if (dcUnlock) {
    const gridAsset = dcUnlock.requirements.assets?.find(
      (asset) => asset.assetId === "grid_capacity_kw"
    );
    assertEvServices(
      (gridAsset?.minCount ?? 0) >= 180,
      "DC fast charge requires grid_capacity_kw threshold."
    );
    assertEvServices(
      dcUnlock.requirements.upgrades?.includes("electrical_safety_program") ?? false,
      "DC fast charge requires electrical safety program."
    );
    assertEvServices(
      (dcUnlock.requirements.minComplianceScore ?? 0) >= 0.65,
      "DC fast charge must require compliance score gate."
    );
  }

  const membershipUnlock = unlocksBySku.get("charging_membership_monthly_unit");
  assertEvServices(!!membershipUnlock, "Membership unlock must exist.");
  if (membershipUnlock) {
    assertEvServices(
      membershipUnlock.requirements.upgrades?.includes("crm_billing_system") ?? false,
      "Membership must require CRM billing system upgrade."
    );
    assertEvServices(
      (membershipUnlock.requirements.minUptimeScore ?? 0) >= 0.85,
      "Membership must require uptime threshold."
    );
  }

  const demandChargeUpgrade = evServicesUpgrades.find((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "demand_charge_exposure_score")
  );
  assertEvServices(
    !!demandChargeUpgrade,
    "EV Services must include upgrade that reduces demand charge exposure."
  );
  if (demandChargeUpgrade) {
    assertEvServices(
      demandChargeUpgrade.risk.failureEffects.length > 0,
      "Demand charge upgrade must include a risk model."
    );
  }
}

function assertRepairShop(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`REPAIR_SHOP_VALIDATION: ${message}`);
  }
}

export function validateRepairShopNiche(): void {
  if (!shouldValidateSector("AUTO")) return;
  assertRepairShop(
    RepairShopNicheConfig.id === "repairShop",
    "Repair Shop niche id must be 'repairShop'."
  );
  assertRepairShop(
    RepairShopNicheConfig.sectorId === "AUTO",
    "Repair Shop niche must belong to AUTO sector."
  );

  type RepairShopSku = typeof repairShopProducts[number]["sku"];
  const expectedSkus: RepairShopSku[] = [
    "inspection_service_unit",
    "oil_service_unit",
    "brake_job_unit",
    "tires_service_unit",
    "diagnostics_advanced_unit",
    "ev_repair_job_unit",
  ];
  const productSkus = new Set<RepairShopSku>(
    repairShopProducts.map((product) => product.sku)
  );
  assertRepairShop(
    productSkus.size === 6,
    "Repair Shop must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertRepairShop(
      productSkus.has(sku),
      `Repair Shop missing required product SKU ${sku}.`
    );
  });

  repairShopProducts.forEach((product) => {
    const jobModel = product.jobModel;
    assertRepairShop(
      jobModel.laborHoursPerUnitRange.min >= 0,
      `Product ${product.sku} missing labor hours range.`
    );
    assertRepairShop(
      jobModel.partsCostEurPerUnitRange.min >= 0,
      `Product ${product.sku} missing parts cost range.`
    );
    assertRepairShop(
      jobModel.reworkProbabilityRange.max >= 0,
      `Product ${product.sku} missing rework probability range.`
    );
  });

  const requiredAssets = new Set([
    "service_bays",
    "lifts",
    "labor_hours_capacity_per_tick",
    "queue_jobs_count",
    "average_wait_ticks",
    "max_queue_before_churn",
  ]);
  const startingAssets = new Set(
    RepairShopNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  requiredAssets.forEach((assetId) => {
    assertRepairShop(
      startingAssets.has(assetId),
      `Repair Shop starting loadout missing ${assetId}.`
    );
  });

  const upgradeIds = new Set(repairShopUpgrades.map((upgrade) => upgrade.id));
  const diagnosticsUpgrade = repairShopUpgrades.find((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "diagnostic_tools_level")
  );
  assertRepairShop(
    !!diagnosticsUpgrade,
    "Repair Shop must include upgrade that changes diagnostic_tools_level."
  );
  if (diagnosticsUpgrade) {
    const unlocksDiagnostics = diagnosticsUpgrade.effects.some(
      (effect) =>
        effect.key === "unlock_products" &&
        Array.isArray(effect.value) &&
        effect.value.includes("diagnostics_advanced_unit")
    );
    assertRepairShop(
      unlocksDiagnostics,
      "Diagnostics upgrade must unlock diagnostics_advanced_unit."
    );
  }

  const evUnlock = repairShopUnlocks.find(
    (unlock) => unlock.productSku === "ev_repair_job_unit"
  );
  assertRepairShop(!!evUnlock, "EV repair unlock must exist.");
  if (evUnlock) {
    assertRepairShop(
      (evUnlock.requirements.diagnosticToolsLevelMin ?? 0) >= 3,
      "EV repair requires diagnostic_tools_level >= 3."
    );
    assertRepairShop(
      evUnlock.requirements.upgrades?.includes(
        "ev_certification_high_voltage_tools"
      ) ?? false,
      "EV repair must require EV certification upgrade."
    );
    evUnlock.requirements.upgrades?.forEach((upgradeId) => {
      assertRepairShop(
        upgradeIds.has(upgradeId),
        `EV repair unlock references unknown upgrade ${upgradeId}.`
      );
    });
  }

  const capacityUpgrade = repairShopUpgrades.find((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "service_bays")
  );
  assertRepairShop(
    !!capacityUpgrade,
    "Repair Shop must include an upgrade that increases capacity."
  );
  if (capacityUpgrade) {
    assertRepairShop(
      capacityUpgrade.risk.failureEffects.some((effect) =>
        effect.includes("underutilized")
      ),
      "Capacity upgrade must include underutilization risk."
    );
  }
}

function assertMobility(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`MOBILITY_VALIDATION: ${message}`);
  }
}

export function validateMobilityNiche(): void {
  if (!shouldValidateSector("AUTO")) return;
  assertMobility(
    MobilityNicheConfig.id === "mobility",
    "Mobility niche id must be 'mobility'."
  );
  assertMobility(
    MobilityNicheConfig.sectorId === "AUTO",
    "Mobility niche must belong to AUTO sector."
  );

  type MobilitySku = typeof mobilityProducts[number]["sku"];
  const expectedSkus: MobilitySku[] = [
    "economy_rental_day_unit",
    "premium_rental_day_unit",
    "van_rental_day_unit",
    "corporate_fleet_contract_unit",
    "insurance_addon_day_unit",
    "delivery_mobility_day_unit",
  ];
  const productSkus = new Set<MobilitySku>(
    mobilityProducts.map((product) => product.sku)
  );
  assertMobility(
    productSkus.size === 6,
    "Mobility must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertMobility(
      productSkus.has(sku),
      `Mobility missing required product SKU ${sku}.`
    );
  });

  const startingAssets = new Set(
    MobilityNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["fleet_economy_count", "fleet_premium_count", "fleet_van_count"].forEach(
    (assetId) => {
      assertMobility(
        startingAssets.has(assetId),
        `Mobility starting loadout missing ${assetId}.`
      );
    }
  );
  ["downtime_pct", "utilization_rate_actual"].forEach((assetId) => {
    assertMobility(
      startingAssets.has(assetId),
      `Mobility starting loadout missing ${assetId}.`
    );
  });

  const usesSummerSeasonality = mobilityProducts.some(
    (product) =>
      product.demandModel.seasonalityKey ===
      "summer_travel_mobility_seasonality"
  );
  assertMobility(
    usesSummerSeasonality,
    "At least one Mobility product must use summer_travel_mobility_seasonality."
  );

  const unlocksBySku = new Map(
    mobilityUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const corporateUnlock = unlocksBySku.get("corporate_fleet_contract_unit");
  assertMobility(!!corporateUnlock, "Corporate contract unlock must exist.");
  if (corporateUnlock) {
    assertMobility(
      (corporateUnlock.requirements.minComplianceScore ?? 0) >= 0.7,
      "Corporate contract must require compliance score gate."
    );
    assertMobility(
      (corporateUnlock.requirements.minUptimeScore ?? 0) >= 0.9,
      "Corporate contract must require uptime score gate."
    );
    assertMobility(
      corporateUnlock.requirements.upgrades?.includes(
        "corporate_contracting_sla_program"
      ) ?? false,
      "Corporate contract must require corporate contracting upgrade."
    );
  }

  const deliveryUnlock = unlocksBySku.get("delivery_mobility_day_unit");
  assertMobility(!!deliveryUnlock, "Delivery mobility unlock must exist.");
  if (deliveryUnlock) {
    assertMobility(
      deliveryUnlock.requirements.upgrades?.includes(
        "delivery_partnerships_program"
      ) ?? false,
      "Delivery mobility must require delivery partnerships upgrade."
    );
  }

  const riskReductionUpgrade = mobilityUpgrades.find((upgrade) =>
    upgrade.effects.some(
      (effect) =>
        effect.key === "accident_rate_per_day" || effect.key === "fraud_risk_score"
    )
  );
  assertMobility(
    !!riskReductionUpgrade &&
      riskReductionUpgrade.risk.failureEffects.length > 0,
    "Mobility must include an upgrade that reduces accident rate or fraud risk and includes a risk model."
  );

  const fleetExpansionUpgrade = mobilityUpgrades.find((upgrade) =>
    upgrade.effects.some((effect) =>
      ["fleet_economy_count", "fleet_premium_count", "fleet_van_count"].includes(
        effect.key
      )
    )
  );
  assertMobility(
    !!fleetExpansionUpgrade &&
      fleetExpansionUpgrade.risk.failureEffects.some((effect) => {
        const effectText = effect.toLowerCase();
        return effectText.includes("utilization") || effectText.includes("financing");
      }),
    "Mobility must include fleet expansion upgrade with utilization or financing risk."
  );
}

function assertCommercialBuild(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`COMMERCIAL_BUILD_VALIDATION: ${message}`);
  }
}

export function validateCommercialBuildNiche(): void {
  if (!shouldValidateSector("BUILD")) return;
  assertCommercialBuild(
    CommercialBuildNicheConfig.id === "commercialBuild",
    "Commercial Build niche id must be 'commercialBuild'."
  );
  assertCommercialBuild(
    CommercialBuildNicheConfig.sectorId === "BUILD",
    "Commercial Build niche must belong to BUILD sector."
  );

  type CommercialBuildSku = typeof commercialBuildProducts[number]["sku"];
  const expectedSkus: CommercialBuildSku[] = [
    "warehouse_shell_project_unit",
    "office_fitout_project_unit",
    "retail_unit_project_unit",
    "industrial_extension_project_unit",
    "design_build_contract_unit",
    "maintenance_repair_retain_unit",
  ];
  const productSkus = new Set<CommercialBuildSku>(
    commercialBuildProducts.map((product) => product.sku)
  );
  assertCommercialBuild(
    productSkus.size === 6,
    "Commercial Build must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertCommercialBuild(
      productSkus.has(sku),
      `Commercial Build missing required product SKU ${sku}.`
    );
  });

  commercialBuildProducts.forEach((product) => {
    assertCommercialBuild(
      product.baseContractValueEurRange.min >= 0,
      `Product ${product.sku} missing base contract value range.`
    );
    assertCommercialBuild(
      product.typicalDurationTicksRange.min >= 1,
      `Product ${product.sku} missing typical duration range.`
    );
    assertCommercialBuild(
      product.paymentModel.paymentTermsDaysRange.max > 0,
      `Product ${product.sku} missing payment terms range.`
    );
    assertCommercialBuild(
      product.paymentModel.retentionPctRange.max > 0,
      `Product ${product.sku} missing retention range.`
    );
    assertCommercialBuild(
      product.costModel.laborHoursPerProjectRange.min >= 0,
      `Product ${product.sku} missing labor hours range.`
    );
    assertCommercialBuild(
      product.costModel.materialsCostPctRange.min >= 0,
      `Product ${product.sku} missing materials cost range.`
    );
    assertCommercialBuild(
      product.costModel.subcontractorCostPctRange.min >= 0,
      `Product ${product.sku} missing subcontractor cost range.`
    );
    assertCommercialBuild(
      product.costModel.equipmentDaysPerProjectRange.min >= 0,
      `Product ${product.sku} missing equipment days range.`
    );
    assertCommercialBuild(
      product.riskModel.delayProbabilityRange.max > 0,
      `Product ${product.sku} missing delay probability range.`
    );
    assertCommercialBuild(
      product.riskModel.delayPenaltyPctRange.max > 0,
      `Product ${product.sku} missing delay penalty range.`
    );
  });

  const startingAssets = new Set(
    CommercialBuildNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["lead_pool_count", "bids_capacity_per_tick", "backlog_contract_value_eur", "accounts_receivable_eur"].forEach(
    (assetId) => {
      assertCommercialBuild(
        startingAssets.has(assetId),
        `Commercial Build starting loadout missing ${assetId}.`
      );
    }
  );

  const biddingCapacityUpgrade = commercialBuildUpgrades.find(
    (upgrade) =>
      upgrade.effects.some((effect) => effect.key === "bids_capacity_per_tick") &&
      upgrade.risk.failureEffects.some((effect) =>
        effect.toLowerCase().includes("overhead")
      )
  );
  assertCommercialBuild(
    !!biddingCapacityUpgrade,
    "Commercial Build must include bidding capacity upgrade with overhead risk."
  );

  const workingCapital = commercialBuildUpgrades.find(
    (upgrade) => upgrade.id === "working_capital_facility"
  );
  assertCommercialBuild(
    !!workingCapital,
    "Working capital facility upgrade must exist."
  );
  if (workingCapital) {
    assertCommercialBuild(
      workingCapital.opexFormula.toLowerCase().includes("interest"),
      "Working capital facility must define interest cost model."
    );
    assertCommercialBuild(
      workingCapital.risk.failureEffects.some((effect) =>
        effect.toLowerCase().includes("leverage")
      ),
      "Working capital facility must include leverage risk."
    );
  }

  const designBuildUnlock = commercialBuildUnlocks.find(
    (unlock) => unlock.productSku === "design_build_contract_unit"
  );
  assertCommercialBuild(
    !!designBuildUnlock,
    "Design-build unlock must exist."
  );
  if (designBuildUnlock) {
    assertCommercialBuild(
      designBuildUnlock.requirements.upgrades?.includes(
        "design_coordination_capability"
      ) ?? false,
      "Design-build product must require Design Coordination upgrade."
    );
  }
}

function assertElectrical(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ELECTRICAL_VALIDATION: ${message}`);
  }
}

export function validateElectricalNiche(): void {
  if (!shouldValidateSector("BUILD")) return;
  assertElectrical(
    ElectricalNicheConfig.id === "electrical",
    "Electrical niche id must be 'electrical'."
  );
  assertElectrical(
    ElectricalNicheConfig.sectorId === "BUILD",
    "Electrical niche must belong to BUILD sector."
  );

  type ElectricalSku = typeof electricalProducts[number]["sku"];
  const expectedSkus: ElectricalSku[] = [
    "residential_wiring_job_unit",
    "commercial_fitout_electrical_job_unit",
    "industrial_panel_upgrade_job_unit",
    "solar_inverter_install_job_unit",
    "emergency_callout_job_unit",
    "annual_maintenance_contract_unit",
  ];
  const productSkus = new Set<ElectricalSku>(
    electricalProducts.map((product) => product.sku)
  );
  assertElectrical(
    productSkus.size === 6,
    "Electrical must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertElectrical(productSkus.has(sku), `Electrical missing required product SKU ${sku}.`);
  });

  electricalProducts.forEach((product) => {
    assertElectrical(
      product.costModel.laborHoursPerJobRange.min >= 0,
      `Product ${product.sku} missing labor hours range.`
    );
    assertElectrical(
      product.costModel.materialCostEurPerJobRange.min >= 0,
      `Product ${product.sku} missing material cost range.`
    );
    assertElectrical(
      typeof product.qualityModel.inspectionRequired === "boolean",
      `Product ${product.sku} missing inspection required flag.`
    );
    assertElectrical(
      product.qualityModel.inspectionFailProbabilityRange.max >= 0,
      `Product ${product.sku} missing inspection fail range.`
    );
    assertElectrical(
      product.qualityModel.callbackProbabilityRange.max >= 0,
      `Product ${product.sku} missing callback probability range.`
    );
  });

  const startingAssets = new Set(
    ElectricalNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["certification_level", "inspection_pass_rate"].forEach((assetId) => {
    assertElectrical(
      startingAssets.has(assetId),
      `Electrical starting loadout missing ${assetId}.`
    );
  });

  const unlocksBySku = new Map(
    electricalUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const solarUnlock = unlocksBySku.get("solar_inverter_install_job_unit");
  assertElectrical(!!solarUnlock, "Solar inverter install unlock must exist.");
  if (solarUnlock) {
    assertElectrical(
      solarUnlock.requirements.upgrades?.includes(
        "safety_certification_compliance_pack"
      ) ?? false,
      "Solar inverter install must require safety certification upgrade."
    );
    assertElectrical(
      (solarUnlock.requirements.minCertificationLevel ?? 0) >= 1,
      "Solar inverter install must require certification_level >= 1."
    );
  }

  const commercialUnlock = unlocksBySku.get("commercial_fitout_electrical_job_unit");
  assertElectrical(!!commercialUnlock, "Commercial fit-out unlock must exist.");
  if (commercialUnlock) {
    assertElectrical(
      (commercialUnlock.requirements.minMasterElectricianFte ?? 0) >= 1,
      "Commercial fit-out must require master electrician."
    );
    assertElectrical(
      (commercialUnlock.requirements.minCertificationLevel ?? 0) >= 2,
      "Commercial fit-out must require certification_level >= 2."
    );
  }

  const industrialUnlock = unlocksBySku.get("industrial_panel_upgrade_job_unit");
  assertElectrical(!!industrialUnlock, "Industrial panel upgrade unlock must exist.");
  if (industrialUnlock) {
    assertElectrical(
      (industrialUnlock.requirements.minMasterElectricianFte ?? 0) >= 1,
      "Industrial panel upgrade must require master electrician."
    );
    assertElectrical(
      (industrialUnlock.requirements.minCertificationLevel ?? 0) >= 2,
      "Industrial panel upgrade must require certification_level >= 2."
    );
  }

  const maintenanceUnlock = unlocksBySku.get("annual_maintenance_contract_unit");
  assertElectrical(!!maintenanceUnlock, "Annual maintenance unlock must exist.");
  if (maintenanceUnlock) {
    assertElectrical(
      maintenanceUnlock.requirements.upgrades?.includes(
        "scheduling_software_dispatch"
      ) ?? false,
      "Annual maintenance contract must require scheduling software upgrade."
    );
    assertElectrical(
      (maintenanceUnlock.requirements.minInspectionPassRate ?? 0) >= 0.9,
      "Annual maintenance contract must require inspection pass rate >= 0.90."
    );
  }

  const inspectionReductionUpgrade = electricalUpgrades.find((upgrade) => {
    const reducesInspection = upgrade.effects.some(
      (effect) => effect.key === "inspection_fail_probability_modifier"
    );
    const hasCalibrationRisk = upgrade.risk.failureEffects.some((effect) => {
      const text = effect.toLowerCase();
      return text.includes("calibration") || text.includes("maintenance");
    });
    return reducesInspection && hasCalibrationRisk;
  });
  assertElectrical(
    !!inspectionReductionUpgrade,
    "Electrical must include inspection reduction upgrade with calibration/maintenance risk."
  );

  const onCallUpgrade = electricalUpgrades.find(
    (upgrade) => upgrade.id === "on_call_team_setup"
  );
  assertElectrical(!!onCallUpgrade, "On-call upgrade must exist.");
  if (onCallUpgrade) {
    const hasOvertimeOrCallbackRisk = onCallUpgrade.risk.failureEffects.some(
      (effect) => {
        const text = effect.toLowerCase();
        return text.includes("overtime") || text.includes("callback");
      }
    );
    assertElectrical(
      hasOvertimeOrCallbackRisk,
      "On-call upgrade must include overtime or callback risk."
    );
  }
}

function assertEngineering(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ENGINEERING_VALIDATION: ${message}`);
  }
}

export function validateEngineeringNiche(): void {
  if (!shouldValidateSector("BUILD")) return;
  assertEngineering(
    EngineeringNicheConfig.id === "engineering",
    "Engineering niche id must be 'engineering'."
  );
  assertEngineering(
    EngineeringNicheConfig.sectorId === "BUILD",
    "Engineering niche must belong to BUILD sector."
  );

  type EngineeringSku = typeof engineeringProducts[number]["sku"];
  const expectedSkus: EngineeringSku[] = [
    "structural_design_package_unit",
    "mep_design_package_unit",
    "geotechnical_survey_unit",
    "permitting_and_code_review_unit",
    "bim_coordination_service_unit",
    "owner_rep_project_management_unit",
  ];
  const productSkus = new Set<EngineeringSku>(
    engineeringProducts.map((product) => product.sku)
  );
  assertEngineering(
    productSkus.size === 6,
    "Engineering must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertEngineering(productSkus.has(sku), `Engineering missing required product SKU ${sku}.`);
  });

  engineeringProducts.forEach((product) => {
    const pricing = product.pricingModel;
    assertEngineering(
      !!pricing.modelType,
      `Product ${product.sku} missing pricing model type.`
    );
    assertEngineering(
      !!pricing.baseFeeEurRange || !!pricing.hourlyRateEurRange,
      `Product ${product.sku} must define base fee or hourly rate range.`
    );
    assertEngineering(
      product.costModel.staffHoursByRoleRange.engineerHoursRange.min >= 0,
      `Product ${product.sku} missing staff hours by role range.`
    );
    assertEngineering(
      product.liabilityModel.liabilityClaimProbabilityRange.max > 0,
      `Product ${product.sku} missing liability claim probability range.`
    );
    assertEngineering(
      product.liabilityModel.claimSeverityEurRange.max > 0,
      `Product ${product.sku} missing claim severity range.`
    );
  });

  const startingAssets = new Set(
    EngineeringNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["utilization_target", "utilization_actual", "billable_hours_capacity_per_tick"].forEach(
    (assetId) => {
      assertEngineering(
        startingAssets.has(assetId),
        `Engineering starting loadout missing ${assetId}.`
      );
    }
  );

  const unlocksBySku = new Map(
    engineeringUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const bimUnlock = unlocksBySku.get("bim_coordination_service_unit");
  assertEngineering(!!bimUnlock, "BIM coordination unlock must exist.");
  if (bimUnlock) {
    assertEngineering(
      bimUnlock.requirements.upgrades?.includes("software_stack_cad_bim") ?? false,
      "BIM coordination must require software stack upgrade."
    );
    assertEngineering(
      (bimUnlock.requirements.minBimSpecialistFte ?? 0) >= 1,
      "BIM coordination must require bim_specialists_fte >= 1."
    );
  }

  const ownerRepUnlock = unlocksBySku.get("owner_rep_project_management_unit");
  assertEngineering(!!ownerRepUnlock, "Owner rep unlock must exist.");
  if (ownerRepUnlock) {
    assertEngineering(
      ownerRepUnlock.requirements.upgrades?.includes("governance_reporting_process") ??
        false,
      "Owner rep must require governance upgrade."
    );
    assertEngineering(
      (ownerRepUnlock.requirements.minComplianceScore ?? 0) >= 0.7,
      "Owner rep must require compliance score gate."
    );
    assertEngineering(
      (ownerRepUnlock.requirements.minReputationScore ?? 0) >= 0.65,
      "Owner rep must require reputation score gate."
    );
  }

  const structuralUnlock = unlocksBySku.get("structural_design_package_unit");
  assertEngineering(!!structuralUnlock, "Structural design unlock must exist.");
  if (structuralUnlock) {
    assertEngineering(
      structuralUnlock.requirements.upgrades?.includes("qa_baseline_checklist") ??
        false,
      "Structural design must require QA baseline upgrade."
    );
    assertEngineering(
      (structuralUnlock.requirements.minSeniorEngineersFte ?? 0) >= 1,
      "Structural design must require senior engineer gate."
    );
  }

  const proposalUpgrade = engineeringUpgrades.find((upgrade) =>
    upgrade.effects.some((effect) => effect.key === "proposals_capacity_per_tick")
  );
  assertEngineering(
    !!proposalUpgrade,
    "Engineering must include upgrade that increases proposal capacity."
  );
  if (proposalUpgrade) {
    assertEngineering(
      proposalUpgrade.risk.failureEffects.some((effect) =>
        effect.toLowerCase().includes("overhead")
      ),
      "Proposal capacity upgrade must include overhead risk."
    );
  }

  const qaUpgrade = engineeringUpgrades.find((upgrade) => upgrade.id === "qa_baseline_checklist");
  assertEngineering(!!qaUpgrade, "QA baseline upgrade must exist.");
  if (qaUpgrade) {
    const reducesLiability = qaUpgrade.effects.some(
      (effect) => effect.key === "liability_claim_probability_modifier"
    );
    const reducesCapacity = qaUpgrade.effects.some(
      (effect) =>
        effect.key === "billable_hours_capacity_per_tick" &&
        Array.isArray(effect.range) &&
        effect.range[1] < 0
    );
    assertEngineering(
      reducesLiability && reducesCapacity,
      "QA baseline upgrade must reduce liability risk and capacity."
    );
  }
}

function assertPlumbing(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`PLUMBING_VALIDATION: ${message}`);
  }
}

export function validatePlumbingNiche(): void {
  if (!shouldValidateSector("BUILD")) return;
  assertPlumbing(
    PlumbingNicheConfig.id === "plumbing",
    "Plumbing niche id must be 'plumbing'."
  );
  assertPlumbing(
    PlumbingNicheConfig.sectorId === "BUILD",
    "Plumbing niche must belong to BUILD sector."
  );

  type PlumbingSku = typeof plumbingProducts[number]["sku"];
  const expectedSkus: PlumbingSku[] = [
    "residential_repair_visit_job_unit",
    "bathroom_installation_job_unit",
    "commercial_fitout_plumbing_job_unit",
    "boiler_heatpump_plumbing_service_job_unit",
    "emergency_leak_callout_job_unit",
    "property_maintenance_contract_unit",
  ];
  const productSkus = new Set<PlumbingSku>(
    plumbingProducts.map((product) => product.sku)
  );
  assertPlumbing(
    productSkus.size === 6,
    "Plumbing must define exactly 6 products."
  );
  expectedSkus.forEach((sku) => {
    assertPlumbing(productSkus.has(sku), `Plumbing missing required product SKU ${sku}.`);
  });

  const startingAssets = new Set(
    PlumbingNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  const startingStaff = new Set(
    PlumbingNicheConfig.startingLoadout.staff.map((staff) => staff.roleId)
  );
  ["plumbers_fte", "dispatcher_fte"].forEach((roleId) => {
    assertPlumbing(
      startingStaff.has(roleId),
      `Plumbing starting loadout missing staff role ${roleId}.`
    );
  });
  ["parts_fill_rate", "callback_rate", "callbacks_queue_count"].forEach((assetId) => {
    assertPlumbing(
      startingAssets.has(assetId),
      `Plumbing starting loadout missing ${assetId}.`
    );
  });

  const hasMasterInspectionProduct = plumbingProducts.some(
    (product) => product.requirements.masterPlumberFteMin >= 1 && product.qualityModel.inspectionRequired
  );
  assertPlumbing(
    hasMasterInspectionProduct,
    "At least one Plumbing product must require a master plumber and inspection."
  );

  const unlocksBySku = new Map(
    plumbingUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const emergencyUnlock = unlocksBySku.get("emergency_leak_callout_job_unit");
  assertPlumbing(!!emergencyUnlock, "Emergency leak callout unlock must exist.");
  if (emergencyUnlock) {
    const anyOf = emergencyUnlock.requirements.anyOf ?? [];
    const hasOnCallAsset = anyOf.some((group) =>
      group.assets?.some((asset) => asset.assetId === "on_call_enabled")
    );
    const hasOnCallUpgrade = anyOf.some((group) =>
      group.upgrades?.includes("on_call_rotation_setup")
    );
    assertPlumbing(
      hasOnCallAsset || hasOnCallUpgrade,
      "Emergency leak callout must be gated by on-call enablement."
    );
  }

  const maintenanceUnlock = unlocksBySku.get("property_maintenance_contract_unit");
  assertPlumbing(!!maintenanceUnlock, "Property maintenance unlock must exist.");
  if (maintenanceUnlock) {
    assertPlumbing(
      (maintenanceUnlock.requirements.maxCallbackRate ?? 1) <= 0.08,
      "Property maintenance must require low callback rate."
    );
    assertPlumbing(
      (maintenanceUnlock.requirements.minReputationScore ?? 0) >= 0.6,
      "Property maintenance must require reputation gate."
    );
  }

  const callbackUpgrade = plumbingUpgrades.find((upgrade) => {
    const reducesCallbacks = upgrade.effects.some(
      (effect) => effect.key === "callback_probability_modifier"
    );
    const reducesThroughput = upgrade.effects.some(
      (effect) =>
        effect.key === "labor_hours_capacity_per_tick" &&
        Array.isArray(effect.range) &&
        effect.range[1] < 0
    );
    return reducesCallbacks && reducesThroughput;
  });
  assertPlumbing(
    !!callbackUpgrade,
    "Plumbing must include callback reduction upgrade with throughput tradeoff."
  );

  const inventoryUpgrade = plumbingUpgrades.find(
    (upgrade) => upgrade.id === "parts_inventory_system"
  );
  assertPlumbing(!!inventoryUpgrade, "Parts inventory upgrade must exist.");
  if (inventoryUpgrade) {
    const increasesFill = inventoryUpgrade.effects.some(
      (effect) => effect.key === "parts_fill_rate" && (effect.range?.[1] ?? 0) > 0
    );
    const increasesInventory = inventoryUpgrade.effects.some(
      (effect) =>
        effect.key === "parts_inventory_value_eur" && (effect.range?.[1] ?? 0) > 0
    );
    const hasCashRisk = inventoryUpgrade.risk.failureEffects.some((effect) => {
      const text = effect.toLowerCase();
      return text.includes("cash") || text.includes("overstock");
    });
    assertPlumbing(
      increasesFill && increasesInventory && hasCashRisk,
      "Parts inventory upgrade must increase fill rate, raise inventory, and include cash tie-up risk."
    );
  }
}

function assertRenovation(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`RENOVATION_VALIDATION: ${message}`);
  }
}

export function validateRenovationNiche(): void {
  if (!shouldValidateSector("BUILD")) return;
  assertRenovation(
    RenovationNicheConfig.id === "renovation",
    "Renovation niche id must be 'renovation'."
  );
  assertRenovation(
    RenovationNicheConfig.sectorId === "BUILD",
    "Renovation niche must belong to BUILD sector."
  );

  type RenovationSku = typeof renovationProducts[number]["sku"];
  const expectedSkus: RenovationSku[] = [
    "small_repair_punchlist_job_unit",
    "kitchen_renovation_job_unit",
    "bathroom_renovation_job_unit",
    "whole_home_renovation_job_unit",
    "tenant_turnover_renovation_contract_unit",
    "insurance_restoration_job_unit",
  ];
  const productSkus = new Set<RenovationSku>(
    renovationProducts.map((product) => product.sku)
  );
  assertRenovation(productSkus.size === 6, "Renovation must define exactly 6 products.");
  expectedSkus.forEach((sku) => {
    assertRenovation(productSkus.has(sku), `Renovation missing required product SKU ${sku}.`);
  });

  const startingAssets = new Set(
    RenovationNicheConfig.startingLoadout.assets.map((asset) => asset.assetId)
  );
  ["scope_creep_rate", "contract_discipline_score", "defect_detection_score", "hidden_defect_probability"].forEach(
    (assetId) => {
      assertRenovation(
        startingAssets.has(assetId),
        `Renovation starting loadout missing ${assetId}.`
      );
    }
  );

  const hasChangeOrderParams = renovationProducts.some(
    (product) =>
      product.scopeContractModel.changeOrderAcceptanceRateRange.max > 0 &&
      product.scopeContractModel.changeOrderMarginPctRange.max > 0
  );
  assertRenovation(
    hasChangeOrderParams,
    "At least one Renovation product must define change order parameters."
  );

  const hasDefectRework = renovationProducts.some(
    (product) =>
      product.hiddenDefectModel.defectReworkCostEurRange.max > 0 &&
      product.hiddenDefectModel.defectDelayTicksRange.max > 0
  );
  assertRenovation(
    hasDefectRework,
    "At least one Renovation product must define hidden defect rework cost and delay ranges."
  );

  const unlocksBySku = new Map(
    renovationUnlocks.map((unlock) => [unlock.productSku, unlock])
  );

  const wholeHomeUnlock = unlocksBySku.get("whole_home_renovation_job_unit");
  assertRenovation(!!wholeHomeUnlock, "Whole-home renovation unlock must exist.");
  if (wholeHomeUnlock) {
    assertRenovation(
      (wholeHomeUnlock.requirements.minProjectManagerFte ?? 0) >= 1,
      "Whole-home renovation must require project manager gate."
    );
    assertRenovation(
      (wholeHomeUnlock.requirements.minSiteManagersFte ?? 0) >= 1,
      "Whole-home renovation must require site manager gate."
    );
    assertRenovation(
      (wholeHomeUnlock.requirements.minContractDisciplineScore ?? 0) >= 0.6,
      "Whole-home renovation must require contract discipline gate."
    );
    assertRenovation(
      (wholeHomeUnlock.requirements.minDefectDetectionScore ?? 0) >= 0.45,
      "Whole-home renovation must require defect detection gate."
    );
    assertRenovation(
      wholeHomeUnlock.requirements.upgrades?.includes("project_controls_milestone_billing") ??
        false,
      "Whole-home renovation must require project controls upgrade."
    );
  }

  const insuranceUnlock = unlocksBySku.get("insurance_restoration_job_unit");
  assertRenovation(!!insuranceUnlock, "Insurance restoration unlock must exist.");
  if (insuranceUnlock) {
    assertRenovation(
      insuranceUnlock.requirements.upgrades?.includes(
        "insurance_documentation_compliance_pack"
      ) ?? false,
      "Insurance restoration must require documentation compliance upgrade."
    );
    assertRenovation(
      (insuranceUnlock.requirements.minComplianceScore ?? 0) >= 0.7,
      "Insurance restoration must require compliance score gate."
    );
    const insuranceAssets = insuranceUnlock.requirements.assets ?? [];
    const hasDocumentation = insuranceAssets.some(
      (asset) =>
        asset.assetId === "documentation_process_enabled" && (asset.minCount ?? 0) >= 1
    );
    assertRenovation(
      hasDocumentation,
      "Insurance restoration must require documentation_process_enabled."
    );
  }

  const disciplineUpgrade = renovationUpgrades.find((upgrade) => {
    const addsDiscipline = upgrade.effects.some(
      (effect) => effect.key === "contract_discipline_score"
    );
    const hasCloseRateRisk = upgrade.risk.failureEffects.some((effect) =>
      effect.toLowerCase().includes("close_rate")
    );
    return addsDiscipline && hasCloseRateRisk;
  });
  assertRenovation(
    !!disciplineUpgrade,
    "Renovation must include contract discipline upgrade with close rate risk."
  );

  const detectionUpgrade = renovationUpgrades.find((upgrade) => {
    const addsDetection = upgrade.effects.some(
      (effect) => effect.key === "defect_detection_score"
    );
    const hasQuoteCycleRisk = upgrade.risk.failureEffects.some((effect) =>
      effect.toLowerCase().includes("quote_cycle")
    );
    return addsDetection && hasQuoteCycleRisk;
  });
  assertRenovation(
    !!detectionUpgrade,
    "Renovation must include defect detection upgrade with quote cycle risk."
  );
}
