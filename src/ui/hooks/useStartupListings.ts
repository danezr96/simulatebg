// src/ui/hooks/useStartupListings.ts
import { useEffect, useMemo, useState } from "react";

import type { Sector, Niche } from "../../core/domain/sector";
import { sectorRepo } from "../../core/persistence/sectorRepo";
import { getStartupPricing } from "../../core/config/companyPricing";
import { isSectorPlayable } from "../../core/config/playableSectors";

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

  const playableSectors = useMemo(
    () => sectors.filter((sector) => isSectorPlayable(sector.code)),
    [sectors]
  );
  const playableSectorIds = useMemo(
    () => new Set(playableSectors.map((sector) => String(sector.id))),
    [playableSectors]
  );
  const playableNiches = useMemo(
    () => niches.filter((niche) => playableSectorIds.has(String(niche.sectorId))),
    [niches, playableSectorIds]
  );

  const listings = useMemo(() => {
    if (playableSectors.length === 0 || playableNiches.length === 0) return [];
    const sectorById = new Map(playableSectors.map((s) => [String(s.id), s]));

    return playableNiches
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
  }, [playableSectors, playableNiches]);

  return useMemo(
    () => ({
      sectors: playableSectors,
      niches: playableNiches,
      listings,
      loading,
      error,
    }),
    [playableSectors, playableNiches, listings, loading, error]
  );
}

export default useStartupListings;
