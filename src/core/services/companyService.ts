// src/core/services/companyService.ts
import type {
  Company,
  CompanyId,
  CompanyState,
  HoldingId,
  WorldId,
  SectorId,
  NicheId,
  Year,
  WeekNumber,
  DecisionSource,
} from "../domain";

import { companyRepo, type CompanyStateInput } from "../persistence/companyRepo";
import { holdingRepo } from "../persistence/holdingRepo";
import { financeRepo } from "../persistence/financeRepo";
import { decisionRepo } from "../persistence/decisionRepo";
import { sectorRepo } from "../persistence/sectorRepo";
import { getStartupPricing } from "../config/companyPricing";

/**
 * CompanyService responsibilities:
 * - CRUD companies
 * - Read/write company state (weekly)
 * - Fetch joined context (sector + niche + latest KPIs)
 * - Capture player/bot decisions for a given world/week
 */
export const companyService = {
  /* =========================
   * Companies
   * ========================= */

  async getCompany(companyId: CompanyId): Promise<Company> {
    const c = await companyRepo.getById(companyId);
    if (!c) throw new Error(`Company not found: ${String(companyId)}`);
    return c;
  },

  async listCompaniesByHolding(holdingId: HoldingId): Promise<Company[]> {
    return companyRepo.listByHolding(holdingId);
  },

  async createCompany(input: {
    holdingId: HoldingId;
    worldId: WorldId;
    sectorId: SectorId;
    nicheId: NicheId;
    name: string;
    region: string;
    foundedYear: number;
  }): Promise<Company> {
    const sector = await sectorRepo.getSectorById(input.sectorId);
    const niche = await sectorRepo.getNicheById(input.nicheId);
    if (!sector || !niche) {
      throw new Error("Sector or niche not found.");
    }
    if (String(niche.sectorId) !== String(input.sectorId)) {
      throw new Error("Niche does not belong to selected sector.");
    }

    const creationCost = Number(getStartupPricing(sector, niche).startupCost ?? 0);
    let charged = false;
    let currentCash = 0;

    if (creationCost > 0) {
      const holding = await holdingRepo.getById(input.holdingId);
      if (!holding) throw new Error("Holding not found.");

      currentCash = Number(holding.cashBalance ?? 0);
      if (currentCash < creationCost) {
        throw new Error(`Not enough cash to purchase a company (need ${creationCost}).`);
      }

      await holdingRepo.update(input.holdingId, {
        cashBalance: currentCash - creationCost,
      });
      charged = true;
    }

    try {
      return await companyRepo.create({
        holdingId: input.holdingId,
        worldId: input.worldId,
        sectorId: input.sectorId as unknown as string,
        nicheId: input.nicheId as unknown as string,
        name: input.name,
        region: input.region,
        foundedYear: input.foundedYear,
      });
    } catch (error) {
      if (charged) {
        await holdingRepo.update(input.holdingId, {
          cashBalance: currentCash,
        });
      }
      throw error;
    }
  },

  async updateCompany(
    companyId: CompanyId,
    patch: Partial<{
      name: string;
      status: Company["status"];
      region: string;
    }>
  ): Promise<Company> {
    return companyRepo.update(companyId, {
      name: patch.name,
      region: patch.region,
      status: patch.status as unknown as string,
    });
  },

  async deleteCompany(companyId: CompanyId): Promise<void> {
    await companyRepo.delete(companyId);
  },

  /* =========================
   * State + financials
   * ========================= */

  async getLatestState(companyId: CompanyId): Promise<CompanyState | null> {
    return companyRepo.getLatestState(companyId);
  },

  async getState(companyId: CompanyId, year: Year, week: WeekNumber): Promise<CompanyState | null> {
    return companyRepo.getState({
      companyId,
      year: Number(year),
      week: Number(week),
    });
  },

  async upsertState(state: CompanyStateInput): Promise<CompanyState> {
    return companyRepo.upsertState(state);
  },

  async getLatestFinancials(companyId: CompanyId) {
    return financeRepo.getLatestCompanyFinancials(companyId);
  },

  async listFinancials(companyId: CompanyId, limit = 52) {
    return financeRepo.listCompanyFinancials(companyId, limit);
  },

  /* =========================
   * Decisions (world-scoped)
   * ========================= */

  async listCompanyDecisions(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
  }) {
    return decisionRepo.listCompanyDecisionsForWeek({
      worldId: input.worldId, // ✅ required by repo
      companyId: input.companyId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },

  /**
   * "Upsert" behavior:
   * - delete existing decisions for that world/week/company
   * - insert a new one
   */
  async submitCompanyDecision(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
    source: DecisionSource;
    payload: unknown; // keep flexible while UI evolves
  }) {
    const year = Number(input.year);
    const week = Number(input.week);

    // ✅ repo expects worldId now
    await decisionRepo.deleteCompanyDecisionsForWeek({
      worldId: input.worldId,
      companyId: input.companyId,
      year,
      week,
    });

    return decisionRepo.insertCompanyDecision({
      worldId: input.worldId,
      companyId: input.companyId,
      year,
      week,
      source: input.source,
      payload: input.payload,
    } as any);
  },

  async clearCompanyDecisions(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
  }): Promise<void> {
    await decisionRepo.deleteCompanyDecisionsForWeek({
      worldId: input.worldId, // ✅ required by repo
      companyId: input.companyId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },

  /* =========================
   * Joined “detail view” helper
   * ========================= */

  async getCompanyDetailView(companyId: CompanyId): Promise<{
    company: Company;
    niche: unknown | null;
    sector: unknown | null;
    latestState: CompanyState | null;
    latestFinancials: unknown | null;
  }> {
    const company = await this.getCompany(companyId);

    // sectorRepo signatures can differ per phase; keep defensive.
    const [niche, sectors, latestState, latestFinancials] = await Promise.all([
      (sectorRepo as any).getNicheById?.(company.nicheId) ?? Promise.resolve(null),
      (sectorRepo as any).listSectors?.() ?? Promise.resolve([]),
      this.getLatestState(companyId),
      this.getLatestFinancials(companyId),
    ]);

    const sector =
      Array.isArray(sectors)
        ? (sectors as any[]).find((s) => String(s.id) === String(company.sectorId)) ?? null
        : null;

    return { company, niche, sector, latestState, latestFinancials };
  },
};
