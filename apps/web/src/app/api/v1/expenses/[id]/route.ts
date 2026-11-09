import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { updateTransactionCore } from "@/lib/expenses/update";
import { deleteTransactionCore } from "@/lib/expenses/delete";

const patchSchema = z.object({
  amountPaisas: z.number().int().positive(),
  categoryId: z.string().min(1),
  description: z.string().min(1).max(200),
  notes: z.string().max(1000).nullable().optional(),
  date: z.string().min(1),
  isRegretPurchase: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
  // Omitted = keep the current funding. "INCOME" or a savings pot (held in the base currency).
  fundingSource: z.enum(["INCOME", "SAVINGS_POT"]).optional(),
  fundingPotId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    const existing = await prisma.transaction.findFirst({ where: { id, userId: auth.id, type: "EXPENSE" }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const base = d.fundingSource === "SAVINGS_POT" ? await getBaseCurrency() : null;
    const result = await updateTransactionCore(auth.id, id, {
      amountPaisas: d.amountPaisas,
      categoryId: d.categoryId,
      description: d.description,
      notes: d.notes ?? null,
      date: d.date,
      budgetMonth: d.budgetMonth,
      budgetYear: d.budgetYear,
      isRegretPurchase: d.isRegretPurchase,
      fundingSource: d.fundingSource,
      fundingPotId: d.fundingPotId,
      fundingCurrencyId: base?.id,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Gives pot money back (expenses) and refuses to strand spending (income), like the web.
    const result = await deleteTransactionCore(auth.id, id, "EXPENSE");
    if (result.notFound) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
