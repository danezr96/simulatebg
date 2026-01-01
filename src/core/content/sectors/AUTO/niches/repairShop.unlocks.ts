import type {
  RepairShopProductSku,
  StaffRequirement,
} from "./repairShop.products";
import { repairShopProducts } from "./repairShop.products";

export type RepairShopUnlockRequirements = {
  serviceBaysMin?: number;
  liftsMin?: number;
  diagnosticToolsLevelMin?: number;
  evToolsRequired?: boolean;
  minComplianceScore?: number;
  minReputationScore?: number;
  staff?: StaffRequirement[];
  upgrades?: string[];
};

export type RepairShopUnlock = {
  productSku: RepairShopProductSku;
  startingUnlocked: boolean;
  requirements: RepairShopUnlockRequirements;
};

export type RepairShopCompanyState = {
  serviceBays: number;
  lifts: number;
  diagnosticToolsLevel: number;
  evToolsEnabled: boolean;
  complianceScore: number;
  reputationScore: number;
  staff: Record<string, number>;
  upgrades: string[];
};

export const repairShopUnlocks: RepairShopUnlock[] = [
  {
    productSku: "inspection_service_unit",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "oil_service_unit",
    startingUnlocked: false,
    requirements: {
      liftsMin: 1,
      staff: [{ roleId: "technician", minFTE: 1 }],
    },
  },
  {
    productSku: "tires_service_unit",
    startingUnlocked: false,
    requirements: {
      liftsMin: 1,
      staff: [{ roleId: "technician", minFTE: 2 }],
    },
  },
  {
    productSku: "brake_job_unit",
    startingUnlocked: false,
    requirements: {
      serviceBaysMin: 2,
      staff: [{ roleId: "technician", minFTE: 2 }],
      minReputationScore: 0.45,
    },
  },
  {
    productSku: "diagnostics_advanced_unit",
    startingUnlocked: false,
    requirements: {
      diagnosticToolsLevelMin: 2,
      staff: [{ roleId: "master_tech", minFTE: 1 }],
      minReputationScore: 0.55,
    },
  },
  {
    productSku: "ev_repair_job_unit",
    startingUnlocked: false,
    requirements: {
      diagnosticToolsLevelMin: 3,
      evToolsRequired: true,
      minComplianceScore: 0.75,
      minReputationScore: 0.6,
      staff: [{ roleId: "master_tech", minFTE: 1 }],
      upgrades: ["ev_certification_high_voltage_tools"],
    },
  },
];

function meetsStaffRequirements(
  staff: Record<string, number>,
  requirements?: StaffRequirement[]
): boolean {
  if (!requirements || requirements.length === 0) {
    return true;
  }
  return requirements.every((role) => (staff[role.roleId] ?? 0) >= role.minFTE);
}

export function getUnlockedProducts(
  state: RepairShopCompanyState
): RepairShopProductSku[] {
  const unlocked = new Set<RepairShopProductSku>();

  repairShopUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  repairShopUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const requirements = unlock.requirements;
      if (
        requirements.serviceBaysMin !== undefined &&
        state.serviceBays < requirements.serviceBaysMin
      ) {
        return;
      }
      if (
        requirements.liftsMin !== undefined &&
        state.lifts < requirements.liftsMin
      ) {
        return;
      }
      if (
        requirements.diagnosticToolsLevelMin !== undefined &&
        state.diagnosticToolsLevel < requirements.diagnosticToolsLevelMin
      ) {
        return;
      }
      if (
        requirements.evToolsRequired === true &&
        state.evToolsEnabled !== true
      ) {
        return;
      }
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
      if (!meetsStaffRequirements(state.staff, requirements.staff)) {
        return;
      }
      if (
        requirements.upgrades &&
        !requirements.upgrades.every((upgrade) => state.upgrades.includes(upgrade))
      ) {
        return;
      }
      unlocked.add(unlock.productSku);
    });

  return repairShopProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testRepairShopUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    serviceBays: 2,
    lifts: 2,
    diagnosticToolsLevel: 2,
    evToolsEnabled: false,
    complianceScore: 0.65,
    reputationScore: 0.6,
    staff: {
      technician: 2,
      master_tech: 1,
      service_advisor: 1,
    },
    upgrades: [],
  });

  return (
    unlocked.includes("inspection_service_unit") &&
    unlocked.includes("oil_service_unit") &&
    unlocked.includes("diagnostics_advanced_unit") &&
    !unlocked.includes("ev_repair_job_unit")
  );
}
