import { Expense, Balance, Settlement, AppUser } from '../types';

export function calculateBalances(expenses: Expense[], members: AppUser[]): Balance[] {
  const netMap: Record<string, number> = {};

  members.forEach((m) => {
    netMap[m.id] = 0;
  });

  expenses.forEach((expense) => {
    // Payer gets credited the full amount
    if (netMap[expense.paidBy] !== undefined) {
      netMap[expense.paidBy] += expense.amount;
    }
    // Each member in split gets debited their share
    expense.splits.forEach((split) => {
      if (netMap[split.userId] !== undefined) {
        netMap[split.userId] -= split.amount;
      }
    });
  });

  return members.map((m) => ({
    userId: m.id,
    userName: m.displayName,
    net: Math.round(netMap[m.id] * 100) / 100,
  }));
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b }));

  const settlements: Settlement[] = [];

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];

    const amount = Math.min(credit.net, -debt.net);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0) {
      settlements.push({
        from: debt.userId,
        fromName: debt.userName,
        to: credit.userId,
        toName: credit.userName,
        amount: rounded,
      });
    }

    credit.net -= amount;
    debt.net += amount;

    if (Math.abs(credit.net) < 0.01) i++;
    if (Math.abs(debt.net) < 0.01) j++;
  }

  return settlements;
}

export function equalSplit(amount: number, memberCount: number): number {
  return Math.round((amount / memberCount) * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}
