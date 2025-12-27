// src/ui/hooks/useStartupListings.ts
import { useEffect, useMemo, useState } from "react";

import type { Sector, Niche } from "../../core/domain/sector";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { getStartupPricing } from "../../core/config/companyPricing";

export type StartupListing = {
  id: string;
  sector: Sector;
  niche: Niche;
  pricing: ReturnType<typeof getStartupPricing>;
};

export function useStartupListings() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sectorRows, nicheRows] = await Promise.all([
          sectorRepo.listSectors(),
          sectorRepo.listAllNiches(),
        ]);
        if (!alive) return;
        setSectors(sectorRows ?? []);
        setNiches(nicheRows ?? []);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message ?? "Failed to load startup listings.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const listings = useMemo(() => {
    if (sectors.length === 0 || niches.length === 0) return [];
    const sectorById = new Map(sectors.map((s) => [String(s.id), s]));

    return niches
      .map((niche) => {
        const sector = sectorById.get(String(niche.sectorId));
        if (!sector) return null;
        return {
          id: String(niche.id),
          sector,
          niche,
          pricing: getStartupPricing(sector, niche),
        } as StartupListing;
      })
      .filter(Boolean) as StartupListing[];
  }, [sectors, niches]);

  return useMemo(
    () => ({
      sectors,
      niches,
      listings,
      loading,
      error,
    }),
    [sectors, niches, listings, loading, error]
  );
}

export default useStartupListings;
