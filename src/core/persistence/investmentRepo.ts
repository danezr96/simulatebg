// src/core/persistence/investmentRepo.ts

import type { HoldingId, InvestmentId, Timestamp, WorldId } from "../domain";
import { supabase } from "./supabaseClient";
import type { Json } from "../../supabase/database.types"; // pas dit pad aan naar jouw generated types

export type Investment = {
  id: InvestmentId;
  worldId: WorldId;
  holdingId: HoldingId;

  type: string;
  name: string;
  currentValue: number;
  costBasis: number;
  meta: Record<string, unknown>;

  createdAt: Timestamp;
};

export type InvestmentCreateInput = {
  worldId: WorldId;
  holdingId: HoldingId;

  type: string;
  name: string;
  currentValue: number;
  costBasis: number;
  meta?: Record<string, unknown>; // ✅ type-only, geen code
};

type InvestmentRow = {
  id: string;
  world_id: string;
  holding_id: string;
  type: string;
  name: string;
  current_value: number;
  cost_basis: number;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function toInvestment(row: InvestmentRow): Investment {
  return {
    id: row.id as InvestmentId,
    worldId: row.world_id as WorldId,
    holdingId: row.holding_id as HoldingId,
    type: row.type,
    name: row.name,
    currentValue: Number(row.current_value),
    costBasis: Number(row.cost_basis),
    meta: row.meta ?? {},
    createdAt: row.created_at as Timestamp,
  };
}

function requireNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${field}`);
  return n;
}

export const investmentRepo = {
  async listByHolding(worldId: WorldId, holdingId: HoldingId): Promise<Investment[]> {
    const { data, error } = await supabase
      .from("investments")
      .select("id, world_id, holding_id, type, name, current_value, cost_basis, meta, created_at")
      .eq("world_id", worldId as unknown as string)
      .eq("holding_id", holdingId as unknown as string)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`investments.listByHolding failed: ${error.message}`);

    return ((data ?? []) as InvestmentRow[]).map(toInvestment);
  },

  async create(input: InvestmentCreateInput): Promise<Investment> {
    const insertRow = {
      world_id: input.worldId as unknown as string,
      holding_id: input.holdingId as unknown as string,
      type: input.type,
      name: input.name,
      current_value: requireNumber(input.currentValue, "currentValue"),
      cost_basis: requireNumber(input.costBasis, "costBasis"),
      meta: ((input.meta ?? {}) as unknown) as Json, // ✅ cast naar Json voor Supabase insert
    };

    const { data, error } = await supabase
      .from("investments")
      .insert([insertRow]) // ✅ altijd array is safe
      .select("id, world_id, holding_id, type, name, current_value, cost_basis, meta, created_at")
      .single();

    if (error) throw new Error(`investments.create failed: ${error.message}`);
    if (!data) throw new Error("investments.create failed: no row returned");

    return toInvestment(data as InvestmentRow);
  },

  async updateValue(id: InvestmentId, currentValue: number): Promise<Investment> {
    const { data, error } = await supabase
      .from("investments")
      .update({ current_value: requireNumber(currentValue, "currentValue") })
      .eq("id", id as unknown as string)
      .select("id, world_id, holding_id, type, name, current_value, cost_basis, meta, created_at")
      .single();

    if (error) throw new Error(`investments.updateValue failed: ${error.message}`);
    if (!data) throw new Error("investments.updateValue failed: no row returned");

    return toInvestment(data as InvestmentRow);
  },

  async delete(id: InvestmentId): Promise<void> {
    const { error } = await supabase.from("investments").delete().eq("id", id as unknown as string);
    if (error) throw new Error(`investments.delete failed: ${error.message}`);
  },
};
