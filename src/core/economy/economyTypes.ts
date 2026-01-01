export type DebtState = {
  id: string;
  principal: number;
  interestRate: number;
  weeklyPayment: number;
};

export type CostTiming = "immediate" | "next_tick" | "multi_tick";

export type CostInput = {
  id?: string;
  amount: number;
  timing: CostTiming;
  ticks?: number;
};

export type PendingCost = {
  id: string;
  amountPerTick: number;
  ticksRemaining: number;
};

export type OneTimeInvestment = {
  id?: string;
  amount: number;
  scheduledTick: number;
};

export type CompanyEconomyState = {
  cash: number;
  revenueWeekly: number;
  costsWeekly: number;
  debt: DebtState[];
  pendingCosts: PendingCost[];
  scheduledInvestments: OneTimeInvestment[];
};

export function createEmptyEconomyState(): CompanyEconomyState {
  return {
    cash: 0,
    revenueWeekly: 0,
    costsWeekly: 0,
    debt: [],
    pendingCosts: [],
    scheduledInvestments: [],
  };
}

export function testEconomyTypes(): boolean {
  const state = createEmptyEconomyState();
  return (
    state.cash === 0 &&
    state.revenueWeekly === 0 &&
    state.costsWeekly === 0 &&
    state.debt.length === 0
  );
}
