// src/core/persistence/upgradeRepo.ts
import { supabase } from "./supabaseClient";
import type { Database } from "../../supabase/database.types";
import type {
  CompanyUpgrade,
  NicheUpgrade,
  CompanyId,
  WorldId,
  NicheId,
  Year,
  WeekNumber,
  Timestamp,
} from "../domain";

type NicheUpgradeRow = Database["public"]["Tables"]["niche_upgrades"]["Row"];
type CompanyUpgradeRow = Database["public"]["Tables"]["company_upgrades"]["Row"];
type CompanyUpgradeInsert = Database["public"]["Tables"]["company_upgrades"]["Insert"];

function mapNicheUpgrade(row: NicheUpgradeRow): NicheUpgrade {
  return {
    id: row.id as any,
    nicheId: row.niche_id as any,
    code: row.code,
    treeKey: row.tree_key,
    name: row.name,
    description: row.description ?? undefined,
    tier: row.tier,
    cost: row.cost as any,
    durationWeeks: row.duration_weeks,
    effects: (row.effects ?? {}) as any,
    createdAt: row.created_at as unknown as Timestamp,
  };
}

function mapCompanyUpgrade(row: CompanyUpgradeRow): CompanyUpgrade {
  return {
    id: row.id as any,
    companyId: row.company_id as unknown as CompanyId,
    worldId: row.world_id as unknown as WorldId,
    upgradeId: row.upgrade_id as any,
    purchasedYear: row.purchased_year as unknown as Year,
    purchasedWeek: row.purchased_week as unknown as WeekNumber,
    status: row.status as CompanyUpgrade["status"],
    createdAt: row.created_at as unknown as Timestamp,
  };
}

export const upgradeRepo = {
  async listNicheUpgrades(nicheId: NicheId): Promise<NicheUpgrade[]> {
    const { data, error } = await supabase
      .from("niche_upgrades")
      .select("*")
      .eq("niche_id", nicheId as unknown as string)
      .order("tree_key", { ascending: true })
      .order("tier", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: NicheUpgradeRow) => mapNicheUpgrade(r));
  },

  async listAllNicheUpgrades(): Promise<NicheUpgrade[]> {
    const { data, error } = await supabase
      .from("niche_upgrades")
      .select("*")
      .order("niche_id", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: NicheUpgradeRow) => mapNicheUpgrade(r));
  },

  async listCompanyUpgrades(companyId: CompanyId): Promise<CompanyUpgrade[]> {
    const { data, error } = await supabase
      .from("company_upgrades")
      .select("*")
      .eq("company_id", companyId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((r: CompanyUpgradeRow) => mapCompanyUpgrade(r));
  },

  async listCompanyUpgradesByWorld(worldId: WorldId): Promise<CompanyUpgrade[]> {
    const { data, error } = await supabase
      .from("company_upgrades")
      .select("*")
      .eq("world_id", worldId as unknown as string);

    if (error) throw error;
    return (data ?? []).map((r: CompanyUpgradeRow) => mapCompanyUpgrade(r));
  },

  async upsertCompanyUpgrade(input: {
    companyId: CompanyId;
    worldId: WorldId;
    upgradeId: string;
    purchasedYear: number;
    purchasedWeek: number;
    status?: string;
  }): Promise<CompanyUpgrade> {
    const insert: CompanyUpgradeInsert = {
      company_id: input.companyId as unknown as string,
      world_id: input.worldId as unknown as string,
      upgrade_id: input.upgradeId,
      purchased_year: input.purchasedYear,
      purchased_week: input.purchasedWeek,
      status: input.status ?? "ACTIVE",
    };

    const { data, error } = await supabase
      .from("company_upgrades")
      .upsert(insert, { onConflict: "company_id,upgrade_id" })
      .select("*")
      .single();

    if (error) throw error;
    return mapCompanyUpgrade(data as CompanyUpgradeRow);
  },
};
