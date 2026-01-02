// src/core/persistence/companyRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { Company, CompanyState, CompanyId, HoldingId, WorldId } from "../domain";

// DB row types
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

type CompanyStateRow = Database["public"]["Tables"]["company_state"]["Row"];
type CompanyStateInsert = Database["public"]["Tables"]["company_state"]["Insert"];

/**
 * For upserting weekly company state:
 * DB generates id/created_at, so callers should not provide them.
 */
export type CompanyStateInput = Omit<CompanyState, "id" | "createdAt">;

/* =========================
 * Mappers (DB -> Domain)
 * ========================= */

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id as unknown as CompanyId,
    holdingId: row.holding_id as any,
    worldId: row.world_id as unknown as WorldId,
    sectorId: row.sector_id as any,
    nicheId: row.niche_id as any,
    name: row.name,
    region: row.region,
    foundedYear: row.founded_year,
    status: row.status as any,
    createdAt: row.created_at as any,
  } as Company;
}

function mapCompanyState(row: CompanyStateRow): CompanyState {
  return {
    id: row.id,
    companyId: row.company_id as CompanyId,
    worldId: row.world_id as WorldId,
    year: row.year as any,
    week: row.week as any,

    priceLevel: row.price_level as any,
    capacity: row.capacity as any,
    qualityScore: row.quality_score as any,
    marketingLevel: row.marketing_level as any,
    awarenessScore: ((row as any).awareness_score ?? 20) as any,
    employees: row.employees,

    fixedCosts: row.fixed_costs as any,
    variableCostPerUnit: row.variable_cost_per_unit as any,

    // ✅ domain verwacht reputationScore (houd die aan)
    reputationScore: row.brand_score as any,

    // ✅ (optioneel) alias voor nieuwe naam zodat engines/UI alvast brandScore kunnen gebruiken
    brandScore: row.brand_score as any,

    operationalEfficiencyScore: ((row as any).operational_efficiency_score ?? 50) as any,
    utilisationRate: row.utilisation_rate as any,

    createdAt: row.created_at as any,
  } as any;
}


/* =========================
 * Repo
 * ========================= */

export const companyRepo = {
  /* =========================
   * Companies
   * ========================= */

  async getById(id: CompanyId): Promise<Company | null> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCompany(data as CompanyRow) : null;
  },

  async listByHolding(holdingId: HoldingId): Promise<Company[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("holding_id", holdingId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r) => mapCompany(r as CompanyRow));
  },

  async listByWorld(worldId: WorldId): Promise<Company[]> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r) => mapCompany(r as CompanyRow));
  },
  async create(input: {
    holdingId: HoldingId;
    worldId: WorldId;
    sectorId: string;
    nicheId: string;
    name: string;
    region: string;
    foundedYear: number;
    status?: string;
  }): Promise<Company> {
    const payload: CompanyInsert = {
      holding_id: input.holdingId as unknown as string,
      world_id: input.worldId as unknown as string,
      sector_id: input.sectorId as any,
      niche_id: input.nicheId as any,
      name: input.name,
      region: input.region,
      founded_year: input.foundedYear,
      status: (input.status ?? "ACTIVE") as any,
    };

    const { data, error } = await supabase
      .from("companies")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapCompany(data as CompanyRow);
  },

  async update(
    id: CompanyId,
    patch: Partial<{
      name: string;
      region: string;
      status: string;
    }>
  ): Promise<Company> {
    const payload: CompanyUpdate = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.region !== undefined) payload.region = patch.region;
    if (patch.status !== undefined) payload.status = patch.status as any;

    const { data, error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapCompany(data as CompanyRow);
  },

  async delete(id: CompanyId): Promise<void> {
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id as unknown as string);

    if (error) throw error;
  },

  /* =========================
   * Company state (weekly)
   * ========================= */

  async listStates(companyId: CompanyId, limit = 52): Promise<CompanyState[]> {
    const { data, error } = await supabase
      .from("company_state")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r) => mapCompanyState(r as CompanyStateRow));
  },

  async getLatestState(companyId: CompanyId): Promise<CompanyState | null> {
    const { data, error } = await supabase
      .from("company_state")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCompanyState(data as CompanyStateRow) : null;
  },

  async getState(input: { companyId: CompanyId; year: number; week: number }): Promise<CompanyState | null> {
    const { data, error } = await supabase
      .from("company_state")
      .select("*")
      .eq("company_id", input.companyId as unknown as string)
      .eq("year", input.year)
      .eq("week", input.week)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCompanyState(data as CompanyStateRow) : null;
  },

  async upsertState(state: CompanyStateInput): Promise<CompanyState> {
    const payload: CompanyStateInsert = {
      company_id: state.companyId as unknown as string,
      world_id: state.worldId as unknown as string,
      year: Number(state.year as any),
      week: Number(state.week as any),

      price_level: Number(state.priceLevel as any),
      capacity: Number(state.capacity as any),
      quality_score: Number(state.qualityScore as any),
      marketing_level: Number(state.marketingLevel as any),
      awareness_score: Number((state as any).awarenessScore ?? 20),
      employees: Number(state.employees),

      fixed_costs: Number(state.fixedCosts as any),
      variable_cost_per_unit: Number(state.variableCostPerUnit as any),

      brand_score: Number(
  (state as any).reputationScore ?? (state as any).brandScore ?? 0.5
),
      operational_efficiency_score: Number((state as any).operationalEfficiencyScore ?? 50),
      utilisation_rate: Number((state as any).utilisationRate ?? 0),
    };

    const { data, error } = await supabase
      .from("company_state")
      .upsert(payload, { onConflict: "company_id,year,week" })
      .select("*")
      .single();

    if (error) throw error;
    return mapCompanyState(data as CompanyStateRow);
  },
};
