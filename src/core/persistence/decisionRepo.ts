// src/core/persistence/decisionRepo.ts
import { supabase } from "./supabaseClient";
import type { Database, Json } from "../../supabase/database.types";
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
  Timestamp,
} from "../domain";

/**
 * Tables:
 * - company_decisions
 * - holding_decisions
 */

type CompanyDecisionRow = Database["public"]["Tables"]["company_decisions"]["Row"];
type CompanyDecisionInsert = Database["public"]["Tables"]["company_decisions"]["Insert"];

type HoldingDecisionRow = Database["public"]["Tables"]["holding_decisions"]["Row"];
type HoldingDecisionInsert = Database["public"]["Tables"]["holding_decisions"]["Insert"];

/* =========================
 * Mappers
 * ========================= */

function mapCompanyDecision(row: CompanyDecisionRow): CompanyDecision {
  return {
    id: row.id,
    companyId: row.company_id as unknown as CompanyId,
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    source: row.source as unknown as DecisionSource,
    payload: (row.payload ?? {}) as unknown as CompanyDecisionPayload,
    createdAt: row.created_at as unknown as Timestamp,
  };
}

function mapHoldingDecision(row: HoldingDecisionRow): HoldingDecision {
  return {
    id: row.id,
    holdingId: row.holding_id as unknown as HoldingId,
    worldId: row.world_id as unknown as WorldId,
    year: row.year as unknown as Year,
    week: row.week as unknown as WeekNumber,
    source: row.source as unknown as DecisionSource,
    payload: (row.payload ?? {}) as unknown as HoldingDecisionPayload,
    createdAt: row.created_at as unknown as Timestamp,
  };
}

/**
 * Helper: schema requires NOT NULL `type`
 * (stored in DB only, never mapped back onto CompanyDecision/HoldingDecision)
 */
function decisionTypeFromPayload(payload: unknown): string {
  const t = (payload as any)?.type;
  return typeof t === "string" && t.length > 0 ? t : "UNKNOWN";
}

/* =========================
 * Repo
 * ========================= */

export const decisionRepo = {
  /* =========================
   * Company decisions
   * ========================= */

  async listCompanyDecisionsForWeek(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: number;
    week: number;
    createdBefore?: Timestamp;
  }): Promise<CompanyDecision[]> {
    let query = supabase
      .from("company_decisions")
      .select("*")
      .eq("world_id", input.worldId as unknown as string)
      .eq("company_id", input.companyId as unknown as string)
      .eq("year", input.year)
      .eq("week", input.week)
      .order("created_at", { ascending: true });

    if (input.createdBefore) {
      query = query.lte("created_at", input.createdBefore as unknown as string);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as unknown as CompanyDecisionRow[];
    return rows.map(mapCompanyDecision);
  },

  async insertCompanyDecision(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: number;
    week: number;
    source: DecisionSource;
    payload: CompanyDecisionPayload;
  }): Promise<CompanyDecision> {
    const insert: CompanyDecisionInsert = {
      world_id: input.worldId as unknown as string,
      company_id: input.companyId as unknown as string,
      year: input.year,
      week: input.week,
      source: input.source as unknown as string,
      type: decisionTypeFromPayload(input.payload), // ✅ DB-only
      payload: input.payload as unknown as Json,
    };

    const { data, error } = await supabase
      .from("company_decisions")
      .insert(insert)
      .select("*")
      .single();

    if (error) throw error;

    return mapCompanyDecision(data as CompanyDecisionRow);
  },

  async deleteCompanyDecisionsForWeek(input: {
    worldId: WorldId;
    companyId: CompanyId;
    year: number;
    week: number;
  }): Promise<void> {
    const { error } = await supabase
      .from("company_decisions")
      .delete()
      .eq("world_id", input.worldId as unknown as string)
      .eq("company_id", input.companyId as unknown as string)
      .eq("year", input.year)
      .eq("week", input.week);

    if (error) throw error;
  },

  /* =========================
   * Holding decisions
   * ========================= */

  async listHoldingDecisionsForWeek(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: number;
    week: number;
    createdBefore?: Timestamp;
  }): Promise<HoldingDecision[]> {
    let query = supabase
      .from("holding_decisions")
      .select("*")
      .eq("world_id", input.worldId as unknown as string)
      .eq("holding_id", input.holdingId as unknown as string)
      .eq("year", input.year)
      .eq("week", input.week)
      .order("created_at", { ascending: true });

    if (input.createdBefore) {
      query = query.lte("created_at", input.createdBefore as unknown as string);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as unknown as HoldingDecisionRow[];
    return rows.map(mapHoldingDecision);
  },

  async insertHoldingDecision(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: number;
    week: number;
    source: DecisionSource;
    payload: HoldingDecisionPayload;
  }): Promise<HoldingDecision> {
    const insert: HoldingDecisionInsert = {
      world_id: input.worldId as unknown as string,
      holding_id: input.holdingId as unknown as string,
      year: input.year,
      week: input.week,
      source: input.source as unknown as string,
      type: decisionTypeFromPayload(input.payload), // ✅ DB-only
      payload: input.payload as unknown as Json,
    };

    const { data, error } = await supabase
      .from("holding_decisions")
      .insert(insert)
      .select("*")
      .single();

    if (error) throw error;

    return mapHoldingDecision(data as HoldingDecisionRow);
  },

  async deleteHoldingDecisionsForWeek(input: {
    worldId: WorldId;
    holdingId: HoldingId;
    year: number;
    week: number;
  }): Promise<void> {
    const { error } = await supabase
      .from("holding_decisions")
      .delete()
      .eq("world_id", input.worldId as unknown as string)
      .eq("holding_id", input.holdingId as unknown as string)
      .eq("year", input.year)
      .eq("week", input.week);

    if (error) throw error;
  },
};
