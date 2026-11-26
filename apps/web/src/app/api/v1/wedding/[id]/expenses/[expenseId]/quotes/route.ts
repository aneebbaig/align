import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedExpense, quoteFields, readJson, serverError, text } from "../../../../_shared";

const createSchema = z.object({
  vendorName: quoteFields.vendorName,
  amount: quoteFields.amount,
  phone: quoteFields.phone,
  instagram: quoteFields.instagram,
  notes: quoteFields.notes,
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId } = await params;
  try {
    const r = await readJson(req, createSchema);
    if (!r.ok) return r.res;
    if (!(await ownedExpense(expenseId, id, auth.id))) return notFound();
    const d = r.data;
    const created = await prisma.weddingQuote.create({
      data: { expenseId, vendorName: d.vendorName, amount: d.amount, phone: text(d.phone), instagram: text(d.instagram), notes: text(d.notes) },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return serverError();
  }
}
