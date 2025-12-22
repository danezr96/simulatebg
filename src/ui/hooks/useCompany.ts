import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Company, CompanyState, CompanyFinancials } from "../../core/domain";
import { asCompanyId, asHoldingId } from "../../core/domain";
import { companyService } from "../../core/services/companyService";
import { useHolding } from "./useHolding";

const QK = {
  companies: (holdingId?: string) => ["companies", holdingId] as const,
  company: (companyId?: string) => ["company", companyId] as const,
  state: (companyId?: string) => ["companyState", companyId] as const,
  financials: (companyId?: string) => ["companyFinancials", companyId] as const,
};

export function useCompanies() {
  const qc = useQueryClient();
  const { holding } = useHolding();

  const holdingId = holding?.id ? String(holding.id) : undefined;

  const companiesQuery = useQuery({
    queryKey: QK.companies(holdingId),
    queryFn: async () => {
      if (!holdingId) return [];
      return companyService.listCompaniesByHolding(asHoldingId(holdingId));
    },
    enabled: !!holdingId,
    staleTime: 5_000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: QK.companies(holdingId) });
    },
  });

  const companies: Company[] = companiesQuery.data ?? [];

  return useMemo(
    () => ({
      companies,
      isLoading: companiesQuery.isLoading,
      error: companiesQuery.error ?? null,
      refetch: () => refresh.mutateAsync(),
      holdingId,
    }),
    [companies, companiesQuery.isLoading, companiesQuery.error, refresh, holdingId]
  );
}

export function useCompany(companyId?: string) {
  const qc = useQueryClient();

  const cid = companyId ? asCompanyId(companyId) : undefined;

  const companyQuery = useQuery({
    queryKey: QK.company(companyId),
    queryFn: async () => {
      if (!cid) return null;
      return companyService.getCompany(cid);
    },
    enabled: !!cid,
    staleTime: 10_000,
  });

  const stateQuery = useQuery({
    queryKey: QK.state(companyId),
    queryFn: async () => {
      if (!cid) return null;
      return companyService.getLatestState(cid);
    },
    enabled: !!cid,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const financialsQuery = useQuery({
    queryKey: QK.financials(companyId),
    queryFn: async () => {
      if (!cid) return null;
      return companyService.getLatestFinancials(cid);
    },
    enabled: !!cid,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await qc.invalidateQueries({ queryKey: QK.company(companyId) });
      await qc.invalidateQueries({ queryKey: QK.state(companyId) });
      await qc.invalidateQueries({ queryKey: QK.financials(companyId) });
    },
  });

  return useMemo(
    () => ({
      company: (companyQuery.data ?? null) as Company | null,
      state: (stateQuery.data ?? null) as CompanyState | null,
      financials: (financialsQuery.data ?? null) as CompanyFinancials | null,
      isLoading: companyQuery.isLoading || stateQuery.isLoading || financialsQuery.isLoading,
      error: companyQuery.error ?? stateQuery.error ?? financialsQuery.error ?? null,
      refetch: () => refresh.mutateAsync(),
    }),
    [
      companyQuery.data,
      stateQuery.data,
      financialsQuery.data,
      companyQuery.isLoading,
      stateQuery.isLoading,
      financialsQuery.isLoading,
      companyQuery.error,
      stateQuery.error,
      financialsQuery.error,
      refresh,
      companyId,
    ]
  );
}

export default useCompany;
