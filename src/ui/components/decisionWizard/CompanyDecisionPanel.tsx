import * as React from "react";

import type {
  Company,
  CompanyDecisionPayload,
  CompanyState,
  Niche,
  NicheProduct,
  Sector,
  SetProductPlanDecision,
} from "../../../core/domain";
import type { ProjectionSummary, WhatIfProjection } from "../../../core/projections/types";
import { getDecisionFieldsForNiche, type DecisionField } from "../../../core/config/nicheDecisionFields";
import { getDecisionModulesForNiche } from "../../../core/config/nicheDecisions";
import { getDecisionGuidance } from "../../../core/config/decisionGuidance";
import { cn, formatCurrencyCompact, formatNumber } from "../../../utils/format";
import Card from "../Card";
import Sparkline from "../Sparkline";
import { Button } from "../Button";
import BottomSheet from "./BottomSheet";
import WhatIfDeltaRow from "./WhatIfDeltaRow";

export type CompanyDecisionPanelProps = {
  companies: Company[];
  sectorsById: Map<string, Sector>;
  nichesById: Map<string, Niche>;
  nicheProductsById: Map<string, NicheProduct[]>;
  unlockedProductsByCompany: Map<string, Set<string>>;
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
  statesById,
  baseline,
  whatIf,
  draftDecisions,
  onDecisionChange,
  onPreset,
  disabled,
}: CompanyDecisionPanelProps) {
  const [openCompanyId, setOpenCompanyId] = React.useState<string | null>(null);

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
        const nicheProducts = nicheProductsById.get(String(niche?.id ?? "")) ?? [];
        const unlockedSet = unlockedProductsByCompany.get(companyId) ?? new Set<string>();
        const unlockedProducts =
          unlockedSet.size > 0
            ? nicheProducts.filter((product) => unlockedSet.has(product.sku))
            : nicheProducts.slice(0, 1);
        const lockedProducts = nicheProducts.filter((product) => !unlockedProducts.includes(product));
        const hasProductPlan = unlockedProducts.length > 0;
        const decisionModules = getDecisionModulesForNiche(niche ?? null);
        const decisionFields = getDecisionFieldsForNiche(niche ?? null);
        const editableFields = hasProductPlan
          ? decisionFields.filter((field) => field.kind !== "PRICE")
          : decisionFields;
        const guidance = getDecisionGuidance(niche ?? null, sector ?? null, state);
        const planDecision = findDecision(decisions, "SET_PRODUCT_PLAN") as SetProductPlanDecision | null;
        const defaultPlan = buildDefaultProductPlan(unlockedProducts);
        const productPlan = mergeProductPlan(unlockedProducts, planDecision);
        const planSummary = summarizeProductPlan(unlockedProducts, productPlan);
        const derivedPriceLevel = computePlanPriceLevel(unlockedProducts, productPlan);
        const projection = getProjection(companyId);

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

                {hasProductPlan ? (
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
                                  {product.name}
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
                                  className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                                  value={Number.isFinite(priceEur) ? priceEur : basePrice}
                                  onChange={(event) =>
                                    updateProductPlan(product.sku, { priceEur: Number(event.target.value) })
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
                        <div className="mt-1">
                          {lockedProducts.map((product) => product.name).join(", ")}. Unlock via upgrades.
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

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
                          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px] md:items-center">
                            <input
                              type="range"
                              min={range.min}
                              max={range.max}
                              step={range.step}
                              value={clamp(value, range.min, range.max)}
                              disabled={disabled}
                              onChange={(event) => {
                                const nextValue = clamp(
                                  toNumber(event.target.value, value),
                                  range.min,
                                  range.max
                                );
                                applyValue(nextValue);
                              }}
                              className="w-full"
                            />
                            <input
                              type="number"
                              min={range.min}
                              max={range.max}
                              step={range.step}
                              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
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

                {decisionModules.length > 0 ? (
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
