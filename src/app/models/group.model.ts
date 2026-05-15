export type SplitMode = 'equal' | 'daywise';

export interface ExpenseConfig {
  rentAmount: number;
  rationAmount: number;
  vegetableAmount: number;
  rationSplitMode: SplitMode;
  vegetableSplitMode: SplitMode;
}

export interface Member {
  id: string;
  name: string;
  daysPresent: number;
  includeRation: boolean;
  includeVegetable: boolean;
  personalExpensePaid: number;
}

export interface MemberShare {
  memberId: string;
  memberName: string;
  rentShare: number;
  rationShare: number;
  vegetableShare: number;
  personalExpensePaid: number;
  subtotal: number;
  total: number;
}

export interface CalculationResult {
  shares: MemberShare[];
  totalRent: number;
  totalRation: number;
  totalVegetable: number;
  grandTotal: number;
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
  cycleLabel: string;
  expenses: ExpenseConfig;
  members: Member[];
}
