// src/core/persistence/financeRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type {
  Loan,
  CompanyFinancials,
  LoanId,
  HoldingId,
  CompanyId,
  WorldId,
} from "../domain";

/**
 * Tables:
 * - loans
 * - company_financials
 * - holdings (used to update cash/debt totals after onboarding loan)
 */

type LoanRow = Database["public"]["Tables"]["loans"]["Row"];
type LoanInsert = Database["public"]["Tables"]["loans"]["Insert"];
type LoanUpdate = Database["public"]["Tables"]["loans"]["Update"];

type CompanyFinancialsRow = Database["public"]["Tables"]["company_financials"]["Row"];
type CompanyFinancialsInsert = Database["public"]["Tables"]["company_financials"]["Insert"];

type HoldingRow = Database["public"]["Tables"]["holdings"]["Row"];
type HoldingUpdate = Database["public"]["Tables"]["holdings"]["Update"];

function mapLoan(row: LoanRow): Loan {
  return {
    id: row.id as unknown as LoanId,
    worldId: row.world_id as unknown as WorldId,
    holdingId: (row.holding_id ?? undefined) as any,
    companyId: (row.company_id ?? undefined) as any,

    principal: row.principal as any,
    outstandingBalance: row.outstanding_balance as any,
    interestRate: row.interest_rate as any,

    termWeeks: row.term_weeks as any,
    remainingWeeks: row.remaining_weeks as any,

    lenderName: row.lender_name as any,
    type: row.type as any,
    status: row.status as any,

    createdAt: row.created_at as any,
  } as any;
}

function mapCompanyFinancials(row: CompanyFinancialsRow): CompanyFinancials {
  return {
    id: row.id as any,
    companyId: row.company_id as unknown as CompanyId,
    worldId: row.world_id as unknown as WorldId,
    year: row.year as any,
    week: row.week as any,

    revenue: row.revenue as any,
    cogs: row.cogs as any,
    opex: row.opex as any,
    interestCost: row.interest_cost as any,
    taxExpense: row.tax_expense as any,
    netProfit: row.net_profit as any,
    cashChange: row.cash_change as any,

    assets: row.assets as any,
    liabilities: row.liabilities as any,
    equity: row.equity as any,

    createdAt: row.created_at as any,
  } as any;
}

/** ---------------------------------
 * Helpers: holdings
 * --------------------------------- */
async function getHoldingById(holdingId: HoldingId): Promise<HoldingRow | null> {
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .eq("id", holdingId as unknown as string)
    .maybeSingle();

  if (error) throw error;
  return (data as HoldingRow) ?? null;
}

/**
 * NOTE:
 * In your generated types, holdings.Update seems to require prestige_level.
 * So when we update cash/debt, we MUST also pass prestige_level (current value).
 */
async function updateHoldingBalances(
  holdingId: HoldingId,
  patch: { cashDelta?: number; debtDelta?: number }
): Promise<void> {
  const holding = await getHoldingById(holdingId);
  if (!holding) return;

  const currentCash = Number((holding as any).cash_balance ?? 0);
  const currentDebt = Number((holding as any).total_debt ?? 0);

  const nextCash = currentCash + Number(patch.cashDelta ?? 0);
  const nextDebt = currentDebt + Number(patch.debtDelta ?? 0);

  // ✅ include prestige_level to satisfy your generated HoldingUpdate type
  const payload: HoldingUpdate = {
    cash_balance: nextCash,
    total_debt: nextDebt,

    // important for TS + safe for DB
    prestige_level: (holding as any).prestige_level ?? 0,
  } as any;

  const { error } = await supabase
    .from("holdings")
    .update(payload)
    .eq("id", holdingId as unknown as string);

  if (error) throw error;
}

export const financeRepo = {
  /* =========================
   * Loans
   * ========================= */

  async listLoansByHolding(holdingId: HoldingId): Promise<Loan[]> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("holding_id", holdingId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as unknown as LoanRow[];
    return rows.map(mapLoan);
  },

  async listLoansByCompany(companyId: CompanyId): Promise<Loan[]> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const rows = (data ?? []) as unknown as LoanRow[];
    return rows.map(mapLoan);
  },

  async getLoanById(id: LoanId): Promise<Loan | null> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapLoan(data as LoanRow) : null;
  },

  /**
   * Onboarding helper:
   * "starter loan exists" = at least one holding-level loan (company_id is NULL)
   */
  async getHoldingLoanForOnboarding(holdingId: HoldingId): Promise<Loan | null> {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("holding_id", holdingId as unknown as string)
      .is("company_id", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapLoan(data as LoanRow) : null;
  },

  async hasHoldingLoanForOnboarding(holdingId: HoldingId): Promise<boolean> {
    const loan = await this.getHoldingLoanForOnboarding(holdingId);
    return !!loan;
  },

  async createLoan(input: {
    worldId: WorldId;
    type: string; // e.g. "HOLDING" | "COMPANY"
    holdingId?: HoldingId;
    companyId?: CompanyId;

    principal: number;
    interestRate: number;
    termWeeks: number;
    lenderName: string;

    outstandingBalance?: number;
    remainingWeeks?: number;
    status?: string; // default ACTIVE
  }): Promise<Loan> {
    const payload: LoanInsert = {
      world_id: input.worldId as unknown as string,
      type: input.type as any,
      holding_id: (input.holdingId ?? null) as any,
      company_id: (input.companyId ?? null) as any,

      principal: Number(input.principal),
      outstanding_balance: Number(input.outstandingBalance ?? input.principal),
      interest_rate: Number(input.interestRate),

      term_weeks: Number(input.termWeeks),
      remaining_weeks: Number(input.remainingWeeks ?? input.termWeeks),

      lender_name: input.lenderName,
      status: (input.status ?? "ACTIVE") as any,
    };

    const { data, error } = await supabase
      .from("loans")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapLoan(data as LoanRow);
  },

  /**
   * ✅ Onboarding helper used by ChooseLoanCard:
   * - creates holding-level loan (company_id stays NULL)
   * - updates holdings totals so Overview reflects it (cash_balance + total_debt)
   */
  async createStarterHoldingLoan(input: {
    worldId: WorldId;
    holdingId: HoldingId;

    principal: number;
    interestRate: number;
    termWeeks: number;

    lenderName?: string;
    status?: string;
  }): Promise<Loan> {
    return this.createHoldingLoan({
      worldId: input.worldId,
      holdingId: input.holdingId,
      principal: input.principal,
      interestRate: input.interestRate,
      termWeeks: input.termWeeks,
      lenderName: input.lenderName ?? "Starter Bank",
      status: input.status ?? "ACTIVE",
    });
  },

  /**
   * Holding loan helper (mid-game).
   * - creates holding-level loan (company_id stays NULL)
   * - updates holdings totals (cash_balance + total_debt)
   */
  async createHoldingLoan(input: {
    worldId: WorldId;
    holdingId: HoldingId;

    principal: number;
    interestRate: number;
    termWeeks: number;

    lenderName?: string;
    status?: string;
  }): Promise<Loan> {
    const loan = await this.createLoan({
      worldId: input.worldId,
      holdingId: input.holdingId,
      companyId: undefined,
      type: "HOLDING",
      principal: input.principal,
      interestRate: input.interestRate,
      termWeeks: input.termWeeks,
      lenderName: input.lenderName ?? "Holding Bank",
      status: input.status ?? "ACTIVE",
    });

    if (Number(input.principal) > 0) {
      await updateHoldingBalances(input.holdingId, {
        cashDelta: Number(input.principal),
        debtDelta: Number(input.principal),
      });
    }

    return loan;
  },

  async updateLoan(
    id: LoanId,
    patch: Partial<{
      outstandingBalance: number;
      remainingWeeks: number;
      status: string;
      interestRate: number;
      lenderName: string;
    }>
  ): Promise<Loan> {
    const payload: LoanUpdate = {};

    if (patch.outstandingBalance !== undefined) payload.outstanding_balance = Number(patch.outstandingBalance);
    if (patch.remainingWeeks !== undefined) payload.remaining_weeks = Number(patch.remainingWeeks);
    if (patch.status !== undefined) payload.status = patch.status as any;
    if (patch.interestRate !== undefined) payload.interest_rate = Number(patch.interestRate);
    if (patch.lenderName !== undefined) payload.lender_name = patch.lenderName;

    const { data, error } = await supabase
      .from("loans")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapLoan(data as LoanRow);
  },

  /* =========================
   * Company financials (weekly)
   * ========================= */

  async getCompanyFinancials(companyId: CompanyId, year: number, week: number): Promise<CompanyFinancials | null> {
    const { data, error } = await supabase
      .from("company_financials")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .eq("year", year)
      .eq("week", week)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCompanyFinancials(data as CompanyFinancialsRow) : null;
  },

  async getLatestCompanyFinancials(companyId: CompanyId): Promise<CompanyFinancials | null> {
    const { data, error } = await supabase
      .from("company_financials")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapCompanyFinancials(data as CompanyFinancialsRow) : null;
  },

  async upsertCompanyFinancials(input: Omit<CompanyFinancials, "id" | "createdAt">): Promise<CompanyFinancials> {
    const payload: CompanyFinancialsInsert = {
      company_id: input.companyId as any,
      world_id: input.worldId as any,
      year: Number(input.year),
      week: Number(input.week),

      revenue: Number(input.revenue),
      cogs: Number(input.cogs),
      opex: Number(input.opex),
      interest_cost: Number(input.interestCost),
      tax_expense: Number(input.taxExpense),

      net_profit: Number(input.netProfit),
      cash_change: Number(input.cashChange),

      assets: Number(input.assets),
      liabilities: Number(input.liabilities),
      equity: Number(input.equity),
    };

    const { data, error } = await supabase
      .from("company_financials")
      .upsert(payload, { onConflict: "company_id,year,week" })
      .select("*")
      .single();

    if (error) throw error;
    return mapCompanyFinancials(data as CompanyFinancialsRow);
  },

  async listCompanyFinancials(companyId: CompanyId, limit = 52): Promise<CompanyFinancials[]> {
    const { data, error } = await supabase
      .from("company_financials")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rows = (data ?? []) as unknown as CompanyFinancialsRow[];
    return rows.map(mapCompanyFinancials);
  },
};
