export interface TripMember {
  id: string;
  name: string;
  upiId?: string;       // optional UPI VPA for collecting settlements
}

export interface TripExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;       // member id
  splitAmong: string[]; // member ids that share this expense
  date?: string;        // ISO yyyy-mm-dd of actual spend (defaults to trip.createdAt)
  splitType?: 'equal' | 'exact'; // default 'equal'
  splits?: Record<string, number>; // member id → exact ₹ (only when splitType === 'exact')
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  paid: boolean;          // legacy binary flag (kept for back-compat)
  paidAmount?: number;    // amount received so far against this transfer (partial payments)
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string;
  members: TripMember[];
  expenses: TripExpense[];
  settlements: Settlement[];
  simplifyDebts?: boolean; // default true — minimize number of transfers
  archived?: boolean;
}
