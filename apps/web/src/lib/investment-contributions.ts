import type { Prisma } from "@/generated/prisma/client";
import { ensureCategory } from "@/lib/default-categories";

// Books the ledger side of "money going into an investment" - a normal
// Transaction (EXPENSE, "Investments" category), same pattern loans.ts uses
// for loan principal/repayment. Callers still create the InvestmentContribution
// themselves (data.transactionId: result of this) and handle
// Investment.investedAmount however they already do (some set it directly at
// creation, some increment) - this only owns the transaction/category side.
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

// Deletes a contribution, its linked Transaction (if it booked one), and
// decrements the SIP's cached total - the one place that needs to happen
// together. Caller has already verified ownership of the contribution.
export async function deleteContribution(
  tx: Prisma.TransactionClient,
  contribution: { id: string; investmentId: string; amount: number; transactionId: string | null },
): Promise<void> {
  await tx.investmentContribution.delete({ where: { id: contribution.id } });
  if (contribution.transactionId) {
    await tx.transaction.delete({ where: { id: contribution.transactionId } });
  }
  await tx.investment.update({
    where: { id: contribution.investmentId },
    data: { investedAmount: { decrement: contribution.amount } },
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
