import type {
  AssetRequirement,
  LivestockProductSku,
  MachineRequirement,
  StaffRequirement,
  VehicleRequirement,
} from "./livestock.products";
import { livestockProducts } from "./livestock.products";

export type RequirementGroup = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
  vehicles?: VehicleRequirement[];
  contractPickupAllowed?: boolean;
};

export type NicheUnlockRequirements = {
  assets?: AssetRequirement[];
  staff?: StaffRequirement[];
  machines?: MachineRequirement[];
  vehicles?: VehicleRequirement[];
  minWelfareScore?: number;
  minHealthScore?: number;
  minBiosecurityLevel?: number;
  minQualityScore?: number;
  complianceAuditPassed?: boolean;
  contractPickupAllowed?: boolean;
  anyOf?: RequirementGroup[];
};

export type NicheUnlock = {
  productSku: LivestockProductSku;
  startingUnlocked: boolean;
  requirements: NicheUnlockRequirements;
};

export type LivestockCompanyState = {
  assets: Record<string, number>;
  staff: Record<string, number>;
  machines: Record<string, number>;
  vehicles: Record<string, number>;
  welfareScore: number;
  healthScore: number;
  biosecurityLevel: number;
  complianceAuditPassed: boolean;
  qualityScore: number;
  contractPickupEnabled: boolean;
};

export const livestockUnlocks: NicheUnlock[] = [
  {
    productSku: "poultry_meat_kg",
    startingUnlocked: true,
    requirements: {},
  },
  {
    productSku: "eggs_dozen",
    startingUnlocked: false,
    requirements: {
      machines: [{ machineId: "egg_sorting_line", minCount: 1 }],
      staff: [{ roleId: "quality_compliance", minFTE: 1 }],
      minWelfareScore: 0.75,
    },
  },
  {
    productSku: "pork_kg",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "pens_capacity_animals", minCount: 20000 }],
      staff: [{ roleId: "feed_manager", minFTE: 1 }],
      vehicles: [{ vehicleId: "livestock_trailer", minCount: 1 }],
      minBiosecurityLevel: 0.6,
    },
  },
  {
    productSku: "beef_kg",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "barn_m2", minCount: 2000 }],
      staff: [{ roleId: "vet_health_officer", minFTE: 1 }],
      minWelfareScore: 0.8,
      complianceAuditPassed: true,
    },
  },
  {
    productSku: "hides_leather_kg",
    startingUnlocked: false,
    requirements: {
      staff: [{ roleId: "processing_operator", minFTE: 1 }],
      minQualityScore: 0.7,
      anyOf: [
        { vehicles: [{ vehicleId: "refrigerated_truck", minCount: 1 }] },
        { contractPickupAllowed: true },
      ],
    },
  },
  {
    productSku: "byproducts_rendered_kg",
    startingUnlocked: false,
    requirements: {
      assets: [{ assetId: "waste_processing_enabled", minCount: 1 }],
      anyOf: [
        { machines: [{ machineId: "rendering_unit", minCount: 1 }] },
        { machines: [{ machineId: "slaughter_line", minCount: 1 }] },
      ],
    },
  },
];

function getCount(source: Record<string, number>, key: string): number {
  return Math.max(0, source[key] ?? 0);
}

function meetsAssetRequirements(
  state: LivestockCompanyState,
  assets?: AssetRequirement[]
): boolean {
  if (!assets || assets.length === 0) {
    return true;
  }
  return assets.every((asset) => getCount(state.assets, asset.assetId) >= asset.minCount);
}

function meetsStaffRequirements(
  state: LivestockCompanyState,
  staff?: StaffRequirement[]
): boolean {
  if (!staff || staff.length === 0) {
    return true;
  }
  return staff.every((role) => getCount(state.staff, role.roleId) >= role.minFTE);
}

function meetsMachineRequirements(
  state: LivestockCompanyState,
  machines?: MachineRequirement[]
): boolean {
  if (!machines || machines.length === 0) {
    return true;
  }
  return machines.every(
    (machine) => getCount(state.machines, machine.machineId) >= machine.minCount
  );
}

function meetsVehicleRequirements(
  state: LivestockCompanyState,
  vehicles?: VehicleRequirement[]
): boolean {
  if (!vehicles || vehicles.length === 0) {
    return true;
  }
  return vehicles.every(
    (vehicle) => getCount(state.vehicles, vehicle.vehicleId) >= vehicle.minCount
  );
}

function meetsGroupRequirements(
  state: LivestockCompanyState,
  group: RequirementGroup
): boolean {
  const contractPickupOk =
    group.contractPickupAllowed === undefined
      ? true
      : group.contractPickupAllowed && state.contractPickupEnabled;

  return (
    contractPickupOk &&
    meetsAssetRequirements(state, group.assets) &&
    meetsStaffRequirements(state, group.staff) &&
    meetsMachineRequirements(state, group.machines) &&
    meetsVehicleRequirements(state, group.vehicles)
  );
}

export function getUnlockedProducts(
  state: LivestockCompanyState
): LivestockProductSku[] {
  const unlocked = new Set<LivestockProductSku>();

  livestockUnlocks
    .filter((unlock) => unlock.startingUnlocked)
    .forEach((unlock) => unlocked.add(unlock.productSku));

  livestockUnlocks
    .filter((unlock) => !unlock.startingUnlocked)
    .forEach((unlock) => {
      const { requirements } = unlock;
      if (
        requirements.minWelfareScore !== undefined &&
        state.welfareScore < requirements.minWelfareScore
      ) {
        return;
      }
      if (
        requirements.minHealthScore !== undefined &&
        state.healthScore < requirements.minHealthScore
      ) {
        return;
      }
      if (
        requirements.minBiosecurityLevel !== undefined &&
        state.biosecurityLevel < requirements.minBiosecurityLevel
      ) {
        return;
      }
      if (
        requirements.minQualityScore !== undefined &&
        state.qualityScore < requirements.minQualityScore
      ) {
        return;
      }
      if (requirements.complianceAuditPassed && !state.complianceAuditPassed) {
        return;
      }
      if (
        requirements.contractPickupAllowed &&
        !state.contractPickupEnabled
      ) {
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
      if (!meetsVehicleRequirements(state, requirements.vehicles)) {
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

  return livestockProducts
    .map((product) => product.sku)
    .filter((sku) => unlocked.has(sku));
}

export function testLivestockUnlocks(): boolean {
  const unlocked = getUnlockedProducts({
    assets: {
      pens_capacity_animals: 22000,
      barn_m2: 2200,
      waste_processing_enabled: 1,
    },
    staff: {
      animal_caretaker: 2,
      feed_manager: 1,
      processing_operator: 1,
      quality_compliance: 1,
      vet_health_officer: 1,
    },
    machines: {
      egg_sorting_line: 1,
      slaughter_line: 1,
      rendering_unit: 1,
    },
    vehicles: {
      livestock_trailer: 1,
      refrigerated_truck: 1,
    },
    welfareScore: 0.82,
    healthScore: 0.75,
    biosecurityLevel: 0.65,
    complianceAuditPassed: true,
    qualityScore: 0.8,
    contractPickupEnabled: true,
  });

  return (
    unlocked.includes("poultry_meat_kg") &&
    unlocked.includes("eggs_dozen") &&
    unlocked.includes("beef_kg") &&
    unlocked.includes("byproducts_rendered_kg")
  );
}
