"use server";

import { revalidatePath } from "next/cache";
import { getUserId, getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCurrentPeriod, getCalendarMonthRange } from "@/lib/month";
import { toPaisas } from "@/lib/utils";
import { deleteInvestmentCategoryCore } from "@/lib/investments/delete-category";
import { computeInvestmentSuggestion, loansDueThisMonth } from "@/lib/investments/suggestion";
import { CLOSED_LOAN_STATUSES } from "@/lib/loans/balance";
import { bookContributionTransaction, deleteContribution, deleteContributionTransactionsFor, recordInvestmentMovement, ensureCategoryInvestment, InvestmentMovementError } from "@/lib/investment-contributions";
import type { ContributionType } from "@/lib/investment-math";
import { getAverageMonthlyExpenses } from "@/actions/savings";
import { ActionResult } from "@/types";
// contribution history so the UI can show accumulation over time per SIP.
export async function getInvestments() {
  const userId = await getUserId();
  return prisma.investment.findMany({
    where: { userId },
    include: { contributions: { orderBy: { date: "desc" } } },
    orderBy: { purchaseDate: "desc" },
  });
}

// Creates a SIP and logs its first contribution in one transaction - a SIP
// can't exist with a zero/undefined invested amount, so the two are inseparable.
export async function createInvestment(data: {
  name: string;
  type: string;
  platform: string;
  investedAmount: number; // first contribution, in rupees
  currentValue?: number; // defaults to investedAmount if omitted
  units?: number;
  purchaseDate: string; // date of the first contribution
  notes?: string;
  customFields?: string;
  planCategoryId?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const userId = user.id;
    const period = getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    const firstAmount = toPaisas(data.investedAmount);
    const purchaseDate = new Date(data.purchaseDate);
    await prisma.$transaction(async (tx) => {
      const investment = await tx.investment.create({
        data: {
          name: data.name,
          type: data.type,
          platform: data.platform,
          investedAmount: firstAmount,
          currentValue: data.currentValue != null ? toPaisas(data.currentValue) : firstAmount,
          units: data.units,
          purchaseDate,
          notes: data.notes,
          customFields: data.customFields,
          planCategoryId: data.planCategoryId ?? null,
          userId,
        },
      });
      const transactionId = await bookContributionTransaction(tx, {
        userId, investmentName: data.name, amount: firstAmount, date: purchaseDate, notes: "Initial contribution", period,
      });
      await tx.investmentContribution.create({
        data: {
          investmentId: investment.id,
          amount: firstAmount,
          date: purchaseDate,
          notes: "Initial contribution",
          transactionId,
        },
      });
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[createInvestment]", e);
    return { success: false, error: "Failed to add investment" };
  }
}

interface MoveInput {
  amount: number; // rupees
  date: string;
  notes?: string;
  // When true, no Expenses/Income entry is booked - the investment's numbers still change.
  skipTransaction?: boolean;
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth?: number;
  budgetYear?: number;
}

function revalidateInvestmentPaths() {
  revalidatePath("/savings");
  revalidatePath("/investments");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// Shared by add-money, withdraw and add-money-to-category: resolves the period,
// then applies the movement through recordInvestmentMovement in one transaction.
async function moveInvestmentMoney(
  type: ContributionType,
  target: { investmentId: string } | { planCategoryId: string },
  data: MoveInput,
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser({ currentBudgetMonth: true, currentBudgetYear: true });
    const period = (data.budgetMonth && data.budgetYear)
      ? { month: data.budgetMonth, year: data.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth as number | null, user.currentBudgetYear as number | null);
    await prisma.$transaction(async (tx) => {
      const investmentId = "investmentId" in target
        ? target.investmentId
        : await ensureCategoryInvestment(tx, user.id, target.planCategoryId);
      if (!investmentId) throw new InvestmentMovementError("Plan category not found");
      await recordInvestmentMovement(tx, {
        userId: user.id,
        investmentId,
        type,
        amount: toPaisas(data.amount),
        date: new Date(data.date),
        notes: data.notes,
        period,
        book: !data.skipTransaction,
      });
    });
    revalidateInvestmentPaths();
    return { success: true };
  } catch (e) {
    if (e instanceof InvestmentMovementError) return { success: false, error: e.message };
    console.error(`[moveInvestmentMoney:${type}]`, e);
    return { success: false, error: type === "DEPOSIT" ? "Failed to add money" : "Failed to withdraw" };
  }
}

// Logs a top-up against an existing investment, any amount, any time.
export async function addInvestmentContribution(investmentId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("DEPOSIT", { investmentId }, data);
}

// Takes money out of an investment - lowers its current value.
export async function withdrawFromInvestment(investmentId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("WITHDRAWAL", { investmentId }, data);
}

export async function deleteInvestmentContribution(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.$transaction(async (tx) => {
      const contribution = await tx.investmentContribution.findFirst({
        where: { id, investment: { userId } },
        select: { id: true, investmentId: true, type: true, amount: true, transactionId: true },
      });
      if (!contribution) return;
      await deleteContribution(tx, contribution);
    });
    revalidateInvestmentPaths();
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestmentContribution]", e);
    return { success: false, error: "Failed to delete contribution" };
  }
}

// Mark-to-market update (current value, units, notes) - not a contribution.
export async function updateInvestment(id: string, data: {
  currentValue: number;
  units?: number;
  customFields?: string;
  notes?: string;
  planCategoryId?: string | null;
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.investment.updateMany({
      where: { id, userId },
      data: {
        currentValue: toPaisas(data.currentValue),
        units: data.units,
        customFields: data.customFields,
        notes: data.notes,
        planCategoryId: data.planCategoryId,
        lastUpdated: new Date(),
      },
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    return { success: true };
  } catch (e) {
    console.error("[updateInvestment]", e);
    return { success: false, error: "Failed to update investment" };
  }
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    await prisma.$transaction(async (tx) => {
      const owned = await tx.investment.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) return;
      // Investment -> InvestmentContribution cascades on delete, but not the
      // contributions' linked Transactions - clear those first.
      await deleteContributionTransactionsFor(tx, [id]);
      await tx.investment.delete({ where: { id } });
    });
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestment]", e);
    return { success: false, error: "Failed to delete investment" };
  }
}

export async function deleteInvestmentCategory(planCategoryId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const deleted = await deleteInvestmentCategoryCore(userId, planCategoryId);
    if (!deleted) return { success: false, error: "Investment not found" };
    revalidatePath("/savings");
    revalidatePath("/investments");
    revalidatePath("/expenses");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    console.error("[deleteInvestmentCategory]", e);
    return { success: false, error: "Failed to delete investment" };
  }
}


export interface InvestmentPlanCategoryInput {
  id?: string; // omit to create a new category row
  name: string;
  investmentType?: string | null; // maps to Investment.type for actual-vs-planned matching
  percentage: number; // 0-100
}

export async function getInvestmentPlan() {
  const userId = await getUserId();
  return prisma.investmentPlan.findUnique({
    where: { userId },
    include: { categories: { orderBy: { order: "asc" } } },
  });
}

export async function upsertInvestmentPlan(data: {
  monthlyTarget?: number;
  autoFromSurplus?: boolean;
  categories: InvestmentPlanCategoryInput[];
}): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    await prisma.$transaction(async (tx) => {
      const plan = await tx.investmentPlan.upsert({
        where: { userId },
        create: {
          userId,
          monthlyTarget: data.monthlyTarget != null ? toPaisas(data.monthlyTarget) : 0,
          autoFromSurplus: data.autoFromSurplus ?? true,
        },
        update: {
          ...(data.monthlyTarget != null && { monthlyTarget: toPaisas(data.monthlyTarget) }),
          ...(data.autoFromSurplus != null && { autoFromSurplus: data.autoFromSurplus }),
        },
      });

      // Diff against what's there today instead of delete-all-recreate:
      // categories are now the object users add money against (their id is
      // Investment.planCategoryId's target), so re-minting ids on every save
      // would silently unlink every SIP from its category (the FK is
      // onDelete: SetNull). Update existing rows by id, create rows with no
      // id, and delete+cascade rows no longer present.
      const existing = await tx.investmentPlanCategory.findMany({ where: { planId: plan.id }, select: { id: true } });
      const existingIds = new Set(existing.map((c) => c.id));
      const keepIds = new Set(data.categories.filter((c) => c.id).map((c) => c.id as string));
      const removedIds = [...existingIds].filter((id) => !keepIds.has(id));

      if (removedIds.length > 0) {
        // Cascades InvestmentContribution via the schema's onDelete: Cascade
        // off Investment; Investment.planCategoryId itself is SetNull so
        // this only removes investments actually linked to a removed category.
        await tx.investment.deleteMany({ where: { planCategoryId: { in: removedIds } } });
        await tx.investmentPlanCategory.deleteMany({ where: { id: { in: removedIds } } });
      }

      for (const [i, c] of data.categories.entries()) {
        if (c.id && existingIds.has(c.id)) {
          await tx.investmentPlanCategory.update({
            where: { id: c.id },
            data: { name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        } else {
          await tx.investmentPlanCategory.create({
            data: { planId: plan.id, name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        }
      }
    });

    revalidatePath("/investments");
    return { success: true };
  } catch (e) {
    console.error("[upsertInvestmentPlan]", e);
    return { success: false, error: "Failed to save investment plan" };
  }
}

// Adds money to a plan category directly - lazily creates the category's
// linked Investment on first use (name/type inherited from the category) so
// "add to plan, then add money" needs no separate SIP-creation form.
export async function addMoneyToCategory(planCategoryId: string, data: MoveInput): Promise<ActionResult> {
  return moveInvestmentMoney("DEPOSIT", { planCategoryId }, data);
}

export interface InvestmentCategorySuggestion {
  id: string;
  name: string;
  investmentType: string | null;
  percentage: number;
  plannedAmount: number; // this cycle's suggested contribution for this category
  actualAmount: number; // sum of Investment.investedAmount of matching type, purchased this period
}

export interface InvestmentSuggestion {
  hasPlan: boolean;
  monthlyIncome: number; // this period's actual income
  obligationsDue: number; // what's left on borrowed loans due this budget month
  bufferTarget: number; // emergencyFundMonths x average monthly expenses
  bufferCurrent: number; // current EMERGENCY-pot balance, base currency
  bufferUnmet: number; // max(0, bufferTarget - bufferCurrent)
  suggestedTotal: number; // max(0, income - obligationsDue - bufferUnmet)
  categories: InvestmentCategorySuggestion[];
}

/**
 * Suggested investment = income − borrowed loans due this month − any unmet
 * emergency-fund buffer, then split by category. Read-only - it never moves
 * money or creates rows.
 */
export async function getInvestmentSuggestion(): Promise<InvestmentSuggestion> {
  const user = await getAuthenticatedUser({
    currentBudgetMonth: true,
    currentBudgetYear: true,
    emergencyFundMonths: true,
  });
  const userId = user.id;
  const { month, year } = getCurrentPeriod(
    user.currentBudgetMonth as number | null,
    user.currentBudgetYear as number | null,
  );

  const [plan, monthIncomeTx, openBorrowedLoans, avgMonthlyExpenses, emergencyPots] = await Promise.all([
    prisma.investmentPlan.findUnique({
      where: { userId },
      include: { categories: { orderBy: { order: "asc" } } },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", budgetMonth: month, budgetYear: year },
      _sum: { amount: true },
    }),
    prisma.loan.findMany({
      where: { userId, type: "RECEIVED", status: { notIn: CLOSED_LOAN_STATUSES }, dueDate: { not: null } },
      select: { type: true, status: true, remainingAmount: true, dueDate: true },
    }),
    getAverageMonthlyExpenses(),
    prisma.savingsPot.findMany({
      where: { userId, type: "EMERGENCY" },
      include: { balances: { include: { currency: true } } },
    }),
  ]);

  const monthlyIncome = monthIncomeTx._sum.amount ?? 0;
  const obligationsDue = loansDueThisMonth(openBorrowedLoans, month, year);
  const bufferTarget = Math.round(avgMonthlyExpenses * (user.emergencyFundMonths as number));
  const bufferCurrent = emergencyPots.reduce(
    (sum, pot) => sum + pot.balances.reduce((s, b) => s + Math.round(b.amount * b.currency.rateToBase), 0),
    0,
  );

  if (!plan || plan.categories.length === 0) {
    const { bufferUnmet, suggestedTotal } = computeInvestmentSuggestion({
      monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, categories: [],
    });
    return { hasPlan: false, monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, bufferUnmet, suggestedTotal, categories: [] };
  }

  const { start, end } = getCalendarMonthRange(month, year);
  const categoryIds = plan.categories.map((c) => c.id);
  // Matched by explicit SIP -> plan category link (Investment.planCategoryId),
  // not by investmentType - multiple categories can share a type (e.g. two
  // "STOCKS" buckets for an index ETF vs. hand-picked names) and only the
  // explicit link tells them apart.
  const periodContributions = categoryIds.length > 0
    ? await prisma.investmentContribution.findMany({
        where: { type: "DEPOSIT", date: { gte: start, lte: end }, investment: { userId, planCategoryId: { in: categoryIds } } },
        select: { amount: true, investment: { select: { planCategoryId: true } } },
      })
    : [];

  const { bufferUnmet, suggestedTotal, categories } = computeInvestmentSuggestion({
    monthlyIncome,
    obligationsDue,
    bufferTarget,
    bufferCurrent,
    categories: plan.categories.map((c) => ({
      id: c.id,
      name: c.name,
      investmentType: c.investmentType,
      percentage: c.percentage,
      actualAmount: periodContributions
        .filter((ct) => ct.investment.planCategoryId === c.id)
        .reduce((s, ct) => s + ct.amount, 0),
    })),
  });

  return { hasPlan: true, monthlyIncome, obligationsDue, bufferTarget, bufferCurrent, bufferUnmet, suggestedTotal, categories };
}
