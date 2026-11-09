"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getAuthenticatedUser, getUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";
import { ActionResult } from "@/types";
import { getCurrentPeriod } from "@/lib/month";
import { toPaisas, toLocalDate } from "@/lib/utils";
import { creditPot, debitPot, type PotEntryPeriod } from "@/lib/pot-helpers";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { fetchMonthIncomeIntegrityData, baseIntegrity } from "@/lib/income-helpers";
import { revalidateTransactionPaths } from "@/lib/revalidate";
import { sendEmail, budgetWarningEmail, doomSpendingEmail } from "@/lib/email";
import { MAX_FUNDING_SOURCES } from "@/lib/constants";
import { validateFundingSources, getFundingContextForMonth, getPotUnits } from "@/lib/expenses/funding";
import { updateTransactionCore } from "@/lib/expenses/update";
import { deleteTransactionCore } from "@/lib/expenses/delete";

// ─── internal helpers ─────────────────────────────────────────────────────────

function fundingEntryDescription(description: string) {
  return `Expense: ${description}`;
}

// ─── public read queries ──────────────────────────────────────────────────────

export async function getTransactions(filters?: {
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  month?: number;
  year?: number;
}) {
  const userId = await getUserId();

  const where: Prisma.TransactionWhereInput = { userId };
  if (filters?.type) where.type = filters.type;
  if (filters?.categoryId) where.categoryId = filters.categoryId;
  if (filters?.search) where.description = { contains: filters.search };
  if (filters?.startDate || filters?.endDate) {
    where.date = {
      ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
    };
  }
  if (filters?.month && filters?.year) {
    where.budgetMonth = filters.month;
    where.budgetYear = filters.year;
  }

  return prisma.transaction.findMany({
    where,
    include: {
      category: true,
      fundingPot: { select: { id: true, name: true, type: true } },
      fundingCurrency: true,
      nativeCurrency: true,
      fundingSources: { orderBy: { priority: "asc" }, include: { pot: { select: { id: true, name: true, type: true } }, currency: true } },
      loanPrincipalOf: { select: { id: true } },
      loanPaymentOf: { select: { id: true } },
      investmentContributionOf: { select: { id: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function getExpenseFundingContext(month: number, year: number) {
  const user = await getAuthenticatedUser({});
  return getFundingContextForMonth(user.id, month, year);
}

// ─── createTransaction ────────────────────────────────────────────────────────

export async function createTransaction(data: {
  amount: number;
  type: string;
  categoryId: string;
  description: string;
  notes?: string;
  date: string;
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth?: number;
  budgetYear?: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  tags: string;
  isRegretPurchase?: boolean;
  // Income entered in a non-base currency (amount above is always base-currency)
  nativeCurrencyId?: string;
  nativeAmount?: number;
  // Single-source (backward compat)
  fundingSource?: string;
  fundingPotId?: string;
  fundingCurrencyId?: string;
  // Split sources (up to MAX_FUNDING_SOURCES)
  splitSources?: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[];
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ email: true, currentBudgetMonth: true, currentBudgetYear: true, notifyDoomSpending: true, notifyBudgetWarning: true });
    // New transactions are filed under the user's open budget period (not their calendar date),
    // unless an explicit override month is supplied.
    const period = (data.budgetMonth && data.budgetYear)
      ? { month: data.budgetMonth, year: data.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data" };


    const amountPaisas = toPaisas(data.amount);
    const txDate = toLocalDate(data.date);
    const isSplit = data.type === "EXPENSE" && data.splitSources && data.splitSources.length > 1;

    if (data.type === "EXPENSE") {
      if (isSplit) {
        // Validate split sources
        if (data.splitSources!.length > MAX_FUNDING_SOURCES) {
          return { success: false, error: `Maximum ${MAX_FUNDING_SOURCES} funding sources allowed` };
        }
        const totalCovered = data.splitSources!.reduce((s, src) => s + src.pkrAmount, 0);
        if (totalCovered !== amountPaisas) {
          return { success: false, error: "Funding source amounts must sum to the total expense" };
        }
        const err = await validateFundingSources(user.id, data.splitSources!, period.month, period.year);
        if (err) return { success: false, error: err };
      } else {
        // Single source validation (existing logic)
        const fundingSource = data.fundingSource ?? "INCOME";
        const pkrAmount = amountPaisas;
        const err = await validateFundingSources(user.id, [{ source: fundingSource as "INCOME" | "SAVINGS_POT", potId: data.fundingPotId, currencyId: data.fundingCurrencyId, pkrAmount }], period.month, period.year);
        if (err) return { success: false, error: err };
      }
    }

    const fundingSource = isSplit ? "SPLIT" : (data.type === "EXPENSE" ? data.fundingSource ?? "INCOME" : "INCOME");
    const fundingCurrency = fundingSource === "SAVINGS_POT" && data.fundingCurrencyId
      ? await prisma.currency.findUnique({ where: { id: data.fundingCurrencyId } })
      : null;
    const fundingAmount = fundingCurrency ? getPotUnits(amountPaisas, fundingCurrency) : null;

    // Derived from the submitted amounts (not re-fetched) so a manually overridden
    // rate at entry time - e.g. today's actual bank rate - is preserved as-entered.
    const exchangeRateUsed = data.nativeCurrencyId && data.nativeAmount
      ? amountPaisas / toPaisas(data.nativeAmount)
      : null;

    await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          amount: amountPaisas,
          type: data.type,
          categoryId: data.categoryId,
          description: data.description,
          notes: data.notes,
          date: txDate,
          budgetMonth: period.month,
          budgetYear: period.year,
          isRecurring: data.isRecurring,
          recurringFrequency: data.recurringFrequency ?? null,
          tags: data.tags,
          isRegretPurchase: data.isRegretPurchase ?? false,
          nativeCurrencyId: data.nativeCurrencyId ?? null,
          nativeAmount: data.nativeAmount ? toPaisas(data.nativeAmount) : null,
          exchangeRateUsed,
          fundingSource,
          fundingPotId: fundingSource === "SAVINGS_POT" ? data.fundingPotId : null,
          fundingCurrencyId: fundingCurrency?.id ?? null,
          fundingAmount,
          userId: user.id,
        },
      });

      if (isSplit) {
        // Create child funding source rows and debit pots
        for (let i = 0; i < data.splitSources!.length; i++) {
          const src = data.splitSources![i];
          const isPot = src.source === "SAVINGS_POT" && src.currencyId;
          const currency = isPot ? await tx.currency.findUnique({ where: { id: src.currencyId! } }) : null;
          const potUnits = currency ? getPotUnits(src.pkrAmount, currency) : null;
          await tx.transactionFundingSource.create({
            data: {
              transactionId: created.id,
              priority: i + 1,
              source: src.source,
              potId: src.potId ?? null,
              currencyId: isPot ? src.currencyId : null,
              potAmount: potUnits,
              pkrAmount: src.pkrAmount,
            },
          });
          if (src.source === "SAVINGS_POT" && src.potId && src.currencyId && potUnits) {
            await debitPot(tx, src.potId, potUnits, src.currencyId, fundingEntryDescription(data.description), "MANUAL", { budgetMonth: period.month, budgetYear: period.year });
          }
        }
      } else if (data.type === "EXPENSE" && fundingSource === "SAVINGS_POT" && data.fundingPotId && data.fundingCurrencyId && fundingAmount) {
        await debitPot(tx, data.fundingPotId, fundingAmount, data.fundingCurrencyId, fundingEntryDescription(data.description), "MANUAL", { budgetMonth: period.month, budgetYear: period.year });
      }
    });

    // Post-create notifications
    if (data.type === "EXPENSE") {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentExpenses = await prisma.transaction.findMany({
        where: { userId: user.id, type: "EXPENSE", date: { gte: twoHoursAgo } },
        select: { amount: true },
      });
      if (recentExpenses.length >= 3 && user.notifyDoomSpending) {
        const total = recentExpenses.reduce((s, t) => s + t.amount, 0) + amountPaisas;
        const base = await getBaseCurrency();
        await sendEmail(user.email as string, "🛑 Doom Spending Alert", doomSpendingEmail(recentExpenses.length + 1, total, base.symbol));
      }

      const [budgetCat, spent] = await Promise.all([
        prisma.budgetCategory.findFirst({
          where: { categoryId: data.categoryId, budget: { month: period.month, year: period.year } },
          include: { category: { select: { name: true } } },
        }),
        prisma.transaction.aggregate({
          where: { userId: user.id, type: "EXPENSE", categoryId: data.categoryId, budgetMonth: period.month, budgetYear: period.year },
          _sum: { amount: true },
        }),
      ]);
      if (budgetCat && user.notifyBudgetWarning) {
        const totalSpent = (spent._sum.amount ?? 0) + amountPaisas;
        const pct = Math.round((totalSpent / budgetCat.allocatedAmount) * 100);
        if (pct >= 85 && pct < 100) {
          const prevPct = Math.round(((totalSpent - amountPaisas) / budgetCat.allocatedAmount) * 100);
          if (prevPct < 85) {
            const base = await getBaseCurrency();
            await sendEmail(user.email as string, `⚠️ Budget Warning: ${budgetCat.category.name}`, budgetWarningEmail(budgetCat.category.name, pct, totalSpent, budgetCat.allocatedAmount, base.symbol));
          }
        }
      }
    }

    revalidateTransactionPaths();
    return { success: true };
  } catch (e) {
    console.error("[createTransaction]", e);
    return { success: false, error: "Failed to create transaction" };
  }
}

// ─── updateTransaction ────────────────────────────────────────────────────────

export async function updateTransaction(id: string, data: {
  amount: number;
  type: string;
  categoryId: string;
  description: string;
  notes?: string;
  date: string;
  // Optional budget-period override. When omitted, the existing period is preserved.
  budgetMonth?: number;
  budgetYear?: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  tags: string;
  isRegretPurchase?: boolean;
  // Income entered in a non-base currency: the amount in that currency (major units).
  nativeAmount?: number;
  fundingSource?: string;
  fundingPotId?: string;
  fundingCurrencyId?: string;
  splitSources?: { source: "INCOME" | "SAVINGS_POT"; potId?: string; currencyId?: string; pkrAmount: number }[];
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({});
    const validated = transactionSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Invalid data" };

    const result = await updateTransactionCore(user.id, id, {
      amountPaisas: toPaisas(data.amount),
      categoryId: data.categoryId,
      description: data.description,
      notes: data.notes ?? null,
      date: data.date,
      budgetMonth: data.budgetMonth,
      budgetYear: data.budgetYear,
      isRecurring: data.isRecurring,
      recurringFrequency: data.recurringFrequency ?? null,
      tags: data.tags,
      isRegretPurchase: data.isRegretPurchase,
      nativeAmountPaisas: data.nativeAmount != null ? toPaisas(data.nativeAmount) : undefined,
      fundingSource: data.fundingSource as "INCOME" | "SAVINGS_POT" | undefined,
      fundingPotId: data.fundingPotId,
      fundingCurrencyId: data.fundingCurrencyId,
      splitSources: data.splitSources,
    });
    if (result.error) return { success: false, error: result.error };

    revalidateTransactionPaths();
    return { success: true };
  } catch (e) {
    console.error("[updateTransaction]", e);
    return { success: false, error: "Failed to update transaction" };
  }
}

// ─── deleteTransaction ────────────────────────────────────────────────────────

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const result = await deleteTransactionCore(userId, id);
    if (result.error) return { success: false, error: result.error };

    revalidateTransactionPaths();
    revalidatePath("/expenses/plans");
    return { success: true };
  } catch (e) {
    console.error("[deleteTransaction]", e);
    return { success: false, error: "Failed to delete transaction" };
  }
}

// ─── analytics ────────────────────────────────────────────────────────────────

export async function getMonthlySummary(month: number, year: number) {
  const userId = await getUserId();

  const transactions = await prisma.transaction.findMany({
    where: { userId, budgetMonth: month, budgetYear: year },
  });

  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "EXPENSE").reduce((sum, t) => sum + t.amount, 0);

  return { totalIncome, totalExpenses, netSavings: totalIncome - totalExpenses };
}

export async function getSpendingByCategory(month: number, year: number) {
  const userId = await getUserId();

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", budgetMonth: month, budgetYear: year },
    include: { category: true },
  });

  const byCategory: Record<string, { name: string; color: string; amount: number }> = {};
  for (const t of transactions) {
    if (!byCategory[t.categoryId]) {
      byCategory[t.categoryId] = { name: t.category.name, color: t.category.color, amount: 0 };
    }
    byCategory[t.categoryId].amount += t.amount;
  }

  return Object.values(byCategory).sort((a, b) => b.amount - a.amount);
}

export async function getRegretPurchaseStats(month: number, year: number) {
  const userId = await getUserId();

  const [thisMonth, allTime, recent] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", isRegretPurchase: true, budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", isRegretPurchase: true },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", isRegretPurchase: true },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true, description: true, amount: true, date: true,
        category: { select: { name: true, color: true } },
      },
    }),
  ]);

  return {
    thisMonth: { count: thisMonth._count, total: thisMonth._sum.amount ?? 0 },
    allTime: { count: allTime._count, total: allTime._sum.amount ?? 0 },
    recent,
  };
}

export async function getMonthlyTrend(months = 6) {
  const userId = await getUserId();

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { amount: true, type: true, date: true },
  });

  const byMonth: Record<string, { income: number; expenses: number }> = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0 };
    if (t.type === "INCOME") byMonth[key].income += t.amount;
    else byMonth[key].expenses += t.amount;
  }

  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const baseMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${baseMonth.getFullYear()}-${String(baseMonth.getMonth() + 1).padStart(2, "0")}`;
    const { income, expenses } = byMonth[key] ?? { income: 0, expenses: 0 };
    result.push({
      month: baseMonth.toLocaleString("default", { month: "short" }),
      year: baseMonth.getFullYear(),
      income,
      expenses,
    });
  }

  return result;
}
