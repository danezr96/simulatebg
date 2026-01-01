import type {
  AssetRequirement,
  GreenhouseProductSku,
  MachineRequirement,
  StaffRequirement,
} from "./greenhouse.products";
import { greenhouseProducts } from "./greenhouse.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
  minClimateControlLevel?: number;
  co2InjectionRequired?: boolean;
  complianceAuditPassed?: boolean;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: GreenhouseProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type GreenhouseCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  machines: Record<string, number>;
  climateControlLevel: number;
  co2InjectionEnabled: boolean;
  complianceAuditPassed: boolean;
};

export const greenhouseUnlocks: NicheUnlock[] = [
  {
    productSku: "tomatoes_kg",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "cucumbers_kg",
    startingUnlocked: false,
    requirements: {
      minClimateControlLevel: 0.45,
      anyOf: [
        { machines: [{ machineId: "packaging_line", minCount: 1 }] },
        { staff: [{ roleId: "logistics_staff", minFTE: 2 }] },
      ],
    },
  },
  {
    productSku: "bell_peppers_kg",
    startingUnlocked: false,
    requirements: {
      minClimateControlLevel: 0.6,
      machines: [{ machineId: "sorting_line", minCount: 1 }],
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
    },
  },
  {
    productSku: "herbs_pack",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "packaging_line", minCount: 1 }],
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
    },
  },
  {
    productSku: "strawberries_kg",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "pest_management_system", minCount: 1 }],
      assets: [{ assetId: "cold_storage_kg", minCount: 1500 }],
      staff: [{ roleId: "maintenance_technician", minFTE: 1 }],
    },
  },
  {
    productSku: "microgreens_kg",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "led_lighting_system", minCount: 1 }],
      assets: [{ assetId: "co2_injection_enabled", minCount: 1 }],
      staff: [{ roleId: "grower", minFTE: 2 }],
      co2InjectionRequired: true,
      complianceAuditPassed: true,
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: GreenhouseCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: GreenhouseCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsMachineRequirements(
  state: GreenhouseCompanyState,
  machines?: MachineRequirement[]
): boolean {
  if (!machines || machines.length === 0) {
    return true;
  }
  return machines.every(
    (machine) => getCount(state.machines, machine.machineId) >= machine.minCount
  );
}

function meetsGroupRequirements(
  state: GreenhouseCompanyState,
  group: RequirementGroup
): boolean {
  return (
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsMachineRequirements(state, group.machines)
  );
}

export function getUnlockedProducts(
  state: GreenhouseCompanyState
): GreenhouseProductSku[] {
  const unlocked = new Set<GreenhouseProductSku>();

  greenhouseUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  greenhouseUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (
        requirements.minClimateControlLevel !== undefined &&
        state.climateControlLevel < requirements.minClimateControlLevel
      ) {
        return;
      }
      if (requirements.co2InjectionRequired && !state.co2InjectionEnabled) {
        return;
      }
      if (requirements.complianceAuditPassed && !state.complianceAuditPassed) {
        return;
      }
      if (!meetsAssetRequirements(state, requirements.assets)) {
        return;
      }
      if (!meetsStaffRequirements(state, requirements.staff)) {
        return;
      }
      if (!meetsMachineRequirements(state, requirements.machines)) {
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

  return greenhouseProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testGreenhouseUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      cold_storage_kg: 2000,
      co2_injection_enabled: 1,
    },
    staff: {
      grower: 2,
      quality_compliance: 1,
      logistics_staff: 2,
      maintenance_technician: 1,
    },
    machines: {
      climate_control_system: 1,
      packaging_line: 1,
      led_lighting_system: 1,
      pest_management_system: 1,
      sorting_line: 1,
    },
    climateControlLevel: 0.7,
    co2InjectionEnabled: true,
    complianceAuditPassed: true,
  });

  return (
    unlocked.includes("tomatoes_kg") &&
    unlocked.includes("cucumbers_kg") &&
    unlocked.includes("microgreens_kg")
  );
}
