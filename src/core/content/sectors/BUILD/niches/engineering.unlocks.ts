import type { EngineeringProductSku } from "./engineering.products";
import { engineeringProducts } from "./engineering.products";

export type RequirementGroup = {
  upgrades?: string[];
  minSeniorEngineersFte?: number;
};

export type NicheUnlockRequirements = {
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minEngineersFte?: number;
  minSeniorEngineersFte?: number;
  minProjectManagerFte?: number;
  minBimSpecialistFte?: number;
  minCertificationLevel?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: EngineeringProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type EngineeringCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  certificationLevel: number;
};

const ENGINEER_ROLE_ID = "engineers_fte";
const SENIOR_ENGINEER_ROLE_ID = "senior_engineers_fte";
const PROJECT_MANAGER_ROLE_ID = "project_managers_fte";
const BIM_SPECIALIST_ROLE_ID = "bim_specialists_fte";

export const engineeringUnlocks: NicheUnlock[] = [
  {
    productSku: "permitting_and_code_review_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "geotechnical_survey_unit",
    startingUnlocked: false,
    requirements: {
      minComplianceScore: 0.55,
      anyOf: [
        { upgrades: ["subcontractor_framework_specialty"] },
        { minSeniorEngineersFte: 1 },
      ],
    },
  },
  {
    productSku: "structural_design_package_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["qa_baseline_checklist"],
      minEngineersFte: 2,
      minSeniorEngineersFte: 1,
      minReputationScore: 0.5,
    },
  },
  {
    productSku: "mep_design_package_unit",
    startingUnlocked: false,
    requirements: {
      minEngineersFte: 3,
      minSeniorEngineersFte: 1,
      minProjectManagerFte: 1,
      minCertificationLevel: 1,
      minComplianceScore: 0.6,
    },
  },
  {
    productSku: "bim_coordination_service_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["software_stack_cad_bim"],
      minBimSpecialistFte: 1,
      minReputationScore: 0.6,
    },
  },
  {
    productSku: "owner_rep_project_management_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["governance_reporting_process"],
      minProjectManagerFte: 1,
      minComplianceScore: 0.7,
      minReputationScore: 0.65,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsUpgradeRequirements(
  state: EngineeringCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsFteRequirements(
  state: EngineeringCompanyState,
  requirements: NicheUnlockRequirements
): boolean {
  if (
    requirements.minEngineersFte !== undefined &&
    getCount(state.staff, ENGINEER_ROLE_ID) < requirements.minEngineersFte
  ) {
    return false;
  }
  if (
    requirements.minSeniorEngineersFte !== undefined &&
    getCount(state.staff, SENIOR_ENGINEER_ROLE_ID) < requirements.minSeniorEngineersFte
  ) {
    return false;
  }
  if (
    requirements.minProjectManagerFte !== undefined &&
    getCount(state.staff, PROJECT_MANAGER_ROLE_ID) < requirements.minProjectManagerFte
  ) {
    return false;
  }
  if (
    requirements.minBimSpecialistFte !== undefined &&
    getCount(state.staff, BIM_SPECIALIST_ROLE_ID) < requirements.minBimSpecialistFte
  ) {
    return false;
  }
  return true;
}

function meetsGroupRequirements(
  state: EngineeringCompanyState,
  group: RequirementGroup
): boolean {
  if (
    group.minSeniorEngineersFte !== undefined &&
    getCount(state.staff, SENIOR_ENGINEER_ROLE_ID) < group.minSeniorEngineersFte
  ) {
    return false;
  }
  return meetsUpgradeRequirements(state, group.upgrades);
}

export function getUnlockedProducts(
  state: EngineeringCompanyState
): EngineeringProductSku[] {
  const unlocked = new Set<EngineeringProductSku>();

  engineeringUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  engineeringUnlocks
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
        requirements.minCertificationLevel !== undefined &&
        state.certificationLevel < requirements.minCertificationLevel
      ) {
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

  return engineeringProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testEngineeringUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {},
    staff: {
      engineers_fte: 3,
      senior_engineers_fte: 1,
      project_managers_fte: 1,
      bim_specialists_fte: 1,
    },
    upgrades: [
      "qa_baseline_checklist",
      "software_stack_cad_bim",
      "governance_reporting_process",
    ],
    complianceScore: 0.75,
    reputationScore: 0.7,
    certificationLevel: 1,
  });

  return (
    unlocked.includes("permitting_and_code_review_unit") &&
    unlocked.includes("structural_design_package_unit") &&
    unlocked.includes("bim_coordination_service_unit")
  );
}
