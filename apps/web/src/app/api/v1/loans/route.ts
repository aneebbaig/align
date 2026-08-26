import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { ensureCategory } from "@/lib/default-categories";

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const loans = await prisma.loan.findMany({
      where: { userId: auth.id },
      select: {
        id: true,
        personName: true,
        description: true,
        type: true,
        principalAmount: true,
        remainingAmount: true,
        date: true,
        dueDate: true,
        status: true,
        notes: true,
        payments: {
          select: { id: true, amount: true, date: true, notes: true, transactionId: true },
          orderBy: { date: "desc" },
          take: 5,
        },
        schedules: {
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      data: loans.map((l) => ({
        ...l,
        date: l.date.toISOString(),
        dueDate: l.dueDate?.toISOString() ?? null,
        payments: l.payments.map((p) => ({
          ...p,
          date: p.date.toISOString(),
        })),
        schedules: l.schedules.map((s) => ({
          id: s.id,
          loanId: s.loanId,
          kind: s.kind,
          amountPaisas: s.amount,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate?.toISOString() ?? null,
          flexibility: s.flexibility,
          priority: s.priority,
          slideWindowMonths: s.slideWindowMonths,
          interestRate: s.interestRate,
          fulfilledPaymentId: s.fulfilledPaymentId,
        })),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/loans ────────────────────────────────────────────────────────

const createLoanSchema = z.object({
  personName: z.string().min(1).max(100),
  type: z.enum(["GIVEN", "RECEIVED"]),
  principalPaisas: z.number().int().positive(),
  description: z.string().max(200).optional(),
  date: z.string().min(1),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
  // When true, no principal Transaction is booked - loan tracking only, no
  // entry in Expenses/Income. Defaults to false (book it).
  skipTransaction: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = createLoanSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { personName, type, principalPaisas, description, date, dueDate, notes, budgetMonth, budgetYear, skipTransaction } = parsed.data;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    const period = (budgetMonth && budgetYear)
      ? { month: budgetMonth, year: budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);
    const isGiven = type === "GIVEN";

    const loanDate = new Date(date);
    const created = await prisma.$transaction(async (tx) => {
      let transactionId: string | null = null;
      if (!skipTransaction) {
        const categoryId = await ensureCategory(tx, auth.id, "Loan");
        const transaction = await tx.transaction.create({
          data: {
            amount: principalPaisas,
            type: isGiven ? "EXPENSE" : "INCOME",
            categoryId,
            description: isGiven ? `Loan to ${personName}` : `Loan from ${personName}`,
            notes: notes ?? null,
            date: loanDate,
            budgetMonth: period.month,
            budgetYear: period.year,
            fundingSource: "INCOME",
            tags: "loan",
            userId: auth.id,
          },
        });
        transactionId = transaction.id;
      }
      return tx.loan.create({
        data: {
          personName,
          type,
          principalAmount: principalPaisas,
          remainingAmount: principalPaisas,
          description: description ?? null,
          date: loanDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes ?? null,
          transactionId,
          userId: auth.id,
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
