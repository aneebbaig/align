import { PrismaClient } from "@/generated/prisma/client";
import { RESET_GROUP_KEYS, ResetGroupKey } from "@/lib/reset-groups";
import { deleteContributionTransactionsFor } from "@/lib/investment-contributions";

// Deletion order matters for exactly one reason: Transaction.categoryId and
// BudgetCategory.categoryId hold required (ON DELETE RESTRICT) foreign keys
// to Category. Every other relation in the schema is either owned-and-cascading
// or an optional FK that gets SET NULL, so it self-resolves regardless of
// which groups are picked or in what order. Categories must go last so the
// transactions/budgets that reference them are already gone.
const DELETE_ORDER: ResetGroupKey[] = [
  "transactions",
  "budgets",
  "savingsPots",
  "investments",
  "loans",
  "planners",
  "wedding",
  "lists",
  "tasks",
  "projects",
  "calendar",
  "vault",
  "perfumes",
  "categories",
];

// Core wipe logic behind the Settings "Reset app data" tool (actions/reset.ts,
// SUPER_ADMIN only). Callers are responsible for their own auth check before
// calling this.
export async function wipeAppData(
  prisma: PrismaClient,
  keys: string[],
): Promise<Record<string, number>> {
  const validKeys = new Set<string>(RESET_GROUP_KEYS);
  const selected = new Set(keys.filter((k) => validKeys.has(k)));
  const ordered = DELETE_ORDER.filter((k) => selected.has(k));
  const deleted: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      for (const key of ordered) {
        switch (key) {
          case "transactions": {
            const r = await tx.transaction.deleteMany({});
            deleted.transactions = r.count;
            break;
          }
          case "budgets": {
            const r = await tx.budget.deleteMany({});
            deleted.budgets = r.count;
            break;
          }
          case "savingsPots": {
            const r = await tx.savingsPot.deleteMany({});
            deleted.savingsPots = r.count;
            break;
          }
          case "investments": {
            // Investment -> InvestmentContribution cascades on delete, but not
            // the contributions' linked Transactions (booked expenses) - clear
            // those first, same reasoning as the "loans" case below.
            const investmentIds = (await tx.investment.findMany({ select: { id: true } })).map((i) => i.id);
            await deleteContributionTransactionsFor(tx, investmentIds);
            const r = await tx.investment.deleteMany({});
            const p = await tx.investmentPlan.deleteMany({});
            deleted.investments = r.count;
            if (p.count > 0) deleted.investmentPlan = p.count;
            break;
          }
          case "loans": {
            // Loan.transactionId is optional (null when created via
            // "skip transaction") - only delete the ones that exist.
            const loans = await tx.loan.findMany({ select: { transactionId: true } });
            const transactionIds = loans.map((l) => l.transactionId).filter((id): id is string => id != null);
            const r = await tx.loan.deleteMany({});
            if (transactionIds.length > 0) {
              await tx.transaction.deleteMany({ where: { id: { in: transactionIds } } });
            }
            deleted.loans = r.count;
            break;
          }
          case "planners": {
            const r = await tx.plan.deleteMany({});
            deleted.planners = r.count;
            break;
          }
          case "wedding": {
            const r = await tx.weddingPlan.deleteMany({});
            deleted.wedding = r.count;
            break;
          }
          case "lists": {
            const w = await tx.wantListItem.deleteMany({});
            const n = await tx.needListItem.deleteMany({});
            deleted.lists = w.count + n.count;
            break;
          }
          case "tasks": {
            const r = await tx.task.deleteMany({});
            deleted.tasks = r.count;
            break;
          }
          case "projects": {
            const r = await tx.project.deleteMany({});
            deleted.projects = r.count;
            break;
          }
          case "calendar": {
            const r = await tx.calendarEvent.deleteMany({});
            deleted.calendar = r.count;
            break;
          }
          case "vault": {
            const r = await tx.surprise.deleteMany({});
            deleted.vault = r.count;
            break;
          }
          case "perfumes": {
            const r = await tx.perfume.deleteMany({});
            deleted.perfumes = r.count;
            break;
          }
          case "categories": {
            // Custom (userId != null) categories only - built-in categories
            // are shared and never touched. A category can only be hard-deleted
            // once nothing still references it (RESTRICT); check first rather
            // than delete-and-catch, since a failed statement would poison the
            // rest of this transaction. Anything still referenced gets hidden
            // instead, same fallback the regular "delete category" action uses.
            const custom = await tx.category.findMany({
              where: { userId: { not: null } },
              select: { id: true },
            });
            let removed = 0;
            let hidden = 0;
            for (const c of custom) {
              const [txCount, budgetCount] = await Promise.all([
                tx.transaction.count({ where: { categoryId: c.id } }),
                tx.budgetCategory.count({ where: { categoryId: c.id } }),
              ]);
              if (txCount === 0 && budgetCount === 0) {
                await tx.category.delete({ where: { id: c.id } });
                removed++;
              } else {
                await tx.category.update({ where: { id: c.id }, data: { isHidden: true } });
                hidden++;
              }
            }
            deleted.categories = removed;
            if (hidden > 0) deleted.categoriesHidden = hidden;
            break;
          }
        }
      }
    },
    { timeout: 30000 },
  );

  return deleted;
}
