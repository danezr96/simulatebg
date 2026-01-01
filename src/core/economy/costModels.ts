export type StaffRoleInput = {
  roleId: string;
  fte: number;
  weeklyCost: number;
};

export type AssetInput = {
  assetId: string;
  count: number;
  weeklyCost: number;
  energyUse?: number;
  maintenanceFactor?: number;
};

export function computeLaborCost(staff: StaffRoleInput[]): number {
  return staff.reduce((total, role) => {
    const fte = Math.max(0, role.fte);
    const weeklyCost = Math.max(0, role.weeklyCost);
    return total + fte * weeklyCost;
  }, 0);
}

export function computeEnergyCost(assets: AssetInput[], energyRate: number): number {
  const rate = Math.max(0, energyRate);
  return assets.reduce((total, asset) => {
    const count = Math.max(0, asset.count);
    const usage = Math.max(0, asset.energyUse ?? asset.weeklyCost);
    return total + count * usage * rate;
  }, 0);
}

export function computeMaintenanceCost(
  assets: AssetInput[],
  maintenanceRate: number
): number {
  const rate = Math.max(0, maintenanceRate);
  return assets.reduce((total, asset) => {
    const count = Math.max(0, asset.count);
    const weeklyCost = Math.max(0, asset.weeklyCost);
    const factor = Math.max(0, asset.maintenanceFactor ?? 1);
    return total + count * weeklyCost * factor * rate;
  }, 0);
}

export function testCostModels(): boolean {
  const labor = computeLaborCost([{ roleId: "ops", fte: 2, weeklyCost: 500 }]);
  const energy = computeEnergyCost(
    [{ assetId: "machine", count: 3, weeklyCost: 100, energyUse: 20 }],
    2
  );
  const maintenance = computeMaintenanceCost(
    [{ assetId: "machine", count: 2, weeklyCost: 200, maintenanceFactor: 1.5 }],
    0.1
  );
  return labor === 1000 && energy === 120 && maintenance === 60;
}
