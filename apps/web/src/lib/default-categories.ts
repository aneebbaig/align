import type { PrismaClient, Prisma } from "@/generated/prisma/client";

// The full set of built-in categories a fresh install gets seeded with
// (prisma/seed.ts), plus the ones lazily ensured at first use by the
// loan/investment flows (ensureCategory below) - kept in one place so both
// paths agree on id/name/icon/color/type.
export const DEFAULT_CATEGORIES = [
  // Expense categories
  { name: "Food & Dining", icon: "Utensils", color: "#f97316", type: "EXPENSE" },
  { name: "Groceries", icon: "ShoppingCart", color: "#84cc16", type: "EXPENSE" },
  { name: "Transport & Fuel", icon: "Car", color: "#06b6d4", type: "EXPENSE" },
  { name: "Utilities", icon: "Zap", color: "#a855f7", type: "EXPENSE" },
  { name: "Rent & Housing", icon: "Home", color: "#3b82f6", type: "EXPENSE" },
  { name: "Healthcare", icon: "Heart", color: "#ef4444", type: "EXPENSE" },
  { name: "Shopping", icon: "ShoppingBag", color: "#ec4899", type: "EXPENSE" },
  { name: "Entertainment", icon: "Tv", color: "#8b5cf6", type: "EXPENSE" },
  { name: "Subscriptions", icon: "CreditCard", color: "#6366f1", type: "EXPENSE" },
  { name: "Personal Care", icon: "Sparkles", color: "#f43f5e", type: "EXPENSE" },
  { name: "Education", icon: "BookOpen", color: "#0ea5e9", type: "EXPENSE" },
  { name: "Gifts", icon: "Gift", color: "#d946ef", type: "EXPENSE" },
  { name: "Car Maintenance", icon: "Wrench", color: "#78716c", type: "EXPENSE" },
  { name: "Investments", icon: "PiggyBank", color: "#2563eb", type: "EXPENSE" },
  { name: "Miscellaneous", icon: "MoreHorizontal", color: "#94a3b8", type: "EXPENSE" },
  // Income categories
  { name: "Salary", icon: "Briefcase", color: "#22c55e", type: "INCOME" },
  { name: "Freelance", icon: "Laptop", color: "#10b981", type: "INCOME" },
  { name: "Investment Returns", icon: "TrendingUp", color: "#14b8a6", type: "INCOME" },
  { name: "Gifts Received", icon: "Gift", color: "#34d399", type: "INCOME" },
  { name: "Side Hustle", icon: "Zap", color: "#6ee7b7", type: "INCOME" },
  { name: "Refunds", icon: "RefreshCw", color: "#a7f3d0", type: "INCOME" },
  { name: "Other Income", icon: "DollarSign", color: "#4ade80", type: "INCOME" },
  // Loan categories - type BOTH: GIVEN/RECEIVED principal and repayment can
  // each land as either an EXPENSE or an INCOME depending on direction.
  { name: "Loan", icon: "Landmark", color: "#f59e0b", type: "BOTH" },
  { name: "Loan Repayment", icon: "Landmark", color: "#d97706", type: "BOTH" },
] as const;

export function defaultCategoryId(name: string): string {
  return `default-${name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
}

type TxClient = PrismaClient | Prisma.TransactionClient;

// Resolves the category id a loan/investment transaction should file under.
// 1. A legacy per-user custom category with this exact name, if one already
//    exists (existing installs created these lazily before default
//    categories existed - reuse it, don't fork into a duplicate).
// 2. Otherwise the shared built-in default category (userId: null),
//    upserted by its fixed id - self-heals on any deployment that hasn't
//    been reseeded since these were added, no manual reseed required.
export async function ensureCategory(
  tx: TxClient,
  userId: string,
  name: string,
): Promise<string> {
  const legacy = await tx.category.findFirst({
    where: { userId, name },
    select: { id: true },
  });
  if (legacy) return legacy.id;

  const def = DEFAULT_CATEGORIES.find((c) => c.name === name);
  if (!def) throw new Error(`No default category registered for "${name}"`);

  const id = defaultCategoryId(name);
  const category = await tx.category.upsert({
    where: { id },
    update: {},
    create: { id, name: def.name, icon: def.icon, color: def.color, type: def.type, isDefault: true, userId: null },
  });
  return category.id;
}
