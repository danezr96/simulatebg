type CapexRange = {
  min: number;
  max: number;
  source: "startup_cost" | "capex" | "range" | "fixed";
};

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sumRanges(ranges: Array<{ min: number; max: number }>): { min: number; max: number } {
  return ranges.reduce(
    (acc, range) => ({
      min: acc.min + range.min,
      max: acc.max + range.max,
    }),
    { min: 0, max: 0 }
  );
}

export function parseCapexRange(formula: string, startupCost?: number): CapexRange | null {
  if (!formula) return null;
  const normalized = String(formula).toLowerCase().trim();

  const rangePattern = /([0-9]+(?:\.[0-9]+)?)\s*\.\.\s*([0-9]+(?:\.[0-9]+)?)/g;
  const ranges: Array<{ min: number; max: number }> = [];
  let match = rangePattern.exec(normalized);
  while (match) {
    ranges.push({
      min: toNumber(match[1]),
      max: toNumber(match[2]),
    });
    match = rangePattern.exec(normalized);
  }

  if (normalized.includes("startup_cost") && ranges.length > 0 && Number.isFinite(startupCost ?? NaN)) {
    const range = ranges[0];
    return {
      min: (startupCost ?? 0) * range.min,
      max: (startupCost ?? 0) * range.max,
      source: "startup_cost",
    };
  }

  if (ranges.length > 0) {
    const summed = sumRanges(ranges);
    return {
      min: summed.min,
      max: summed.max,
      source: normalized.includes("capex") ? "capex" : "range",
    };
  }

  const capexMatch = normalized.match(/capex\s+([0-9]+(?:\.[0-9]+)?)/);
  if (capexMatch) {
    const value = toNumber(capexMatch[1], 0);
    return { min: value, max: value, source: "fixed" };
  }

  return null;
}

export function estimateCapexFromFormula(formula: string, startupCost?: number): number | null {
  const range = parseCapexRange(formula, startupCost);
  if (!range) return null;
  return (range.min + range.max) / 2;
}

export function estimateUpgradeCapex(input: {
  cost?: number | null;
  capexFormula?: string | null;
  capexPctRange?: { min: number; max: number } | null;
  startupCost?: number | null;
}): number {
  const cost = toNumber(input.cost, 0);
  if (cost > 0) return cost;

  const startupCost = toNumber(input.startupCost, 0);
  const capexPct = input.capexPctRange;
  if (capexPct && Number.isFinite(startupCost) && startupCost > 0) {
    const min = toNumber(capexPct.min, 0);
    const max = toNumber(capexPct.max, min);
    return startupCost * ((min + max) / 2);
  }

  const formula = String(input.capexFormula ?? "");
  const estimate = estimateCapexFromFormula(formula, startupCost);
  if (estimate != null) return estimate;

  return cost;
}

