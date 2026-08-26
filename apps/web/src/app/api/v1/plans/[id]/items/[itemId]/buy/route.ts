import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";

// Buy & log: mark a plan item bought and book a real expense for it (item's
// actual cost, or its estimate if none). Mirrors the web one-tap flow.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, itemId } = await params;

  try {
    const item = await prisma.planItem.findFirst({
      where: { id: itemId, planId: id, plan: { userId: auth.id } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const amount = item.actualCost ?? item.estimatedCost;
    if (!amount || amount <= 0) return NextResponse.json({ error: "Set a cost for this item first" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    const { month, year } = getCurrentPeriod(user?.currentBudgetMonth, user?.currentBudgetYear);

    const category = await prisma.category.findFirst({ where: { userId: auth.id, name: "Plan Purchase", type: "EXPENSE" } })
      ?? await prisma.category.create({ data: { userId: auth.id, name: "Plan Purchase", type: "EXPENSE", color: "#8b5cf6", icon: "🎯" } });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          amount,
          type: "EXPENSE",
          categoryId: category.id,
          description: item.name,
          date: new Date(),
          budgetMonth: month,
          budgetYear: year,
          fundingSource: "INCOME",
          userId: auth.id,
        },
      });
      await tx.planItem.update({ where: { id: itemId }, data: { status: "PAID", actualCost: amount } });
    });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
