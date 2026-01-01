const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type CreditTier = {
  label: string;
  note: string;
  score: number;
  rateDelta: number;
};

function creditScore(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return clamp((level - 1) / 998, 0, 1);
}

export function getCreditTier(level: number): CreditTier {
  const score = creditScore(level);
  const tiers: Array<{ min: number; label: string; note: string }> = [
    { min: 0.9, label: "AAA", note: "Elite credit" },
    { min: 0.8, label: "AA", note: "Very strong credit" },
    { min: 0.7, label: "A", note: "Strong credit" },
    { min: 0.6, label: "BBB", note: "Stable credit" },
    { min: 0.5, label: "BB", note: "Developing credit" },
    { min: 0.4, label: "B", note: "Risk-sensitive" },
    { min: 0.0, label: "CCC", note: "High risk" },
  ];

  const tier = tiers.find((t) => score >= t.min) ?? tiers[tiers.length - 1];

  // +/- 2% annual rate adjustment based on credit score
  const rateDelta = (0.5 - score) * 0.04;

  return {
    label: tier.label,
    note: tier.note,
    score,
    rateDelta,
  };
}

export function applyCreditRate(params: {
  baseRate: number;
  creditLevel: number;
  minRate: number;
  maxRate: number;
}) {
  const tier = getCreditTier(params.creditLevel);
  const rate = clamp(params.baseRate + tier.rateDelta, params.minRate, params.maxRate);
  return { rate, tier };
}

export function estimateWeeklyLoanPayment(params: {
  principal: number;
  annualRate: number;
  termWeeks: number;
}) {
  const principal = Math.max(0, Number(params.principal) || 0);
  const termWeeks = Math.max(1, Math.floor(Number(params.termWeeks) || 1));
  const annualRate = Math.max(0, Number(params.annualRate) || 0);

  const weeklyRate = annualRate / 52;
  const weeklyInterest = principal * weeklyRate;
  const weeklyPrincipal = principal / termWeeks;
  const weeklyPayment = weeklyInterest + weeklyPrincipal;

  // Rough total interest estimate using average balance.
  const totalInterestEstimate = principal * annualRate * (termWeeks / 104);

  return {
    weeklyInterest,
    weeklyPrincipal,
    weeklyPayment,
    totalInterestEstimate,
  };
}
