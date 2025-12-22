// src/core/services/decisionService.ts
import type {
  CompanyDecision,
  HoldingDecision,
  CompanyDecisionPayload,
  HoldingDecisionPayload,
  DecisionSource,
  CompanyId,
  HoldingId,
  WorldId,
  Year,
  WeekNumber,
} from "../domain";
import { decisionRepo } from "../persistence/decisionRepo";

/**
 * DecisionService
 * - World-scoped API
 * - Weekly decision sets (clear → insert)
 * - Used by UI + engine
 */
export const decisionService = {
  /* =========================
   * Company decisions
   * ========================= */

  async listCompanyDecisions(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
  }): Promise<CompanyDecision[]> {
    return decisionRepo.listCompanyDecisionsForWeek({
      worldId: input.worldId,
      companyId: input.companyId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },

  /**
   * Submit ONE decision payload for the week
   * (= replace weekly set)
   */
  async submitCompanyDecision(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
    source: DecisionSource;
    payload: CompanyDecisionPayload;
  }): Promise<CompanyDecision> {
    const year = Number(input.year);
    const week = Number(input.week);

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
    });
  },

  /**
   * Submit MULTIPLE decision payloads for the week
   * (= replace weekly set with log-style rows)
   */
  async replaceCompanyDecisions(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
    source: DecisionSource;
    payloads: CompanyDecisionPayload[];
  }): Promise<CompanyDecision[]> {
    const year = Number(input.year);
    const week = Number(input.week);

    await decisionRepo.deleteCompanyDecisionsForWeek({
      worldId: input.worldId,
      companyId: input.companyId,
      year,
      week,
    });

    const created: CompanyDecision[] = [];
    for (const payload of input.payloads) {
      created.push(
        await decisionRepo.insertCompanyDecision({
          worldId: input.worldId,
          companyId: input.companyId,
          year,
          week,
          source: input.source,
          payload,
        })
      );
    }

    return created;
  },

  async saveCompanyDecisions(input: {
    companyId: CompanyId;
    worldId: WorldId;
    year: Year;
    week: WeekNumber;
    source: DecisionSource;
    payloads: CompanyDecisionPayload[];
  }): Promise<CompanyDecision[]> {
    return this.replaceCompanyDecisions({
      companyId: input.companyId,
      worldId: input.worldId,
      year: input.year,
      week: input.week,
      source: input.source,
      payloads: input.payloads,
    });
  },

  async clearCompanyDecisions(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: Year;
    week: WeekNumber;
  }): Promise<void> {
    return decisionRepo.deleteCompanyDecisionsForWeek({
      worldId: input.worldId,
      companyId: input.companyId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },

  /* =========================
   * Holding decisions
   * ========================= */

  async listHoldingDecisions(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: Year;
    week: WeekNumber;
  }): Promise<HoldingDecision[]> {
    return decisionRepo.listHoldingDecisionsForWeek({
      worldId: input.worldId,
      holdingId: input.holdingId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },

  async submitHoldingDecision(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: Year;
    week: WeekNumber;
    source: DecisionSource;
    payload: HoldingDecisionPayload;
  }): Promise<HoldingDecision> {
    return decisionRepo.insertHoldingDecision({
      worldId: input.worldId,
      holdingId: input.holdingId,
      year: Number(input.year),
      week: Number(input.week),
      source: input.source,
      payload: input.payload,
    });
  },

  async clearHoldingDecisions(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: Year;
    week: WeekNumber;
  }): Promise<void> {
    return decisionRepo.deleteHoldingDecisionsForWeek({
      worldId: input.worldId,
      holdingId: input.holdingId,
      year: Number(input.year),
      week: Number(input.week),
    });
  },
};
