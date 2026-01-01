// src/core/domain/acquisitions.ts
import type {
  AcquisitionOfferId,
  CompanyId,
  HoldingId,
  Money,
  Timestamp,
  WorldId,
  Year,
  WeekNumber,
} from "./common";

export type AcquisitionOfferStatus =
  | "OPEN"
  | "COUNTERED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED"
  | "FAILED_FUNDS";

export type AcquisitionOfferTurn = "BUYER" | "SELLER" | "NONE";

export type AcquisitionOfferAction =
  | "SUBMIT"
  | "COUNTER"
  | "ACCEPT"
  | "REJECT"
  | "WITHDRAW"
  | "EXPIRE"
  | "FAIL_FUNDS";

export type AcquisitionOfferHistoryItem = {
  action: AcquisitionOfferAction;
  by: "BUYER" | "SELLER";
  price: Money;
  message?: string;
  year: Year;
  week: WeekNumber;
  at: Timestamp;
};

export type AcquisitionOffer = {
  id: AcquisitionOfferId;
  worldId: WorldId;
  companyId: CompanyId;
  buyerHoldingId: HoldingId;
  sellerHoldingId: HoldingId;
  status: AcquisitionOfferStatus;
  offerPrice: Money;
  currency: string;
  message?: string;
  turn: AcquisitionOfferTurn;
  lastAction: "BUYER" | "SELLER";
  counterCount: number;
  expiresYear?: Year;
  expiresWeek?: WeekNumber;
  history: AcquisitionOfferHistoryItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
