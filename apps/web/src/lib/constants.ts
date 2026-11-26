
export const TASK_CATEGORIES = ["Home", "Work", "Personal", "Errands", "Finance"] as const;

export const INVESTMENT_TYPES = [
  "MUTUAL_FUND",
  "STOCKS",
  "GOLD",
  "CRYPTO",
  "FIXED_DEPOSIT",
  "OTHER",
] as const;


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
export const PROJECT_TASK_STATUSES = ["BUG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export const PROJECT_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const PROJECT_TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

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
  BUG: "Bugs",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

// Dot color per project task status - used on tile previews and kanban cards.
export const PROJECT_TASK_STATUS_DOT_COLOR: Record<string, string> = {
  BUG: "bg-red-500",
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
