import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedExpense, serverError } from "../../../../_shared";

// Settle in full: paid = the cost, and the cost becomes real (actual = estimate
// when no actual yet). Returns the previous values (paisas) so the client can
// undo with PATCH { actualAmount, paidAmount }.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId } = await params;
  try {
    const expense = await ownedExpense(expenseId, id, auth.id);
    if (!expense) return notFound();
    const cost = expense.actualAmount ?? expense.estimatedAmount;
    await prisma.weddingExpense.update({ where: { id: expenseId }, data: { actualAmount: cost, paidAmount: cost } });
    return NextResponse.json({
      data: {
        id: expenseId,
        previousActualAmount: expense.actualAmount,
        previousPaidAmount: expense.paidAmount,
      },
    });
  } catch {
    return serverError();
  }
}
