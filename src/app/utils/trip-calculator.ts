import { TripMember, TripExpense, Settlement } from '../models/trip.model';

/** What a single member owes for one expense, honouring its split type. */
export function shareFor(exp: TripExpense, memberId: string): number {
  if (!exp.splitAmong.includes(memberId)) return 0;
  if (exp.splitType === 'exact') {
    return Number(exp.splits?.[memberId]) || 0;
  }
  return exp.splitAmong.length > 0 ? exp.amount / exp.splitAmong.length : 0;
}

export function calculateSettlements(
  members: TripMember[],
  expenses: TripExpense[],
  simplify = true,
): Settlement[] {
  const nameOf = (id: string) => members.find(m => m.id === id)?.name ?? id;

  return simplify
    ? minimalSettlements(members, expenses, nameOf)
    : pairwiseSettlements(members, expenses, nameOf);
}

/** Greedy net-balance matching → fewest transfers. */
function minimalSettlements(
  members: TripMember[],
  expenses: TripExpense[],
  nameOf: (id: string) => string,
): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach(m => (balance[m.id] = 0));

  for (const exp of expenses) {
    if (exp.splitAmong.length === 0) continue;
    balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) + exp.amount;
    for (const id of exp.splitAmong) {
      balance[id] = (balance[id] ?? 0) - shareFor(exp, id);
    }
  }

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

/** Direct debts: each person pays whoever actually fronted their share, netted per pair. */
function pairwiseSettlements(
  members: TripMember[],
  expenses: TripExpense[],
  nameOf: (id: string) => string,
): Settlement[] {
  // owes[debtor][creditor] = amount debtor owes creditor
  const owes: Record<string, Record<string, number>> = {};
  const add = (from: string, to: string, amt: number) => {
    if (from === to || amt <= 0) return;
    (owes[from] ??= {})[to] = (owes[from][to] ?? 0) + amt;
  };

  for (const exp of expenses) {
    if (exp.splitAmong.length === 0) continue;
    for (const id of exp.splitAmong) {
      if (id === exp.paidBy) continue;
      add(id, exp.paidBy, shareFor(exp, id));
    }
  }

  const settlements: Settlement[] = [];
  const seen = new Set<string>();

  for (const a of members) {
    for (const b of members) {
      if (a.id >= b.id) continue;
      const key = a.id + '|' + b.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const ab = owes[a.id]?.[b.id] ?? 0; // a owes b
      const ba = owes[b.id]?.[a.id] ?? 0; // b owes a
      const net = ab - ba;
      if (net > 0.005) {
        settlements.push({ from: a.id, fromName: nameOf(a.id), to: b.id, toName: nameOf(b.id), amount: net, paid: false });
      } else if (net < -0.005) {
        settlements.push({ from: b.id, fromName: nameOf(b.id), to: a.id, toName: nameOf(a.id), amount: -net, paid: false });
      }
    }
  }

  return settlements.sort((x, y) => y.amount - x.amount);
}
