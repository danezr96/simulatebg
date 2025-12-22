// src/core/services/upgradeService.ts
import type { CompanyId, NicheId, WorldId } from "../domain";
import { upgradeRepo } from "../persistence/upgradeRepo";

export const upgradeService = {
  async listNicheUpgrades(nicheId: NicheId) {
    return upgradeRepo.listNicheUpgrades(nicheId);
  },

  async listCompanyUpgrades(companyId: CompanyId) {
    return upgradeRepo.listCompanyUpgrades(companyId);
  },

  async listCompanyUpgradesByWorld(worldId: WorldId) {
    return upgradeRepo.listCompanyUpgradesByWorld(worldId);
  },
};
