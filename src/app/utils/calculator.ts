import { ExpenseConfig, Member, MemberShare, CalculationResult } from '../models/group.model';

export function calculateShares(expenses: ExpenseConfig, members: Member[]): CalculationResult {
  if (members.length === 0) {
    return { shares: [], totalRent: 0, totalRation: 0, totalVegetable: 0, grandTotal: 0, calculatedAt: new Date().toISOString() };
  }

  const rentPerPerson = expenses.rentAmount / members.length;

  // Ration shares
  const rationApplicable = members.filter(m => m.includeRation);
  const rationShareMap = buildShareMap(expenses.rationAmount, expenses.rationSplitMode, rationApplicable);

  // Vegetable shares
  const vegetableApplicable = members.filter(m => m.includeVegetable);
  const vegetableShareMap = buildShareMap(expenses.vegetableAmount, expenses.vegetableSplitMode, vegetableApplicable);

  // Build raw shares
  const rawShares: MemberShare[] = members.map(m => {
    const rent = rentPerPerson;
    const ration = rationShareMap[m.id] ?? 0;
    const veg = vegetableShareMap[m.id] ?? 0;
    const subtotal = rent + ration + veg;
    const total = subtotal - m.personalExpensePaid;
    return {
      memberId: m.id,
      memberName: m.name,
      rentShare: rent,
      rationShare: ration,
      vegetableShare: veg,
      personalExpensePaid: m.personalExpensePaid,
      subtotal,
      total,
    };
  });

  // Round each total, then adjust last person so sum stays exact
  const exactGrandTotal = expenses.rentAmount + expenses.rationAmount + expenses.vegetableAmount;
  const totalPersonalPaid = members.reduce((s, m) => s + m.personalExpensePaid, 0);
  const exactNetTotal = exactGrandTotal - totalPersonalPaid;

  const rounded = rawShares.map(s => ({ ...s, total: Math.round(s.total) }));
  const roundedSum = rounded.reduce((s, r) => s + r.total, 0);
  const adjustment = Math.round(exactNetTotal) - roundedSum;
  if (rounded.length > 0) {
    rounded[rounded.length - 1].total += adjustment;
  }

  return {
    shares: rounded,
    totalRent: expenses.rentAmount,
    totalRation: expenses.rationAmount,
    totalVegetable: expenses.vegetableAmount,
    grandTotal: exactGrandTotal,
    calculatedAt: new Date().toISOString(),
  };
}

function buildShareMap(amount: number, mode: 'equal' | 'daywise', applicable: Member[]): Record<string, number> {
  const map: Record<string, number> = {};
  if (amount === 0 || applicable.length === 0) return map;

  if (mode === 'equal') {
    const share = amount / applicable.length;
    applicable.forEach(m => (map[m.id] = share));
  } else {
    const totalDays = applicable.reduce((s, m) => s + m.daysPresent, 0);
    if (totalDays === 0) return map;
    applicable.forEach(m => (map[m.id] = (m.daysPresent / totalDays) * amount));
  }
  return map;
}
