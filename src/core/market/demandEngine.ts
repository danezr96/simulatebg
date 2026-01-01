export type CompanyOffer = {
  companyId: string;
  quantity: number;
};

export type DemandAllocation = {
  companyId: string;
  allocated: number;
};

export function computeDemandAllocation(
  totalDemand: number,
  companyOffers: CompanyOffer[]
): DemandAllocation[] {
  const safeDemand = Math.max(0, totalDemand);
  const totalSupply = companyOffers.reduce(
    (sum, offer) => sum + Math.max(0, offer.quantity),
    0
  );

  if (safeDemand === 0 || totalSupply === 0) {
    return companyOffers.map((offer) => ({
      companyId: offer.companyId,
      allocated: 0,
    }));
  }

  const ratio = safeDemand / totalSupply;
  return companyOffers.map((offer) => ({
    companyId: offer.companyId,
    allocated: Math.max(0, offer.quantity) * ratio,
  }));
}

function approxEqual(a: number, b: number, tolerance = 1e-6): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function testDemandEngine(): boolean {
  const allocations = computeDemandAllocation(100, [
    { companyId: "A", quantity: 60 },
    { companyId: "B", quantity: 40 },
  ]);
  const sum = allocations.reduce((total, entry) => total + entry.allocated, 0);
  return approxEqual(sum, 100);
}
