import type {
  AssetRequirement,
  CommercialBuildProductSku,
  StaffRequirement,
} from "./commercialBuild.products";
import { commercialBuildProducts } from "./commercialBuild.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minCashEur?: number;
  maxSubcontractorDependencyScore?: number;
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minCashEur?: number;
  minCrewFte?: number;
  minSupervisorFte?: number;
  minEstimatorFte?: number;
  maxSubcontractorDependencyScore?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: CommercialBuildProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type CommercialBuildCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  cashEur: number;
  complianceScore: number;
  reputationScore: number;
  subcontractorDependencyScore: number;
};

const CREW_ROLE_ID = "crew_fte";
const SUPERVISOR_ROLE_ID = "supervisors_fte";
const ESTIMATOR_ROLE_ID = "estimators_fte";

export const commercialBuildUnlocks: NicheUnlock[] = [
  {
    productSku: "maintenance_repair_retain_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "retail_unit_project_unit",
    startingUnlocked: false,
    requirements: {
      minCrewFte: 6,
      minSupervisorFte: 1,
      minReputationScore: 0.45,
    },
  },
  {
    productSku: "office_fitout_project_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["safety_program_certification"],
      minCrewFte: 10,
      minSupervisorFte: 2,
      minReputationScore: 0.55,
    },
  },
  {
    productSku: "warehouse_shell_project_unit",
    startingUnlocked: false,
    requirements: {
      minCrewFte: 14,
      minSupervisorFte: 2,
      minEstimatorFte: 1,
      minComplianceScore: 0.55,
      minCashEur: 350000,
      anyOf: [
        { assets: [{ assetId: "excavator_access", minCount: 1 }] },
        { assets: [{ assetId: "crane_access", minCount: 1 }] },
      ],
    },
  },
  {
    productSku: "industrial_extension_project_unit",
    startingUnlocked: false,
    requirements: {
      minCrewFte: 12,
      minSupervisorFte: 2,
      minEstimatorFte: 1,
      minComplianceScore: 0.6,
      anyOf: [
        { maxSubcontractorDependencyScore: 0.5 },
        { upgrades: ["subcontractor_network_sla"] },
      ],
    },
  },
  {
    productSku: "design_build_contract_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["design_coordination_capability"],
      minCrewFte: 16,
      minSupervisorFte: 3,
      minEstimatorFte: 2,
      minComplianceScore: 0.65,
      minReputationScore: 0.65,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: CommercialBuildCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: CommercialBuildCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsUpgradeRequirements(
  state: CommercialBuildCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsFteRequirements(
  state: CommercialBuildCompanyState,
  requirements: NicheUnlockRequirements
): boolean {
  if (
    requirements.minCrewFte !== undefined &&
    getCount(state.staff, CREW_ROLE_ID) < requirements.minCrewFte
  ) {
    return false;
  }
  if (
    requirements.minSupervisorFte !== undefined &&
    getCount(state.staff, SUPERVISOR_ROLE_ID) < requirements.minSupervisorFte
  ) {
    return false;
  }
  if (
    requirements.minEstimatorFte !== undefined &&
    getCount(state.staff, ESTIMATOR_ROLE_ID) < requirements.minEstimatorFte
  ) {
    return false;
  }
  return true;
}

function meetsSubcontractorRequirements(
  state: CommercialBuildCompanyState,
  maxDependencyScore?: number
): boolean {
  if (maxDependencyScore === undefined) {
    return true;
  }
  return state.subcontractorDependencyScore <= maxDependencyScore;
}

function meetsGroupRequirements(
  state: CommercialBuildCompanyState,
  group: RequirementGroup
): boolean {
  if (group.minCashEur !== undefined && state.cashEur < group.minCashEur) {
    return false;
  }
  if (
    group.maxSubcontractorDependencyScore !== undefined &&
    !meetsSubcontractorRequirements(state, group.maxSubcontractorDependencyScore)
  ) {
    return false;
  }
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: CommercialBuildCompanyState
): CommercialBuildProductSku[] {
  const unlocked = new Set<CommercialBuildProductSku>();

  commercialBuildUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  commercialBuildUnlocks
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
        requirements.maxSubcontractorDependencyScore !== undefined &&
        !meetsSubcontractorRequirements(
          state,
          requirements.maxSubcontractorDependencyScore
        )
      ) {
        return;
      }
      if (!meetsAssetRequirements(state, requirements.assets)) {
        return;
      }
      if (!meetsStaffRequirements(state, requirements.staff)) {
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

  return commercialBuildProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testCommercialBuildUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      excavator_access: 1,
      crane_access: 0,
    },
    staff: {
      crew_fte: 18,
      supervisors_fte: 3,
      estimators_fte: 2,
    },
    upgrades: ["design_coordination_capability", "safety_program_certification"],
    cashEur: 600000,
    complianceScore: 0.7,
    reputationScore: 0.7,
    subcontractorDependencyScore: 0.45,
  });

  return (
    unlocked.includes("maintenance_repair_retain_unit") &&
    unlocked.includes("warehouse_shell_project_unit") &&
    unlocked.includes("design_build_contract_unit")
  );
}
