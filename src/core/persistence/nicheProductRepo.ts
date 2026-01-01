import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type { NicheProduct } from "../domain";
import type { NicheId } from "../domain/common";

/**
 * Tables:
 * - niche_products
 */

type NicheProductRow = Database["public"]["Tables"]["niche_products"]["Row"];

function mapNicheProduct(row: NicheProductRow): NicheProduct {
  return {
    id: row.id,
    nicheId: row.niche_id as NicheId,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    priceMinEur: Number(row.price_min_eur),
    priceMaxEur: Number(row.price_max_eur),
    cogsPctMin: Number(row.cogs_pct_min),
    cogsPctMax: Number(row.cogs_pct_max),
    capacityDriver: row.capacity_driver,
    notes: row.notes,
  };
}

export const nicheProductRepo = {
  async listByNiche(nicheId: NicheId): Promise<NicheProduct[]> {
    const { data, error } = await supabase
      .from("niche_products")
      .select("*")
      .eq("niche_id", nicheId as unknown as string)
      .order("name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map(mapNicheProduct);
  },
};
