export type GroupType = "trip" | "flat";
export type SplitType = "equal" | "unequal" | "percent";

export interface Group {
  _id: string;
  name: string;
  type: GroupType;
  members: string[];
  createdBy: string;
  inviteCode: string;
  createdAt: string;
}

export interface Split {
  userId: string;
  amount: number;
  percent?: number;
}

export interface Expense {
  _id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  category: string;
  description: string;
  splitType: SplitType;
  splits: Split[];
  createdAt: string;
}

export interface Settlement {
  _id: string;
  groupId: string;
  from: string;
  to: string;
  amount: number;
  status: "pending" | "completed";
  createdAt: string;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface BalancesResponse {
  group: Group;
  balances: Record<string, number>;
  transfers: Transfer[];
}
