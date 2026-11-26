import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedQuote, quoteFields, readJson, serverError, text } from "../../../../../_shared";

type Ctx = { params: Promise<{ id: string; expenseId: string; quoteId: string }> };

const patchSchema = z.object({
  vendorName: quoteFields.vendorName.optional(),
  amount: quoteFields.amount.optional(),
  phone: quoteFields.phone,
  instagram: quoteFields.instagram,
  notes: quoteFields.notes,
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId, quoteId } = await params;
  try {
    const r = await readJson(req, patchSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    const quote = await ownedQuote(quoteId, expenseId, id, auth.id);
    if (!quote) return notFound();
    const phone = d.phone !== undefined ? text(d.phone) : undefined;
    const instagram = d.instagram !== undefined ? text(d.instagram) : undefined;
    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.update({
        where: { id: quoteId },
        data: {
          ...(d.vendorName !== undefined ? { vendorName: d.vendorName } : {}),
          ...(d.amount !== undefined ? { amount: d.amount } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(instagram !== undefined ? { instagram } : {}),
          ...(d.notes !== undefined ? { notes: text(d.notes) } : {}),
        },
      });
      // The chosen quote drives its expense, so edits to it carry through.
      if (quote.isChosen) {
        await tx.weddingExpense.update({
          where: { id: expenseId },
          data: {
            ...(d.vendorName !== undefined ? { vendorName: d.vendorName } : {}),
            ...(d.amount !== undefined ? { estimatedAmount: d.amount } : {}),
            ...(phone !== undefined ? { vendorPhone: phone } : {}),
            ...(instagram !== undefined ? { vendorInstagram: instagram } : {}),
          },
        });
      }
    });
    return NextResponse.json({ data: { id: quoteId } });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId, quoteId } = await params;
  try {
    const quote = await ownedQuote(quoteId, expenseId, id, auth.id);
    if (!quote) return notFound();
    await prisma.$transaction(async (tx) => {
      await tx.weddingQuote.delete({ where: { id: quoteId } });
      if (quote.isChosen) {
        await tx.weddingExpense.update({ where: { id: expenseId }, data: { vendorName: null, vendorPhone: null, vendorInstagram: null } });
      }
    });
    return NextResponse.json({ data: { id: quoteId } });
  } catch {
    return serverError();
  }
}
