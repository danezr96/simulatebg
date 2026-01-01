import type { ElectricalProductSku } from "./electrical.products";
import { electricalProducts } from "./electrical.products";

export type AssetRequirement = {
  assetId: string;
  minCount: number;
};

export type RequirementGroup = {
  assets?: AssetRequirement[];
  upgrades?: string[];
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  upgrades?: string[];
  minComplianceScore?: number;
  minReputationScore?: number;
  minElectriciansFte?: number;
  minMasterElectricianFte?: number;
  minSchedulerFte?: number;
  minCertificationLevel?: number;
  minInspectionPassRate?: number;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: ElectricalProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type ElectricalCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  upgrades: string[];
  complianceScore: number;
  reputationScore: number;
  certificationLevel: number;
  inspectionPassRate: number;
};

const ELECTRICIAN_ROLE_ID = "electricians_fte";
const MASTER_ROLE_ID = "master_electrician_fte";
const SCHEDULER_ROLE_ID = "scheduler_fte";

export const electricalUnlocks: NicheUnlock[] = [
  {
    productSku: "residential_wiring_job_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "emergency_callout_job_unit",
    startingUnlocked: false,
    requirements: {
      minElectriciansFte: 2,
      minReputationScore: 0.45,
      anyOf: [
        { assets: [{ assetId: "overtime_enabled", minCount: 1 }] },
        { upgrades: ["on_call_team_setup"] },
      ],
    },
  },
  {
    productSku: "solar_inverter_install_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["safety_certification_compliance_pack"],
      minCertificationLevel: 1,
      minComplianceScore: 0.6,
    },
  },
  {
    productSku: "commercial_fitout_electrical_job_unit",
    startingUnlocked: false,
    requirements: {
      minElectriciansFte: 6,
      minMasterElectricianFte: 1,
      minSchedulerFte: 1,
      minCertificationLevel: 2,
      minReputationScore: 0.55,
    },
  },
  {
    productSku: "industrial_panel_upgrade_job_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["testing_commissioning_tools"],
      minElectriciansFte: 5,
      minMasterElectricianFte: 1,
      minSchedulerFte: 1,
      minCertificationLevel: 2,
      minComplianceScore: 0.7,
    },
  },
  {
    productSku: "annual_maintenance_contract_unit",
    startingUnlocked: false,
    requirements: {
      upgrades: ["scheduling_software_dispatch"],
      minInspectionPassRate: 0.9,
      minReputationScore: 0.6,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: ElectricalCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsUpgradeRequirements(
  state: ElectricalCompanyState,
  upgrades?: string[]
): boolean {
  if (!upgrades || upgrades.length === 0) {
    return true;
  }
  return upgrades.every((upgrade) => state.upgrades.includes(upgrade));
}

function meetsFteRequirements(
  state: ElectricalCompanyState,
  requirements: NicheUnlockRequirements
): boolean {
  if (
    requirements.minElectriciansFte !== undefined &&
    getCount(state.staff, ELECTRICIAN_ROLE_ID) < requirements.minElectriciansFte
  ) {
    return false;
  }
  if (
    requirements.minMasterElectricianFte !== undefined &&
    getCount(state.staff, MASTER_ROLE_ID) < requirements.minMasterElectricianFte
  ) {
    return false;
  }
  if (
    requirements.minSchedulerFte !== undefined &&
    getCount(state.staff, SCHEDULER_ROLE_ID) < requirements.minSchedulerFte
  ) {
    return false;
  }
  return true;
}

function meetsGroupRequirements(
  state: ElectricalCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsUpgradeRequirements(state, group.upgrades)
  );
}

export function getUnlockedProducts(
  state: ElectricalCompanyState
): ElectricalProductSku[] {
  const unlocked = new Set<ElectricalProductSku>();

  electricalUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  electricalUnlocks
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
      if (
        requirements.minInspectionPassRate !== undefined &&
        state.inspectionPassRate < requirements.minInspectionPassRate
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

  return electricalProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testElectricalUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      overtime_enabled: 1,
    },
    staff: {
      electricians_fte: 6,
      master_electrician_fte: 1,
      scheduler_fte: 1,
    },
    upgrades: ["safety_certification_compliance_pack", "testing_commissioning_tools"],
    complianceScore: 0.75,
    reputationScore: 0.6,
    certificationLevel: 2,
    inspectionPassRate: 0.92,
  });

  return (
    unlocked.includes("residential_wiring_job_unit") &&
    unlocked.includes("emergency_callout_job_unit") &&
    unlocked.includes("industrial_panel_upgrade_job_unit")
  );
}
