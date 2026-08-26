"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ActionResult } from "@/types";
import { getCurrentPeriod, nextPeriod } from "@/lib/month";
import { toPaisas } from "@/lib/utils";

export async function getBudget(month: number, year: number) {
  await getUserId();
  return prisma.budget.findUnique({
    where: { month_year: { month, year } },
    include: { budgetCategories: { include: { category: true } } },
  });
}

export async function upsertBudget(data: {
  month: number;
  year: number;
  categories: { categoryId: string; allocatedAmount: number }[];
  savingsAllocations?: { potId: string; amount: number }[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    const categoryTotal = data.categories.reduce((sum, c) => sum + toPaisas(c.allocatedAmount), 0);
    const savingsTotal = (data.savingsAllocations ?? []).reduce((sum, s) => sum + toPaisas(s.amount), 0);
    const totalBudget = categoryTotal + savingsTotal;

    const budget = await prisma.budget.upsert({
      where: { month_year: { month: data.month, year: data.year } },
      update: { totalBudget },
      create: { userId, month: data.month, year: data.year, totalBudget },
    });

    await prisma.budgetCategory.deleteMany({ where: { budgetId: budget.id } });
    await prisma.budgetCategory.createMany({
      data: data.categories.map((c) => ({
        budgetId: budget.id,
        categoryId: c.categoryId,
        allocatedAmount: toPaisas(c.allocatedAmount),
      })),
    });

    await prisma.budgetSavingsAllocation.deleteMany({ where: { budgetId: budget.id } });
    const validSavings = (data.savingsAllocations ?? []).filter((s) => s.amount > 0);
    if (validSavings.length > 0) {
      await prisma.budgetSavingsAllocation.createMany({
        data: validSavings.map((s) => ({
          budgetId: budget.id,
          potId: s.potId,
          amount: toPaisas(s.amount),
        })),
      });
    }

    revalidatePath("/budget");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[upsertBudget]", e);
    return { success: false, error: "Failed to save budget" };
  }
}

export async function copyPreviousMonthBudget(month: number, year: number): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const previous = await prisma.budget.findUnique({
      where: { month_year: { month: prevMonth, year: prevYear } },
      include: {
        budgetCategories: true,
        savingsAllocations: true,
      },
    });
    if (!previous) return { success: false, error: "No previous month budget found" };

    const budget = await prisma.budget.upsert({
      where: { month_year: { month, year } },
      update: { totalBudget: previous.totalBudget },
      create: { userId, month, year, totalBudget: previous.totalBudget },
    });

    await prisma.budgetCategory.deleteMany({ where: { budgetId: budget.id } });
    await prisma.budgetCategory.createMany({
      data: previous.budgetCategories.map((bc) => ({
        budgetId: budget.id,
        categoryId: bc.categoryId,
        allocatedAmount: bc.allocatedAmount,
      })),
    });

    await prisma.budgetSavingsAllocation.deleteMany({ where: { budgetId: budget.id } });
    if (previous.savingsAllocations.length > 0) {
      await prisma.budgetSavingsAllocation.createMany({
        data: previous.savingsAllocations.map((sa) => ({
          budgetId: budget.id,
          potId: sa.potId,
          amount: sa.amount,
        })),
      });
    }

    revalidatePath("/budget");
    return { success: true };
  } catch (e) {
    console.error("[copyPreviousMonthBudget]", e);
    return { success: false, error: "Failed to copy budget" };
  }
}

export async function getReadyToAssign(month: number, year: number) {
  const userId = await getUserId();

  const [incomeTransactions, budget] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true },
    }),
    prisma.budget.findUnique({
      where: { month_year: { month, year } },
      include: {
        budgetCategories: { select: { allocatedAmount: true } },
        savingsAllocations: { select: { amount: true } },
      },
    }),
  ]);

  const totalIncome = incomeTransactions.reduce((s, t) => s + t.amount, 0);
  const totalAssigned = budget?.budgetCategories.reduce((s, bc) => s + bc.allocatedAmount, 0) ?? 0;
  const totalPlannedSavings = budget?.savingsAllocations.reduce((s, sa) => s + sa.amount, 0) ?? 0;

  return { totalIncome, readyToAssign: totalIncome - totalAssigned - totalPlannedSavings };
}

export async function getBudgetWithSpending(month: number, year: number) {
  const user = await getAuthenticatedUser({ id: true });

  const [budget, expenseTransactions, incomeTransactions, pots] = await Promise.all([
    prisma.budget.findUnique({
      where: { month_year: { month, year } },
      include: {
        budgetCategories: { include: { category: true } },
        savingsAllocations: {
          include: {
            pot: { select: { id: true, name: true, type: true, balances: { include: { currency: true } } } },
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "EXPENSE", budgetMonth: month, budgetYear: year },
      include: { category: { select: { name: true, color: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id, type: "INCOME", budgetMonth: month, budgetYear: year },
      select: { amount: true },
    }),
    prisma.savingsPot.findMany({
      where: { userId: user.id, type: { not: "EMERGENCY" } },
      select: { id: true, name: true, type: true, balances: { include: { currency: true } } },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const spendingByCategory: Record<string, number> = {};
  for (const t of expenseTransactions) {
    spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] ?? 0) + t.amount;
  }

  const totalSpent = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

  const totalAssigned = budget?.budgetCategories.reduce((s, bc) => s + bc.allocatedAmount, 0) ?? 0;
  const totalPlannedSavings = budget?.savingsAllocations.reduce((s, sa) => s + sa.amount, 0) ?? 0;
  const readyToAssign = totalIncome - totalAssigned - totalPlannedSavings;

  const budgetedCategoryIds = new Set(budget?.budgetCategories.map((bc) => bc.categoryId) ?? []);
  const unbudgetedExpenses = expenseTransactions.filter((t) => !budgetedCategoryIds.has(t.categoryId));
  const unbudgetedTotal = unbudgetedExpenses.reduce((sum, t) => sum + t.amount, 0);

  return {
    budget,
    totalSpent,
    totalIncome,
    unbudgetedExpenses,
    unbudgetedTotal,
    spendingByCategory,
    readyToAssign,
    totalAssigned,
    totalPlannedSavings,
    pots,
    savingsAllocations: budget?.savingsAllocations.map((sa) => ({
      potId: sa.potId,
      potName: sa.pot.name,
      potType: sa.pot.type,
      amount: sa.amount,
    })) ?? [],
    categories: budget?.budgetCategories.map((bc) => {
      const spent = spendingByCategory[bc.categoryId] ?? 0;
      return {
        ...bc,
        spent,
        available: bc.allocatedAmount - spent,
        percentage: bc.allocatedAmount > 0 ? Math.round((spent / bc.allocatedAmount) * 100) : 0,
      };
    }) ?? [],
  };
}

// ─── open budget period ─────────────────────────────────────────────────────────
// The "open period" is which (month, year) newly-logged transactions are filed under.
// Advanced manually via startNewBudgetPeriod() when salary lands, so a late-month salary
// (and the spending it funds) count toward the next month's budget regardless of date.

export async function getOpenBudgetPeriod(): Promise<{ month: number; year: number }> {
  const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
  return getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
}

/**
 * Advance (or set) the open budget period. With no args, advances to the period after the
 * current open one - the typical "my salary arrived, start next month" action.
 */
/**
 * Read-only: a closed period's surplus (income − expenses, both by budgetMonth/budgetYear).
 * Nothing is moved anywhere - leftover savings live in `getFinancialPosition()`'s
 * `liquidAvailable`, computed live from the ledger every time it's read.
 */
async function computePeriodSurplus(month: number, year: number): Promise<number> {
  const txns = await prisma.transaction.findMany({ where: { budgetMonth: month, budgetYear: year }, select: { amount: true, type: true } });
  const income = txns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  return Math.max(0, income - expenses);
}

export async function startNewBudgetPeriod(
  target?: { month: number; year: number },
): Promise<ActionResult & { period?: { month: number; year: number }; reconciledSurplus?: number }> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const current = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const next = target ?? nextPeriod(current.month, current.year);

    // Informational only - the closed period's leftover isn't moved anywhere,
    // it's just counted from here on as part of accumulated (liquid) savings.
    const reconciledSurplus = await computePeriodSurplus(current.month, current.year);

    await prisma.user.update({
      where: { id: user.id },
      data: { currentBudgetMonth: next.month, currentBudgetYear: next.year },
    });

    revalidatePath("/budget");
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/income");
    revalidatePath("/savings");
    return { success: true, period: next, reconciledSurplus };
  } catch (e) {
    console.error("[startNewBudgetPeriod]", e);
    return { success: false, error: "Failed to start new budget period" };
  }
}
