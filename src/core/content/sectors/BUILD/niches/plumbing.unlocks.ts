import type { PlumbingProductSku } from "./plumbing.products";
import { plumbingProducts } from "./plumbing.products";

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type RequirementGroup = {
  assets?: AssetRequirement[];
  upgrades?: string[];
  minMasterPlumberFte?: number;
  minDispatcherFte?: number;
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minPlumbersFte?: number;
  minMasterPlumberFte?: number;
  minApprenticesFte?: number;
  minDispatcherFte?: number;
  maxCallbackRate?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: PlumbingProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type PlumbingCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  callbackRate: number;
};

const PLUMBER_ROLE_ID = "plumbers_fte";
const MASTER_ROLE_ID = "master_plumber_fte";
const APPRENTICE_ROLE_ID = "apprentices_fte";
const DISPATCHER_ROLE_ID = "dispatcher_fte";

export const plumbingUnlocks: NicheUnlock[] = [
  {
    productSku: "residential_repair_visit_job_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "emergency_leak_callout_job_unit",
    startingUnlocked: false,
    requirements: {
      minPlumbersFte: 2,
      minReputationScore: 0.45,
      anyOf: [
        { assets: [{ assetId: "on_call_enabled", minCount: 1 }] },
        { upgrades: ["on_call_rotation_setup"] },
      ],
    },
  },
  {
    productSku: "boiler_heatpump_plumbing_service_job_unit",
    startingUnlocked: false,
    requirements: {
      minComplianceScore: 0.6,
      anyOf: [
        { upgrades: ["tooling_upgrade_pipe_press_camera"] },
        { minMasterPlumberFte: 1 },
      ],
    },
  },
  {
    productSku: "bathroom_installation_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["quality_checklist_pressure_testing"],
      minPlumbersFte: 3,
      minMasterPlumberFte: 1,
      assets: [{ assetId: "parts_inventory_value_eur", minCount: 12000 }],
    },
  },
  {
    productSku: "property_maintenance_contract_unit",
    startingUnlocked: false,
    requirements: {
      minReputationScore: 0.6,
      maxCallbackRate: 0.08,
      anyOf: [
        { minDispatcherFte: 1 },
        { upgrades: ["dispatcher_routing_discipline"] },
      ],
    },
  },
  {
    productSku: "commercial_fitout_plumbing_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["project_controls_system"],
      minComplianceScore: 0.7,
      minMasterPlumberFte: 1,
      assets: [{ assetId: "warranty_reserve_eur", minCount: 8000 }],
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: PlumbingCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsUpgradeRequirements(
  state: PlumbingCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsFteRequirements(
  state: PlumbingCompanyState,
  requirements: NicheUnlockRequirements
): boolean {
  if (
    requirements.minPlumbersFte !== undefined &&
    getCount(state.staff, PLUMBER_ROLE_ID) < requirements.minPlumbersFte
  ) {
    return false;
  }
  if (
    requirements.minMasterPlumberFte !== undefined &&
    getCount(state.staff, MASTER_ROLE_ID) < requirements.minMasterPlumberFte
  ) {
    return false;
  }
  if (
    requirements.minApprenticesFte !== undefined &&
    getCount(state.staff, APPRENTICE_ROLE_ID) < requirements.minApprenticesFte
  ) {
    return false;
  }
  if (
    requirements.minDispatcherFte !== undefined &&
    getCount(state.staff, DISPATCHER_ROLE_ID) < requirements.minDispatcherFte
  ) {
    return false;
  }
  return true;
}

function meetsGroupRequirements(
  state: PlumbingCompanyState,
  group: RequirementGroup
): boolean {
  if (
    group.minMasterPlumberFte !== undefined &&
    getCount(state.staff, MASTER_ROLE_ID) < group.minMasterPlumberFte
  ) {
    return false;
  }
  if (
    group.minDispatcherFte !== undefined &&
    getCount(state.staff, DISPATCHER_ROLE_ID) < group.minDispatcherFte
  ) {
    return false;
  }
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: PlumbingCompanyState
): PlumbingProductSku[] {
  const unlocked = new Set<PlumbingProductSku>();

  plumbingUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  plumbingUnlocks
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
        requirements.maxCallbackRate !== undefined &&
        state.callbackRate > requirements.maxCallbackRate
      ) {
        return;
      }
      if (!meetsAssetRequirements(state, requirements.assets)) {
        return;
      }
      if (!meetsFteRequirements(state, requirements)) {
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

  return plumbingProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testPlumbingUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      on_call_enabled: 1,
      parts_inventory_value_eur: 18000,
      warranty_reserve_eur: 12000,
    },
    staff: {
      plumbers_fte: 4,
      master_plumber_fte: 1,
      apprentices_fte: 1,
      dispatcher_fte: 1,
    },
    upgrades: [
      "quality_checklist_pressure_testing",
      "dispatcher_routing_discipline",
      "project_controls_system",
    ],
    complianceScore: 0.72,
    reputationScore: 0.65,
    callbackRate: 0.06,
  });

  return (
    unlocked.includes("residential_repair_visit_job_unit") &&
    unlocked.includes("emergency_leak_callout_job_unit") &&
    unlocked.includes("commercial_fitout_plumbing_job_unit")
  );
}
