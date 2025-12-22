// src/core/engine/financeEngine.ts
import type {
  Loan,
  Company,
  CompanyFinancials,
  Holding,
  WorldEconomyState,
  Year,
  WeekNumber,
} from "../domain";

import { clamp } from "../../utils/math";
import { economyConfig } from "../../config/economy";

/**
 * FinanceEngine (v0)
 * - Applies interest + amortization to loans
 * - Computes interestCost for companies
 * - Applies simple corporate tax on profit (company level)
 * - Updates holding totalDebt aggregate (simplified)
 *
 * Notes:
 * - Loans are weekly interest: interest = outstanding * weeklyRate
 * - Amortization: equal principal payments across remainingWeeks
 */

export type FinanceTickInput = {
  year: Year;
  week: WeekNumber;
  economy: WorldEconomyState;

  holding: Holding;

  companies: Company[];
  companyFinancials: Record<string, CompanyFinancials>;

  loans: Loan[];
};

export type FinanceTickOutput = {
  nextHolding: Holding;

  nextCompanyFinancials: Record<string, CompanyFinancials>;
  nextLoans: Loan[];

  holdingDebtTotal: number;
};

function weeklyRateFromAnnual(annualRate: number): number {
  // v0: simple approximation
  return annualRate / 52;
}

export const financeEngine = {
  tick(input: FinanceTickInput): FinanceTickOutput {
    // ✅ Use new config layout
    const taxRate = economyConfig.taxes.flatRate;

    // Macro interest base; loan records may override with their own rate
    const baseAnnualRate = clamp(
      Number(input.economy.baseInterestRate ?? economyConfig.interest.baseAnnualRate),
      economyConfig.interest.minAnnualRate,
      economyConfig.interest.maxAnnualRate
    );

    const nextCompanyFinancials: Record<string, CompanyFinancials> = { ...input.companyFinancials };
    const nextLoans: Loan[] = [];

    let holdingDebtTotal = 0;
    const interestByCompany: Record<string, number> = {};

    // 1) Apply loan interest + amortization
    for (const loan of input.loans) {
      if (loan.status !== "ACTIVE") {
        nextLoans.push(loan);
        if ((loan as any).type === "HOLDING") holdingDebtTotal += Number(loan.outstandingBalance);
        continue;
      }

      const out = Number(loan.outstandingBalance);

      // If loan has its own interestRate, use it; else fall back to macro base
      const annualRate = Number(loan.interestRate ?? baseAnnualRate);
      const interest = out * weeklyRateFromAnnual(annualRate);

      const remaining = Math.max(1, Number(loan.remainingWeeks));
      const principalPayment = clamp(out / remaining, 0, out);

      const newOutstanding = clamp(out + interest - principalPayment, 0, Number.MAX_SAFE_INTEGER);
      const newRemaining = Math.max(0, remaining - 1);

      const status = newOutstanding <= 0.0001 || newRemaining === 0 ? "PAID_OFF" : "ACTIVE";

      const updated: Loan = {
        ...loan,
        outstandingBalance: Number(newOutstanding) as any,
        remainingWeeks: newRemaining,
        status: status as any,
        interestRate: annualRate as any,
      };

      nextLoans.push(updated);

      // Aggregate & allocate interest
      if ((loan as any).type === "HOLDING") {
        holdingDebtTotal += Number(updated.outstandingBalance);
      } else if (loan.companyId) {
        const cid = String(loan.companyId);
        interestByCompany[cid] = (interestByCompany[cid] ?? 0) + interest;
      }
    }

    // 2) Apply interest & tax to company financials
    for (const company of input.companies) {
      const cid = String(company.id);
      const fin = nextCompanyFinancials[cid];
      if (!fin) continue;

      const interestCost = Number(interestByCompany[cid] ?? 0);

      const profitBeforeTax =
        Number(fin.revenue) - Number(fin.cogs) - Number(fin.opex) - interestCost;

      const taxExpense = profitBeforeTax > 0 ? profitBeforeTax * taxRate : 0;
      const netProfit = profitBeforeTax - taxExpense;

      nextCompanyFinancials[cid] = {
        ...fin,
        interestCost: interestCost as any,
        taxExpense: taxExpense as any,
        netProfit: netProfit as any,
        cashChange: netProfit as any, // v0 simplification
      };
    }

    // 3) Update holding aggregates (simplified)
    const nextHolding: Holding = {
      ...input.holding,
      totalDebt: holdingDebtTotal as any,
    };

    return {
      nextHolding,
      nextCompanyFinancials,
      nextLoans,
      holdingDebtTotal,
    };
  },
};
