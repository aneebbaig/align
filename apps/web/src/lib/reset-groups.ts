// Data categories the "Reset app data" tool (Settings → Users, SUPER_ADMIN only)
// can wipe independently. Order here is display order; the server action
// applies its own dependency-safe deletion order regardless of this list's
// order or the order the caller selects groups in.
export const RESET_GROUPS = [
  { key: "transactions", label: "Transactions", description: "All expense and income entries" },
  { key: "budgets", label: "Budgets", description: "Monthly budgets and category allocations" },
  { key: "savingsPots", label: "Savings Pots", description: "Pots (incl. targeted savings goals) and their history" },
  { key: "investments", label: "Investments", description: "Investment holdings and your investment plan" },
  { key: "loans", label: "Loans", description: "Loans given/received and their payments" },
  { key: "planners", label: "Planner", description: "Planners and their line items" },
  { key: "wedding", label: "Wedding Planning", description: "Wedding plan, events, vendors, and expenses" },
  { key: "lists", label: "Want & Need Lists", description: "Want-list and need-list items" },
  { key: "tasks", label: "Tasks", description: "Daily and one-time tasks" },
  { key: "projects", label: "Projects", description: "Projects and their tasks" },
  { key: "calendar", label: "Calendar", description: "Calendar events" },
  { key: "vault", label: "Vault", description: "Surprise plans and items" },
  { key: "perfumes", label: "Perfumes", description: "Perfume collection entries" },
  { key: "categories", label: "Custom Categories", description: "Categories you created (built-in categories are kept)" },
] as const;

export type ResetGroupKey = (typeof RESET_GROUPS)[number]["key"];

export const RESET_GROUP_KEYS: readonly ResetGroupKey[] = RESET_GROUPS.map((g) => g.key);
