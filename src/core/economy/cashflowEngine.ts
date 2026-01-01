import { createEmptyEconomyState } from "./economyTypes";
import type {
  CompanyEconomyState,
  CostInput,
  DebtState,
  OneTimeInvestment,
  PendingCost,
} from "./economyTypes";

export function applyRevenue(
  state: CompanyEconomyState,
  amount: number
): CompanyEconomyState {
  const revenue = Number.isFinite(amount) ? amount : 0;
  return {
    ...state,
    cash: state.cash + revenue,
    revenueWeekly: state.revenueWeekly + revenue,
  };
}

export function applyCosts(
  state: CompanyEconomyState,
  costs: CostInput[],
  currentTick: number
): CompanyEconomyState {
  const tickId = Number.isFinite(currentTick) ? Math.floor(currentTick) : 0;
  let cash = state.cash;
  let costsWeekly = state.costsWeekly;

  const updatedPending: PendingCost[] = [];
  for (const pending of state.pendingCosts) {
    const amountPerTick = Math.max(0, pending.amountPerTick);
    cash -= amountPerTick;
    costsWeekly += amountPerTick;
    if (pending.ticksRemaining > 1) {
      updatedPending.push({
        ...pending,
        ticksRemaining: pending.ticksRemaining - 1,
      });
    }
  }

  const newPending: PendingCost[] = [];
  let immediateTotal = 0;
  costs.forEach((cost, index) => {
    const amount = Math.max(0, cost.amount);
    const id = cost.id ?? `cost_${tickId}_${index}`;
    if (cost.timing === "immediate") {
      immediateTotal += amount;
      return;
    }
    if (cost.timing === "next_tick") {
      newPending.push({ id, amountPerTick: amount, ticksRemaining: 1 });
      return;
    }

    const ticks = Math.max(1, Math.floor(cost.ticks ?? 1));
    if (ticks <= 1) {
      immediateTotal += amount;
      return;
    }
    newPending.push({
      id,
      amountPerTick: amount / ticks,
      ticksRemaining: ticks,
    });
  });

  cash -= immediateTotal;
  costsWeekly += immediateTotal;

  return {
    ...state,
    cash,
    costsWeekly,
    pendingCosts: [...updatedPending, ...newPending],
  };
}

export function applyDebtService(
  state: CompanyEconomyState,
  debt: DebtState[]
): CompanyEconomyState {
  let cash = state.cash;
  let costsWeekly = state.costsWeekly;
  const nextDebt = debt.map((loan) => {
    const principal = Math.max(0, loan.principal);
    const rate = Number.isFinite(loan.interestRate) ? loan.interestRate : 0;
    const weeklyPayment = Math.max(0, loan.weeklyPayment);
    const interest = principal * rate;
    const due = principal + interest;
    const payment = Math.min(weeklyPayment, due);
    const remaining = Math.max(0, due - payment);
    cash -= payment;
    costsWeekly += payment;
    return { ...loan, principal: remaining };
  });

  return { ...state, cash, costsWeekly, debt: nextDebt };
}

export function applyOneTimeInvestments(
  state: CompanyEconomyState,
  investments: OneTimeInvestment[],
  currentTick: number
): CompanyEconomyState {
  const tick = Number.isFinite(currentTick) ? Math.floor(currentTick) : 0;
  let cash = state.cash;
  let costsWeekly = state.costsWeekly;

  const futureInvestments: OneTimeInvestment[] = [];
  for (const investment of investments) {
    const amount = Math.max(0, investment.amount);
    if (investment.scheduledTick <= tick) {
      cash -= amount;
      costsWeekly += amount;
    } else {
      futureInvestments.push(investment);
    }
  }

  return { ...state, cash, costsWeekly, scheduledInvestments: futureInvestments };
}

export function testCashflowEngine(): boolean {
  const start = { ...createEmptyEconomyState(), cash: 1000 };
  const withPending = {
    ...start,
    pendingCosts: [{ id: "p1", amountPerTick: 50, ticksRemaining: 2 }],
  };
  const afterCosts = applyCosts(
    withPending,
    [
      { amount: 100, timing: "immediate" },
      { amount: 200, timing: "next_tick" },
      { amount: 300, timing: "multi_tick", ticks: 3 },
    ],
    1
  );
  const afterSecond = applyCosts(afterCosts, [], 2);
  const expectedCashAfterSecond = 500;

  return (
    afterCosts.cash === 850 &&
    afterCosts.pendingCosts.length === 3 &&
    afterSecond.cash === expectedCashAfterSecond
  );
}
