import { ExpenseConfig, Member, MemberShare, CalculationResult } from '../models/group.model';

export function calculateShares(expenses: ExpenseConfig, members: Member[]): CalculationResult {
  const { rentAmount, rationAmount, vegetableAmount, splitMode } = expenses;
  const totalExtra = (expenses.extraItems ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const grandTotal = rentAmount + rationAmount + vegetableAmount + totalExtra;

  if (members.length === 0) {
    return { shares: [], totalRent: rentAmount, totalRation: rationAmount, totalVegetable: vegetableAmount, totalExtra, grandTotal, verificationOk: true, calculatedAt: new Date().toISOString() };
  }

  // 1. Rent + extra items — always equal among ALL members
  const rentShare  = rentAmount / members.length;
  const extraShare = totalExtra / members.length;

  // 2. Ration + Veggie — combined pool, one mode
  const pool = rationAmount + vegetableAmount;
  const included = members.filter(m => m.includeRationVeg);
  const rationVegMap: Record<string, number> = {};

  if (pool > 0 && included.length > 0) {
    if (splitMode === 'equal') {
      const share = pool / included.length;
      included.forEach(m => (rationVegMap[m.id] = share));
    } else {
      const totalDays = included.reduce((s, m) => s + m.daysPresent, 0);
      if (totalDays > 0) {
        included.forEach(m => (rationVegMap[m.id] = (m.daysPresent / totalDays) * pool));
      }
    }
  }

  // 3. Build shares
  const shares: MemberShare[] = members.map(m => {
    const rv = rationVegMap[m.id] ?? 0;
    const gross = rentShare + extraShare + rv;
    const previousDue = Number(m.previousDue) || 0;  // carried in from last cycle; 0 for old/standalone splits
    return {
      memberId: m.id,
      memberName: m.name,
      daysPresent: m.daysPresent,
      rentShare,
      extraShare,
      rationVegShare: rv,
      personalExpensePaid: m.personalExpensePaid,
      previousDue,
      grossTotal: gross,
      // previousDue rides on top of this cycle's net; it's NOT part of grandTotal
      // (this cycle's expenses), so verification below stays based on grossTotal.
      total: gross - m.personalExpensePaid + previousDue,
    };
  });

  // 4. Verification: sum of grossTotals must equal grandTotal
  const grossSum = shares.reduce((s, sh) => s + sh.grossTotal, 0);
  const verificationOk = Math.abs(grossSum - grandTotal) < 0.01;

  return {
    shares,
    totalRent: rentAmount,
    totalRation: rationAmount,
    totalVegetable: vegetableAmount,
    totalExtra,
    grandTotal,
    verificationOk,
    calculatedAt: new Date().toISOString(),
  };
}

export function fmt(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toFixed(2);
  return '₹' + formatted;
}
