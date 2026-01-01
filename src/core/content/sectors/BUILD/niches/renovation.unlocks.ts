import type { RenovationProductSku } from "./renovation.products";
import { renovationProducts } from "./renovation.products";

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type RequirementGroup = {
  assets?: AssetRequirement[];
  upgrades?: string[];
  minDefectDetectionScore?: number;
  minContractDisciplineScore?: number;
  maxSubcontractorDependencyScore?: number;
  minProjectManagerFte?: number;
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minCrewFte?: number;
  minSiteManagersFte?: number;
  minProjectManagerFte?: number;
  minContractDisciplineScore?: number;
  minDefectDetectionScore?: number;
  maxScheduleSlipScore?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: RenovationProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type RenovationCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  contractDisciplineScore: number;
  defectDetectionScore: number;
  scheduleSlipScore: number;
  subcontractorDependencyScore: number;
};

const CREW_ROLE_ID = "crew_fte";
const SITE_MANAGER_ROLE_ID = "site_managers_fte";
const PROJECT_MANAGER_ROLE_ID = "project_managers_fte";

export const renovationUnlocks: NicheUnlock[] = [
  {
    productSku: "small_repair_punchlist_job_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "bathroom_renovation_job_unit",
    startingUnlocked: false,
    requirements: {
      minCrewFte: 4,
      minReputationScore: 0.45,
      assets: [{ assetId: "materials_inventory_value_eur", minCount: 12000 }],
      anyOf: [
        { minDefectDetectionScore: 0.35 },
        { upgrades: ["preinspection_hidden_defect_detection"] },
      ],
    },
  },
  {
    productSku: "kitchen_renovation_job_unit",
    startingUnlocked: false,
    requirements: {
      minCrewFte: 4,
      minReputationScore: 0.5,
      anyOf: [
        { minContractDisciplineScore: 0.45, maxSubcontractorDependencyScore: 0.6 },
        { minContractDisciplineScore: 0.45, upgrades: ["preferred_subcontractor_network"] },
        { upgrades: ["contract_discipline_system"], maxSubcontractorDependencyScore: 0.6 },
        {
          upgrades: ["contract_discipline_system", "preferred_subcontractor_network"],
        },
      ],
    },
  },
  {
    productSku: "tenant_turnover_renovation_contract_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["property_manager_sales_engine"],
      minReputationScore: 0.6,
      maxScheduleSlipScore: 0.25,
      anyOf: [
        { minProjectManagerFte: 1 },
        { upgrades: ["project_controls_milestone_billing"] },
      ],
    },
  },
  {
    productSku: "insurance_restoration_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["insurance_documentation_compliance_pack"],
      minComplianceScore: 0.7,
      assets: [
        { assetId: "documentation_process_enabled", minCount: 1 },
        { assetId: "warranty_reserve_eur", minCount: 6000 },
      ],
    },
  },
  {
    productSku: "whole_home_renovation_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["project_controls_milestone_billing"],
      minProjectManagerFte: 1,
      minSiteManagersFte: 1,
      minContractDisciplineScore: 0.6,
      minDefectDetectionScore: 0.45,
      minReputationScore: 0.65,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: RenovationCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsUpgradeRequirements(
  state: RenovationCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsFteRequirements(
  state: RenovationCompanyState,
  requirements: NicheUnlockRequirements
): boolean {
  if (
    requirements.minCrewFte !== undefined &&
    getCount(state.staff, CREW_ROLE_ID) < requirements.minCrewFte
  ) {
    return false;
  }
  if (
    requirements.minSiteManagersFte !== undefined &&
    getCount(state.staff, SITE_MANAGER_ROLE_ID) < requirements.minSiteManagersFte
  ) {
    return false;
  }
  if (
    requirements.minProjectManagerFte !== undefined &&
    getCount(state.staff, PROJECT_MANAGER_ROLE_ID) < requirements.minProjectManagerFte
  ) {
    return false;
  }
  return true;
}

function meetsGroupRequirements(
  state: RenovationCompanyState,
  group: RequirementGroup
): boolean {
  if (
    group.minDefectDetectionScore !== undefined &&
    state.defectDetectionScore < group.minDefectDetectionScore
  ) {
    return false;
  }
  if (
    group.minContractDisciplineScore !== undefined &&
    state.contractDisciplineScore < group.minContractDisciplineScore
  ) {
    return false;
  }
  if (
    group.maxSubcontractorDependencyScore !== undefined &&
    state.subcontractorDependencyScore > group.maxSubcontractorDependencyScore
  ) {
    return false;
  }
  if (
    group.minProjectManagerFte !== undefined &&
    getCount(state.staff, PROJECT_MANAGER_ROLE_ID) < group.minProjectManagerFte
  ) {
    return false;
  }
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: RenovationCompanyState
): RenovationProductSku[] {
  const unlocked = new Set<RenovationProductSku>();

  renovationUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  renovationUnlocks
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
        requirements.minContractDisciplineScore !== undefined &&
        state.contractDisciplineScore < requirements.minContractDisciplineScore
      ) {
        return;
      }
      if (
        requirements.minDefectDetectionScore !== undefined &&
        state.defectDetectionScore < requirements.minDefectDetectionScore
      ) {
        return;
      }
      if (
        requirements.maxScheduleSlipScore !== undefined &&
        state.scheduleSlipScore > requirements.maxScheduleSlipScore
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

  return renovationProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testRenovationUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      materials_inventory_value_eur: 15000,
      documentation_process_enabled: 1,
      warranty_reserve_eur: 8000,
    },
    staff: {
      crew_fte: 6,
      site_managers_fte: 1,
      project_managers_fte: 1,
    },
    upgrades: [
      "contract_discipline_system",
      "preinspection_hidden_defect_detection",
      "project_controls_milestone_billing",
      "property_manager_sales_engine",
      "insurance_documentation_compliance_pack",
    ],
    complianceScore: 0.75,
    reputationScore: 0.7,
    contractDisciplineScore: 0.65,
    defectDetectionScore: 0.5,
    scheduleSlipScore: 0.2,
    subcontractorDependencyScore: 0.5,
  });

  return (
    unlocked.includes("small_repair_punchlist_job_unit") &&
    unlocked.includes("bathroom_renovation_job_unit") &&
    unlocked.includes("whole_home_renovation_job_unit") &&
    unlocked.includes("insurance_restoration_job_unit")
  );
}
