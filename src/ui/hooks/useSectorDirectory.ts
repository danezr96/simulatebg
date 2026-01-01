import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { Sector, Niche } from "../../core/domain/sector";
import { sectorRepo } from "../../core/persistence/sectorRepo";

type SectorDirectory = {
  sectors: Sector[];
  niches: Niche[];
  sectorById: Map<string, Sector>;
  nicheById: Map<string, Niche>;
  loading: boolean;
  error: string | null;
};

export function useSectorDirectory(): SectorDirectory {
  const sectorsQuery = useQuery({
    queryKey: ["sectors", "directory"],
    queryFn: () => sectorRepo.listSectors(),
    staleTime: 60_000,
  });

  const nichesQuery = useQuery({
    queryKey: ["niches", "directory"],
    queryFn: () => sectorRepo.listAllNiches(),
    staleTime: 60_000,
  });

  const sectors = sectorsQuery.data ?? [];
  const niches = nichesQuery.data ?? [];

  const sectorById = React.useMemo(
    () => new Map(sectors.map((s) => [String(s.id), s])),
    [sectors]
  );
  const nicheById = React.useMemo(
    () => new Map(niches.map((n) => [String(n.id), n])),
    [niches]
  );

  return {
    sectors,
    niches,
    sectorById,
    nicheById,
    loading: sectorsQuery.isLoading || nichesQuery.isLoading,
    error: (sectorsQuery.error as any)?.message ?? (nichesQuery.error as any)?.message ?? null,
  };
}

export default useSectorDirectory;
