import { TripMember, TripExpense, Settlement } from '../models/trip.model';

export function calculateSettlements(
  members: TripMember[],
  expenses: TripExpense[],
): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach(m => (balance[m.id] = 0));

  for (const exp of expenses) {
    if (exp.splitAmong.length === 0) continue;
    balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) + exp.amount;
    const share = exp.amount / exp.splitAmong.length;
    for (const id of exp.splitAmong) {
      balance[id] = (balance[id] ?? 0) - share;
    }
  }

  // Separate into creditors (owed money) and debtors (owe money)
  const creditors = members
    .filter(m => balance[m.id] > 0.005)
    .map(m => ({ id: m.id, name: m.name, amount: balance[m.id] }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = members
    .filter(m => balance[m.id] < -0.005)
    .map(m => ({ id: m.id, name: m.name, amount: -balance[m.id] }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({
      from: debtors[i].id,
      fromName: debtors[i].name,
      to: creditors[j].id,
      toName: creditors[j].name,
      amount: pay,
      paid: false,
    });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.005) i++;
    if (creditors[j].amount < 0.005) j++;
  }

  return settlements;
}
