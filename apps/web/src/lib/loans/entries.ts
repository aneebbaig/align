import { prisma } from "@/lib/prisma";
import { toLocalDate } from "@/lib/utils";
import { ensureCategory } from "@/lib/default-categories";
import { applyLoanEntry, isLoanClosed, loanStatusFor, offersWriteOffExpense } from "@/lib/loans/balance";

// "Add to loan" and write-off, shared by the web actions and the v1 routes.

export interface LoanEntryInput {
  amountPaisas: number;
  date: string;
  notes?: string;
  // Optional budget-period override. When omitted, openPeriod is used.
  budgetMonth?: number;
  budgetYear?: number;
}

type Period = { month: number; year: number };

function resolvePeriod(data: LoanEntryInput, openPeriod: Period): Period {
  return data.budgetMonth && data.budgetYear ? { month: data.budgetMonth, year: data.budgetYear } : openPeriod;
}

// Lend or borrow more with the same person. Raises principal and remaining,
// reopens a closed loan, and books the same optional entry as creating a loan.
export async function addToLoanCore(
  userId: string,
  loanId: string,
  data: LoanEntryInput & { skipTransaction?: boolean },
  openPeriod: Period,
): Promise<{ error?: string }> {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
  if (!loan) return { error: "Loan not found" };

  const next = applyLoanEntry(loan, { kind: "TOP_UP", amount: data.amountPaisas });
  if ("error" in next) return next;

  const period = resolvePeriod(data, openPeriod);
  const date = toLocalDate(data.date);
  const isGiven = loan.type === "GIVEN";
  const hasWriteOff = (await prisma.loanPayment.count({ where: { loanId, kind: "WRITE_OFF" } })) > 0;

  await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;
    if (!data.skipTransaction) {
      const categoryId = await ensureCategory(tx, userId, "Loan");
      const created = await tx.transaction.create({
        data: {
          amount: data.amountPaisas,
          type: isGiven ? "EXPENSE" : "INCOME",
          categoryId,
          description: isGiven ? `Loan to ${loan.personName}` : `Loan from ${loan.personName}`,
          notes: data.notes ?? null,
          date,
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource: "INCOME",
          tags: "loan",
          userId,
        },
      });
      transactionId = created.id;
    }
    await tx.loanPayment.create({
      data: { loanId, kind: "TOP_UP", amount: data.amountPaisas, date, notes: data.notes ?? null, transactionId },
    });
    await tx.loan.update({
      where: { id: loanId },
      data: {
        principalAmount: next.principalAmount,
        remainingAmount: next.remainingAmount,
        status: loanStatusFor(next.remainingAmount, next.principalAmount, hasWriteOff),
      },
    });
  });
  return {};
}

// Forgive part or all of what's left. Books an expense only when
// offersWriteOffExpense says it's the first time the loss hits the budget.
export async function writeOffLoanCore(
  userId: string,
  loanId: string,
  data: LoanEntryInput & { bookExpense?: boolean },
  openPeriod: Period,
): Promise<{ error?: string }> {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, userId } });
  if (!loan) return { error: "Loan not found" };
  if (isLoanClosed(loan.status)) return { error: "This loan is already closed" };

  const next = applyLoanEntry(loan, { kind: "WRITE_OFF", amount: data.amountPaisas });
  if ("error" in next) return next;

  const period = resolvePeriod(data, openPeriod);
  const date = toLocalDate(data.date);
  const topUps = await prisma.loanPayment.findMany({ where: { loanId, kind: "TOP_UP" }, select: { kind: true, transactionId: true } });
  const book = !!data.bookExpense && offersWriteOffExpense(loan, topUps);

  await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;
    if (book) {
      const categoryId = await ensureCategory(tx, userId, "Loan");
      const created = await tx.transaction.create({
        data: {
          amount: data.amountPaisas,
          type: "EXPENSE",
          categoryId,
          description: `Written off: ${loan.personName}`,
          notes: data.notes ?? null,
          date,
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource: "INCOME",
          tags: "loan",
          userId,
        },
      });
      transactionId = created.id;
    }
    await tx.loanPayment.create({
      data: { loanId, kind: "WRITE_OFF", amount: data.amountPaisas, date, notes: data.notes ?? null, transactionId },
    });
    await tx.loan.update({
      where: { id: loanId },
      data: {
        remainingAmount: next.remainingAmount,
        status: loanStatusFor(next.remainingAmount, next.principalAmount, true),
      },
    });
  });
  return {};
}
