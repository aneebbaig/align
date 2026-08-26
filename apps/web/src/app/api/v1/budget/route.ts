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

    const [budget, expenseTxns] = await Promise.all([
      prisma.budget.findUnique({
        where: { month_year: { month, year } },
        include: {
          budgetCategories: {
            include: { category: { select: { id: true, name: true, icon: true, color: true } } },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { userId: auth.id, type: "EXPENSE", budgetMonth: month, budgetYear: year },
        select: { categoryId: true, amount: true },
      }),
    ]);

    const spendingByCategory: Record<string, number> = {};
    for (const t of expenseTxns) {
      spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] ?? 0) + t.amount;
    }

    const totalSpentPaisas = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const monthLabel = new Date(year, month - 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    return NextResponse.json({
      data: {
        period: { month, year, label: monthLabel },
        totalBudgetPaisas: budget?.totalBudget ?? null,
        totalSpentPaisas,
        remainingPaisas: budget ? budget.totalBudget - totalSpentPaisas : null,
        categories: (budget?.budgetCategories ?? []).map((bc) => {
          const spent = spendingByCategory[bc.categoryId] ?? 0;
          return {
            id: bc.id,
            categoryId: bc.categoryId,
            category: bc.category,
            allocatedPaisas: bc.allocatedAmount,
            spentPaisas: spent,
            remainingPaisas: bc.allocatedAmount - spent,
            pct: bc.allocatedAmount > 0
              ? Math.round((spent / bc.allocatedAmount) * 100)
              : 0,
          };
        }),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
