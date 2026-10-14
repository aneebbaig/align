import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { z } from "zod";

// Mark a plan item bought. By default (`log` omitted or true) this also books a
// real expense for it (actual cost, or the estimate if none) - "Buy & log".
// With `{ "log": false }` it only marks the item bought, no expense.
const bodySchema = z.object({ log: z.boolean().default(true) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, itemId } = await params;

  try {
    const { log } = bodySchema.parse(await req.json().catch(() => ({})));
    const item = await prisma.planItem.findFirst({
      where: { id: itemId, planId: id, plan: { userId: auth.id } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const amount = item.actualCost ?? item.estimatedCost;
    if (!log) {
      await prisma.planItem.update({ where: { id: itemId }, data: { status: "PAID", actualCost: amount } });
      return NextResponse.json({ data: { ok: true } });
    }
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
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
