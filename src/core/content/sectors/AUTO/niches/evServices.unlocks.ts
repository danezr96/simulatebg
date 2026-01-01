import type {
  AssetRequirement,
  EvServicesProductSku,
  StaffRequirement,
} from "./evServices.products";
import { evServicesProducts } from "./evServices.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
};

export type EvServicesUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minUptimeScore?: number;
  minChargersTotal?: number;
  anyOf?: RequirementGroup[];
};

export type EvServicesUnlock = {
  productSku: EvServicesProductSku;
  startingUnlocked: boolean;
  requirements: EvServicesUnlockRequirements;
};

export type EvServicesCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  uptimeScore: number;
};

export const evServicesUnlocks: EvServicesUnlock[] = [
  {
    productSku: "ac_charge_session_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "kwh_energy_sale_kwh",
    startingUnlocked: false,
    requirements: {
      minComplianceScore: 0.55,
      anyOf: [
        { assets: [{ assetId: "metering_enabled", minCount: 1 }] },
        { upgrades: ["smart_metering_dynamic_pricing"] },
      ],
    },
  },
  {
    productSku: "dc_fast_charge_session_unit",
    startingUnlocked: false,
    requirements: {
      assets: [
        { assetId: "chargers_dc_count", minCount: 1 },
        { assetId: "grid_capacity_kw", minCount: 180 },
      ],
      upgrades: ["electrical_safety_program"],
      minComplianceScore: 0.65,
    },
  },
  {
    productSku: "charging_membership_monthly_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["crm_billing_system"],
      minReputationScore: 0.55,
      minUptimeScore: 0.85,
    },
  },
  {
    productSku: "fleet_charging_contract_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["fleet_partnerships_program"],
      minComplianceScore: 0.7,
      minReputationScore: 0.6,
      minUptimeScore: 0.9,
      minChargersTotal: 6,
    },
  },
  {
    productSku: "installation_service_unit",
    startingUnlocked: false,
    requirements: {
      staff: [{ roleId: "certified_installer", minFTE: 1 }],
      upgrades: ["site_permitting_pipeline"],
      minComplianceScore: 0.75,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: EvServicesCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: EvServicesCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsUpgradeRequirements(
  state: EvServicesCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsGroupRequirements(
  state: EvServicesCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: EvServicesCompanyState
): EvServicesProductSku[] {
  const unlocked = new Set<EvServicesProductSku>();

  evServicesUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  evServicesUnlocks
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
        requirements.minChargersTotal !== undefined &&
        getCount(state.assets, "chargers_ac_count") +
          getCount(state.assets, "chargers_dc_count") <
          requirements.minChargersTotal
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

  return evServicesProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testEvServicesUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      chargers_ac_count: 6,
      chargers_dc_count: 2,
      grid_capacity_kw: 260,
      metering_enabled: 1,
    },
    staff: {
      operations_tech: 2,
      support_agent: 1,
      certified_installer: 1,
    },
    upgrades: [
      "smart_metering_dynamic_pricing",
      "electrical_safety_program",
      "crm_billing_system",
      "fleet_partnerships_program",
      "site_permitting_pipeline",
    ],
    complianceScore: 0.8,
    reputationScore: 0.65,
    uptimeScore: 0.92,
  });

  return (
    unlocked.includes("ac_charge_session_unit") &&
    unlocked.includes("dc_fast_charge_session_unit") &&
    unlocked.includes("fleet_charging_contract_unit") &&
    unlocked.includes("installation_service_unit")
  );
}
