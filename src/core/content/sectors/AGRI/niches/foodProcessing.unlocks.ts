import type {
  AssetRequirement,
  FoodProcessingProductSku,
  MachineRequirement,
  StaffRequirement,
} from "./foodProcessing.products";
import { foodProcessingProducts } from "./foodProcessing.products";

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  complianceAuditPassed?: boolean;
  contractSigned?: boolean;
};

export type NicheUnlock = {
  productSku: FoodProcessingProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type FoodProcessingCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  machines: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  complianceAuditPassed: boolean;
  contractSigned: boolean;
};

export const foodProcessingUnlocks: NicheUnlock[] = [
  {
    productSku: "flour_kg",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "packaged_bread_unit",
    startingUnlocked: false,
    requirements: {
      machines: [
        { machineId: "mixing_line", minCount: 1 },
        { machineId: "baking_line", minCount: 2 },
        { machineId: "packaging_line", minCount: 1 },
      ],
      staff: [
        { roleId: "processing_operator", minFTE: 4 },
        { roleId: "quality_compliance", minFTE: 1 },
      ],
      assets: [{ assetId: "packaging_capacity_units", minCount: 10000 }],
      upgrades: ["advanced_packaging"],
      minComplianceScore: 0.7,
    },
  },
  {
    productSku: "ready_meal_unit",
    startingUnlocked: false,
    requirements: {
      machines: [
        { machineId: "mixing_line", minCount: 1 },
        { machineId: "cooking_line", minCount: 1 },
        { machineId: "packaging_line", minCount: 1 },
      ],
      staff: [
        { roleId: "processing_operator", minFTE: 4 },
        { roleId: "quality_compliance", minFTE: 1 },
        { roleId: "production_manager", minFTE: 0.5 },
      ],
      assets: [{ assetId: "cold_storage_kg", minCount: 5000 }],
      upgrades: ["throughput_expansion"],
      minComplianceScore: 0.8,
      complianceAuditPassed: true,
    },
  },
  {
    productSku: "animal_feed_mix_ton",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "mixing_line", minCount: 1 }],
      staff: [{ roleId: "processing_operator", minFTE: 2 }],
      assets: [{ assetId: "dry_storage_kg", minCount: 15000 }],
      upgrades: ["energy_optimization"],
      minComplianceScore: 0.6,
    },
  },
  {
    productSku: "frozen_vegetables_kg",
    startingUnlocked: false,
    requirements: {
      machines: [
        { machineId: "freezing_line", minCount: 1 },
        { machineId: "packaging_line", minCount: 1 },
      ],
      staff: [
        { roleId: "processing_operator", minFTE: 3 },
        { roleId: "quality_compliance", minFTE: 1 },
      ],
      assets: [{ assetId: "cold_storage_kg", minCount: 8000 }],
      upgrades: ["advanced_packaging"],
      minComplianceScore: 0.75,
    },
  },
  {
    productSku: "private_label_batch",
    startingUnlocked: false,
    requirements: {
      machines: [
        { machineId: "mixing_line", minCount: 1 },
        { machineId: "cooking_line", minCount: 1 },
        { machineId: "packaging_line", minCount: 1 },
      ],
      staff: [
        { roleId: "quality_compliance", minFTE: 2 },
        { roleId: "logistics_staff", minFTE: 2 },
        { roleId: "production_manager", minFTE: 1 },
      ],
      assets: [
        { assetId: "packaging_capacity_units", minCount: 20000 },
        { assetId: "cold_storage_kg", minCount: 6000 },
      ],
      upgrades: ["contract_production_line"],
      minComplianceScore: 0.85,
      complianceAuditPassed: true,
      contractSigned: true,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: FoodProcessingCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: FoodProcessingCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsMachineRequirements(
  state: FoodProcessingCompanyState,
  machines?: MachineRequirement[]
): boolean {
  if (!machines || machines.length === 0) {
    return true;
  }
  return machines.every(
    (machine) => getCount(state.machines, machine.machineId) >= machine.minCount
  );
}

function meetsUpgradeRequirements(
  state: FoodProcessingCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

export function getUnlockedProducts(
  state: FoodProcessingCompanyState
): FoodProcessingProductSku[] {
  const unlocked = new Set<FoodProcessingProductSku>();

  foodProcessingUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  foodProcessingUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (requirements.minComplianceScore !== undefined) {
        if (state.complianceScore < requirements.minComplianceScore) {
          return;
        }
      }
      if (requirements.complianceAuditPassed === true && !state.complianceAuditPassed) {
        return;
      }
      if (requirements.contractSigned === true && !state.contractSigned) {
        return;
      }
      if (!meetsAssetRequirements(state, requirements.assets)) {
        return;
      }
      if (!meetsStaffRequirements(state, requirements.staff)) {
        return;
      }
      if (!meetsMachineRequirements(state, requirements.machines)) {
        return;
      }
      if (!meetsUpgradeRequirements(state, requirements.upgrades)) {
        return;
      }
      unlocked.add(unlock.productSku);
    });

  return foodProcessingProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testFoodProcessingUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      processing_m2: 800,
      dry_storage_kg: 20000,
      cold_storage_kg: 12000,
      packaging_capacity_units: 25000,
      energy_capacity_kwh: 8000,
    },
    staff: {
      processing_operator: 5,
      maintenance_technician: 1,
      quality_compliance: 2,
      logistics_staff: 2,
      production_manager: 1,
    },
    machines: {
      milling_line: 1,
      mixing_line: 1,
      baking_line: 2,
      cooking_line: 1,
      freezing_line: 1,
      packaging_line: 1,
    },
    upgrades: ["advanced_packaging", "throughput_expansion", "contract_production_line"],
    complianceScore: 0.9,
    complianceAuditPassed: true,
    contractSigned: true,
  });

  return (
    unlocked.includes("flour_kg") &&
    unlocked.includes("packaged_bread_unit") &&
    unlocked.includes("private_label_batch")
  );
}
