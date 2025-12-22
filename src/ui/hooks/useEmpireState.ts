// src/ui/hooks/useEmpireState.ts
import { useMemo } from "react";

export type EmpireKpis = {
  netWorthLabel: string;
  netWorthTrend: string;
  cashLabel: string;
  cashTrend: string;
  debtLabel: string;
  debtTrend: string;
  companyCount: number;
};

export function useEmpireState() {
  return useMemo(
    () => ({
      empire: null,
      // ✅ placeholder KPIs so WorldShell compiles
      kpis: {
        netWorthLabel: "-",
        netWorthTrend: "0%",
        cashLabel: "-",
        cashTrend: "0%",
        debtLabel: "-",
        debtTrend: "0%",
        companyCount: 0,
      } as EmpireKpis,
    }),
    []
  );
}
