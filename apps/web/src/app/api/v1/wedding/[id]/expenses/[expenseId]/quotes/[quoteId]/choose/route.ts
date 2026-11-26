import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedQuote, serverError } from "../../../../../../_shared";

// Choosing a quote sets the expense's vendor and estimate; at most one is chosen.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string; quoteId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId, quoteId } = await params;
  try {
    const quote = await ownedQuote(quoteId, expenseId, id, auth.id);
    if (!quote) return notFound();
    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.updateMany({ where: { expenseId }, data: { isChosen: false } });
      await tx.weddingQuote.update({ where: { id: quoteId }, data: { isChosen: true } });
      await tx.weddingExpense.update({
        where: { id: expenseId },
        data: { vendorName: quote.vendorName, vendorPhone: quote.phone, vendorInstagram: quote.instagram, estimatedAmount: quote.amount },
      });
    });
    return NextResponse.json({ data: { id: quoteId } });
  } catch {
    return serverError();
  }
}
