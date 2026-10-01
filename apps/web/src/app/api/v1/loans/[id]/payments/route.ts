import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { isLoanClosed, loanStatusFor } from "@/lib/loans/balance";
import { getCurrentPeriod } from "@/lib/month";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { debitPot } from "@/lib/pot-helpers";
import { validateFundingSources } from "@/lib/expenses/funding";
import { ensureCategory } from "@/lib/default-categories";

const createPaymentSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
  // Optional funding source (RECEIVED loans only - repaying is an expense). When
  // omitted, funded from income (existing behavior).
  fundingSource: z.enum(["INCOME", "SAVINGS_POT"]).optional(),
  fundingPotId: z.string().optional(),
  // When true, no repayment Transaction is booked - no entry in Expenses/Income,
  // no funding-source/pot handling. Defaults to false (book it).
  skipTransaction: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id: loanId } = await params;

  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId: auth.id } });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    if (isLoanClosed(loan.status)) return NextResponse.json({ error: "This loan is already closed" }, { status: 422 });

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { amountPaisas, date, notes, budgetMonth, budgetYear, fundingPotId, skipTransaction } = parsed.data;
    if (amountPaisas > loan.remainingAmount) {
      return NextResponse.json({ error: "Payment exceeds remaining balance" }, { status: 422 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const period = (budgetMonth && budgetYear)
      ? { month: budgetMonth, year: budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    // RECEIVED loan (I borrowed): paying it back is an EXPENSE, may be funded from
    // income or a savings pot. GIVEN loan (I lent): getting repaid is plain INCOME.
    const isExpense = loan.type === "RECEIVED";
    const fundingSource = isExpense ? (parsed.data.fundingSource ?? "INCOME") : "INCOME";

    const base = await getBaseCurrency();
    const fundingCurrencyId = isExpense && fundingSource === "SAVINGS_POT" ? base.id : undefined;

    if (!skipTransaction && isExpense) {
      const fundingErr = await validateFundingSources(
        auth.id,
        [{ source: fundingSource, potId: fundingPotId, currencyId: fundingCurrencyId, pkrAmount: amountPaisas }],
        period.month,
        period.year,
      );
      if (fundingErr) return NextResponse.json({ error: fundingErr }, { status: 422 });
    }

    const newRemaining = loan.remainingAmount - amountPaisas;
    const hasWriteOff = (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0;
    const newStatus = loanStatusFor(newRemaining, loan.principalAmount, hasWriteOff);

    const payment = await prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loanId },
        data: { remainingAmount: newRemaining, status: newStatus },
      });

      let createdTransactionId: string | null = null;
      if (!skipTransaction) {
        const categoryId = await ensureCategory(tx, auth.id, "Loan Repayment");
        const transaction = await tx.transaction.create({
          data: {
            amount: amountPaisas,
            type: isExpense ? "EXPENSE" : "INCOME",
            categoryId,
            description: `Loan repayment - ${loan.personName}`,
            notes: notes ?? null,
            date: new Date(date),
            budgetMonth: period.month,
            budgetYear: period.year,
            fundingSource,
            fundingPotId: isExpense && fundingSource === "SAVINGS_POT" ? fundingPotId : null,
            fundingCurrencyId: isExpense && fundingSource === "SAVINGS_POT" ? fundingCurrencyId : null,
            fundingAmount: isExpense && fundingSource === "SAVINGS_POT" ? amountPaisas : null,
            tags: "loan",
            userId: auth.id,
          },
        });
        createdTransactionId = transaction.id;
        if (isExpense && fundingSource === "SAVINGS_POT" && fundingPotId && fundingCurrencyId) {
          await debitPot(tx, fundingPotId, amountPaisas, fundingCurrencyId, `Expense: Loan repayment - ${loan.personName}`, "MANUAL", { budgetMonth: period.month, budgetYear: period.year });
        }
      }

      const payment = await tx.loanPayment.create({
        data: { loanId, amount: amountPaisas, date: new Date(date), notes: notes ?? null, transactionId: createdTransactionId },
        select: { id: true },
      });

      return payment;
    });

    return NextResponse.json({ data: { id: payment.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
