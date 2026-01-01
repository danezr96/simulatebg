import type {
  AssetRequirement,
  CarDealerProductSku,
  StaffRequirement,
} from "./carDealer.products";
import { carDealerProducts } from "./carDealer.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minCashEur?: number;
  complianceAuditPassed?: boolean;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: CarDealerProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type CarDealerCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  cashEur: number;
  complianceScore: number;
  reputationScore: number;
  complianceAuditPassed: boolean;
};

export const carDealerUnlocks: NicheUnlock[] = [
  {
    productSku: "used_car_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "detailing_service_unit",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "reconditioning_bays", minCount: 1 }],
      staff: [{ roleId: "service_staff", minFTE: 1 }],
    },
  },
  {
    productSku: "trade_in_unit",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "appraisal_tools", minCount: 1 }],
      staff: [{ roleId: "sales_staff", minFTE: 1 }],
      minCashEur: 60000,
    },
  },
  {
    productSku: "financing_contract_unit",
    startingUnlocked: false,
    requirements: {
      staff: [{ roleId: "finance_staff", minFTE: 1 }],
      minComplianceScore: 0.7,
      complianceAuditPassed: true,
    },
  },
  {
    productSku: "extended_warranty_unit",
    startingUnlocked: false,
    requirements: {
      minComplianceScore: 0.75,
      minReputationScore: 0.55,
      anyOf: [
        { staff: [{ roleId: "finance_staff", minFTE: 1 }] },
        { staff: [{ roleId: "service_manager", minFTE: 1 }] },
      ],
    },
  },
  {
    productSku: "new_car_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["manufacturer_dealership_agreement"],
      assets: [
        { assetId: "showroom_m2", minCount: 320 },
        { assetId: "inventory_slots", minCount: 20 },
      ],
      staff: [{ roleId: "sales_staff", minFTE: 2 }],
      minReputationScore: 0.6,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: CarDealerCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: CarDealerCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsUpgradeRequirements(
  state: CarDealerCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsGroupRequirements(
  state: CarDealerCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: CarDealerCompanyState
): CarDealerProductSku[] {
  const unlocked = new Set<CarDealerProductSku>();

  carDealerUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  carDealerUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (
        requirements.minComplianceScore !== undefined &&
        state.complianceScore < requirements.minComplianceScore
      ) {
        return;
      }
      if (
        requirements.minReputationScore !== undefined &&
        state.reputationScore < requirements.minReputationScore
      ) {
        return;
      }
      if (requirements.minCashEur !== undefined && state.cashEur < requirements.minCashEur) {
        return;
      }
      if (
        requirements.complianceAuditPassed === true &&
        !state.complianceAuditPassed
      ) {
        return;
      }
      if (!meetsAssetRequirements(state, requirements.assets)) {
        return;
      }
      if (!meetsStaffRequirements(state, requirements.staff)) {
        return;
      }
      if (!meetsUpgradeRequirements(state, requirements.upgrades)) {
        return;
      }
      if (requirements.anyOf && requirements.anyOf.length > 0) {
        const anySatisfied = requirements.anyOf.some((group) =>
          meetsGroupRequirements(state, group)
        );
        if (!anySatisfied) {
          return;
        }
      }
      unlocked.add(unlock.productSku);
    });

  return carDealerProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testCarDealerUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      showroom_m2: 400,
      inventory_slots: 30,
      appraisal_tools: 1,
      reconditioning_bays: 2,
    },
    staff: {
      sales_staff: 2,
      service_staff: 1,
      finance_staff: 1,
      service_manager: 0,
    },
    upgrades: ["manufacturer_dealership_agreement"],
    cashEur: 200000,
    complianceScore: 0.85,
    reputationScore: 0.7,
    complianceAuditPassed: true,
  });

  return (
    unlocked.includes("used_car_unit") &&
    unlocked.includes("financing_contract_unit") &&
    unlocked.includes("new_car_unit")
  );
}
