import * as React from "react";

import type {
  Company,
  CompanyDecisionPayload,
  CompanyState,
  Niche,
  Sector,
} from "../../../core/domain";
import type { ProjectionSummary, WhatIfProjection } from "../../../core/projections/types";
import { getDecisionFieldsForNiche, type DecisionField } from "../../../core/config/nicheDecisionFields";
import { formatCurrencyCompact } from "../../../utils/format";
import { cn } from "../../../utils/format";
import Card from "../Card";
import Sparkline from "../Sparkline";
import { Button } from "../Button";
import BottomSheet from "./BottomSheet";
import WhatIfDeltaRow from "./WhatIfDeltaRow";

export type CompanyDecisionPanelProps = {
  companies: Company[];
  sectorsById: Map<string, Sector>;
  nichesById: Map<string, Niche>;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function findDecision(decisions: CompanyDecisionPayload[], type: string) {
  return decisions.find((payload) => payload.type === type) ?? null;
}

function formatFieldValue(field: DecisionField, value: number): string {
  if (field.kind === "PRICE") return `${value.toFixed(2)}x`;
  if (field.kind === "QUALITY") return `${value.toFixed(2)}`;
  if (field.kind === "CAPACITY" || field.kind === "STAFFING") return `${Math.round(value)}`;
  return `${Math.round(value)}`;
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
    (company: Company, state: CompanyState | null, fields: DecisionField[], preset: string) => {
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

      onPreset(String(company.id), payloads);
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
        const fields = getDecisionFieldsForNiche(niche ?? null);
        const projection = getProjection(companyId);

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
                        onClick={() => applyPreset(company, state, fields, preset.key)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {fields.map((field) => {
                    const min = field.min ?? 0;
                    const max = field.max ?? 0;
                    const step = field.step ?? 1;
                    const value = getFieldValue(companyId, field, state);
                    const isCapped = value >= max && max > 0;

                    return (
                      <div key={field.id} className="rounded-2xl border border-[var(--border)] p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-[var(--text)]">{field.label}</div>
                            <div className="text-xs text-[var(--text-muted)]">{field.description}</div>
                          </div>
                          <div className="text-sm font-semibold text-[var(--text)]">
                            {formatFieldValue(field, value)}
                          </div>
                        </div>
                        <div className="mt-3">
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            disabled={disabled}
                            onChange={(event) => {
                              const nextValue = toNumber(event.target.value, value);
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
                            }}
                            className="w-full"
                          />
                        </div>
                        {field.kind === "CAPACITY" && isCapped ? (
                          <div className="mt-2 text-xs text-amber-600">
                            Sellable capped to {formatFieldValue(field, max)}. Unlock via hiring or upgrades.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </BottomSheet>
          </Card>
        );
      })}
    </div>
  );
}

export default CompanyDecisionPanel;
