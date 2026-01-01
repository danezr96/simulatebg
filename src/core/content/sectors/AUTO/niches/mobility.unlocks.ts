import type {
  AssetRequirement,
  MobilityProductSku,
  StaffRequirement,
} from "./mobility.products";
import { mobilityProducts } from "./mobility.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
};

export type MobilityUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minUptimeScore?: number;
  minFleetTotal?: number;
  anyOf?: RequirementGroup[];
};

export type MobilityUnlock = {
  productSku: MobilityProductSku;
  startingUnlocked: boolean;
  requirements: MobilityUnlockRequirements;
};

export type MobilityCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  uptimeScore: number;
};

export const mobilityUnlocks: MobilityUnlock[] = [
  {
    productSku: "economy_rental_day_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "insurance_addon_day_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["online_booking_dynamic_pricing"],
      minReputationScore: 0.45,
    },
  },
  {
    productSku: "premium_rental_day_unit",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "fleet_premium_count", minCount: 2 }],
      staff: [{ roleId: "customer_support_staff", minFTE: 1 }],
      minReputationScore: 0.55,
    },
  },
  {
    productSku: "van_rental_day_unit",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "fleet_van_count", minCount: 2 }],
      staff: [{ roleId: "logistics_staff", minFTE: 1 }],
      minComplianceScore: 0.55,
    },
  },
  {
    productSku: "delivery_mobility_day_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["delivery_partnerships_program"],
      assets: [
        { assetId: "fleet_van_count", minCount: 2 },
        { assetId: "fleet_economy_count", minCount: 6 },
      ],
      staff: [{ roleId: "logistics_staff", minFTE: 1 }],
      minComplianceScore: 0.65,
      minUptimeScore: 0.85,
      minFleetTotal: 10,
    },
  },
  {
    productSku: "corporate_fleet_contract_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["corporate_contracting_sla_program"],
      staff: [{ roleId: "corporate_sales_staff", minFTE: 1 }],
      minComplianceScore: 0.7,
      minReputationScore: 0.6,
      minUptimeScore: 0.9,
      minFleetTotal: 18,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: MobilityCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: MobilityCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsUpgradeRequirements(
  state: MobilityCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsGroupRequirements(
  state: MobilityCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

function getFleetTotal(state: MobilityCompanyState): number {
  return (
    getCount(state.assets, "fleet_economy_count") +
    getCount(state.assets, "fleet_premium_count") +
    getCount(state.assets, "fleet_van_count")
  );
}

export function getUnlockedProducts(
  state: MobilityCompanyState
): MobilityProductSku[] {
  const unlocked = new Set<MobilityProductSku>();

  mobilityUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  mobilityUnlocks
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
      if (
        requirements.minUptimeScore !== undefined &&
        state.uptimeScore < requirements.minUptimeScore
      ) {
        return;
      }
      if (
        requirements.minFleetTotal !== undefined &&
        getFleetTotal(state) < requirements.minFleetTotal
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

  return mobilityProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testMobilityUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      fleet_economy_count: 12,
      fleet_premium_count: 3,
      fleet_van_count: 4,
      booking_system_enabled: 1,
    },
    staff: {
      ops_staff: 3,
      customer_support_staff: 2,
      corporate_sales_staff: 1,
      logistics_staff: 1,
    },
    upgrades: [
      "online_booking_dynamic_pricing",
      "delivery_partnerships_program",
      "corporate_contracting_sla_program",
    ],
    complianceScore: 0.78,
    reputationScore: 0.65,
    uptimeScore: 0.92,
  });

  return (
    unlocked.includes("economy_rental_day_unit") &&
    unlocked.includes("premium_rental_day_unit") &&
    unlocked.includes("corporate_fleet_contract_unit")
  );
}
