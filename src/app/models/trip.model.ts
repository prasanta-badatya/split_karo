export interface TripMember {
  id: string;
  name: string;
}

export interface TripExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;       // member id
  splitAmong: string[]; // member ids — equal split only among these
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  paid: boolean;
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string;
  members: TripMember[];
  expenses: TripExpense[];
  settlements: Settlement[];
}
