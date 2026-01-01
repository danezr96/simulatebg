import type {
  AssetRequirement,
  DairyProductSku,
  StaffRequirement,
} from "./dairy.products";
import { dairyProducts } from "./dairy.products";

export type MachineRequirement = {
  machineId: string;
  minCount: number;
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
  minHealthScore?: number;
  complianceAuditPassed?: boolean;
  byproductOf?: DairyProductSku[];
};

export type NicheUnlock = {
  productSku: DairyProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type DairyCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  machines: Record<string, number>;
  vehicles: Record<string, number>;
  healthScore: number;
  complianceScore: number;
  complianceAuditPassed: boolean;
  activeProducts?: DairyProductSku[];
};

export const dairyUnlocks: NicheUnlock[] = [
  {
    productSku: "raw_milk_bulk_liter",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "premium_milk_liter",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "pasteurizer", minCount: 1 }],
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
      minHealthScore: 0.85,
    },
  },
  {
    productSku: "cheese_kg",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "cheese_vat", minCount: 2 }],
      staff: [{ roleId: "processing_operator", minFTE: 2 }],
      assets: [{ assetId: "cold_storage_kg", minCount: 1000 }],
      complianceAuditPassed: true,
    },
  },
  {
    productSku: "yogurt_kg",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "fermentation_tank", minCount: 1 }],
      staff: [{ roleId: "processing_operator", minFTE: 2 }],
    },
  },
  {
    productSku: "butter_kg",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "butter_churn", minCount: 1 }],
      assets: [{ assetId: "cold_storage_kg", minCount: 800 }],
    },
  },
  {
    productSku: "whey_liter",
    startingUnlocked: false,
    requirements: {
      byproductOf: ["cheese_kg", "butter_kg"],
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: DairyCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: DairyCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsMachineRequirements(
  state: DairyCompanyState,
  machines?: MachineRequirement[]
): boolean {
  if (!machines || machines.length === 0) {
    return true;
  }
  return machines.every(
    (machine) => getCount(state.machines, machine.machineId) >= machine.minCount
  );
}

export function getUnlockedProducts(state: DairyCompanyState): DairyProductSku[] {
  const unlocked = new Set<DairyProductSku>();

  dairyUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  dairyUnlocks
    .filter((unlock) => !unlock.startingUnlocked && !unlock.requirements.byproductOf)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (requirements.minHealthScore !== undefined) {
        if (state.healthScore < requirements.minHealthScore) {
          return;
        }
      }
      if (requirements.complianceAuditPassed === true && !state.complianceAuditPassed) {
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
      unlocked.add(unlock.productSku);
    });

  const activeProducts = state.activeProducts ?? [];
  const byproductUnlocked =
    activeProducts.includes("cheese_kg") ||
    activeProducts.includes("butter_kg") ||
    unlocked.has("cheese_kg") ||
    unlocked.has("butter_kg");

  if (byproductUnlocked) {
    unlocked.add("whey_liter");
  }

  return dairyProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testDairyUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: { cold_storage_kg: 1200 },
    staff: { processing_operator: 2, quality_compliance: 1 },
    machines: { pasteurizer: 1, cheese_vat: 2 },
    vehicles: {},
    healthScore: 0.9,
    complianceScore: 0.9,
    complianceAuditPassed: true,
    activeProducts: ["cheese_kg"],
  });

  return (
    unlocked.includes("raw_milk_bulk_liter") &&
    unlocked.includes("premium_milk_liter") &&
    unlocked.includes("cheese_kg") &&
    unlocked.includes("whey_liter")
  );
}
