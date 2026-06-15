export interface AppUser {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];
  memberDetails: Record<string, AppUser>;
  createdBy: string;
  createdAt: any;
  currency: string;
}

export interface Split {
  userId: string;
  userName: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splits: Split[];
  createdAt: any;
  category: string;
  receiptUrl?: string;
}

export interface Balance {
  userId: string;
  userName: string;
  net: number;
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName: string };
  EditGroup: { groupId: string; currentName: string; currentDescription: string; currentCurrency: string };
  AddExpense: { groupId: string; members: AppUser[]; currency: string; groupName: string };
  EditExpense: { groupId: string; expense: Expense; members: AppUser[]; currency: string };
  AddMember: { groupId: string };
  SettleUp: { groupId: string; members: AppUser[]; currency: string };
  Analytics: { groupId: string; groupName: string; currency: string };
  Profile: undefined;
  ForgotPassword: undefined;
};
