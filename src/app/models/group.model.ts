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
}

export interface MemberShare {
  memberId: string;
  memberName: string;
  daysPresent: number;
  rentShare: number;
  extraShare: number;
  rationVegShare: number;
  personalExpensePaid: number;
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

export interface Group {
  id: string;
  name: string;
  cycleLabel: string;
  createdAt: string;
  expenses: ExpenseConfig;
  members: Member[];
  result: CalculationResult;
  paidMembers?: Record<string, boolean>;
}

export interface FormState {
  step: 1 | 2 | 3 | 4;
  groupName: string;
  fromDate: string;
  toDate: string;
  expenses: ExpenseConfig;
  members: Member[];
}
