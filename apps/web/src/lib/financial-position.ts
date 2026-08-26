import { prisma } from "@/lib/prisma";
import { getPotBalancesInBase } from "@/lib/currency-helpers";

export interface FinancialPosition {
  accumulatedSavings: number;
  savingsPotsTotal: number;
  investmentsTotal: number;
  loansOwed: number;
  loansReceivable: number;
  liquidAvailable: number;
  netWorth: number;
}

// Shared by the web server action and the v1 (mobile) API so both compute the
// user's financial position the same way.
export async function computeFinancialPosition(userId: string): Promise<FinancialPosition> {
  const [transactions, savingsPotsTotal, investments, loans] = await Promise.all([
    prisma.transaction.findMany({ where: { userId }, select: { amount: true, type: true } }),
    getPotBalancesInBase(userId),
    prisma.investment.findMany({ where: { userId }, select: { currentValue: true } }),
    prisma.loan.findMany({ where: { userId, status: { not: "PAID" } }, select: { remainingAmount: true, type: true } }),
  ]);

  const totalIncome = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  // Pot deposits never create a Transaction row, so income − expenses already
  // includes whatever's sitting in pots.
  const accumulatedSavings = totalIncome - totalExpenses;
  const investmentsTotal = investments.reduce((s, i) => s + i.currentValue, 0);
  const loansOwed = loans.filter((l) => l.type === "RECEIVED").reduce((s, l) => s + l.remainingAmount, 0);
  const loansReceivable = loans.filter((l) => l.type === "GIVEN").reduce((s, l) => s + l.remainingAmount, 0);

  return {
    accumulatedSavings,
    savingsPotsTotal,
    investmentsTotal,
    loansOwed,
    loansReceivable,
    liquidAvailable: accumulatedSavings - savingsPotsTotal,
    netWorth: accumulatedSavings + investmentsTotal - loansOwed + loansReceivable,
  };
}
