export type SplitMode = 'equal' | 'daywise';

export interface ExpenseConfig {
  rentAmount: number;
  rationAmount: number;
  vegetableAmount: number;
  splitMode: SplitMode;
}

export interface Member {
  id: string;
  name: string;
  daysPresent: number;
  includeRationVeg: boolean;
  personalExpensePaid: number;
}

export interface MemberShare {
  memberId: string;
  memberName: string;
  rentShare: number;
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
}

export interface FormState {
  step: 1 | 2 | 3 | 4;
  groupName: string;
  fromDate: string;
  toDate: string;
  expenses: ExpenseConfig;
  members: Member[];
}
