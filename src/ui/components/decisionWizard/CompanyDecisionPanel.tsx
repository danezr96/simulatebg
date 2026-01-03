import * as React from "react";

import type {
  CarwashEnergyMode,
  CarwashQueuePolicy,
  Company,
  CompanyUpgrade,
  CompanyDecisionPayload,
  CompanyState,
  Niche,
  NicheUpgrade,
  NicheProduct,
  Sector,
  SetCarwashFinanceDecision,
  SetCarwashHrDecision,
  SetCarwashMarketingDecision,
  SetCarwashOperationsDecision,
  SetCarwashPricingDecision,
  SetCarwashProcurementDecision,
  SetCarwashWarehouseDecision,
  SetProductPlanDecision,
} from "../../../core/domain";
import type { ProjectionSummary, WhatIfProjection } from "../../../core/projections/types";
import { getDecisionFieldsForNiche, type DecisionField } from "../../../core/config/nicheDecisionFields";
import { getDecisionModulesForNiche } from "../../../core/config/nicheDecisions";
import { getDecisionGuidance } from "../../../core/config/decisionGuidance";
import { cn, formatCurrencyCompact, formatNumber } from "../../../utils/format";
import Card from "../Card";
import Sparkline from "../Sparkline";
import KPIChip from "../KPIChip";
import { Button } from "../Button";
import BottomSheet from "./BottomSheet";
import WhatIfDeltaRow from "./WhatIfDeltaRow";
import {
  BatteryCharging,
  Gauge,
  Lock,
  Package,
  Power,
  Target,
  Truck,
  Users,
  Warehouse,
  Wrench,
  Droplets,
  TrendingUp,
} from "lucide-react";

export type CompanyDecisionPanelProps = {
  companies: Company[];
  sectorsById: Map<string, Sector>;
  nichesById: Map<string, Niche>;
  nicheProductsById: Map<string, NicheProduct[]>;
  unlockedProductsByCompany: Map<string, Set<string>>;
  nicheUpgradesByCompany?: Map<string, NicheUpgrade[]>;
  ownedUpgradesByCompany?: Map<string, CompanyUpgrade[]>;
  draftUpgradeQueue?: Array<{ companyId: string; upgradeId: string }>;
  upgradeCostById?: Record<string, number>;
  onToggleUpgrade?: (companyId: string, upgradeId: string) => void;
  statesById: Map<string, CompanyState | null>;
  baseline: ProjectionSummary | null;
  whatIf: WhatIfProjection | null;
  draftDecisions: Record<string, CompanyDecisionPayload[]>;
  onDecisionChange: (companyId: string, payload: CompanyDecisionPayload) => void;
  onPreset: (companyId: string, payloads: CompanyDecisionPayload[]) => void;
  disabled?: boolean;
};

const PRESET_LABELS = [
  { key: "conservative", label: "Conservative" },
  { key: "balanced", label: "Balanced" },
  { key: "growth", label: "Growth" },
  { key: "ops", label: "Ops-first" },
  { key: "premium", label: "Premium push" },
] as const;

type ProductPlanEntry = {
  sku: string;
  priceEur: number;
  volumeShare: number;
  bufferWeeks: number;
};

type ProductPlanState = Record<string, Omit<ProductPlanEntry, "sku">>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : fallback;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatRange(min: number, max: number, decimals = 0) {
  const formatValue = (value: number) =>
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return `${formatValue(min)} - ${formatValue(max)}`;
}

function formatMoneyRange(min: number, max: number) {
  return `${formatCurrencyCompact(min)} - ${formatCurrencyCompact(max)}`;
}

type UnlockRequirementSummary = {
  upgrades: string[];
  assets: string[];
  staff: string[];
  thresholds: string[];
  anyOf: string[];
};

function formatUnlockRequirements(requirements: any): UnlockRequirementSummary {
  const upgrades = Array.isArray(requirements?.upgrades) ? requirements.upgrades.map(String) : [];
  const assets = Array.isArray(requirements?.assets)
    ? requirements.assets.map((asset: any) => `${asset.assetId ?? "asset"} ${asset.minCount ?? 0}+`)
    : [];
  const staff = Array.isArray(requirements?.staff)
    ? requirements.staff.map((role: any) => `${role.roleId ?? "role"} ${role.minFTE ?? 0}+`)
    : [];
  const thresholds: string[] = [];

  const thresholdMap: Array<[string, string]> = [
    ["minReputationScore", "Reputation"],
    ["minComplianceScore", "Compliance"],
    ["minUptimeScore", "Uptime"],
    ["minCashEur", "Cash"],
    ["minFleetTotal", "Fleet total"],
    ["minChargersTotal", "Chargers total"],
  ];

  thresholdMap.forEach(([key, label]) => {
    if (Number.isFinite(requirements?.[key])) {
      const suffix = key === "minCashEur" ? " EUR" : "";
      thresholds.push(`${label} >= ${requirements[key]}${suffix}`);
    }
  });

  if (requirements?.complianceAuditPassed === true) {
    thresholds.push("Compliance audit passed");
  }

  const anyOf: string[] = [];
  if (Array.isArray(requirements?.anyOf)) {
    requirements.anyOf.forEach((entry: any) => {
      const parts: string[] = [];
      if (Array.isArray(entry?.upgrades)) {
        parts.push(`Upgrade: ${entry.upgrades.map(String).join(", ")}`);
      }
      if (Array.isArray(entry?.staff)) {
        parts.push(
          `Staff: ${entry.staff.map((role: any) => `${role.roleId ?? "role"} ${role.minFTE ?? 0}+`).join(", ")}`
        );
      }
      if (parts.length) {
        anyOf.push(parts.join(" | "));
      }
    });
  }

  return { upgrades, assets, staff, thresholds, anyOf };
}

function findDecision(decisions: CompanyDecisionPayload[], type: string) {
  return decisions.find((payload) => payload.type === type) ?? null;
}

function getPriceRange(product: NicheProduct) {
  const min = toNumber(product.priceMinEur, 0);
  const max = Math.max(min, toNumber(product.priceMaxEur, min));
  return { min, max };
}

function getPriceBase(product: NicheProduct) {
  const { min, max } = getPriceRange(product);
  return (min + max) / 2 || min;
}

function getPriceStep(min: number, max: number) {
  const span = Math.max(0, max - min);
  if (span <= 1) return 0.01;
  if (span <= 10) return 0.1;
  if (span <= 100) return 1;
  if (span <= 1000) return 10;
  return 50;
}

function getProductIcon(product: NicheProduct) {
  const sku = String(product.sku ?? "").toLowerCase();
  const driver = String(product.capacityDriver ?? "").toLowerCase();
  const iconClass = "h-4 w-4 text-[var(--text-muted)]";

  if (driver.includes("wash") || sku.includes("wash")) return <Droplets className={iconClass} />;
  if (driver.includes("detail") || sku.includes("detail")) return <Wrench className={iconClass} />;
  if (driver.includes("interior")) return <Users className={iconClass} />;
  if (driver.includes("fleet") || sku.includes("fleet")) return <Truck className={iconClass} />;
  if (driver.includes("inventory") || driver.includes("storage")) return <Warehouse className={iconClass} />;
  if (driver.includes("charger") || sku.includes("charging") || sku.includes("kwh")) {
    return <BatteryCharging className={iconClass} />;
  }
  if (sku.includes("membership") || sku.includes("subscription") || sku.includes("pass")) {
    return <Users className={iconClass} />;
  }
  if (sku.includes("insurance") || sku.includes("warranty") || sku.includes("compliance")) {
    return <Target className={iconClass} />;
  }
  if (sku.includes("finance") || sku.includes("loan") || sku.includes("contract")) {
    return <TrendingUp className={iconClass} />;
  }

  return <Package className={iconClass} />;
}

const CARWASH_CATEGORIES = ["chemicals", "consumables", "spare_parts"] as const;

const CARWASH_CATEGORY_LABELS: Record<string, string> = {
  chemicals: "Chemicals",
  consumables: "Consumables",
  spare_parts: "Spare parts",
};

const CARWASH_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  chemicals: <Droplets className="h-3 w-3" />,
  consumables: <Package className="h-3 w-3" />,
  spare_parts: <Wrench className="h-3 w-3" />,
};

function titleize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mergeRecord<T extends Record<string, unknown>>(base?: T, updates?: T): T {
  return { ...(base ?? {}), ...(updates ?? {}) } as T;
}

function buildDefaultProductPlan(products: NicheProduct[]): ProductPlanState {
  const count = products.length;
  if (!count) return {};

  const baseShare = Math.floor(100 / count);
  const remainder = 100 - baseShare * count;
  const plan: ProductPlanState = {};

  products.forEach((product, idx) => {
    const { min, max } = getPriceRange(product);
    const priceEur = (min + max) / 2 || min;
    const volumeShare = baseShare + (idx < remainder ? 1 : 0);
    plan[product.sku] = {
      priceEur,
      volumeShare,
      bufferWeeks: 0.5,
    };
  });

  return plan;
}

function mergeProductPlan(
  products: NicheProduct[],
  decision?: SetProductPlanDecision | null
): ProductPlanState {
  const defaults = buildDefaultProductPlan(products);
  if (!decision || !Array.isArray(decision.items)) return defaults;

  const bySku = new Map<string, ProductPlanEntry>();
  for (const item of decision.items) {
    if (!item || !item.sku) continue;
    bySku.set(item.sku, item);
  }

  const next: ProductPlanState = { ...defaults };
  for (const product of products) {
    const item = bySku.get(product.sku);
    if (!item) continue;
    const fallback = defaults[product.sku];
    const { min, max } = getPriceRange(product);
    next[product.sku] = {
      priceEur: clamp(toNumber(item.priceEur, fallback.priceEur), min, max),
      volumeShare: clamp(toNumber(item.volumeShare, fallback.volumeShare), 0, 100),
      bufferWeeks: clamp(toNumber(item.bufferWeeks, fallback.bufferWeeks), 0, 12),
    };
  }

  return next;
}

function buildProductPlanItems(products: NicheProduct[], plan: ProductPlanState): ProductPlanEntry[] {
  const defaults = buildDefaultProductPlan(products);
  return products.map((product) => {
    const fallback = defaults[product.sku];
    const entry = plan[product.sku] ?? fallback;
    return {
      sku: product.sku,
      priceEur: toNumber(entry?.priceEur, fallback.priceEur),
      volumeShare: toNumber(entry?.volumeShare, fallback.volumeShare),
      bufferWeeks: toNumber(entry?.bufferWeeks, fallback.bufferWeeks),
    };
  });
}

function computePlanPriceLevel(products: NicheProduct[], plan: ProductPlanState) {
  if (!products.length) return 1;

  const defaults = buildDefaultProductPlan(products);
  let weighted = 0;
  let weightTotal = 0;
  let fallbackTotal = 0;
  let fallbackCount = 0;

  for (const product of products) {
    const basePrice = getPriceBase(product);
    const entry = plan[product.sku] ?? defaults[product.sku];
    const priceEur = toNumber(entry?.priceEur, basePrice);
    const multiplier = basePrice > 0 ? priceEur / basePrice : 1;
    const share = Math.max(0, toNumber(entry?.volumeShare, 0));

    if (share > 0) {
      weighted += multiplier * share;
      weightTotal += share;
    }

    fallbackTotal += multiplier;
    fallbackCount += 1;
  }

  if (weightTotal > 0) return weighted / weightTotal;
  return fallbackCount > 0 ? fallbackTotal / fallbackCount : 1;
}

function summarizeProductPlan(products: NicheProduct[], plan: ProductPlanState) {
  if (!products.length) return null;
  let totalShare = 0;
  let weightedPrice = 0;
  let weightedMultiplier = 0;
  let fallbackPrice = 0;
  let fallbackMultiplier = 0;
  let count = 0;

  for (const product of products) {
    const entry = plan[product.sku];
    const basePrice = getPriceBase(product);
    const priceEur = toNumber(entry?.priceEur, basePrice);
    const share = Math.max(0, toNumber(entry?.volumeShare, 0));
    const multiplier = basePrice > 0 ? priceEur / basePrice : 1;

    totalShare += share;
    if (share > 0) {
      weightedPrice += priceEur * share;
      weightedMultiplier += multiplier * share;
    }
    fallbackPrice += priceEur;
    fallbackMultiplier += multiplier;
    count += 1;
  }

  const denom = totalShare > 0 ? totalShare : Math.max(1, count);
  const avgPrice = (totalShare > 0 ? weightedPrice : fallbackPrice) / denom;
  const avgMultiplier = (totalShare > 0 ? weightedMultiplier : fallbackMultiplier) / denom;

  return { totalShare, avgPrice, avgMultiplier };
}

function formatFieldValue(field: DecisionField, value: number): string {
  if (field.kind === "PRICE") return `${value.toFixed(2)}x`;
  if (field.kind === "QUALITY") return `${value.toFixed(2)}`;
  if (field.kind === "CAPACITY" || field.kind === "STAFFING") return `${Math.round(value)}`;
  return `${Math.round(value)}`;
}

const fieldDecimals = (field: DecisionField) =>
  field.kind === "PRICE" || field.kind === "QUALITY" ? 2 : 0;

function getCurrentValueForField(
  field: DecisionField,
  state: CompanyState | null | undefined
): number | null {
  if (!state) return null;
  switch (field.kind) {
    case "PRICE":
      return Number(state.priceLevel ?? 1);
    case "MARKETING":
      return Number(state.marketingLevel ?? 0);
    case "STAFFING":
      return Number(state.employees ?? 0);
    case "CAPACITY":
      return Number(state.capacity ?? 0);
    case "QUALITY":
      return Number(state.qualityScore ?? 1);
    default:
      return null;
  }
}

function RiskBandBar({ worst, expected, best }: { worst: number; expected: number; best: number }) {
  const min = Math.min(worst, expected, best);
  const max = Math.max(worst, expected, best);
  const range = max - min || 1;
  const expectedPos = ((expected - min) / range) * 100;

  return (
    <div className="relative h-2 rounded-full bg-[var(--card-2)]">
      <div className="absolute inset-0 rounded-full bg-[color:var(--accent)]/20" />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--accent)]"
        style={{ left: `calc(${expectedPos}% - 6px)` }}
      />
    </div>
  );
}

export function CompanyDecisionPanel({
  companies,
  sectorsById,
  nichesById,
  nicheProductsById,
  unlockedProductsByCompany,
  nicheUpgradesByCompany,
  ownedUpgradesByCompany,
  draftUpgradeQueue,
  upgradeCostById,
  onToggleUpgrade,
  statesById,
  baseline,
  whatIf,
  draftDecisions,
  onDecisionChange,
  onPreset,
  disabled,
}: CompanyDecisionPanelProps) {
  const [openCompanyId, setOpenCompanyId] = React.useState<string | null>(null);
  const [expandedUnlockKey, setExpandedUnlockKey] = React.useState<string | null>(null);

  const getFieldValue = React.useCallback(
    (companyId: string, field: DecisionField, state: CompanyState | null) => {
      const decisions = draftDecisions[companyId] ?? [];
      switch (field.kind) {
        case "PRICE": {
          const payload = findDecision(decisions, "SET_PRICE");
          return toNumber((payload as any)?.priceLevel, toNumber(state?.priceLevel, 1));
        }
        case "MARKETING": {
          const payload = findDecision(decisions, "SET_MARKETING");
          return toNumber((payload as any)?.marketingLevel, toNumber(state?.marketingLevel, 0));
        }
        case "STAFFING": {
          const payload = findDecision(decisions, "SET_STAFFING");
          const base = toNumber(state?.employees, 0);
          const target = toNumber((payload as any)?.targetEmployees, base);
          return target - base;
        }
        case "CAPACITY": {
          const payload = findDecision(decisions, "INVEST_CAPACITY");
          return toNumber((payload as any)?.addCapacity, 0);
        }
        case "QUALITY": {
          const payload = findDecision(decisions, "INVEST_QUALITY");
          return toNumber((payload as any)?.addQuality, 0);
        }
        default:
          return 0;
      }
    },
    [draftDecisions]
  );

  const applyPreset = React.useCallback(
    (
      company: Company,
      state: CompanyState | null,
      fields: DecisionField[],
      preset: string,
      existingDecisions: CompanyDecisionPayload[]
    ) => {
      const basePrice = toNumber(state?.priceLevel, 1);
      const baseMarketing = toNumber(state?.marketingLevel, 0);
      const baseEmployees = toNumber(state?.employees, 0);

      const presets = {
        conservative: {
          price: basePrice * 1.05,
          marketing: baseMarketing * 0.7,
          staffingDelta: -2,
          capacityDelta: 0,
          qualityDelta: 0.02,
        },
        balanced: {
          price: basePrice,
          marketing: baseMarketing,
          staffingDelta: 0,
          capacityDelta: 0,
          qualityDelta: 0,
        },
        growth: {
          price: basePrice * 0.96,
          marketing: baseMarketing * 1.25 + 200,
          staffingDelta: 3,
          capacityDelta: 30,
          qualityDelta: 0.05,
        },
        ops: {
          price: basePrice * 1.02,
          marketing: baseMarketing * 0.85,
          staffingDelta: 1,
          capacityDelta: 20,
          qualityDelta: 0.08,
        },
        premium: {
          price: basePrice * 1.12,
          marketing: baseMarketing * 0.9,
          staffingDelta: 2,
          capacityDelta: 10,
          qualityDelta: 0.12,
        },
      } as const;

      const presetValues = (presets as any)[preset];
      if (!presetValues) return;

      const decisionTypesToReplace = new Set<string>();
      for (const field of fields) {
        switch (field.kind) {
          case "PRICE":
            decisionTypesToReplace.add("SET_PRICE");
            break;
          case "MARKETING":
            decisionTypesToReplace.add("SET_MARKETING");
            break;
          case "STAFFING":
            decisionTypesToReplace.add("SET_STAFFING");
            break;
          case "CAPACITY":
            decisionTypesToReplace.add("INVEST_CAPACITY");
            break;
          case "QUALITY":
            decisionTypesToReplace.add("INVEST_QUALITY");
            break;
          default:
            break;
        }
      }

      const payloads: CompanyDecisionPayload[] = [];
      for (const field of fields) {
        const min = field.min ?? 0;
        const max = field.max ?? 0;
        switch (field.kind) {
          case "PRICE": {
            const value = clamp(presetValues.price, min, max);
            payloads.push({ type: "SET_PRICE", priceLevel: value } as any);
            break;
          }
          case "MARKETING": {
            const value = clamp(presetValues.marketing, min, max);
            payloads.push({ type: "SET_MARKETING", marketingLevel: value } as any);
            break;
          }
          case "STAFFING": {
            const delta = clamp(presetValues.staffingDelta, min, max);
            if (delta !== 0) {
              payloads.push({ type: "SET_STAFFING", targetEmployees: baseEmployees + delta } as any);
            }
            break;
          }
          case "CAPACITY": {
            const delta = clamp(presetValues.capacityDelta, min, max);
            if (delta !== 0) {
              payloads.push({ type: "INVEST_CAPACITY", addCapacity: delta } as any);
            }
            break;
          }
          case "QUALITY": {
            const delta = clamp(presetValues.qualityDelta, min, max);
            if (delta !== 0) {
              payloads.push({ type: "INVEST_QUALITY", addQuality: delta } as any);
            }
            break;
          }
          default:
            break;
        }
      }

      const preserved = existingDecisions.filter(
        (payload) => !decisionTypesToReplace.has(String(payload.type ?? ""))
      );
      onPreset(String(company.id), [...preserved, ...payloads]);
    },
    [onPreset]
  );

  const getProjection = React.useCallback(
    (companyId: string) => {
      const base = baseline?.companies.find((c) => c.companyId === companyId) ?? null;
      const delta = whatIf?.companyDeltas.find((c) => c.companyId === companyId) ?? null;
      const band = whatIf?.companies.find((c) => c.companyId === companyId)?.riskBandEndCash ?? base?.riskBandEndCash;
      return { base, delta, band };
    },
    [baseline, whatIf]
  );

  return (
    <div className="space-y-4">
      {companies.map((company) => {
        const companyId = String(company.id);
        const state = statesById.get(companyId) ?? null;
        const niche = nichesById.get(String(company.nicheId));
        const sector = sectorsById.get(String(company.sectorId));
        const decisions = draftDecisions[companyId] ?? [];
        const rawProducts = nicheProductsById.get(String(niche?.id ?? "")) ?? [];
        const productMap = new Map<string, NicheProduct>();
        rawProducts.forEach((product) => {
          const sku = String(product?.sku ?? "");
          if (!sku) return;
          productMap.set(sku, product);
        });
        const nicheProducts = Array.from(productMap.values());
        const unlockedSet = unlockedProductsByCompany.get(companyId) ?? new Set<string>();
        const startingUnlocked = Array.isArray((niche as any)?.config?.startingLoadout?.unlockedProducts)
          ? (niche as any).config.startingLoadout.unlockedProducts.map((sku: unknown) => String(sku))
          : [];
        const unlockedSkuSet = new Set<string>(
          unlockedSet.size > 0 ? Array.from(unlockedSet) : startingUnlocked
        );
        if (unlockedSkuSet.size === 0 && nicheProducts.length > 0) {
          unlockedSkuSet.add(nicheProducts[0].sku);
        }
        const availableUpgrades = nicheUpgradesByCompany?.get(companyId) ?? [];
        const ownedUpgrades = ownedUpgradesByCompany?.get(companyId) ?? [];
        const upgradeById = new Map(availableUpgrades.map((upgrade) => [String(upgrade.id), upgrade]));
        const upgradeByCode = new Map(availableUpgrades.map((upgrade) => [String(upgrade.code), upgrade]));
        const upgradeNameByCode = new Map(
          availableUpgrades.map((upgrade) => [String(upgrade.code), String(upgrade.name ?? upgrade.code)])
        );
        const ownedUpgradeCodes = new Set(
          ownedUpgrades
            .map((owned) => upgradeById.get(String(owned.upgradeId))?.code)
            .filter(Boolean)
            .map(String)
        );
        const plannedUpgradeIds = new Set(
          (draftUpgradeQueue ?? [])
            .filter((upgrade) => upgrade.companyId === companyId)
            .map((upgrade) => String(upgrade.upgradeId))
        );
        const plannedUpgradeCodes = new Set(
          Array.from(plannedUpgradeIds)
            .map((upgradeId) => upgradeById.get(String(upgradeId))?.code)
            .filter(Boolean)
            .map(String)
        );
        if (plannedUpgradeIds.size > 0) {
          plannedUpgradeIds.forEach((upgradeId) => {
            const upgrade = upgradeById.get(String(upgradeId));
            const effects = Array.isArray((upgrade as any)?.effects) ? (upgrade as any).effects : [];
            effects.forEach((effect: any) => {
              if (String(effect?.key ?? "") !== "unlock_products") return;
              const value = effect?.value;
              if (!Array.isArray(value)) return;
              value.forEach((sku: unknown) => unlockedSkuSet.add(String(sku)));
            });
          });
        }
        const unlockedProducts = nicheProducts.filter((product) => unlockedSkuSet.has(product.sku));
        const lockedProducts = nicheProducts.filter((product) => !unlockedSkuSet.has(product.sku));
        const hasProductPlan = unlockedProducts.length > 0;
        const decisionModules = getDecisionModulesForNiche(niche ?? null);
        const decisionFields = getDecisionFieldsForNiche(niche ?? null);
        const isCarwash = niche?.code === "AUTO_CARWASH";
        const editableFields = isCarwash
          ? []
          : hasProductPlan
            ? decisionFields.filter((field) => field.kind !== "PRICE")
            : decisionFields;
        const guidance = getDecisionGuidance(niche ?? null, sector ?? null, state);
        const planDecision = findDecision(decisions, "SET_PRODUCT_PLAN") as SetProductPlanDecision | null;
        const defaultPlan = buildDefaultProductPlan(unlockedProducts);
        const productPlan = mergeProductPlan(unlockedProducts, planDecision);
        const planSummary = summarizeProductPlan(unlockedProducts, productPlan);
        const derivedPriceLevel = computePlanPriceLevel(unlockedProducts, productPlan);
        const projection = getProjection(companyId);
        const unlockRules = Array.isArray((niche as any)?.config?.unlockRules)
          ? (niche as any).config.unlockRules
          : [];
        const unlockRuleBySku = new Map<string, any>();
        unlockRules.forEach((rule: any) => {
          if (!rule || !rule.productSku) return;
          unlockRuleBySku.set(String(rule.productSku), rule);
        });

        const renderLockedProduct = (product: NicheProduct) => {
          const rule = unlockRuleBySku.get(product.sku) ?? null;
          const requirements = formatUnlockRequirements((rule as any)?.requirements ?? {});
          const hasRequirements =
            requirements.upgrades.length ||
            requirements.assets.length ||
            requirements.staff.length ||
            requirements.thresholds.length ||
            requirements.anyOf.length;
          const { min, max } = getPriceRange(product);
          const priceRangeLabel = min > 0 || max > 0 ? formatMoneyRange(min, max) : "n/a";
          const cogsLabel = formatRange(product.cogsPctMin, product.cogsPctMax, 0);
          const upgradeItems = requirements.upgrades
            .map((code) => upgradeByCode.get(code))
            .filter(Boolean) as NicheUpgrade[];
          const missingUpgradeItems = upgradeItems.filter(
            (upgrade) => !ownedUpgradeCodes.has(String(upgrade.code))
          );
          const unlockCost = missingUpgradeItems.reduce((sum, upgrade) => {
            const upgradeId = String(upgrade.id);
            return sum + toNumber(upgradeCostById?.[upgradeId] ?? upgrade.cost, 0);
          }, 0);
          const detailKey = `${companyId}-${product.sku}`;
          const isExpanded = expandedUnlockKey === detailKey;
          const canPlan = missingUpgradeItems.length > 0 && typeof onToggleUpgrade === "function";
          const isPlanned =
            missingUpgradeItems.length > 0 &&
            missingUpgradeItems.every((upgrade) => plannedUpgradeIds.has(String(upgrade.id)));
          const planLabel =
            unlockCost > 0 ? `Invest ${formatCurrencyCompact(unlockCost)}` : "Plan unlock";

          return (
            <div
              key={`${companyId}-locked-${product.sku}`}
              className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                    <Lock className="h-3 w-3" />
                    {getProductIcon(product)}
                    {product.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {product.sku} | {product.unit} | Range {priceRangeLabel}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Driver {product.capacityDriver} | COGS {cogsLabel}%
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                    onClick={() => setExpandedUnlockKey(isExpanded ? null : detailKey)}
                  >
                    {isExpanded ? "Hide details" : "Unlock details"}
                  </button>
                  {canPlan ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={disabled || isPlanned}
                      onClick={() => {
                        if (!onToggleUpgrade) return;
                        missingUpgradeItems.forEach((upgrade) => {
                          const upgradeId = String(upgrade.id);
                          if (plannedUpgradeIds.has(upgradeId)) return;
                          onToggleUpgrade(companyId, upgradeId);
                        });
                      }}
                    >
                      {isPlanned ? "Planned" : planLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
              {!hasRequirements ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">Unlock via upgrades.</div>
              ) : null}
              {product.notes ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">{product.notes}</div>
              ) : null}
              {requirements.upgrades.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {requirements.upgrades.map((code) => {
                    const label = upgradeNameByCode.get(code) ?? code;
                    const owned = ownedUpgradeCodes.has(code);
                    const planned = plannedUpgradeCodes.has(code);
                    return (
                      <span
                        key={`${companyId}-locked-upgrade-${product.sku}-${code}`}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          owned
                            ? "bg-emerald-100 text-emerald-700"
                            : planned
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {label}
                        {owned ? " (owned)" : planned ? " (planned)" : ""}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              {requirements.assets.length > 0 ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Assets: {requirements.assets.join(", ")}
                </div>
              ) : null}
              {requirements.staff.length > 0 ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Staff: {requirements.staff.join(", ")}
                </div>
              ) : null}
              {requirements.thresholds.length > 0 ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {requirements.thresholds.join(" | ")}
                </div>
              ) : null}
              {requirements.anyOf.length > 0 ? (
                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Any of: {requirements.anyOf.join(" OR ")}
                </div>
              ) : null}
              {requirements.upgrades.length > 0 && unlockCost > 0 ? (
                <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Unlock investment: {formatCurrencyCompact(unlockCost)}
                </div>
              ) : hasRequirements ? (
                <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Unlock investment: n/a (non-upgrade requirements)
                </div>
              ) : null}
              {isExpanded ? (
                <div className="mt-2 space-y-2 text-[10px] text-[var(--text-muted)]">
                  {upgradeItems.length > 0 ? (
                    <div className="grid gap-2">
                      {upgradeItems.map((upgrade) => {
                        const upgradeId = String(upgrade.id);
                        const upgradeCost = toNumber(
                          upgradeCostById?.[upgradeId] ?? upgrade.cost,
                          0
                        );
                        return (
                          <div
                            key={`${companyId}-upgrade-detail-${product.sku}-${upgradeId}`}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2"
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--text)]">
                              <span>{upgrade.name}</span>
                              <span>{formatCurrencyCompact(upgradeCost)}</span>
                            </div>
                            {upgrade.capexFormula ? (
                              <div className="mt-1">Capex: {upgrade.capexFormula}</div>
                            ) : null}
                            {upgrade.opexFormula ? (
                              <div className="mt-1">Opex: {upgrade.opexFormula}</div>
                            ) : null}
                            {upgrade.durationWeeks ? (
                              <div className="mt-1">Duration: {upgrade.durationWeeks} w</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>No upgrade costs listed for this unlock.</div>
                  )}
                </div>
              ) : null}
            </div>
          );
        };

        const carwashConfig = isCarwash ? ((niche?.config as any) ?? {}) : {};
        const carwashCore = carwashConfig?.coreAssumptions ?? {};
        const carwashOperations = carwashConfig?.operations ?? {};
        const carwashOffers = carwashConfig?.offers ?? {};
        const carwashWarehouse =
          carwashConfig?.warehouse ?? carwashConfig?.demandEngine?.warehouse ?? {};
        const carwashProcurement = carwashConfig?.procurement ?? {};
        const carwashMarketing = carwashConfig?.marketing ?? {};
        const carwashHr = carwashConfig?.hr ?? {};
        const carwashPricing = carwashConfig?.pricing ?? {};
        const carwashFinance = carwashConfig?.finance ?? {};

        const carwashOpsDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_OPERATIONS") as SetCarwashOperationsDecision | null)
          : null;
        const carwashWarehouseDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_WAREHOUSE") as SetCarwashWarehouseDecision | null)
          : null;
        const carwashProcurementDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_PROCUREMENT") as SetCarwashProcurementDecision | null)
          : null;
        const carwashMarketingDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_MARKETING") as SetCarwashMarketingDecision | null)
          : null;
        const carwashHrDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_HR") as SetCarwashHrDecision | null)
          : null;
        const carwashPricingDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_PRICING") as SetCarwashPricingDecision | null)
          : null;
        const carwashFinanceDecision = isCarwash
          ? (findDecision(decisions, "SET_CARWASH_FINANCE") as SetCarwashFinanceDecision | null)
          : null;

        const carwashTicksPerWeek = Math.max(1, toNumber(carwashCore?.ticksPerWeek, 1008));
        const carwashTicksPerDay = Math.max(1, toNumber(carwashCore?.ticksPerDay, 144));
        const carwashDaysPerWeek = carwashTicksPerWeek / carwashTicksPerDay;
        const carwashOpsResolution = carwashConfig?.opsResolution ?? {};
        const carwashMaintenanceLevels = Array.isArray(carwashConfig?.maintenance?.levels)
          ? carwashConfig.maintenance.levels
          : [];
        const carwashQueuePenalty = carwashConfig?.queue?.waitPenalty ?? {};
        const carwashQueuePenaltyLow = toNumber((carwashQueuePenalty as any)?.low, 0);
        const carwashQueuePenaltyMedium = toNumber((carwashQueuePenalty as any)?.medium, 0);
        const carwashQueuePenaltyHigh = toNumber((carwashQueuePenalty as any)?.high, 0);
        const carwashLaneThroughput = Math.max(
          0.1,
          toNumber(carwashOperations?.laneThroughputPerTick?.base, 2)
        );
        const carwashCapacityPerLaneWeek = carwashLaneThroughput * carwashTicksPerWeek;
        const carwashCapacityDecision = isCarwash
          ? (findDecision(decisions, "INVEST_CAPACITY") as any)
          : null;
        const carwashCapacityDelta = toNumber(carwashCapacityDecision?.addCapacity, 0);
        const carwashCurrentCapacity = Math.max(0, toNumber(state?.capacity, 0));
        const carwashPlannedCapacity = Math.max(0, carwashCurrentCapacity + carwashCapacityDelta);
        const carwashLaneCount =
          carwashCapacityPerLaneWeek > 0 ? carwashPlannedCapacity / carwashCapacityPerLaneWeek : 0;
        const carwashLaneCountRounded = Math.max(0, Math.round(carwashLaneCount));
        const carwashMaxExteriorPerTick = Math.max(
          0,
          Math.floor(carwashLaneCount * carwashLaneThroughput)
        );

        const carwashQualityScore = toNumber(state?.qualityScore, 0.6);
        const carwashQualityNorm = clamp((carwashQualityScore - 0.4) / 0.6, 0, 1);
        const carwashDefaultMaintenance = clamp(Math.round(carwashQualityNorm * 3), 0, 3);

        const carwashRoleKeys = Object.keys(carwashHr?.hourlyCostRangeEur ?? {});
        const carwashStartingStaff = Array.isArray(carwashConfig?.startingLoadout?.staff)
          ? carwashConfig.startingLoadout.staff
          : [];
        const carwashStartingStaffFte = carwashStartingStaff.reduce(
          (sum: number, staff: any) => sum + toNumber(staff?.fte, 0),
          0
        );
        const carwashEmployeesBase = toNumber(state?.employees, 0);
        const carwashHireFireDelta = carwashRoleKeys.reduce((sum, role) => {
          return sum + Math.trunc(toNumber(carwashHrDecision?.hireFireByRole?.[role], 0));
        }, 0);
        const carwashEmployeesPlanned = Math.max(0, Math.floor(carwashEmployeesBase + carwashHireFireDelta));
        const carwashStaffAllocationByRole = carwashOpsDecision?.staffAllocationByRole ?? {};
        const carwashAllocatedFte = carwashRoleKeys.reduce((sum, role) => {
          return sum + Math.max(0, toNumber((carwashStaffAllocationByRole as any)?.[role], 0));
        }, 0);
        const carwashStaffGap = carwashEmployeesPlanned - carwashAllocatedFte;
        const carwashAddLanes =
          carwashCapacityPerLaneWeek > 0 ? carwashCapacityDelta / carwashCapacityPerLaneWeek : 0;
        const carwashDefaultCampaigns = {
          performance_ads: {
            budgetPerTickRangeEur: { min: 0, max: 120, step: 5 },
            minDurationTicks: 12,
            maxDurationTicks: 120,
            expectedLiftPctRange: { min: 0.6, max: 2.2 },
          },
          local_flyers_partnerships: {
            budgetPerTickRangeEur: { min: 0, max: 60, step: 2 },
            minDurationTicks: 36,
            maxDurationTicks: 180,
            expectedLiftPctRange: { min: 0.3, max: 1.1 },
          },
          review_push: {
            budgetPerTickRangeEur: { min: 0, max: 50, step: 2 },
            minDurationTicks: 24,
            maxDurationTicks: 120,
            expectedLiftPctRange: { min: 0.2, max: 0.9 },
          },
          hr_branding: {
            budgetPerTickRangeEur: { min: 0, max: 40, step: 2 },
            minDurationTicks: 72,
            maxDurationTicks: 240,
            expectedLiftPctRange: { min: 0.15, max: 0.6 },
          },
          fleet_outreach: {
            budgetPerTickRangeEur: { min: 0, max: 80, step: 4 },
            minDurationTicks: 72,
            maxDurationTicks: 200,
            expectedLiftPctRange: { min: 0.4, max: 1.6 },
          },
          referral_rewards: {
            budgetPerTickRangeEur: { min: 0, max: 70, step: 3 },
            minDurationTicks: 24,
            maxDurationTicks: 160,
            expectedLiftPctRange: { min: 0.35, max: 1.4 },
          },
        };
        const carwashCampaigns = {
          ...carwashDefaultCampaigns,
          ...(carwashMarketing?.campaigns ?? {}),
        };
        const carwashCampaignEntries = Object.entries(carwashCampaigns);
        const carwashPriceStepBase = toNumber(carwashPricing?.priceStepEur, 0.5);
        const carwashDetailingPriceStep = toNumber(
          carwashPricing?.detailingPriceStepEur,
          carwashPriceStepBase
        );
        const carwashUpsell = carwashMarketing?.upsell ?? {};
        const carwashUpsellMin = toNumber((carwashUpsell as any)?.upgradeRateBoostPctPerStaffRange?.min, 0);
        const carwashUpsellMax = toNumber((carwashUpsell as any)?.upgradeRateBoostPctPerStaffRange?.max, 0);
        const carwashUpsellCap = toNumber((carwashUpsell as any)?.upgradeRateBoostTotalCapPct, 0);
        const carwashBaseDemandLevel = toNumber((carwashConfig as any)?.baseDemandLevel, 0);
        const carwashCampaignBudgetPerTickTotal = carwashCampaignEntries.reduce((sum, [key]) => {
          return sum + Math.max(0, toNumber(carwashMarketingDecision?.campaignBudgetByKey?.[key], 0));
        }, 0);
        const carwashCampaignBudgetPerWeek = carwashCampaignBudgetPerTickTotal * carwashTicksPerWeek;
        const carwashCampaignLiftMinPct = clamp((carwashCampaignBudgetPerWeek / 1000) * 0.6, 0, 25);
        const carwashCampaignLiftMaxPct = clamp((carwashCampaignBudgetPerWeek / 1000) * 1.2, carwashCampaignLiftMinPct, 45);
        const carwashCampaignLiftMinUnits = carwashBaseDemandLevel * (carwashCampaignLiftMinPct / 100);
        const carwashCampaignLiftMaxUnits = carwashBaseDemandLevel * (carwashCampaignLiftMaxPct / 100);

        const getCarwashOfferMaxPerTick = (product: NicheProduct) => {
          const offerCfg = carwashOffers?.[product.sku] ?? {};
          const offerMax = toNumber(offerCfg?.outputPerTickMax, 0);
          if (product.capacityDriver === "wash_lanes") return carwashMaxExteriorPerTick;
          if (offerMax > 0) return Math.max(0, Math.round(offerMax));
          if (product.capacityDriver === "interior_bays") {
            return Math.max(0, Math.round(toNumber(carwashOperations?.interiorOutputPerTickMax, 0)));
          }
          if (product.capacityDriver === "detailing_bays") {
            return Math.max(0, Math.round(toNumber(carwashOperations?.detailingOutputPerTickMax, 0)));
          }
          return 0;
        };

        const laneProducts = unlockedProducts.filter((product) => product.capacityDriver === "wash_lanes");
        const laneShareTotal = laneProducts.reduce((sum, product) => {
          const entry = productPlan[product.sku] ?? defaultPlan[product.sku];
          return sum + Math.max(0, toNumber(entry?.volumeShare, 0));
        }, 0);
        const laneShareCount = laneProducts.length;
        const carwashDefaultTargetOutputBySku: Record<string, number> = {};

        for (const product of unlockedProducts) {
          if (product.capacityDriver === "wash_lanes") {
            const entry = productPlan[product.sku] ?? defaultPlan[product.sku];
            const share =
              laneShareTotal > 0
                ? Math.max(0, toNumber(entry?.volumeShare, 0)) / laneShareTotal
                : laneShareCount > 0
                  ? 1 / laneShareCount
                  : 0;
            carwashDefaultTargetOutputBySku[product.sku] = Math.max(
              0,
              Math.round(carwashMaxExteriorPerTick * share)
            );
          } else {
            carwashDefaultTargetOutputBySku[product.sku] = 0;
          }
        }

        const carwashTargetOutputBySku = {
          ...carwashDefaultTargetOutputBySku,
          ...(carwashOpsDecision?.targetOutputBySku ?? {}),
        };
        const carwashTargetOutputPerWeekBySku: Record<string, number> = {};
        let carwashTargetOutputTotalPerWeek = 0;
        for (const product of unlockedProducts) {
          const perTick = Math.max(0, toNumber(carwashTargetOutputBySku[product.sku], 0));
          const perWeek = perTick * carwashTicksPerWeek;
          carwashTargetOutputPerWeekBySku[product.sku] = perWeek;
          carwashTargetOutputTotalPerWeek += perWeek;
        }
        const carwashTargetUtilization =
          carwashPlannedCapacity > 0 ? carwashTargetOutputTotalPerWeek / carwashPlannedCapacity : 0;

        const carwashSupplyConsumption = carwashOpsResolution?.supplyConsumption ?? {};
        const chemicalsUnitsPerWash = carwashSupplyConsumption?.chemicalsUnitsPerWash ?? {};
        const consumablesUnitsPerJob = carwashSupplyConsumption?.consumablesUnitsPerJob ?? {};
        const sparePartsUnitsPerLanePerDay = toNumber(
          carwashSupplyConsumption?.sparePartsUnitsPerLanePerDay,
          0
        );
        let weeklyChemicalsUsage = 0;
        let weeklyConsumablesUsage = 0;
        for (const product of unlockedProducts) {
          const perWeek = carwashTargetOutputPerWeekBySku[product.sku] ?? 0;
          const chemicalUnits = toNumber((chemicalsUnitsPerWash as any)?.[product.sku], 0);
          const consumableUnits = toNumber((consumablesUnitsPerJob as any)?.[product.sku], 0);
          weeklyChemicalsUsage += perWeek * chemicalUnits;
          weeklyConsumablesUsage += perWeek * consumableUnits;
        }
        const weeklySparePartsUsage = sparePartsUnitsPerLanePerDay * carwashDaysPerWeek * carwashLaneCount;

        const carwashStartingAssets = Array.isArray(carwashConfig?.startingLoadout?.assets)
          ? carwashConfig.startingLoadout.assets
          : [];
        const carwashStartingAssetsById = new Map<string, number>(
          carwashStartingAssets.map((asset: any) => [String(asset?.assetId ?? ""), toNumber(asset?.count, 0)])
        );
        const carwashBaseLanes = toNumber(carwashStartingAssetsById.get("wash_lanes"), 0);
        const carwashBaseInteriorBays = toNumber(carwashStartingAssetsById.get("interior_bays"), 0);
        const carwashBaseDetailingBays = toNumber(carwashStartingAssetsById.get("detailing_bays"), 0);
        const storedWarehouse = state && typeof (state as any).warehouseState === "object"
          ? (state as any).warehouseState
          : null;
        const storedOnHand =
          storedWarehouse && typeof storedWarehouse.onHandByCategory === "object"
            ? storedWarehouse.onHandByCategory
            : null;
        const carwashBaselineStock = {
          chemicals: Number.isFinite(toNumber((storedOnHand as any)?.chemicals, NaN))
            ? toNumber((storedOnHand as any)?.chemicals, 0)
            : toNumber(carwashStartingAssetsById.get("chemicals_inventory_units"), 0),
          consumables: Number.isFinite(toNumber((storedOnHand as any)?.consumables, NaN))
            ? toNumber((storedOnHand as any)?.consumables, 0)
            : toNumber(carwashStartingAssetsById.get("consumables_inventory_units"), 0),
          spare_parts: Number.isFinite(toNumber((storedOnHand as any)?.spare_parts, NaN))
            ? toNumber((storedOnHand as any)?.spare_parts, 0)
            : toNumber(carwashStartingAssetsById.get("spare_parts_inventory_units"), 0),
        };
        const carwashPendingOrdersByCategory: Record<string, number> = {
          chemicals: Array.isArray((storedWarehouse as any)?.pendingOrdersByCategory?.chemicals)
            ? (storedWarehouse as any).pendingOrdersByCategory.chemicals.reduce(
                (sum: number, order: any) => sum + toNumber(order?.qty, 0),
                0
              )
            : 0,
          consumables: Array.isArray((storedWarehouse as any)?.pendingOrdersByCategory?.consumables)
            ? (storedWarehouse as any).pendingOrdersByCategory.consumables.reduce(
                (sum: number, order: any) => sum + toNumber(order?.qty, 0),
                0
              )
            : 0,
          spare_parts: Array.isArray((storedWarehouse as any)?.pendingOrdersByCategory?.spare_parts)
            ? (storedWarehouse as any).pendingOrdersByCategory.spare_parts.reduce(
                (sum: number, order: any) => sum + toNumber(order?.qty, 0),
                0
              )
            : 0,
        };
        const carwashTotalStock =
          carwashBaselineStock.chemicals +
          carwashBaselineStock.consumables +
          carwashBaselineStock.spare_parts;
        const carwashTotalPipeline =
          carwashPendingOrdersByCategory.chemicals +
          carwashPendingOrdersByCategory.consumables +
          carwashPendingOrdersByCategory.spare_parts;
        const carwashHoldingCostPctPerDay = Math.max(
          0,
          toNumber(carwashWarehouse?.holdingCostPctPerDay, 0)
        );
        const carwashHoldingCostPerWeek =
          carwashTotalStock * carwashHoldingCostPctPerDay * carwashDaysPerWeek;

        const carwashWarehouseStorageBase = toNumber(carwashWarehouse?.storageCapacityUnitsStart, 0);
        const carwashSelectedStorageUpgrades = new Set<number>(
          carwashWarehouseDecision?.storageUpgrades ?? []
        );
        const carwashWarehouseStorageExtra = Array.isArray(carwashWarehouse?.storageUpgrades)
          ? carwashWarehouse.storageUpgrades.reduce((sum: number, upgrade: any, index: number) => {
              if (!carwashSelectedStorageUpgrades.has(index)) return sum;
              return sum + toNumber(upgrade?.capacityUnits, 0);
            }, 0)
          : 0;
        const carwashWarehouseStorageTotal = carwashWarehouseStorageBase + carwashWarehouseStorageExtra;

        const promoDiscountPct = toNumber(carwashPricingDecision?.promoDiscountPct, 0);
        const marketAllocation = carwashConfig?.demandEngine?.marketAllocation ?? {};
        const segmentSkuMap = (marketAllocation as any)?.segmentSkuMap ?? {};
        const segmentElasticities = (marketAllocation as any)?.elasticities ?? {};
        const relevantElasticities: number[] = [];
        Object.entries(segmentSkuMap).forEach(([segment, sku]) => {
          if (!unlockedProducts.some((product) => product.sku === sku)) return;
          const elasticity = toNumber((segmentElasticities as any)?.[segment], NaN);
          if (Number.isFinite(elasticity)) relevantElasticities.push(elasticity);
        });
        const promoElasticityMin =
          relevantElasticities.length > 0 ? Math.min(...relevantElasticities) : 0;
        const promoElasticityMax =
          relevantElasticities.length > 0 ? Math.max(...relevantElasticities) : 0;
        const promoLiftMinPct = promoDiscountPct * promoElasticityMin;
        const promoLiftMaxPct = promoDiscountPct * promoElasticityMax;
        const promoDurationTicks = toNumber(carwashPricingDecision?.promoDurationTicks, 0);
        const promoCoveragePct =
          carwashTicksPerWeek > 0 ? clamp(promoDurationTicks / carwashTicksPerWeek, 0, 1) : 0;
        const promoEffectiveDiscount = promoDiscountPct * promoCoveragePct;
        const promoLiftMinUnits = carwashBaseDemandLevel * (promoLiftMinPct / 100);
        const promoLiftMaxUnits = carwashBaseDemandLevel * (promoLiftMaxPct / 100);
        const updateCarwashOperations = (updates: Partial<SetCarwashOperationsDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_OPERATIONS") as SetCarwashOperationsDecision | null) ?? {
              type: "SET_CARWASH_OPERATIONS",
            };
          const next: SetCarwashOperationsDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_OPERATIONS",
          };
          if (updates.targetOutputBySku) {
            next.targetOutputBySku = mergeRecord(
              current.targetOutputBySku ?? {},
              updates.targetOutputBySku
            ) as Record<string, number>;
          }
          if (updates.staffAllocationByRole) {
            next.staffAllocationByRole = mergeRecord(
              current.staffAllocationByRole ?? {},
              updates.staffAllocationByRole
            ) as Record<string, number>;
          }
          onDecisionChange(companyId, next as any);
        };

        const updateCapacityDecision = (laneDelta: number) => {
          const lanes = Math.round(toNumber(laneDelta, 0));
          const addCapacity = carwashCapacityPerLaneWeek > 0 ? lanes * carwashCapacityPerLaneWeek : 0;
          onDecisionChange(companyId, { type: "INVEST_CAPACITY", addCapacity } as any);
        };

        const buildAutoStaffAllocation = () => {
          const total = Math.max(0, Math.floor(carwashEmployeesPlanned));
          if (total <= 0 || carwashRoleKeys.length === 0) return {};

          const weights = carwashRoleKeys.map((role) => {
            const lower = role.toLowerCase();
            if (lower.includes("manager")) return 0.1;
            if (lower.includes("maintenance")) return 0.1;
            if (lower.includes("detailer")) return 0.2;
            if (lower.includes("senior")) return 0.15;
            return 0.45;
          });
          const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
          const allocation: Record<string, number> = {};
          let allocated = 0;

          carwashRoleKeys.forEach((role, idx) => {
            const raw = (total * weights[idx]) / weightTotal;
            const rounded = Math.round(raw * 4) / 4;
            allocation[role] = rounded;
            allocated += rounded;
          });

          const diff = Math.round((total - allocated) * 4) / 4;
          if (Math.abs(diff) >= 0.25) {
            const firstRole = carwashRoleKeys[0];
            allocation[firstRole] = Math.max(0, (allocation[firstRole] ?? 0) + diff);
          }

          return allocation;
        };

        const updateCarwashWarehouse = (updates: Partial<SetCarwashWarehouseDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_WAREHOUSE") as SetCarwashWarehouseDecision | null) ?? {
              type: "SET_CARWASH_WAREHOUSE",
            };
          const next: SetCarwashWarehouseDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_WAREHOUSE",
          };
          if (updates.orderQtyByCategory) {
            next.orderQtyByCategory = mergeRecord(
              current.orderQtyByCategory ?? {},
              updates.orderQtyByCategory
            ) as Record<string, number>;
          }
          if (updates.reorderPointByCategory) {
            next.reorderPointByCategory = mergeRecord(
              current.reorderPointByCategory ?? {},
              updates.reorderPointByCategory
            ) as Record<string, number>;
          }
          if (updates.safetyStockByCategory) {
            next.safetyStockByCategory = mergeRecord(
              current.safetyStockByCategory ?? {},
              updates.safetyStockByCategory
            ) as Record<string, number>;
          }
          onDecisionChange(companyId, next as any);
        };

        const updateCarwashProcurement = (updates: Partial<SetCarwashProcurementDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_PROCUREMENT") as SetCarwashProcurementDecision | null) ?? {
              type: "SET_CARWASH_PROCUREMENT",
            };
          const next: SetCarwashProcurementDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_PROCUREMENT",
          };
          if (updates.supplierTierByCategory) {
            next.supplierTierByCategory = mergeRecord(
              current.supplierTierByCategory ?? {},
              updates.supplierTierByCategory
            ) as Record<string, "A" | "B" | "C">;
          }
          if (updates.contractTypeByCategory) {
            next.contractTypeByCategory = mergeRecord(
              current.contractTypeByCategory ?? {},
              updates.contractTypeByCategory
            ) as Record<string, "spot" | "contract_7d" | "contract_30d">;
          }
          onDecisionChange(companyId, next as any);
        };

        const updateCarwashMarketing = (updates: Partial<SetCarwashMarketingDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_MARKETING") as SetCarwashMarketingDecision | null) ?? {
              type: "SET_CARWASH_MARKETING",
            };
          const next: SetCarwashMarketingDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_MARKETING",
          };
          if (updates.campaignBudgetByKey) {
            next.campaignBudgetByKey = mergeRecord(
              current.campaignBudgetByKey ?? {},
              updates.campaignBudgetByKey
            ) as Record<string, number>;
          }
          if (updates.campaignDurationWeeksByKey) {
            next.campaignDurationWeeksByKey = mergeRecord(
              current.campaignDurationWeeksByKey ?? {},
              updates.campaignDurationWeeksByKey
            ) as Record<string, number>;
          }
          onDecisionChange(companyId, next as any);
        };

        const updateCarwashHr = (updates: Partial<SetCarwashHrDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_HR") as SetCarwashHrDecision | null) ?? {
              type: "SET_CARWASH_HR",
            };
          const next: SetCarwashHrDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_HR",
          };
          if (updates.hireFireByRole) {
            next.hireFireByRole = mergeRecord(
              current.hireFireByRole ?? {},
              updates.hireFireByRole
            ) as Record<string, number>;
          }
          if (updates.wagePolicyByRole) {
            next.wagePolicyByRole = mergeRecord(
              current.wagePolicyByRole ?? {},
              updates.wagePolicyByRole
            ) as Record<string, number>;
          }
          onDecisionChange(companyId, next as any);
        };

        const updateCarwashPricing = (updates: Partial<SetCarwashPricingDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_PRICING") as SetCarwashPricingDecision | null) ?? {
              type: "SET_CARWASH_PRICING",
            };
          const next: SetCarwashPricingDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_PRICING",
          };
          onDecisionChange(companyId, next as any);
        };

        const updateCarwashFinance = (updates: Partial<SetCarwashFinanceDecision>) => {
          if (!isCarwash) return;
          const current =
            (findDecision(decisions, "SET_CARWASH_FINANCE") as SetCarwashFinanceDecision | null) ?? {
              type: "SET_CARWASH_FINANCE",
            };
          const next: SetCarwashFinanceDecision = {
            ...current,
            ...updates,
            type: "SET_CARWASH_FINANCE",
          };
          onDecisionChange(companyId, next as any);
        };

        const carwashOpenStatus = carwashOpsDecision?.openStatus ?? true;
        const carwashEnergyMode = (carwashOpsDecision?.energyMode ?? "normal") as CarwashEnergyMode;
        const carwashQueuePolicy = (carwashOpsDecision?.queuePolicy ?? "walk_in_only") as CarwashQueuePolicy;
        const carwashMaintenanceLevel = clamp(
          toNumber(carwashOpsDecision?.maintenanceLevel, carwashDefaultMaintenance),
          0,
          3
        );
        const carwashTrainingMin = toNumber(carwashHr?.trainingLevels?.min, 0);
        const carwashTrainingMax = toNumber(carwashHr?.trainingLevels?.max, 5);
        const carwashTrainingLevel = clamp(
          toNumber(carwashHrDecision?.trainingLevel, carwashTrainingMin),
          carwashTrainingMin,
          carwashTrainingMax
        );
        const carwashShiftPlan = (carwashHrDecision?.shiftPlan ?? "balanced") as SetCarwashHrDecision["shiftPlan"];
        const carwashHiringLeadTimeMin = toNumber(carwashHr?.hiringLeadTimeTicksRange?.min, 0);
        const carwashHiringLeadTimeMax = toNumber(carwashHr?.hiringLeadTimeTicksRange?.max, 0);
        const carwashTrainingCostMin = toNumber(carwashHr?.trainingCostRangeEur?.min, 0);
        const carwashTrainingCostMax = toNumber(carwashHr?.trainingCostRangeEur?.max, 0);
        const carwashTrainingTimeMin = toNumber(carwashHr?.trainingTimeTicksRange?.min, 0);
        const carwashTrainingTimeMax = toNumber(carwashHr?.trainingTimeTicksRange?.max, 0);
        const carwashTrainingEffects = carwashHr?.trainingEffects ?? {};
        const carwashTrainingProductivityPct = toNumber(
          (carwashTrainingEffects as any)?.productivityPctPerLevel,
          0
        );
        const carwashTrainingQualityPct = toNumber((carwashTrainingEffects as any)?.qualityPctPerLevel, 0);
        const carwashTrainingUpsellPct = toNumber((carwashTrainingEffects as any)?.upsellPctPerLevel, 0);
        const carwashEnergyModes = carwashOpsResolution?.energyModes ?? {};
        const carwashEnergyConfig = carwashEnergyModes?.[carwashEnergyMode] ?? {};
        const carwashEnergyCostMultiplier = toNumber(carwashEnergyConfig?.energyCostMultiplier, 1);
        const carwashEnergyThroughputMultiplier = toNumber(carwashEnergyConfig?.throughputMultiplier, 1);
        const carwashEnergyQualityMultiplier = toNumber(carwashEnergyConfig?.qualityMultiplier, 1);
        const carwashInteriorOutputPerTickMax = Math.max(
          0,
          Math.round(toNumber(carwashOperations?.interiorOutputPerTickMax, 0))
        );
        const carwashDetailingOutputPerTickMax = Math.max(
          0,
          Math.round(toNumber(carwashOperations?.detailingOutputPerTickMax, 0))
        );
        const carwashMaintenanceInfo =
          carwashMaintenanceLevels.find((level: any) => Number(level?.level) === carwashMaintenanceLevel) ?? null;
        const carwashMaintenanceCostPerLanePerTick = toNumber(
          carwashMaintenanceInfo?.costPerLanePerTick,
          0
        );
        const carwashBreakdownChancePct = toNumber(carwashMaintenanceInfo?.breakdownChancePct, 0);
        const carwashMaintenanceCostPerWeek =
          carwashMaintenanceCostPerLanePerTick * carwashLaneCount * carwashTicksPerWeek;
        const carwashMaintenanceCostPerLanePerWeek = carwashMaintenanceCostPerLanePerTick * carwashTicksPerWeek;
        const carwashExteriorCapacityPerWeek = carwashMaxExteriorPerTick * carwashTicksPerWeek;
        const carwashInteriorCapacityPerWeek = carwashInteriorOutputPerTickMax * carwashTicksPerWeek;
        const carwashDetailingCapacityPerWeek = carwashDetailingOutputPerTickMax * carwashTicksPerWeek;
        const carwashExteriorCapacityPerWeekEffective =
          carwashExteriorCapacityPerWeek * carwashEnergyThroughputMultiplier;
        const carwashInteriorCapacityPerWeekEffective =
          carwashInteriorCapacityPerWeek * carwashEnergyThroughputMultiplier;
        const carwashDetailingCapacityPerWeekEffective =
          carwashDetailingCapacityPerWeek * carwashEnergyThroughputMultiplier;
        const getOfferUtilityRange = (sku: string) => {
          const offer = carwashOffers?.[sku] ?? {};
          const utilities = (offer as any)?.costsEur?.utilities ?? {};
          const min = toNumber(utilities?.min, 0);
          const max = Math.max(min, toNumber(utilities?.max, min));
          return { min, max };
        };
        let weeklyUtilityCostMin = 0;
        let weeklyUtilityCostMax = 0;
        for (const product of unlockedProducts) {
          const perWeek = carwashTargetOutputPerWeekBySku[product.sku] ?? 0;
          if (perWeek <= 0) continue;
          const range = getOfferUtilityRange(product.sku);
          weeklyUtilityCostMin += perWeek * range.min;
          weeklyUtilityCostMax += perWeek * range.max;
        }
        weeklyUtilityCostMin *= carwashEnergyCostMultiplier;
        weeklyUtilityCostMax *= carwashEnergyCostMultiplier;

        const resolveRangeForField = (field: DecisionField) => {
          const guidanceRange = field.guidanceKey ? guidance?.ranges[field.guidanceKey] : undefined;
          const min = Number(guidanceRange?.min ?? field.min ?? 0);
          const max = Number(guidanceRange?.max ?? field.max ?? min + 1);
          const step = Number(field.step ?? (field.kind === "PRICE" ? 0.05 : 1));
          const unit = field.unit ?? guidanceRange?.unit ?? "";
          const note = guidanceRange?.note ?? field.description ?? "";
          return {
            min,
            max: Math.max(min, max),
            step,
            unit,
            note,
          };
        };

        const selectedProgramIds = new Map<string, string>();
        for (const module of decisionModules) {
          const programType = String((module.options[0]?.payload as any)?.programType ?? "");
          if (!programType) continue;
          const existing = decisions.find(
            (payload) =>
              payload.type === "START_PROGRAM" &&
              String((payload as any)?.programType ?? "") === programType
          );
          if (!existing) continue;
          const match = module.options.find((opt) => {
            const labelMatch = String((opt.payload as any)?.label ?? "") === String((existing as any)?.label ?? "");
            return String((opt.payload as any)?.programType ?? "") === programType && labelMatch;
          });
          if (match) selectedProgramIds.set(module.id, match.id);
        }

        const updateProgramSelection = (moduleId: string, optionId: string) => {
          const module = decisionModules.find((mod) => mod.id === moduleId);
          if (!module) return;
          const programType = String((module.options[0]?.payload as any)?.programType ?? "");
          if (!programType) return;

          const filtered = decisions.filter(
            (payload) =>
              payload.type !== "START_PROGRAM" ||
              String((payload as any)?.programType ?? "") !== programType
          );

          if (optionId) {
            const option = module.options.find((opt) => opt.id === optionId);
            if (option) filtered.push(option.payload);
          }

          onPreset(companyId, filtered);
        };

        const updateProductPlan = (sku: string, updates: Partial<ProductPlanEntry>) => {
          const product = unlockedProducts.find((item) => item.sku === sku);
          const fallback = defaultPlan[sku];
          if (!product || !fallback) return;
          const { min, max } = getPriceRange(product);

          const current = productPlan[sku] ?? fallback;
          const nextEntry = {
            priceEur: clamp(toNumber(updates.priceEur ?? current.priceEur, fallback.priceEur), min, max),
            volumeShare: clamp(
              toNumber(updates.volumeShare ?? current.volumeShare, fallback.volumeShare),
              0,
              100
            ),
            bufferWeeks: clamp(
              toNumber(updates.bufferWeeks ?? current.bufferWeeks, fallback.bufferWeeks),
              0,
              12
            ),
          };

          const nextPlan: ProductPlanState = {
            ...productPlan,
            [sku]: nextEntry,
          };

          const items = buildProductPlanItems(unlockedProducts, nextPlan);
          if (items.length) {
            const priceLevel = computePlanPriceLevel(unlockedProducts, nextPlan);
            const preserved = decisions.filter(
              (payload) =>
                payload.type !== "SET_PRODUCT_PLAN" && payload.type !== "SET_PRICE"
            );
            onPreset(companyId, [
              ...preserved,
              { type: "SET_PRODUCT_PLAN", version: 1, items } as any,
              {
                type: "SET_PRICE",
                priceLevel: Number.isFinite(priceLevel) ? priceLevel : 1,
              } as any,
            ]);
          }
        };

        return (
          <Card key={companyId} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">{company.name}</div>
                <div className="text-xs text-[var(--text-muted)]">
                  {sector?.name ?? sector?.code ?? "Sector"} - {niche?.name ?? "Niche"}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[var(--text-muted)]">Expected profit</div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {formatCurrencyCompact(projection.base?.expectedProfit ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Delta</div>
                    <div className={cn("text-sm font-semibold", (projection.delta?.profit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrencyCompact(projection.delta?.profit ?? 0)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <KPIChip
                    label="Util"
                    value={`${Math.round(clamp(toNumber(state?.utilisationRate, 0), 0, 1) * 100)}%`}
                    trend={
                      clamp(toNumber(state?.utilisationRate, 0), 0, 1) >= 0.75
                        ? "up"
                        : clamp(toNumber(state?.utilisationRate, 0), 0, 1) <= 0.35
                          ? "down"
                          : "neutral"
                    }
                  />
                  <KPIChip
                    label="Cap"
                    value={formatNumber(toNumber(state?.capacity, 0), "nl-NL", 0)}
                    trend="neutral"
                    subtle
                  />
                  <KPIChip
                    label="Mkt"
                    value={formatNumber(toNumber(state?.marketingLevel, 0), "nl-NL", 0)}
                    trend={toNumber(state?.marketingLevel, 0) > 0 ? "up" : "neutral"}
                    subtle
                  />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="w-28">
                  <Sparkline
                    data={[
                      projection.base?.riskBandEndCash.worst ?? 0,
                      projection.base?.riskBandEndCash.expected ?? 0,
                      projection.base?.riskBandEndCash.best ?? 0,
                    ]}
                    stroke="var(--accent)"
                  />
                </div>
                <Button size="sm" variant="secondary" onClick={() => setOpenCompanyId(companyId)}>
                  Edit
                </Button>
              </div>
            </div>

            {projection.band ? (
              <div className="mt-4">
                <RiskBandBar
                  worst={projection.band.worst}
                  expected={projection.band.expected}
                  best={projection.band.best}
                />
              </div>
            ) : null}

            <BottomSheet
              open={openCompanyId === companyId}
              title={`Plan for ${company.name}`}
              onClose={() => setOpenCompanyId(null)}
            >
              <div className="space-y-4">
                <div className="rounded-2xl bg-[var(--card-2)] p-3">
                  <div className="text-xs font-semibold text-[var(--text)]">What-if impact</div>
                  <div className="mt-2 space-y-2">
                    <WhatIfDeltaRow
                      label="Delta profit"
                      value={projection.base?.expectedProfit ?? 0}
                      delta={projection.delta?.profit ?? 0}
                      format={formatCurrencyCompact}
                    />
                    <WhatIfDeltaRow
                      label="Delta end cash"
                      value={projection.base?.expectedEndCash ?? 0}
                      delta={projection.delta?.endCash ?? 0}
                      format={formatCurrencyCompact}
                    />
                  </div>
                </div>

                {guidance ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="text-xs font-semibold text-[var(--text)]">Niche guidance</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{guidance.summary}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                      {guidance.drivers.slice(0, 4).map((driver) => (
                        <div
                          key={`${companyId}-driver-${driver.label}`}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 py-1"
                        >
                          <div className="text-[10px] uppercase tracking-wide">{driver.label}</div>
                          <div className="text-[var(--text)]">{driver.value}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                ) : null}

                {!isCarwash ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Presets
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRESET_LABELS.map((preset) => (
                        <Button
                          key={preset.key}
                          size="sm"
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => applyPreset(company, state, editableFields, preset.key, decisions)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                  </div>
                ) : null}

                {!isCarwash && hasProductPlan ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">
                          Product mix & pricing
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Set prices and weekly mix for each product.
                        </div>
                      </div>
                      {planSummary ? (
                        <div className="text-xs text-[var(--text-muted)]">
                          Avg {formatCurrencyCompact(planSummary.avgPrice)} (
                          {planSummary.avgMultiplier.toFixed(2)}x)
                        </div>
                      ) : null}
                    </div>
                    {planSummary ? (
                      <div className="mt-2 text-xs text-[var(--text-muted)]">
                        Total share {Math.round(planSummary.totalShare)}% | Derived price level{" "}
                        {derivedPriceLevel.toFixed(2)}x
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {unlockedProducts.map((product) => {
                        const entry = productPlan[product.sku] ?? defaultPlan[product.sku];
                        if (!entry) return null;
                        const { min, max } = getPriceRange(product);
                        const basePrice = getPriceBase(product);
                        const priceEur = toNumber(entry.priceEur, basePrice);
                        const volumeShare = toNumber(entry.volumeShare, 0);
                        const bufferWeeks = toNumber(entry.bufferWeeks, 0);
                        const multiplier = basePrice > 0 ? priceEur / basePrice : 1;
                        const cogsLabel = formatRange(product.cogsPctMin, product.cogsPctMax, 0);

                        return (
                          <div
                            key={`${companyId}-product-${product.sku}`}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                          >
                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-[var(--text)]">
                                  <span className="inline-flex items-center gap-2">
                                    {getProductIcon(product)}
                                    {product.name}
                                  </span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {product.sku} - {product.unit} - COGS {cogsLabel}%
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  Driver: {product.capacityDriver}
                                </div>
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                Range {formatMoneyRange(min, max)}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                              <label className="text-xs text-[var(--text-muted)]">
                                Price
                                <input
                                  type="number"
                                  min={min}
                                  max={max}
                                  step={getPriceStep(min, max)}
                                  inputMode="decimal"
                                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                  value={Number.isFinite(priceEur) ? priceEur : basePrice}
                                  onChange={(event) =>
                                    updateProductPlan(product.sku, {
                                      priceEur: toNumber(event.target.value, priceEur),
                                    })
                                  }
                                  disabled={disabled}
                                />
                                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                  {multiplier.toFixed(2)}x vs baseline
                                </span>
                              </label>
                              <label className="text-xs text-[var(--text-muted)]">
                                Volume share
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                  value={Number.isFinite(volumeShare) ? volumeShare : 0}
                                  onChange={(event) =>
                                    updateProductPlan(product.sku, { volumeShare: Number(event.target.value) })
                                  }
                                  disabled={disabled}
                                />
                              </label>
                              <label className="text-xs text-[var(--text-muted)]">
                                Buffer weeks
                                <input
                                  type="number"
                                  min={0}
                                  max={12}
                                  step={0.25}
                                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                  value={Number.isFinite(bufferWeeks) ? bufferWeeks : 0}
                                  onChange={(event) =>
                                    updateProductPlan(product.sku, { bufferWeeks: Number(event.target.value) })
                                  }
                                  disabled={disabled}
                                />
                              </label>
                            </div>

                            {product.notes ? (
                              <div className="mt-2 text-xs text-[var(--text-muted)]">
                                {product.notes}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {lockedProducts.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-2)] p-3 text-xs text-[var(--text-muted)]">
                        <div className="text-[var(--text)]">Locked products</div>
                        <div className="mt-2 space-y-2">
                          {lockedProducts.map(renderLockedProduct)}
                        </div>
                        <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                          Use “Plan unlock” to queue upgrades, then review timing in the Upgrades step.
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isCarwash && hasProductPlan ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text)]">Pricing</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Set prices per offer.
                        </div>
                      </div>
                      {planSummary ? (
                        <div className="text-xs text-[var(--text-muted)]">
                          Avg {formatCurrencyCompact(planSummary.avgPrice)} (
                          {planSummary.avgMultiplier.toFixed(2)}x)
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {unlockedProducts.map((product) => {
                        const entry = productPlan[product.sku] ?? defaultPlan[product.sku];
                        if (!entry) return null;
                        const { min, max } = getPriceRange(product);
                        const basePrice = getPriceBase(product);
                        const priceEur = toNumber(entry.priceEur, basePrice);
                        const step =
                          product.sku.includes("detailing")
                            ? carwashDetailingPriceStep
                            : carwashPriceStepBase || getPriceStep(min, max);

                        return (
                          <div
                            key={`${companyId}-carwash-price-${product.sku}`}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                          >
                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-[var(--text)]">
                                  <span className="inline-flex items-center gap-2">
                                    {getProductIcon(product)}
                                    {product.name}
                                  </span>
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">{product.sku}</div>
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                Range {formatMoneyRange(min, max)}
                              </div>
                            </div>

                            <label className="mt-3 block text-xs text-[var(--text-muted)]">
                              Price
                              <input
                                type="number"
                                min={min}
                                max={max}
                                step={step}
                                inputMode="decimal"
                                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                value={Number.isFinite(priceEur) ? priceEur : basePrice}
                                onChange={(event) =>
                                  updateProductPlan(product.sku, {
                                    priceEur: toNumber(event.target.value, priceEur),
                                  })
                                }
                                disabled={disabled}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    {lockedProducts.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card-2)] p-3 text-xs text-[var(--text-muted)]">
                        <div className="text-[var(--text)]">Locked products</div>
                        <div className="mt-2 space-y-2">
                          {lockedProducts.map(renderLockedProduct)}
                        </div>
                      </div>
                    ) : null}

                  </div>
                ) : null}

                {!isCarwash ? (
                  <div className="space-y-4">
                  {editableFields.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] p-3 text-sm text-[var(--text-muted)]">
                      No decision levers available for this niche.
                    </div>
                  ) : (
                    editableFields.map((field) => {
                      const range = resolveRangeForField(field);
                      const decimals = fieldDecimals(field);
                      const rawValue = Number(getFieldValue(companyId, field, state));
                      const value = Number.isFinite(rawValue) ? rawValue : 0;
                      const currentValue = getCurrentValueForField(field, state);
                      const isDelta =
                        field.kind === "STAFFING" || field.kind === "CAPACITY" || field.kind === "QUALITY";
                      const targetValue =
                        isDelta && currentValue != null ? currentValue + value : null;
                      const isCapped = field.kind === "CAPACITY" && value >= range.max && range.max > 0;

                      const applyValue = (nextValue: number) => {
                        switch (field.kind) {
                          case "PRICE":
                            onDecisionChange(companyId, {
                              type: "SET_PRICE",
                              priceLevel: nextValue,
                            } as any);
                            break;
                          case "MARKETING":
                            onDecisionChange(companyId, {
                              type: "SET_MARKETING",
                              marketingLevel: nextValue,
                            } as any);
                            break;
                          case "STAFFING": {
                            const baseEmployees = toNumber(state?.employees, 0);
                            onDecisionChange(companyId, {
                              type: "SET_STAFFING",
                              targetEmployees: Math.max(0, Math.round(baseEmployees + nextValue)),
                            } as any);
                            break;
                          }
                          case "CAPACITY":
                            onDecisionChange(companyId, {
                              type: "INVEST_CAPACITY",
                              addCapacity: nextValue,
                            } as any);
                            break;
                          case "QUALITY":
                            onDecisionChange(companyId, {
                              type: "INVEST_QUALITY",
                              addQuality: nextValue,
                            } as any);
                            break;
                          default:
                            break;
                        }
                      };

                      return (
                        <div key={field.id} className="rounded-2xl border border-[var(--border)] p-3">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-[var(--text)]">{field.label}</div>
                              <div className="text-xs text-[var(--text-muted)]">{field.description}</div>
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              Suggested: {formatRange(range.min, range.max, decimals)} {range.unit}
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="text-xs text-[var(--text-muted)]">
                              Value
                              <input
                                type="number"
                                min={range.min}
                                max={range.max}
                                step={range.step}
                                inputMode={field.kind === "PRICE" || field.kind === "QUALITY" ? "decimal" : "numeric"}
                                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                value={Number.isFinite(value) ? value : 0}
                                disabled={disabled}
                                onChange={(event) => {
                                  const nextValue = clamp(
                                    toNumber(event.target.value, value),
                                    range.min,
                                    range.max
                                  );
                                  applyValue(nextValue);
                                }}
                              />
                            </label>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            {currentValue != null ? (
                              <span>
                                Current:{" "}
                                <span className="text-[var(--text)]">
                                  {formatNumber(currentValue, "nl-NL", decimals)}
                                </span>
                              </span>
                            ) : null}
                            {targetValue != null ? (
                              <span>
                                Target:{" "}
                                <span className="text-[var(--text)]">
                                  {formatNumber(targetValue, "nl-NL", decimals)}
                                </span>
                              </span>
                            ) : null}
                          </div>
                          {range.note ? (
                            <div className="mt-2 text-xs text-[var(--text-muted)]">{range.note}</div>
                          ) : null}
                          {field.kind === "CAPACITY" && isCapped ? (
                            <div className="mt-2 text-xs text-amber-600">
                              Sellable capped to {formatFieldValue(field, range.max)}. Unlock via hiring or upgrades.
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                  </div>
                ) : null}

                {isCarwash ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">Operations</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Set open status, energy mode, maintenance, staffing, and target output.
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Power className="h-3 w-3" />
                            Status
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {carwashOpenStatus ? "Open" : "Closed"}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Queue {carwashQueuePolicy === "walk_in_only" ? "Walk-in" : "Reservations"}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <BatteryCharging className="h-3 w-3" />
                            Energy mode
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">{titleize(carwashEnergyMode)}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Throughput {carwashEnergyThroughputMultiplier.toFixed(2)}x | Cost{" "}
                            {carwashEnergyCostMultiplier.toFixed(2)}x
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Gauge className="h-3 w-3" />
                            Capacity
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashPlannedCapacity, "nl-NL", 0)} / wk
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-[var(--card-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{
                                width: `${Math.round(clamp(carwashTargetUtilization, 0, 1) * 100)}%`,
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Util {Math.round(clamp(carwashTargetUtilization, 0, 1) * 100)}%
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Users className="h-3 w-3" />
                            Staff
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashEmployeesPlanned, "nl-NL", 0)} FTE
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Allocated {formatNumber(carwashAllocatedFte, "nl-NL", 1)} FTE
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Base {formatNumber(carwashStartingStaffFte, "nl-NL", 1)} FTE
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="text-xs text-[var(--text-muted)]">
                          Open status
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashOpenStatus ? "open" : "closed"}
                            onChange={(event) =>
                              updateCarwashOperations({ openStatus: event.target.value === "open" })
                            }
                            disabled={disabled}
                          >
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                          </select>
                        </label>
                        <label className="text-xs text-[var(--text-muted)]">
                          Energy mode
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashEnergyMode}
                            onChange={(event) =>
                              updateCarwashOperations({ energyMode: event.target.value as CarwashEnergyMode })
                            }
                            disabled={disabled}
                          >
                            <option value="normal">Normal</option>
                            <option value="eco">Eco</option>
                            <option value="peak_avoid">Peak avoid</option>
                          </select>
                        </label>
                        <label className="text-xs text-[var(--text-muted)]">
                          Queue policy
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashQueuePolicy}
                            onChange={(event) =>
                              updateCarwashOperations({ queuePolicy: event.target.value as CarwashQueuePolicy })
                            }
                            disabled={disabled}
                          >
                            <option value="walk_in_only">Walk-in only</option>
                            <option value="reservations">Reservations</option>
                          </select>
                        </label>
                        <label className="text-xs text-[var(--text-muted)]">
                          Maintenance level (0-3)
                          <input
                            type="number"
                            min={0}
                            max={3}
                            step={1}
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashMaintenanceLevel}
                            onChange={(event) =>
                              updateCarwashOperations({
                                maintenanceLevel: clamp(toNumber(event.target.value, 0), 0, 3),
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                      </div>
                      <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                          <Gauge className="h-4 w-4" />
                          Capacity expansion
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                          <label className="text-xs text-[var(--text-muted)]">
                            Add wash lanes
                            <input
                              type="number"
                              min={-5}
                              max={15}
                              step={1}
                              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                              value={Number.isFinite(carwashAddLanes) ? Math.round(carwashAddLanes) : 0}
                              onChange={(event) => updateCapacityDecision(toNumber(event.target.value, 0))}
                              disabled={disabled}
                            />
                          </label>
                          <div className="text-xs text-[var(--text-muted)]">
                            <div className="mt-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                              {formatNumber(carwashCapacityDelta, "nl-NL", 0)} / wk capacity delta
                            </div>
                            <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                              Each lane adds ~{formatNumber(carwashCapacityPerLaneWeek, "nl-NL", 0)} washes/week.
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                          Maintenance per lane/week: {formatCurrencyCompact(carwashMaintenanceCostPerLanePerWeek)} |{" "}
                          Current capacity {formatNumber(carwashCurrentCapacity, "nl-NL", 0)} / wk
                        </div>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-[var(--text-muted)]">
                        <div>
                          Status: {carwashOpenStatus ? "Open" : "Closed"} | Queue policy{" "}
                          {carwashQueuePolicy === "walk_in_only" ? "Walk-in only" : "Reservations"} | Availability{" "}
                          {carwashOpenStatus ? "100%" : "0%"} | Queue penalties (low/med/high){" "}
                          {formatNumber(carwashQueuePenaltyLow * 100, "nl-NL", 0)}% /{" "}
                          {formatNumber(carwashQueuePenaltyMedium * 100, "nl-NL", 0)}% /{" "}
                          {formatNumber(carwashQueuePenaltyHigh * 100, "nl-NL", 0)}%
                          {!carwashOpenStatus ? " | Fixed costs still run" : ""}
                        </div>
                        <div>
                          Energy mode: throughput {carwashEnergyThroughputMultiplier.toFixed(2)}x | energy cost{" "}
                          {carwashEnergyCostMultiplier.toFixed(2)}x | quality{" "}
                          {carwashEnergyQualityMultiplier.toFixed(2)}x
                        </div>
                        <div>
                          Maintenance: {formatCurrencyCompact(carwashMaintenanceCostPerWeek)} / week | breakdown chance{" "}
                          {formatNumber(carwashBreakdownChancePct, "nl-NL", 0)}%
                        </div>
                        <div>
                          Capacity per week (effective): Exterior{" "}
                          {formatNumber(carwashExteriorCapacityPerWeekEffective, "nl-NL", 0)} | Interior{" "}
                          {formatNumber(carwashInteriorCapacityPerWeekEffective, "nl-NL", 0)} | Detailing{" "}
                          {formatNumber(carwashDetailingCapacityPerWeekEffective, "nl-NL", 0)}
                        </div>
                        <div>
                          Target output per week: {formatNumber(carwashTargetOutputTotalPerWeek, "nl-NL", 0)} |{" "}
                          Estimated lanes: {carwashLaneCountRounded}
                        </div>
                        {weeklyUtilityCostMax > 0 ? (
                          <div>
                            Utility cost / week (energy mode applied):{" "}
                            {formatMoneyRange(weeklyUtilityCostMin, weeklyUtilityCostMax)}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Wrench className="h-3 w-3" />
                            Wash lanes
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashLaneCountRounded, "nl-NL", 0)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            Base {formatNumber(carwashBaseLanes, "nl-NL", 0)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Target className="h-3 w-3" />
                            Interior bays
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashBaseInteriorBays, "nl-NL", 0)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">Unlock via upgrades.</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Target className="h-3 w-3" />
                            Detailing bays
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashBaseDetailingBays, "nl-NL", 0)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">Unlock via upgrades.</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Warehouse className="h-3 w-3" />
                            Storage
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashWarehouseStorageTotal, "nl-NL", 0)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">Units total</div>
                        </div>
                      </div>

                      {carwashRoleKeys.length > 0 ? (
                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-[var(--text)]">Staff allocation (FTE)</div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateCarwashOperations({
                                  staffAllocationByRole: buildAutoStaffAllocation(),
                                })
                              }
                              disabled={disabled}
                            >
                              Auto-fill
                            </Button>
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                            Allocated {formatNumber(carwashAllocatedFte, "nl-NL", 1)} / Planned{" "}
                            {formatNumber(carwashEmployeesPlanned, "nl-NL", 0)} FTE
                            {Math.abs(carwashStaffGap) >= 0.25
                              ? ` | Gap ${formatNumber(carwashStaffGap, "nl-NL", 1)} FTE`
                              : ""}
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                            {carwashRoleKeys.map((role) => {
                              const currentValue = toNumber(
                                carwashOpsDecision?.staffAllocationByRole?.[role],
                                0
                              );
                              return (
                                <label
                                  key={`${companyId}-carwash-staff-${role}`}
                                  className="text-xs text-[var(--text-muted)]"
                                >
                                  {titleize(role)}
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.25}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(currentValue) ? currentValue : 0}
                                    onChange={(event) =>
                                      updateCarwashOperations({
                                        staffAllocationByRole: {
                                          [role]: Math.max(0, toNumber(event.target.value, 0)),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <div className="text-xs font-semibold text-[var(--text)]">Target output per week</div>
                        {carwashPlannedCapacity <= 0 ? (
                          <div className="mt-1 text-xs text-amber-600">
                            No capacity set yet. Add wash lanes above to unlock output.
                          </div>
                        ) : null}
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {unlockedProducts.map((product) => {
                            const maxPerTick = getCarwashOfferMaxPerTick(product);
                            const maxPerWeek = maxPerTick * carwashTicksPerWeek;
                            const currentValue = clamp(
                              toNumber(carwashTargetOutputPerWeekBySku[product.sku], 0),
                              0,
                              maxPerWeek
                            );
                            const disabledOutput = disabled || maxPerWeek <= 0;
                            return (
                              <label
                                key={`${companyId}-carwash-output-${product.sku}`}
                                className="text-xs text-[var(--text-muted)]"
                              >
                                {product.name}
                                <input
                                  type="number"
                                  min={0}
                                  max={maxPerWeek}
                                  step={1}
                                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                  value={Number.isFinite(currentValue) ? currentValue : 0}
                                  onChange={(event) =>
                                    updateCarwashOperations({
                                      targetOutputBySku: {
                                        [product.sku]:
                                          carwashTicksPerWeek > 0
                                            ? clamp(
                                                toNumber(event.target.value, 0),
                                                0,
                                                maxPerWeek
                                              ) / carwashTicksPerWeek
                                            : 0,
                                      },
                                    })
                                  }
                                  disabled={disabledOutput}
                                />
                                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                                  Max {formatNumber(maxPerWeek, "nl-NL", 0)} per week
                                  {maxPerWeek <= 0 ? " (requires capacity)" : ""}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">Warehouse</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Manage order quantities, reorder points, and safety stock.
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        Current stock uses live warehouse state when available. Weekly usage is estimated from target output.
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        Storage capacity: {formatNumber(carwashWarehouseStorageTotal, "nl-NL", 0)} units
                        {carwashWarehouseStorageExtra > 0
                          ? ` (base ${formatNumber(carwashWarehouseStorageBase, "nl-NL", 0)} + upgrades)`
                          : ""}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Warehouse className="h-3 w-3" />
                            On hand
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashTotalStock, "nl-NL", 0)} units
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Truck className="h-3 w-3" />
                            Pipeline
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashTotalPipeline, "nl-NL", 0)} units
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Package className="h-3 w-3" />
                            Holding cost
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatCurrencyCompact(carwashHoldingCostPerWeek)} / wk
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {CARWASH_CATEGORIES.map((category) => {
                          const orderRange = carwashWarehouse?.orderQtyRange ?? {};
                          const reorderRange = carwashWarehouse?.reorderPointRange ?? {};
                          const safetyRange = carwashWarehouse?.safetyStockRange ?? {};
                          const orderValue = toNumber(
                            carwashWarehouseDecision?.orderQtyByCategory?.[category],
                            0
                          );
                          const reorderValue = toNumber(
                            carwashWarehouseDecision?.reorderPointByCategory?.[category],
                            0
                          );
                          const safetyValue = toNumber(
                            carwashWarehouseDecision?.safetyStockByCategory?.[category],
                            0
                          );
                          const weeklyUsage =
                            category === "chemicals"
                              ? weeklyChemicalsUsage
                              : category === "consumables"
                                ? weeklyConsumablesUsage
                                : weeklySparePartsUsage;
                          const baselineStock = toNumber((carwashBaselineStock as any)?.[category], 0);
                          const shrinkPerDayPct = toNumber(
                            (carwashWarehouse?.shrinkPerDayPct as any)?.[category],
                            0
                          );
                          const shrinkPerWeek = shrinkPerDayPct * carwashDaysPerWeek;
                          const projectedNoOrder = baselineStock * (1 - shrinkPerWeek) - weeklyUsage;
                          const projectedWithOrder = projectedNoOrder + orderValue;
                          const reorderWeeks = weeklyUsage > 0 ? reorderValue / weeklyUsage : 0;
                          const safetyWeeks = weeklyUsage > 0 ? safetyValue / weeklyUsage : 0;
                          const pendingOrders = Math.max(
                            0,
                            toNumber(carwashPendingOrdersByCategory[category], 0)
                          );
                          const categoryMax = Math.max(
                            carwashWarehouseStorageTotal / 3,
                            reorderValue,
                            safetyValue,
                            baselineStock,
                            projectedWithOrder,
                            orderValue
                          );
                          const currentPct = categoryMax > 0 ? clamp(baselineStock / categoryMax, 0, 1) : 0;
                          const projectedPct =
                            categoryMax > 0 ? clamp(projectedWithOrder / categoryMax, 0, 1) : 0;
                          const reorderPct = categoryMax > 0 ? clamp(reorderValue / categoryMax, 0, 1) : 0;
                          const safetyPct = categoryMax > 0 ? clamp(safetyValue / categoryMax, 0, 1) : 0;

                          return (
                            <div
                              key={`${companyId}-carwash-warehouse-${category}`}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                            >
                              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                                {CARWASH_CATEGORY_ICONS[category] ?? <Package className="h-3 w-3" />}
                                {CARWASH_CATEGORY_LABELS[category] ?? titleize(category)}
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                  <span>On hand {formatNumber(baselineStock, "nl-NL", 0)}</span>
                                  <span>Projected {formatNumber(projectedWithOrder, "nl-NL", 0)}</span>
                                </div>
                                <div className="relative mt-1 h-2 rounded-full bg-[var(--card-2)]">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]/30"
                                    style={{ width: `${Math.round(projectedPct * 100)}%` }}
                                  />
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]"
                                    style={{ width: `${Math.round(currentPct * 100)}%` }}
                                  />
                                  <div
                                    className="absolute top-0 h-full w-0.5 bg-amber-400"
                                    style={{ left: `${Math.round(reorderPct * 100)}%` }}
                                  />
                                  <div
                                    className="absolute top-0 h-full w-0.5 bg-rose-400"
                                    style={{ left: `${Math.round(safetyPct * 100)}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                  Usage {formatNumber(weeklyUsage, "nl-NL", 0)} / wk | Pipeline{" "}
                                  {formatNumber(pendingOrders, "nl-NL", 0)} | Reorder cover{" "}
                                  {formatNumber(reorderWeeks, "nl-NL", 1)} w | Safety{" "}
                                  {formatNumber(safetyWeeks, "nl-NL", 1)} w
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                                <label className="text-xs text-[var(--text-muted)]">
                                  Order qty
                                  <input
                                    type="number"
                                    min={toNumber(orderRange?.min, 0)}
                                    max={toNumber(orderRange?.max, 50000)}
                                    step={toNumber(orderRange?.step, 100)}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(orderValue) ? orderValue : 0}
                                    onChange={(event) =>
                                      updateCarwashWarehouse({
                                        orderQtyByCategory: {
                                          [category]: clamp(
                                            toNumber(event.target.value, 0),
                                            toNumber(orderRange?.min, 0),
                                            toNumber(orderRange?.max, 50000)
                                          ),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                                <label className="text-xs text-[var(--text-muted)]">
                                  Reorder point
                                  <input
                                    type="number"
                                    min={toNumber(reorderRange?.min, 0)}
                                    max={toNumber(reorderRange?.max, 20000)}
                                    step={toNumber(reorderRange?.step, 100)}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(reorderValue) ? reorderValue : 0}
                                    onChange={(event) =>
                                      updateCarwashWarehouse({
                                        reorderPointByCategory: {
                                          [category]: clamp(
                                            toNumber(event.target.value, 0),
                                            toNumber(reorderRange?.min, 0),
                                            toNumber(reorderRange?.max, 20000)
                                          ),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                                <label className="text-xs text-[var(--text-muted)]">
                                  Safety stock
                                  <input
                                    type="number"
                                    min={toNumber(safetyRange?.min, 0)}
                                    max={toNumber(safetyRange?.max, 30000)}
                                    step={toNumber(safetyRange?.step, 100)}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(safetyValue) ? safetyValue : 0}
                                    onChange={(event) =>
                                      updateCarwashWarehouse({
                                        safetyStockByCategory: {
                                          [category]: clamp(
                                            toNumber(event.target.value, 0),
                                            toNumber(safetyRange?.min, 0),
                                            toNumber(safetyRange?.max, 30000)
                                          ),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                              </div>
                              <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                Current stock {formatNumber(baselineStock, "nl-NL", 0)} | Usage / week{" "}
                                {formatNumber(weeklyUsage, "nl-NL", 0)} | Reorder cover{" "}
                                {weeklyUsage > 0 ? formatNumber(reorderWeeks, "nl-NL", 1) : "n/a"} w | Safety cover{" "}
                                {weeklyUsage > 0 ? formatNumber(safetyWeeks, "nl-NL", 1) : "n/a"} w
                              </div>
                              <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                Projected stock (no order): {formatNumber(projectedNoOrder, "nl-NL", 0)} | With order:{" "}
                                {formatNumber(projectedWithOrder, "nl-NL", 0)}
                                {shrinkPerWeek > 0 ? ` | Shrink ${(shrinkPerWeek * 100).toFixed(2)}%/week` : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {Array.isArray(carwashWarehouse?.storageUpgrades) &&
                      carwashWarehouse.storageUpgrades.length > 0 ? (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-[var(--text)]">Storage upgrades</div>
                          <div className="mt-2 space-y-2">
                            {carwashWarehouse.storageUpgrades.map((upgrade: any, index: number) => {
                              const selected = new Set<number>(
                                carwashWarehouseDecision?.storageUpgrades ?? []
                              );
                              const capacityUnits = toNumber(upgrade?.capacityUnits, 0);
                              const capexMin = toNumber(upgrade?.capexRangeEur?.min, 0);
                              const capexMax = toNumber(upgrade?.capexRangeEur?.max, capexMin);
                              const opexMin = toNumber(upgrade?.opexPerTickRangeEur?.min, 0);
                              const opexMax = toNumber(upgrade?.opexPerTickRangeEur?.max, opexMin);
                              const isChecked = selected.has(index);

                              return (
                                <label
                                  key={`${companyId}-carwash-storage-${index}`}
                                  className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--text-muted)]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(event) => {
                                      if (event.target.checked) {
                                        selected.add(index);
                                      } else {
                                        selected.delete(index);
                                      }
                                      updateCarwashWarehouse({ storageUpgrades: Array.from(selected) });
                                    }}
                                    disabled={disabled}
                                  />
                                  <span>
                                    +{capacityUnits.toLocaleString("nl-NL")} units | Capex{" "}
                                    {formatMoneyRange(capexMin, capexMax)} | Opex{" "}
                                    {formatMoneyRange(opexMin, opexMax)} / tick
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">Procurement</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Choose supplier tiers and contract types per category.
                      </div>
                      <div className="mt-3 space-y-3">
                        {CARWASH_CATEGORIES.map((category) => {
                          const tierKeys = Object.keys(carwashProcurement?.supplierTiers ?? {});
                          const tierOptions = tierKeys.length > 0 ? tierKeys : ["A", "B", "C"];
                          const defaultTier = tierOptions.includes("B") ? "B" : tierOptions[0];
                          const tierValue = (carwashProcurementDecision?.supplierTierByCategory?.[category] ??
                            defaultTier) as "A" | "B" | "C";
                          const contractValue = (carwashProcurementDecision?.contractTypeByCategory?.[category] ??
                            "spot") as "spot" | "contract_7d" | "contract_30d";
                          const tierDetails = (carwashProcurement?.supplierTiers ?? {})[tierValue] ?? {};
                          const tierPriceIndex = toNumber((tierDetails as any)?.priceIndex, NaN);
                          const tierReliability = (tierDetails as any)?.reliabilityRange ?? [];
                          const tierQuality = (tierDetails as any)?.qualityRange ?? [];
                          const tierLeadTime = (tierDetails as any)?.leadTimeTicksRange ?? [];
                          const tierFillRate = (tierDetails as any)?.fillRateRange ?? [];
                          const tierMoq = toNumber((tierDetails as any)?.moqUnits, 0);
                          const contractDetails =
                            (carwashProcurement?.contractOptions ?? {})[contractValue] ?? {};
                          const contractFee = (contractDetails as any)?.feeRangeEur ?? {};
                          const contractDiscount = (contractDetails as any)?.priceDiscountPctRange ?? {};
                          const contractReliabilityBonus = toNumber(
                            (contractDetails as any)?.reliabilityBonus,
                            0
                          );
                          const contractLeadTimeVariance = toNumber(
                            (contractDetails as any)?.leadTimeVarianceReductionPct,
                            0
                          );

                          return (
                            <div
                              key={`${companyId}-carwash-proc-${category}`}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                            >
                              <div className="text-xs font-semibold text-[var(--text)]">
                                {CARWASH_CATEGORY_LABELS[category] ?? titleize(category)}
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <label className="text-xs text-[var(--text-muted)]">
                                  Supplier tier
                                  <select
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={tierValue}
                                    onChange={(event) =>
                                      updateCarwashProcurement({
                                        supplierTierByCategory: {
                                          [category]: event.target.value as "A" | "B" | "C",
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  >
                                    {tierOptions.map((tier) => (
                                      <option key={tier} value={tier}>
                                        Tier {tier}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="text-xs text-[var(--text-muted)]">
                                  Contract type
                                  <select
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={contractValue}
                                    onChange={(event) =>
                                      updateCarwashProcurement({
                                        contractTypeByCategory: {
                                          [category]: event.target.value as "spot" | "contract_7d" | "contract_30d",
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  >
                                    <option value="spot">Spot</option>
                                    <option value="contract_7d">Contract 7d</option>
                                    <option value="contract_30d">Contract 30d</option>
                                  </select>
                                </label>
                              </div>
                              <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                {Number.isFinite(tierPriceIndex) ? `Price index ${tierPriceIndex.toFixed(2)}x` : "Price index n/a"}
                                {" | "}
                                Reliability {formatRange(toNumber(tierReliability?.[0], 0), toNumber(tierReliability?.[1], 0), 0)}%
                                {" | "}
                                Quality {formatRange(toNumber(tierQuality?.[0], 0), toNumber(tierQuality?.[1], 0), 0)}%
                                {" | "}
                                Lead time {formatRange(toNumber(tierLeadTime?.[0], 0), toNumber(tierLeadTime?.[1], 0), 0)} ticks
                                {" | "}
                                Fill rate {formatRange(toNumber(tierFillRate?.[0], 0), toNumber(tierFillRate?.[1], 0), 0)}%
                                {tierMoq > 0 ? ` | MOQ ${formatNumber(tierMoq, "nl-NL", 0)}` : ""}
                              </div>
                              <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                Contract fees {formatMoneyRange(toNumber(contractFee?.min, 0), toNumber(contractFee?.max, 0))}
                                {" | "}
                                Discount {formatRange(toNumber(contractDiscount?.min, 0), toNumber(contractDiscount?.max, 0), 0)}%
                                {contractReliabilityBonus > 0 ? ` | Reliability +${contractReliabilityBonus}` : ""}
                                {contractLeadTimeVariance > 0 ? ` | Lead time variance -${contractLeadTimeVariance}%` : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-[var(--text-muted)]">
                          Quality level
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashProcurementDecision?.qualityLevel ?? "standard"}
                            onChange={(event) =>
                              updateCarwashProcurement({
                                qualityLevel: event.target.value as "budget" | "standard" | "premium",
                              })
                            }
                            disabled={disabled}
                          >
                            <option value="budget">Budget</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                        </label>
                        <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                          Quality trades price for reliability and customer satisfaction.
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">Marketing & sales</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Set campaign budgets and durations.
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <TrendingUp className="h-3 w-3" />
                            Weekly spend
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatCurrencyCompact(carwashCampaignBudgetPerWeek)}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {formatCurrencyCompact(carwashCampaignBudgetPerTickTotal)} / tick
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-2">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <Target className="h-3 w-3" />
                            Est. uplift
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatNumber(carwashCampaignLiftMinUnits, "nl-NL", 0)} -{" "}
                            {formatNumber(carwashCampaignLiftMaxUnits, "nl-NL", 0)} / wk
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {formatRange(carwashCampaignLiftMinPct, carwashCampaignLiftMaxPct, 0)}%
                          </div>
                        </div>
                      </div>
                      {carwashCampaignEntries.length > 0 ? (
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          {carwashCampaignEntries.map(([key, campaign]) => {
                            const range = (campaign as any)?.budgetPerTickRangeEur ?? {};
                            const min = toNumber(range?.min, 0);
                            const max = toNumber(range?.max, 0);
                            const step = toNumber(range?.step, 1);
                            const currentBudget = toNumber(
                              carwashMarketingDecision?.campaignBudgetByKey?.[key],
                              0
                            );
                            const minDurationTicks = toNumber((campaign as any)?.minDurationTicks, 0);
                            const maxDurationTicks = toNumber((campaign as any)?.maxDurationTicks, 0);
                            const minDurationWeeks =
                              minDurationTicks > 0
                                ? Math.max(1, Math.ceil(minDurationTicks / carwashTicksPerWeek))
                                : 1;
                            const maxDurationWeeks =
                              maxDurationTicks > 0
                                ? Math.max(minDurationWeeks, Math.ceil(maxDurationTicks / carwashTicksPerWeek))
                                : Math.max(minDurationWeeks, 12);
                            const currentDurationWeeks = clamp(
                              Math.round(
                                toNumber(
                                  carwashMarketingDecision?.campaignDurationWeeksByKey?.[key],
                                  minDurationWeeks
                                )
                              ),
                              minDurationWeeks,
                              maxDurationWeeks
                            );
                            const expectedRange = (campaign as any)?.expectedLiftPctRange ?? {};
                            const expectedMin = toNumber(expectedRange?.min, 0);
                            const expectedMax = toNumber(expectedRange?.max, 0);
                            const budgetPct = max > 0 ? clamp(currentBudget / max, 0, 1) : 0;
                            const liftMinPct = expectedMin * budgetPct;
                            const liftMaxPct = expectedMax * budgetPct;
                            const liftMinUnits = carwashBaseDemandLevel * (liftMinPct / 100);
                            const liftMaxUnits = carwashBaseDemandLevel * (liftMaxPct / 100);

                            return (
                              <div
                                key={`${companyId}-carwash-campaign-${key}`}
                                className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-muted)]"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-xs font-semibold text-[var(--text)]">
                                    {titleize(key)}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)]">
                                    {formatMoneyRange(min, max)} / tick
                                  </div>
                                </div>
                                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <label className="text-[10px] text-[var(--text-muted)]">
                                    Budget / tick
                                    <input
                                      type="number"
                                      min={min}
                                      max={max}
                                      step={step}
                                      className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                      value={Number.isFinite(currentBudget) ? currentBudget : 0}
                                      onChange={(event) =>
                                        updateCarwashMarketing({
                                          campaignBudgetByKey: {
                                            [key]: clamp(toNumber(event.target.value, 0), min, max),
                                          },
                                        })
                                      }
                                      disabled={disabled}
                                    />
                                  </label>
                                  <label className="text-[10px] text-[var(--text-muted)]">
                                    Duration (weeks)
                                    <input
                                      type="number"
                                      min={minDurationWeeks}
                                      max={maxDurationWeeks}
                                      step={1}
                                      className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                      value={currentDurationWeeks}
                                      onChange={(event) =>
                                        updateCarwashMarketing({
                                          campaignDurationWeeksByKey: {
                                            [key]: clamp(
                                              toNumber(event.target.value, minDurationWeeks),
                                              minDurationWeeks,
                                              maxDurationWeeks
                                            ),
                                          },
                                        })
                                      }
                                      disabled={disabled}
                                    />
                                  </label>
                                </div>
                                {expectedMax > 0 ? (
                                  <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                    Expected lift: +{formatRange(liftMinPct, liftMaxPct, 1)}% |{" "}
                                    {formatNumber(liftMinUnits, "nl-NL", 0)} -{" "}
                                    {formatNumber(liftMaxUnits, "nl-NL", 0)} / wk
                                  </div>
                                ) : (
                                  <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                                    Expected lift range not configured.
                                  </div>
                                )}
                                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                  Min run {minDurationWeeks} w | Max {maxDurationWeeks} w
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-[var(--text-muted)]">
                          No campaigns configured.
                        </div>
                      )}
                      <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3">
                        <div className="text-xs font-semibold text-[var(--text)]">Promo offers</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          Temporary discounts to boost short-term volume.
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="text-xs text-[var(--text-muted)]">
                            Promo discount (%)
                            <input
                              type="number"
                              min={toNumber(carwashPricing?.promoDiscountPctRange?.min, 0)}
                              max={toNumber(carwashPricing?.promoDiscountPctRange?.max, 35)}
                              step={toNumber(carwashPricing?.promoDiscountPctRange?.step, 1)}
                              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                              value={toNumber(carwashPricingDecision?.promoDiscountPct, 0)}
                              onChange={(event) =>
                                updateCarwashPricing({
                                  promoDiscountPct: clamp(
                                    toNumber(event.target.value, 0),
                                    toNumber(carwashPricing?.promoDiscountPctRange?.min, 0),
                                    toNumber(carwashPricing?.promoDiscountPctRange?.max, 35)
                                  ),
                                })
                              }
                              disabled={disabled}
                            />
                          </label>
                          <label className="text-xs text-[var(--text-muted)]">
                            Promo duration (ticks)
                            <input
                              type="number"
                              min={toNumber(carwashPricing?.promoDurationTicksRange?.min, 6)}
                              max={toNumber(carwashPricing?.promoDurationTicksRange?.max, 72)}
                              step={1}
                              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                              value={toNumber(carwashPricingDecision?.promoDurationTicks, 6)}
                              onChange={(event) =>
                                updateCarwashPricing({
                                  promoDurationTicks: clamp(
                                    toNumber(event.target.value, 6),
                                    toNumber(carwashPricing?.promoDurationTicksRange?.min, 6),
                                    toNumber(carwashPricing?.promoDurationTicksRange?.max, 72)
                                  ),
                                })
                              }
                              disabled={disabled}
                            />
                          </label>
                        </div>
                        {promoDiscountPct > 0 && promoElasticityMax > 0 ? (
                          <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                            Estimated promo lift: +{formatNumber(promoLiftMinPct, "nl-NL", 0)}% to +
                            {formatNumber(promoLiftMaxPct, "nl-NL", 0)}% | Coverage{" "}
                            {formatNumber(promoCoveragePct * 100, "nl-NL", 0)}% | Effective discount{" "}
                            {formatNumber(promoEffectiveDiscount, "nl-NL", 1)}%
                            {" | "}
                            {formatNumber(promoLiftMinUnits, "nl-NL", 0)} -{" "}
                            {formatNumber(promoLiftMaxUnits, "nl-NL", 0)} / wk
                          </div>
                        ) : null}
                      </div>
                      {carwashUpsellCap > 0 ? (
                        <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                          Upsell boost per staff: {formatRange(carwashUpsellMin, carwashUpsellMax, 1)}% | Cap{" "}
                          {formatNumber(carwashUpsellCap, "nl-NL", 0)}%
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">HR</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Manage hiring, wages, training, and shift planning.
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        Hiring lead time {formatRange(carwashHiringLeadTimeMin, carwashHiringLeadTimeMax, 0)} ticks |
                        Training cost {formatMoneyRange(carwashTrainingCostMin, carwashTrainingCostMax)} | Training time{" "}
                        {formatRange(carwashTrainingTimeMin, carwashTrainingTimeMax, 0)} ticks
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Training effects per level: +{formatNumber(carwashTrainingProductivityPct, "nl-NL", 0)}%
                        productivity | +{formatNumber(carwashTrainingQualityPct, "nl-NL", 0)}% quality | +
                        {formatNumber(carwashTrainingUpsellPct, "nl-NL", 0)}% upsell
                      </div>
                      <div className="mt-3 space-y-3">
                        {carwashRoleKeys.map((role) => {
                          const range = carwashHr?.hourlyCostRangeEur?.[role] ?? [];
                          const min = toNumber(range[0], 0);
                          const max = toNumber(range[1], min);
                          const hiringRange = carwashHr?.hiringCostRangeEur?.[role] ?? [];
                          const hiringMin = toNumber(hiringRange[0], 0);
                          const hiringMax = toNumber(hiringRange[1], hiringMin);
                          const firingPenaltyMin = toNumber(carwashHr?.firingPenaltyRangeEur?.min, 0);
                          const firingPenaltyMax = toNumber(carwashHr?.firingPenaltyRangeEur?.max, 0);
                          const hireValue = Math.trunc(
                            toNumber(carwashHrDecision?.hireFireByRole?.[role], 0)
                          );
                          const defaultWage = min === max ? min : (min + max) / 2;
                          const wageValue = clamp(
                            toNumber(carwashHrDecision?.wagePolicyByRole?.[role], defaultWage),
                            min,
                            max
                          );

                          return (
                            <div
                              key={`${companyId}-carwash-hr-${role}`}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3"
                            >
                              <div className="text-xs font-semibold text-[var(--text)]">
                                {titleize(role)}
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <label className="text-xs text-[var(--text-muted)]">
                                  Hire/fire (FTE)
                                  <input
                                    type="number"
                                    step={1}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(hireValue) ? hireValue : 0}
                                    onChange={(event) =>
                                      updateCarwashHr({
                                        hireFireByRole: {
                                          [role]: Math.trunc(toNumber(event.target.value, 0)),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                                <label className="text-xs text-[var(--text-muted)]">
                                  Hourly wage (EUR)
                                  <input
                                    type="number"
                                    min={min}
                                    max={max}
                                    step={0.5}
                                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                    value={Number.isFinite(wageValue) ? wageValue : min}
                                    onChange={(event) =>
                                      updateCarwashHr({
                                        wagePolicyByRole: {
                                          [role]: clamp(toNumber(event.target.value, min), min, max),
                                        },
                                      })
                                    }
                                    disabled={disabled}
                                  />
                                </label>
                              </div>
                              <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                Range {formatMoneyRange(min, max)} / hour
                              </div>
                              {hiringMax > 0 ? (
                                <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                                  Hiring cost {formatMoneyRange(hiringMin, hiringMax)} | Firing penalty{" "}
                                  {formatMoneyRange(firingPenaltyMin, firingPenaltyMax)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        <label className="text-xs text-[var(--text-muted)]">
                          Training level ({carwashTrainingMin}-{carwashTrainingMax})
                          <input
                            type="number"
                            min={carwashTrainingMin}
                            max={carwashTrainingMax}
                            step={1}
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashTrainingLevel}
                            onChange={(event) =>
                              updateCarwashHr({
                                trainingLevel: clamp(
                                  toNumber(event.target.value, carwashTrainingMin),
                                  carwashTrainingMin,
                                  carwashTrainingMax
                                ),
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                        <label className="text-xs text-[var(--text-muted)]">
                          Shift plan
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={carwashShiftPlan}
                            onChange={(event) =>
                              updateCarwashHr({
                                shiftPlan: event.target.value as SetCarwashHrDecision["shiftPlan"],
                              })
                            }
                            disabled={disabled}
                          >
                            <option value="balanced">Balanced</option>
                            <option value="extended">Extended</option>
                            <option value="peak_only">Peak only</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                      <div className="text-sm font-semibold text-[var(--text)]">Finance</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Optional extra repayments per tick.
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                        Holding-level repayments are not wired yet.
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-[var(--text-muted)]">
                          Extra repay per tick (EUR)
                          <input
                            type="number"
                            min={0}
                            max={toNumber(carwashFinance?.extraRepayPerTickMaxEur, 2000)}
                            step={10}
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={toNumber(carwashFinanceDecision?.extraRepayPerTick, 0)}
                            onChange={(event) =>
                              updateCarwashFinance({
                                extraRepayPerTick: clamp(
                                  toNumber(event.target.value, 0),
                                  0,
                                  toNumber(carwashFinance?.extraRepayPerTickMaxEur, 2000)
                                ),
                              })
                            }
                            disabled={disabled}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}

                {!isCarwash && decisionModules.length > 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                    <div className="text-sm font-semibold text-[var(--text)]">Programs</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      Run multi-week initiatives for this niche.
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {decisionModules.map((module) => (
                        <div key={`${companyId}-module-${module.id}`}>
                          <label className="text-xs font-medium text-[var(--text-muted)]">
                            {module.label}
                          </label>
                          <select
                            className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                            value={selectedProgramIds.get(module.id) ?? ""}
                            onChange={(event) => updateProgramSelection(module.id, event.target.value)}
                            disabled={disabled}
                          >
                            <option value="">No program</option>
                            {module.options.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {module.description ? (
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {module.description}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </BottomSheet>
          </Card>
        );
      })}
    </div>
  );
}

export default CompanyDecisionPanel;
