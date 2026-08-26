export const CURRENCIES = [
  { code: "PKR", symbol: "Rs ", name: "Pakistani Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export const DEFAULT_CURRENCY = "PKR";

export const TRANSACTION_TYPES = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export const CATEGORY_TYPES = {
  EXPENSE: "EXPENSE",
  INCOME: "INCOME",
  BOTH: "BOTH",
} as const;

export const GOAL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const GOAL_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "ABANDONED"] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TASK_TYPES = ["DAILY", "ONE_TIME"] as const;
export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"] as const;
export const TASK_CATEGORIES = ["Home", "Work", "Personal", "Errands", "Finance"] as const;

export const PLANNER_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const PLANNER_ITEM_STATUSES = ["PENDING", "BOOKED", "PAID", "SKIPPED"] as const;

export const SAVINGS_POT_TYPES = ["EMERGENCY", "GENERAL", "GOAL", "CUSTOM"] as const;

export const INVESTMENT_TYPES = [
  "MUTUAL_FUND",
  "STOCKS",
  "GOLD",
  "CRYPTO",
  "FIXED_DEPOSIT",
  "OTHER",
] as const;

export const RECURRING_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const SURPRISE_STATUSES = ["IDEA", "PLANNING", "BUYING", "READY", "DELIVERED"] as const;
export const SURPRISE_ITEM_STATUSES = ["IDEA", "SHORTLISTED", "BOUGHT", "WRAPPED"] as const;

export const CALENDAR_EVENT_TYPES = ["EVENT", "REMINDER", "DEADLINE"] as const;
export const REMINDER_TYPES = ["NONE", "AT_TIME", "MIN_15", "MIN_30", "HOUR_1", "DAY_1"] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-emerald-100 text-emerald-700",
  SKIPPED: "bg-slate-100 text-slate-500",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ABANDONED: "bg-red-100 text-red-700",
};

export const MAX_FUNDING_SOURCES = 2;

// ─── Projects (freelance/client PM) ───────────────────────────────────────────

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export const PROJECT_TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export const PROJECT_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const PROJECT_TASK_STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

// Dot color per priority - used on compact task rows.
export const PROJECT_TASK_PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};

// Dot color per project task status - used on tile previews and kanban cards.
export const PROJECT_TASK_STATUS_DOT_COLOR: Record<string, string> = {
  TODO: "bg-muted-foreground/40",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
};

// Preset accent colors offered in the project create/edit form.
export const PROJECT_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F59E0B", "#10B981", "#06B6D4", "#3B82F6",
] as const;
