import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedExpense, serverError } from "../../../../../_shared";

// Un-choose: the expense keeps its estimate but is no longer tied to a vendor.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId } = await params;
  try {
    if (!(await ownedExpense(expenseId, id, auth.id))) return notFound();
    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.updateMany({ where: { expenseId }, data: { isChosen: false } });
      await tx.weddingExpense.update({ where: { id: expenseId }, data: { vendorName: null, vendorPhone: null, vendorInstagram: null } });
    });
    return NextResponse.json({ data: { id: expenseId } });
  } catch {
    return serverError();
  }
}
