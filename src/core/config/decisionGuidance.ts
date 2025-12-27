// src/core/config/decisionGuidance.ts
import type { CompanyState, Niche, Sector } from "../domain";

type GuidanceRange = {
  min: number;
  max: number;
  unit?: string;
  note: string;
};

export type DecisionGuidance = {
  summary: string;
  drivers: Array<{ label: string; value: string }>;
  ranges: {
    priceLevel: GuidanceRange;
    marketingLevel: GuidanceRange;
    employeesDelta: GuidanceRange;
    capacityDelta: GuidanceRange;
  };
};

const COMPETITION_LABELS: Record<string, string> = {
  FRAGMENTED: "Fragmented",
  OLIGOPOLY: "Oligopoly",
  MONOPOLY_LIKE: "Monopoly-like",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function intensityLabel(value: number) {
  if (value >= 0.85) return "High";
  if (value >= 0.55) return "Medium";
  return "Low";
}

function percentLabel(value: number, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return `${Math.round(value * 100 * factor) / factor}%`;
}

export function getDecisionGuidance(
  niche: Niche | null | undefined,
  sector: Sector | null | undefined,
  state?: CompanyState | null
): DecisionGuidance | null {
  if (!niche) return null;

  const config: any = niche.config ?? {};
  const competitionType = String(config.competitionType ?? "FRAGMENTED");
  const baseDemand = Math.max(50, Number(config.baseDemandLevel ?? 800));
  const elasticity = clamp(Number(config.priceElasticity ?? 0.8), 0.2, 1.5);
  const labourIntensity = clamp(Number(config.labourIntensity ?? 0.6), 0.1, 1.3);
  const capacityElasticity = clamp(Number(config.capacityElasticity ?? 0.6), 0.2, 1.4);

  const marginMin = clamp(Number(config.marginRange?.min ?? 0.06), 0.02, 0.6);
  const marginMax = clamp(Number(config.marginRange?.max ?? 0.18), marginMin, 0.6);

  const priceBand =
    elasticity >= 1.1
      ? { min: 0.85, max: 1.1 }
      : elasticity >= 0.8
      ? { min: 0.9, max: 1.2 }
      : { min: 0.95, max: 1.35 };

  const competitionBoost =
    competitionType === "FRAGMENTED"
      ? { min: -0.05, max: 0.0 }
      : competitionType === "MONOPOLY_LIKE"
      ? { min: 0.0, max: 0.1 }
      : { min: 0.0, max: 0.05 };

  const priceMin = clamp(priceBand.min + competitionBoost.min, 0.6, 1.5);
  const priceMax = clamp(priceBand.max + competitionBoost.max, priceMin + 0.05, 1.6);

  const demandScale = clamp(baseDemand / 1000, 0.4, 2.5);
  const competitionFactor =
    competitionType === "FRAGMENTED"
      ? 1.2
      : competitionType === "MONOPOLY_LIKE"
      ? 0.75
      : 1.0;

  const marketingBase = 220 * demandScale * competitionFactor;
  const marketingMin = clamp(roundTo(marketingBase * 0.6, 10), 50, 8_000);
  const marketingMax = clamp(roundTo(marketingBase * 2.5, 10), marketingMin + 10, 10_000);

  const baseEmployees = Math.max(3, Number(state?.employees ?? 6));
  const hirePct = clamp(0.18 - labourIntensity * 0.06, 0.08, 0.2);
  const firePct = clamp(0.12 - labourIntensity * 0.05, 0.05, 0.15);
  const maxHire = Math.max(1, Math.round(baseEmployees * hirePct));
  const maxFire = Math.max(1, Math.round(baseEmployees * firePct));

  const baseCapacity = Math.max(50, Number(state?.capacity ?? 100));
  const capMin = Math.max(5, Math.round(baseCapacity * (0.04 + capacityElasticity * 0.03)));
  const capMax = Math.max(capMin, Math.round(baseCapacity * (0.1 + capacityElasticity * 0.12)));

  const sectorLabel = sector?.name ?? "Sector";

  return {
    summary: `Guidance for ${niche.name} in ${sectorLabel}. Use these ranges as a starting point.`,
    drivers: [
      { label: "Competition", value: COMPETITION_LABELS[competitionType] ?? competitionType },
      { label: "Price sensitivity", value: intensityLabel(elasticity / 1.5) },
      { label: "Labour intensity", value: intensityLabel(labourIntensity) },
      { label: "Capacity flexibility", value: intensityLabel(capacityElasticity / 1.4) },
      { label: "Margin range", value: `${percentLabel(marginMin, 0)} - ${percentLabel(marginMax, 0)}` },
      { label: "Base demand", value: `${roundTo(baseDemand, 10)}` },
    ],
    ranges: {
      priceLevel: {
        min: Number(priceMin.toFixed(2)),
        max: Number(priceMax.toFixed(2)),
        unit: "x",
        note: "Higher elasticity means tight pricing bands.",
      },
      marketingLevel: {
        min: marketingMin,
        max: marketingMax,
        note: "Fragmented markets need more consistent marketing.",
      },
      employeesDelta: {
        min: -maxFire,
        max: maxHire,
        note: "Staffing is a cost lever, adjust in small steps.",
      },
      capacityDelta: {
        min: 0,
        max: capMax,
        note: "Use negative values to shrink capacity if overbuilt.",
      },
    },
  };
}
