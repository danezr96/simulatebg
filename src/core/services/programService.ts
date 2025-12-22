// src/core/services/programService.ts
import type { CompanyId, WorldId } from "../domain";
import { programRepo } from "../persistence/programRepo";

export const programService = {
  async listCompanyPrograms(companyId: CompanyId) {
    return programRepo.listByCompany({ companyId });
  },

  async listWorldPrograms(worldId: WorldId, status?: string) {
    return programRepo.listByWorld({ worldId, status });
  },
};
