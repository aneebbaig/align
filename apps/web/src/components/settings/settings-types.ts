export interface UserSettings {
  name: string;
  email: string;
  dateFormat: string;
  firstDayOfWeek: number;
  emergencyFundMonths: number;
  notifyBudgetWarning: boolean;
  notifyDoomSpending: boolean;
  notifyLoanDue: boolean;
  notifyDailyDigest: boolean;
  notifyDigestTasks: boolean;
  notifyDigestBudget: boolean;
  notifyDigestFinancials: boolean;
}
export interface Currency {
  id: string;
  code: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  isDefault: boolean;
}
export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  recurringFrequency: string | null;
  date: Date;
  category: { name: string; color: string };
}
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}
