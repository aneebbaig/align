import type { Prisma } from "@/generated/prisma/client";
import { ensureCategory } from "@/lib/default-categories";
import { applyMovement, reverseMovement, type ContributionType } from "@/lib/investment-math";

// Books the ledger side of "money going into an investment" - a normal
// Transaction (EXPENSE, "Investments" category), same pattern loans.ts uses
// for loan principal/repayment. recordInvestmentMovement is the normal caller;
// createInvestment still books its first contribution directly.
export async function bookContributionTransaction(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    investmentName: string;
    amount: number; // paisas
    date: Date;
    notes?: string | null;
    period: { month: number; year: number };
  },
): Promise<string> {
  const { userId, investmentName, amount, date, notes, period } = params;
  const categoryId = await ensureCategory(tx, userId, "Investments");

  const transaction = await tx.transaction.create({
    data: {
      amount,
      type: "EXPENSE",
      categoryId,
      description: `Investment - ${investmentName}`,
      notes: notes ?? null,
      date,
      budgetMonth: period.month,
      budgetYear: period.year,
      fundingSource: "INCOME",
      tags: "investment",
      userId,
    },
  });
  return transaction.id;
}

// Deletes a deposit or withdrawal, its linked Transaction (if it booked one),
// and applies the exact inverse to the investment's cached totals. Caller has
// already verified ownership of the contribution.
export async function deleteContribution(
  tx: Prisma.TransactionClient,
  contribution: { id: string; investmentId: string; type: string; amount: number; transactionId: string | null },
): Promise<void> {
  const inv = await tx.investment.findUniqueOrThrow({
    where: { id: contribution.investmentId },
    select: { investedAmount: true, currentValue: true },
  });
  const next = reverseMovement(inv, { type: contribution.type as ContributionType, amount: contribution.amount });
  await tx.investmentContribution.delete({ where: { id: contribution.id } });
  if (contribution.transactionId) {
    await tx.transaction.delete({ where: { id: contribution.transactionId } });
  }
  await tx.investment.update({
    where: { id: contribution.investmentId },
    data: { investedAmount: next.investedAmount, currentValue: next.currentValue },
  });
}

// Deletes every contribution's linked Transaction for a set of investments,
// without touching the InvestmentContribution/Investment rows themselves -
// used right before/alongside deleting the investments, whose cascade
// already handles those rows (Investment -> InvestmentContribution is
// onDelete: Cascade) but never their linked Transaction.
export async function deleteContributionTransactionsFor(
  tx: Prisma.TransactionClient,
  investmentIds: string[],
): Promise<void> {
  if (investmentIds.length === 0) return;
  const contributions = await tx.investmentContribution.findMany({
    where: { investmentId: { in: investmentIds }, transactionId: { not: null } },
    select: { transactionId: true },
  });
  if (contributions.length === 0) return;
  await tx.transaction.deleteMany({
    where: { id: { in: contributions.map((c) => c.transactionId as string) } },
  });
}

export class InvestmentMovementError extends Error {}

// Ledger side of "money coming out of an investment" - an INCOME entry in the
// default "Investment Returns" category, mirroring bookContributionTransaction.
export async function bookWithdrawalTransaction(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    investmentName: string;
    amount: number; // paisas
    date: Date;
    notes?: string | null;
    period: { month: number; year: number };
  },
): Promise<string> {
  const { userId, investmentName, amount, date, notes, period } = params;
  const categoryId = await ensureCategory(tx, userId, "Investment Returns");
  const transaction = await tx.transaction.create({
    data: {
      amount,
      type: "INCOME",
      categoryId,
      description: `Withdrawal - ${investmentName}`,
      notes: notes ?? null,
      date,
      budgetMonth: period.month,
      budgetYear: period.year,
      fundingSource: "INCOME",
      tags: "investment",
      userId,
    },
  });
  return transaction.id;
}

// A plan category's linked Investment, created empty (0 invested, 0 value) the
// first time money goes in - the deposit that follows sets both.
export async function ensureCategoryInvestment(
  tx: Prisma.TransactionClient,
  userId: string,
  planCategoryId: string,
): Promise<string | null> {
  const category = await tx.investmentPlanCategory.findFirst({
    where: { id: planCategoryId, plan: { userId } },
    select: { id: true, name: true, investmentType: true },
  });
  if (!category) return null;
  const existing = await tx.investment.findFirst({
    where: { planCategoryId: category.id, userId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.investment.create({
    data: {
      name: category.name,
      type: category.investmentType ?? "OTHER",
      platform: "",
      investedAmount: 0,
      currentValue: 0,
      purchaseDate: new Date(),
      planCategoryId: category.id,
      userId,
    },
    select: { id: true },
  });
  return created.id;
}

// The one place a deposit or withdrawal is applied: checks the rule, books the
// optional ledger entry, logs the contribution, and updates the cached totals
// - all inside the caller's transaction.
export async function recordInvestmentMovement(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    investmentId: string;
    type: ContributionType;
    amount: number; // paisas
    date: Date;
    notes?: string | null;
    period: { month: number; year: number };
    book: boolean;
  },
): Promise<string> {
  const inv = await tx.investment.findFirst({
    where: { id: params.investmentId, userId: params.userId },
    select: { id: true, name: true, investedAmount: true, currentValue: true },
  });
  if (!inv) throw new InvestmentMovementError("Investment not found");

  const next = applyMovement(inv, { type: params.type, amount: params.amount });
  if ("error" in next) throw new InvestmentMovementError(next.error);

  let transactionId: string | null = null;
  if (params.book) {
    const book = params.type === "DEPOSIT" ? bookContributionTransaction : bookWithdrawalTransaction;
    transactionId = await book(tx, {
      userId: params.userId,
      investmentName: inv.name,
      amount: params.amount,
      date: params.date,
      notes: params.notes,
      period: params.period,
    });
  }

  const contribution = await tx.investmentContribution.create({
    data: {
      investmentId: inv.id,
      type: params.type,
      amount: params.amount,
      date: params.date,
      notes: params.notes ?? null,
      transactionId,
    },
    select: { id: true },
  });
  await tx.investment.update({
    where: { id: inv.id },
    data: { investedAmount: next.investedAmount, currentValue: next.currentValue, lastUpdated: new Date() },
  });
  return contribution.id;
}
