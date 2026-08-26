// Shared TypeScript types for Align

export type TransactionType = "INCOME" | "EXPENSE";
export type CategoryType = "EXPENSE" | "INCOME" | "BOTH";
export type PlannerStatus = "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PlannerItemStatus = "PENDING" | "BOOKED" | "PAID" | "SKIPPED";
export type SavingsPotType = "EMERGENCY" | "GENERAL" | "GOAL" | "CUSTOM";
export type InvestmentType = "MUTUAL_FUND" | "STOCKS" | "GOLD" | "CRYPTO" | "FIXED_DEPOSIT" | "OTHER";
export type TaskType = "DAILY" | "ONE_TIME";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "SKIPPED";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type ProjectTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type CalendarEventType = "EVENT" | "REMINDER" | "DEADLINE";
export type ReminderType = "NONE" | "AT_TIME" | "MIN_15" | "MIN_30" | "HOUR_1" | "DAY_1";
export type SurpriseStatus = "IDEA" | "PLANNING" | "BUYING" | "READY" | "DELIVERED";
export type SurpriseItemStatus = "IDEA" | "SHORTLISTED" | "BOUGHT" | "WRAPPED";
export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

// Server action response type
export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard summary types
export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  remainingBudget: number;
}

export interface BudgetAlert {
  type: "exceeded" | "approaching" | "unallocated";
  categoryName: string;
  amount: number;
  percentage?: number;
}

export interface DashboardAlert {
  id: string;
  type: "error" | "warning" | "success" | "info";
  message: string;
  icon?: string;
}
