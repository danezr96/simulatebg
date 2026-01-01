// src/core/persistence/acquisitionRepo.ts
import { supabase } from "./supabaseClient";
import type { Database, Json } from "../../supabase/database.types";
import type {
  AcquisitionOffer,
  AcquisitionOfferId,
  AcquisitionOfferStatus,
  AcquisitionOfferTurn,
  CompanyId,
  HoldingId,
  WorldId,
} from "../domain";

type AcquisitionOfferRow = Database["public"]["Tables"]["acquisition_offers"]["Row"];
type AcquisitionOfferInsert = Database["public"]["Tables"]["acquisition_offers"]["Insert"];
type AcquisitionOfferUpdate = Database["public"]["Tables"]["acquisition_offers"]["Update"];

function mapOffer(row: AcquisitionOfferRow): AcquisitionOffer {
  return {
    id: row.id as AcquisitionOfferId,
    worldId: row.world_id as WorldId,
    companyId: row.company_id as CompanyId,
    buyerHoldingId: row.buyer_holding_id as HoldingId,
    sellerHoldingId: row.seller_holding_id as HoldingId,
    status: row.status as AcquisitionOfferStatus,
    offerPrice: row.offer_price as any,
    currency: row.currency,
    message: row.message ?? undefined,
    turn: row.turn as AcquisitionOfferTurn,
    lastAction: row.last_action as any,
    counterCount: Number(row.counter_count ?? 0),
    expiresYear: (row.expires_year ?? undefined) as any,
    expiresWeek: (row.expires_week ?? undefined) as any,
    history: (row.history ?? []) as any,
    createdAt: row.created_at as any,
    updatedAt: row.updated_at as any,
  };
}

export const acquisitionRepo = {
  async getById(id: AcquisitionOfferId): Promise<AcquisitionOffer | null> {
    const { data, error } = await supabase
      .from("acquisition_offers")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) throw error;
    return data ? mapOffer(data as AcquisitionOfferRow) : null;
  },

  async listByWorld(worldId: WorldId): Promise<AcquisitionOffer[]> {
    const { data, error } = await supabase
      .from("acquisition_offers")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapOffer(row as AcquisitionOfferRow));
  },

  async listOpenByWorld(worldId: WorldId): Promise<AcquisitionOffer[]> {
    const { data, error } = await supabase
      .from("acquisition_offers")
      .select("*")
      .eq("world_id", worldId as unknown as string)
      .in("status", ["OPEN", "COUNTERED"])
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => mapOffer(row as AcquisitionOfferRow));
  },

  async listByHolding(input: {
    worldId: WorldId;
    holdingId: HoldingId;
  }): Promise<AcquisitionOffer[]> {
    const { data, error } = await supabase
      .from("acquisition_offers")
      .select("*")
      .eq("world_id", input.worldId as unknown as string)
      .or(
        `buyer_holding_id.eq.${input.holdingId as unknown as string},seller_holding_id.eq.${input.holdingId as unknown as string}`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapOffer(row as AcquisitionOfferRow));
  },

  async createOffer(input: {
    worldId: WorldId;
    companyId: CompanyId;
    buyerHoldingId: HoldingId;
    sellerHoldingId: HoldingId;
    offerPrice: number;
    currency?: string;
    message?: string;
    turn?: AcquisitionOfferTurn;
    lastAction?: "BUYER" | "SELLER";
    expiresYear?: number;
    expiresWeek?: number;
    counterCount?: number;
    history?: Json;
    status?: AcquisitionOfferStatus;
  }): Promise<AcquisitionOffer> {
    const payload: AcquisitionOfferInsert = {
      world_id: input.worldId as unknown as string,
      company_id: input.companyId as unknown as string,
      buyer_holding_id: input.buyerHoldingId as unknown as string,
      seller_holding_id: input.sellerHoldingId as unknown as string,
      status: (input.status ?? "OPEN") as any,
      offer_price: Number(input.offerPrice),
      currency: input.currency ?? "EUR",
      message: input.message ?? null,
      turn: (input.turn ?? "SELLER") as any,
      last_action: (input.lastAction ?? "BUYER") as any,
      counter_count: Number(input.counterCount ?? 0),
      expires_year: input.expiresYear ?? null,
      expires_week: input.expiresWeek ?? null,
      history: (input.history ?? []) as any,
    };

    const { data, error } = await supabase
      .from("acquisition_offers")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return mapOffer(data as AcquisitionOfferRow);
  },

  async updateOffer(
    id: AcquisitionOfferId,
    patch: Partial<{
      status: AcquisitionOfferStatus;
      offerPrice: number;
      message: string | null;
      turn: AcquisitionOfferTurn;
      lastAction: "BUYER" | "SELLER";
      counterCount: number;
      expiresYear: number | null;
      expiresWeek: number | null;
      history: Json;
    }>
  ): Promise<AcquisitionOffer> {
    const payload: AcquisitionOfferUpdate = {};

    if (patch.status !== undefined) payload.status = patch.status as any;
    if (patch.offerPrice !== undefined) payload.offer_price = Number(patch.offerPrice);
    if (patch.message !== undefined) payload.message = patch.message;
    if (patch.turn !== undefined) payload.turn = patch.turn as any;
    if (patch.lastAction !== undefined) payload.last_action = patch.lastAction as any;
    if (patch.counterCount !== undefined) payload.counter_count = Number(patch.counterCount);
    if (patch.expiresYear !== undefined) payload.expires_year = patch.expiresYear;
    if (patch.expiresWeek !== undefined) payload.expires_week = patch.expiresWeek;
    if (patch.history !== undefined) payload.history = patch.history as any;

    const { data, error } = await supabase
      .from("acquisition_offers")
      .update(payload)
      .eq("id", id as unknown as string)
      .select("*")
      .single();

    if (error) throw error;
    return mapOffer(data as AcquisitionOfferRow);
  },
};
