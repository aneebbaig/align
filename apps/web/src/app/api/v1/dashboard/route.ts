import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { month, year } = getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const [transactions, budget, recentRaw] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: auth.id, budgetMonth: month, budgetYear: year },
        select: { amount: true, type: true },
      }),
      prisma.budget.findUnique({
        where: { month_year: { month, year } },
        select: { totalBudget: true },
      }),
      prisma.transaction.findMany({
        where: { userId: auth.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 8,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          date: true,
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
      }),
    ]);

    const totalIncomePaisas = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpensesPaisas = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);

    const monthLabel = new Date(year, month - 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    return NextResponse.json({
      data: {
        period: { month, year, label: monthLabel },
        summary: {
          totalIncomePaisas,
          totalExpensesPaisas,
          netSavingsPaisas: totalIncomePaisas - totalExpensesPaisas,
        },
        budget: budget
          ? {
              totalBudgetPaisas: budget.totalBudget,
              totalSpentPaisas: totalExpensesPaisas,
              remainingPaisas: budget.totalBudget - totalExpensesPaisas,
            }
          : null,
        recentTransactions: recentRaw.map((t) => ({
          id: t.id,
          amountPaisas: t.amount,
          type: t.type,
          description: t.description,
          date: t.date.toISOString(),
          category: t.category,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
