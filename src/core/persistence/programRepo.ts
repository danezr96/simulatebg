// src/core/persistence/programRepo.ts
import { supabase } from "./supabaseClient";
import type { Database, Json } from "../../supabase/database.types";
import type {
  CompanyProgram,
  CompanyId,
  WorldId,
  Year,
  WeekNumber,
  Timestamp,
} from "../domain";

type CompanyProgramRow = Database["public"]["Tables"]["company_programs"]["Row"];
type CompanyProgramInsert = Database["public"]["Tables"]["company_programs"]["Insert"];

function mapCompanyProgram(row: CompanyProgramRow): CompanyProgram {
  return {
    id: row.id as any,
    companyId: row.company_id as unknown as CompanyId,
    worldId: row.world_id as unknown as WorldId,
    programType: row.program_type,
    payload: (row.payload ?? {}) as any,
    startYear: row.start_year as unknown as Year,
    startWeek: row.start_week as unknown as WeekNumber,
    durationWeeks: row.duration_weeks,
    status: row.status as CompanyProgram["status"],
    createdAt: row.created_at as unknown as Timestamp,
    cancelledAt: row.cancelled_at ? (row.cancelled_at as unknown as Timestamp) : undefined,
  };
}

export const programRepo = {
  async listByWorld(input: { worldId: WorldId; status?: string }): Promise<CompanyProgram[]> {
    let query = supabase
      .from("company_programs")
      .select("*")
      .eq("world_id", input.worldId as unknown as string);

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as CompanyProgramRow[];
    return rows.map(mapCompanyProgram);
  },

  async listByCompany(input: { companyId: CompanyId }): Promise<CompanyProgram[]> {
    const { data, error } = await supabase
      .from("company_programs")
      .select("*")
      .eq("company_id", input.companyId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as CompanyProgramRow[];
    return rows.map(mapCompanyProgram);
  },

  async upsertProgram(input: {
    companyId: CompanyId;
    worldId: WorldId;
    programType: string;
    payload: unknown;
    startYear: number;
    startWeek: number;
    durationWeeks: number;
    status?: string;
  }): Promise<CompanyProgram> {
    const insert: CompanyProgramInsert = {
      company_id: input.companyId as unknown as string,
      world_id: input.worldId as unknown as string,
      program_type: input.programType,
      payload: (input.payload ?? {}) as Json,
      start_year: input.startYear,
      start_week: input.startWeek,
      duration_weeks: input.durationWeeks,
      status: input.status ?? "ACTIVE",
    };

    const { data, error } = await supabase
      .from("company_programs")
      .upsert(insert, { onConflict: "company_id,start_year,start_week,program_type" })
      .select("*")
      .single();

    if (error) throw error;
    return mapCompanyProgram(data as CompanyProgramRow);
  },

  async cancelProgram(input: { programId: string }): Promise<void> {
    const { error } = await supabase
      .from("company_programs")
      .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() })
      .eq("id", input.programId);

    if (error) throw error;
  },
};
