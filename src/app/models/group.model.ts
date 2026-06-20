export type SplitMode = 'equal' | 'daywise';

export interface ExtraItem {
  id: string;
  label: string;
  amount: number;
}

export interface ExpenseConfig {
  rentAmount: number;
  rationAmount: number;
  vegetableAmount: number;
  splitMode: SplitMode;
  extraItems?: ExtraItem[];
}

export interface Member {
  id: string;
  name: string;
  daysPresent: number;
  includeRationVeg: boolean;
  personalExpensePaid: number;
  upiId?: string;
  rosterMemberId?: string;  // stable identity across cycles (member ids are re-generated per split)
  previousDue?: number;     // unpaid balance carried in from the previous cycle (default 0)
}

export interface MemberShare {
  memberId: string;
  memberName: string;
  daysPresent: number;
  rentShare: number;
  extraShare: number;
  rationVegShare: number;
  personalExpensePaid: number;
  previousDue: number;   // carried-in dues added on top of this cycle's share
  grossTotal: number;
  total: number;
}

export interface CalculationResult {
  shares: MemberShare[];
  totalRent: number;
  totalRation: number;
  totalVegetable: number;
  totalExtra: number;
  grandTotal: number;
  verificationOk: boolean;
  calculatedAt: string;
}

// A Roster is the persistent "group" of people. Members are entered once and
// reused across many splits (cycles).
export interface Roster {
  id: string;
  name: string;
  members: Member[];   // daysPresent/personalExpensePaid unused here (roster = identity only)
  createdAt: string;
  archived?: boolean;
}

// A Group is ONE split/cycle belonging to a roster. (Kept name "Group" to avoid
// a mass rename — conceptually this is a "Split".)
export interface Group {
  id: string;
  name: string;          // snapshot of roster name at split time
  rosterId: string;      // owning roster
  cycleLabel: string;
  fromDate: string;      // billing period start (YYYY-MM-DD)
  toDate: string;        // billing period end (YYYY-MM-DD)
  createdAt: string;
  expenses: ExpenseConfig;
  members: Member[];
  result: CalculationResult;
  paidMembers?: Record<string, boolean>;     // legacy binary paid flag (kept for back-compat)
  paidAmounts?: Record<string, number>;      // memberId → amount received so far (partial payments)
  collectorId?: string;  // member who collects everyone's share (UPI QR target)
  archived?: boolean;
}

export interface FormState {
  step: 1 | 2 | 3 | 4;
  groupName: string;
  fromDate: string;
  toDate: string;
  expenses: ExpenseConfig;
  members: Member[];
}
