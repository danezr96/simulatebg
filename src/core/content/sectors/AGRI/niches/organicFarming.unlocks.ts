import type {
  AssetRequirement,
  OrganicFarmingProductSku,
  StaffRequirement,
} from "./organicFarming.products";
import { organicFarmingProducts } from "./organicFarming.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minSoilHealthScore?: number;
  minRotationComplianceScore?: number;
  minAuditReadinessScore?: number;
  minReputationScore?: number;
  minWelfareScore?: number;
  requiresOrganicCertified?: boolean;
  minTicksSinceSyntheticInput?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: OrganicFarmingProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type OrganicFarmingCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  soilHealthScore: number;
  rotationComplianceScore: number;
  auditReadinessScore: number;
  brandReputationScore: number;
  organicCertified: boolean;
  welfareScore: number;
  syntheticInputUsedLastTicks: number;
};

export const organicFarmingUnlocks: NicheUnlock[] = [
  {
    productSku: "organic_grain_ton",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "organic_vegetables_kg",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "irrigation_system", minCount: 1 },
        { assetId: "compost_capacity_ton", minCount: 15 },
      ],
      staff: [{ roleId: "farm_worker", minFTE: 3 }],
      minRotationComplianceScore: 0.6,
      minSoilHealthScore: 0.5,
    },
  },
  {
    productSku: "farmers_market_slot_day",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "farmers_market_slots", minCount: 1 }],
      staff: [{ roleId: "sales_staff", minFTE: 1 }],
      minReputationScore: 0.55,
    },
  },
  {
    productSku: "csa_box_unit",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "packaging_line", minCount: 1 },
        { assetId: "csa_subscribers", minCount: 200 },
      ],
      staff: [{ roleId: "logistics_staff", minFTE: 2 }],
      minReputationScore: 0.65,
    },
  },
  {
    productSku: "organic_milk_liter",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "dairy_module_enabled", minCount: 1 }],
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
      requiresOrganicCertified: true,
      minWelfareScore: 0.75,
    },
  },
  {
    productSku: "premium_organic_contract_batch",
    startingUnlocked: false,
    requirements: {
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
      requiresOrganicCertified: true,
      minAuditReadinessScore: 0.75,
      minTicksSinceSyntheticInput: 6,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: OrganicFarmingCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: OrganicFarmingCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsUpgradeRequirements(
  state: OrganicFarmingCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsGroupRequirements(
  state: OrganicFarmingCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: OrganicFarmingCompanyState
): OrganicFarmingProductSku[] {
  const unlocked = new Set<OrganicFarmingProductSku>();

  organicFarmingUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  organicFarmingUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (
        requirements.minSoilHealthScore !== undefined &&
        state.soilHealthScore < requirements.minSoilHealthScore
      ) {
        return;
      }
      if (
        requirements.minRotationComplianceScore !== undefined &&
        state.rotationComplianceScore < requirements.minRotationComplianceScore
      ) {
        return;
      }
      if (
        requirements.minAuditReadinessScore !== undefined &&
        state.auditReadinessScore < requirements.minAuditReadinessScore
      ) {
        return;
      }
      if (
        requirements.minReputationScore !== undefined &&
        state.brandReputationScore < requirements.minReputationScore
      ) {
        return;
      }
      if (
        requirements.minWelfareScore !== undefined &&
        state.welfareScore < requirements.minWelfareScore
      ) {
        return;
      }
      if (requirements.requiresOrganicCertified && !state.organicCertified) {
        return;
      }
      if (
        requirements.minTicksSinceSyntheticInput !== undefined &&
        state.syntheticInputUsedLastTicks < requirements.minTicksSinceSyntheticInput
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

  return organicFarmingProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testOrganicFarmingUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      organic_arable_m2: 250000,
      irrigation_system: 1,
      compost_capacity_ton: 20,
      packaging_line: 1,
      csa_subscribers: 300,
      farmers_market_slots: 1,
      dairy_module_enabled: 1,
    },
    staff: {
      farm_worker: 4,
      logistics_staff: 2,
      sales_staff: 1,
      quality_compliance: 1,
    },
    upgrades: [],
    soilHealthScore: 0.65,
    rotationComplianceScore: 0.7,
    auditReadinessScore: 0.8,
    brandReputationScore: 0.7,
    organicCertified: true,
    welfareScore: 0.8,
    syntheticInputUsedLastTicks: 8,
  });

  return (
    unlocked.includes("organic_grain_ton") &&
    unlocked.includes("organic_vegetables_kg") &&
    unlocked.includes("premium_organic_contract_batch")
  );
}
