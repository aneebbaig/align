import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { toLocalDate } from "@/lib/utils";
import { creditPot, debitPot } from "@/lib/pot-helpers";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { validateFundingSources } from "@/lib/expenses/funding";

// Shared by the "use server" web action (`actions/loans.ts`) and the v1
// bearer-auth API routes (mobile) - kept out of actions/loans.ts since that
// file is "use server" and can't be imported from a plain API route handler.

/** Reverses a single-source or split funding of a transaction back into
 * whichever pot(s) it drew from - shared by update (undo old funding before
 * applying new) and delete (undo funding entirely). */
export async function reverseTransactionFunding(
  tx: Prisma.TransactionClient,
  transaction: { id: string; fundingSource: string; fundingPotId: string | null; fundingAmount: number | null; fundingCurrencyId: string | null; description: string },
  period: { budgetMonth: number; budgetYear: number },
) {
  if (transaction.fundingSource === "SAVINGS_POT" && transaction.fundingPotId && transaction.fundingAmount && transaction.fundingCurrencyId) {
    await creditPot(tx, transaction.fundingPotId, transaction.fundingAmount, transaction.fundingCurrencyId, `Reversal: ${transaction.description}`, "MANUAL", period);
  } else if (transaction.fundingSource === "SPLIT") {
    const sources = await tx.transactionFundingSource.findMany({ where: { transactionId: transaction.id } });
    for (const src of sources) {
      if (src.source === "SAVINGS_POT" && src.potId && src.currencyId && src.potAmount) {
        await creditPot(tx, src.potId, src.potAmount, src.currencyId, `Reversal: ${transaction.description}`, "MANUAL", period);
      }
    }
    await tx.transactionFundingSource.deleteMany({ where: { transactionId: transaction.id } });
  }
}

export function loanStatusFor(remainingAmount: number, principalAmount: number): string {
  if (remainingAmount <= 0) return "PAID";
  if (remainingAmount >= principalAmount) return "ACTIVE";
  return "PARTIALLY_PAID";
}

export interface UpdateLoanPaymentInput {
  amountPaisas: number;
  date: string;
  notes?: string;
  fundingSource?: string;
  fundingPotId?: string;
  budgetMonth?: number;
  budgetYear?: number;
}

export async function updateLoanPaymentCore(userId: string, paymentId: string, data: UpdateLoanPaymentInput): Promise<{ error: string } | { error?: undefined }> {
  const base = await getBaseCurrency();

  const payment = await prisma.loanPayment.findFirst({
    where: { id: paymentId, loan: { userId } },
    include: { loan: true, transaction: { include: { fundingSources: true } } },
  });
  if (!payment) return { error: "Payment not found" };
  if (!payment.transaction) {
    return { error: "This payment has no linked transaction to edit - delete and re-add it instead." };
  }

  const { loan, transaction } = payment;
  const newAmount = data.amountPaisas;
  const remainingExcludingThis = loan.remainingAmount + payment.amount;
  if (newAmount > remainingExcludingThis) {
    return { error: "Payment exceeds remaining balance" };
  }
  const newRemaining = remainingExcludingThis - newAmount;

  const period = (data.budgetMonth && data.budgetYear)
    ? { budgetMonth: data.budgetMonth, budgetYear: data.budgetYear }
    : { budgetMonth: transaction.budgetMonth, budgetYear: transaction.budgetYear };

  const isExpense = loan.type === "RECEIVED";
  const fundingSource = isExpense ? (data.fundingSource ?? "INCOME") : "INCOME";
  const fundingPotId = isExpense && fundingSource === "SAVINGS_POT" ? (data.fundingPotId ?? null) : null;

  if (isExpense) {
    const err = await validateFundingSources(
      userId,
      [{ source: fundingSource as "INCOME" | "SAVINGS_POT", potId: fundingPotId ?? undefined, currencyId: fundingPotId ? base.id : undefined, pkrAmount: newAmount }],
      period.budgetMonth,
      period.budgetYear,
      transaction.id,
    );
    if (err) return { error: err };
  }

  await prisma.$transaction(async (tx) => {
    await reverseTransactionFunding(tx, transaction, { budgetMonth: transaction.budgetMonth, budgetYear: transaction.budgetYear });

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        amount: newAmount,
        date: toLocalDate(data.date),
        notes: data.notes ?? null,
        budgetMonth: period.budgetMonth,
        budgetYear: period.budgetYear,
        fundingSource,
        fundingPotId,
        fundingCurrencyId: fundingPotId ? base.id : null,
        fundingAmount: fundingPotId ? newAmount : null,
      },
    });

    if (fundingPotId) {
      await debitPot(tx, fundingPotId, newAmount, base.id, `Expense: Loan repayment - ${loan.personName}`, "MANUAL", period);
    }

    await tx.loanPayment.update({
      where: { id: paymentId },
      data: { amount: newAmount, date: toLocalDate(data.date), notes: data.notes },
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: { remainingAmount: newRemaining, status: loanStatusFor(newRemaining, loan.principalAmount) },
    });
  });

  return {};
}

export async function deleteLoanPaymentCore(userId: string, paymentId: string): Promise<{ error: string } | { error?: undefined }> {
  const payment = await prisma.loanPayment.findFirst({
    where: { id: paymentId, loan: { userId } },
    include: { loan: true, transaction: true },
  });
  if (!payment) return { error: "Payment not found" };

  const { loan, transaction } = payment;
  const newRemaining = Math.min(loan.principalAmount, loan.remainingAmount + payment.amount);

  await prisma.$transaction(async (tx) => {
    if (transaction) {
      await reverseTransactionFunding(tx, transaction, { budgetMonth: transaction.budgetMonth, budgetYear: transaction.budgetYear });
    }
    await tx.loanPayment.delete({ where: { id: paymentId } });
    if (transaction) {
      await tx.transaction.delete({ where: { id: transaction.id } });
    }
    await tx.loan.update({
      where: { id: loan.id },
      data: { remainingAmount: newRemaining, status: loanStatusFor(newRemaining, loan.principalAmount) },
    });
  });

  return {};
}
