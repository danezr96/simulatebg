import type {
  CompanyId,
  HoldingId,
  PlayerId,
  SectorId,
  NicheId,
  ProgramId,
  UpgradeId,
  CompanyUpgradeId,
} from "./index";

// common heeft al asWorldId/asSeasonId → NIET dubbel exporteren
export const asCompanyId = (v: string) => v as CompanyId;
export const asHoldingId = (v: string) => v as HoldingId;
export const asPlayerId  = (v: string) => v as PlayerId;

export const asSectorId = (v: string) => v as SectorId;
export const asNicheId  = (v: string) => v as NicheId;

export const asProgramId = (v: string) => v as ProgramId;
export const asUpgradeId = (v: string) => v as UpgradeId;
export const asCompanyUpgradeId = (v: string) => v as CompanyUpgradeId;
