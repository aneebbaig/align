import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";

// ── POST /api/v1/recurring-income/[id]/record ─────────────────────────────────
// Books a real INCOME transaction for "this month" of a recurring income
// stream, and records the occurrence so the same period can't be double-booked -
// mirrors the web app's `createTransaction({ linkRecurringIncomeId })`.

const recordSchema = z.object({
  amountPaisas: z.number().int().positive(),
  categoryId: z.string().min(1),
  description: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().min(1),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const recurring = await prisma.recurringIncome.findFirst({ where: { id, userId: auth.id } });
    if (!recurring) return NextResponse.json({ error: "Recurring income not found" }, { status: 404 });

    const body = await req.json();
    const parsed = recordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { amountPaisas, categoryId, notes, date, budgetMonth, budgetYear } = parsed.data;
    const description = parsed.data.description || recurring.label;

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const period = (budgetMonth && budgetYear)
      ? { month: budgetMonth, year: budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const existing = await prisma.recurringIncomeOccurrence.findUnique({
      where: { recurringIncomeId_month_year: { recurringIncomeId: id, month: period.month, year: period.year } },
    });
    if (existing) return NextResponse.json({ error: "Already recorded for this period" }, { status: 422 });

    const created = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: amountPaisas,
          type: "INCOME",
          categoryId,
          description,
          notes: notes ?? null,
          date: new Date(date),
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource: "INCOME",
          tags: "",
          userId: auth.id,
        },
      });

      await tx.recurringIncomeOccurrence.create({
        data: { recurringIncomeId: id, month: period.month, year: period.year, transactionId: transaction.id },
      });

      return transaction;
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
