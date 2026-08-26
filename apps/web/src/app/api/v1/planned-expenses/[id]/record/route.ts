import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { debitPot } from "@/lib/pot-helpers";
import { validateFundingSources } from "@/lib/expenses/funding";

// ── POST /api/v1/planned-expenses/[id]/record ─────────────────────────────────
// Books a real EXPENSE transaction for a planned-expense row ("Mark paid"),
// linking it back so the row shows as actually paid instead of just a status
// flip - mirrors the web app's `createTransaction({ linkPlannedExpenseId })`.

const recordSchema = z.object({
  amountPaisas: z.number().int().positive(),
  categoryId: z.string().min(1),
  description: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().min(1),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
  fundingSource: z.enum(["INCOME", "SAVINGS_POT"]).optional(),
  fundingPotId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const plan = await prisma.plannedExpense.findFirst({ where: { id, userId: auth.id } });
    if (!plan) return NextResponse.json({ error: "Planned expense not found" }, { status: 404 });
    if (plan.transactionId) return NextResponse.json({ error: "Already recorded" }, { status: 422 });

    const body = await req.json();
    const parsed = recordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { amountPaisas, categoryId, notes, date, budgetMonth, budgetYear, fundingPotId } = parsed.data;
    const description = parsed.data.description || plan.name;
    const fundingSource = parsed.data.fundingSource ?? "INCOME";

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const period = (budgetMonth && budgetYear)
      ? { month: budgetMonth, year: budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const base = await getBaseCurrency();
    const fundingCurrencyId = fundingSource === "SAVINGS_POT" ? base.id : undefined;

    const fundingErr = await validateFundingSources(
      auth.id,
      [{ source: fundingSource, potId: fundingPotId, currencyId: fundingCurrencyId, pkrAmount: amountPaisas }],
      period.month,
      period.year,
    );
    if (fundingErr) return NextResponse.json({ error: fundingErr }, { status: 422 });

    const created = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: amountPaisas,
          type: "EXPENSE",
          categoryId,
          description,
          notes: notes ?? null,
          date: new Date(date),
          budgetMonth: period.month,
          budgetYear: period.year,
          fundingSource,
          fundingPotId: fundingSource === "SAVINGS_POT" ? fundingPotId : null,
          fundingCurrencyId: fundingSource === "SAVINGS_POT" ? fundingCurrencyId : null,
          fundingAmount: fundingSource === "SAVINGS_POT" ? amountPaisas : null,
          tags: "",
          userId: auth.id,
        },
      });

      if (fundingSource === "SAVINGS_POT" && fundingPotId && fundingCurrencyId) {
        await debitPot(tx, fundingPotId, amountPaisas, fundingCurrencyId, `Expense: ${description}`, "MANUAL", { budgetMonth: period.month, budgetYear: period.year });
      }

      await tx.plannedExpense.update({ where: { id }, data: { status: "PAID", transactionId: transaction.id } });

      return transaction;
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
