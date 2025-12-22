// src/core/services/holdingService.ts
import type {
  Holding,
  HoldingId,
  PlayerId,
  WorldId,
} from "../domain";
import { holdingRepo } from "../persistence/holdingRepo";
import { financeRepo } from "../persistence/financeRepo";
// create later
import { companyRepo } from "../persistence/companyRepo";

/**
 * HoldingService responsibilities:
 * - Read/update holding finance
 * - Aggregate holding dashboard (net worth, companies, loans)
 * - Simple money movements (inject capital, dividend, etc.) will be added here later
 */
export const holdingService = {
  async getHolding(holdingId: HoldingId): Promise<Holding> {
    const h = await holdingRepo.getById(holdingId);
    if (!h) throw new Error(`Holding not found: ${holdingId}`);
    return h;
  },

  async getHoldingByPlayerAndWorld(playerId: PlayerId, worldId: WorldId): Promise<Holding | null> {
    return holdingRepo.getByPlayerAndWorld(playerId, worldId);
  },

  async listHoldingsByPlayer(playerId: PlayerId): Promise<Holding[]> {
    return holdingRepo.listByPlayer(playerId);
  },

  async updateHolding(
    holdingId: HoldingId,
    patch: Partial<{
      name: string;
      baseCurrency: string;
      status: Holding["status"];
      cashBalance: number;
      totalEquity: number;
      totalDebt: number;
      prestigeLevel: number;
    }>
  ): Promise<Holding> {
    return holdingRepo.update(holdingId, patch);
  },

  /**
   * Dashboard aggregation for the holding overview panel.
   */
  async getHoldingDashboard(holdingId: HoldingId): Promise<{
    holding: Holding;
    companiesCount: number;
    activeCompaniesCount: number;
    loansTotalOutstanding: number;
    cashBalance: number;
    // netWorth can be computed later when properties/investments are in
  }> {
    const holding = await this.getHolding(holdingId);

    const companies = await companyRepo.listByHolding(holdingId);
    const activeCompaniesCount = companies.filter((c) => c.status === "ACTIVE").length;

    const loans = await financeRepo.listLoansByHolding(holdingId);
    const loansTotalOutstanding = loans.reduce(
      (sum, l) => sum + Number(l.outstandingBalance),
      0
    );

    return {
      holding,
      companiesCount: companies.length,
      activeCompaniesCount,
      loansTotalOutstanding,
      cashBalance: Number(holding.cashBalance),
    };
  },
};
