import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { expenseFields, fail, notFound, ownedExpense, readJson, serverError, text } from "../../../_shared";

type Ctx = { params: Promise<{ id: string; expenseId: string }> };

const patchSchema = z.object({
  name: expenseFields.name.optional(),
  category: expenseFields.category.optional(),
  eventId: expenseFields.eventId.optional(),
  estimatedAmount: expenseFields.estimatedAmount.optional(),
  actualAmount: expenseFields.actualAmount.optional(),
  paidAmount: expenseFields.paidAmount.optional(),
  vendorName: expenseFields.vendorName,
  vendorPhone: expenseFields.vendorPhone,
  vendorInstagram: expenseFields.vendorInstagram,
  notes: expenseFields.notes,
});

// Same rules as the web action: a chosen quote owns the estimate and vendor, so
// those fields are ignored while one is chosen (edit the quote instead).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId } = await params;
  try {
    const r = await readJson(req, patchSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    const expense = await ownedExpense(expenseId, id, auth.id);
    if (!expense) return notFound();
    if (d.eventId) {
      const event = await prisma.weddingEvent.findFirst({ where: { id: d.eventId, weddingPlanId: id }, select: { id: true } });
      if (!event) return fail("Event not found", 400);
    }
    const chosen = await prisma.weddingQuote.findFirst({ where: { expenseId, isChosen: true }, select: { id: true } });
    await prisma.weddingExpense.update({
      where: { id: expenseId },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.category !== undefined ? { category: d.category } : {}),
        ...(d.eventId !== undefined ? { eventId: d.eventId } : {}),
        ...(d.estimatedAmount !== undefined && !chosen ? { estimatedAmount: d.estimatedAmount } : {}),
        ...(d.actualAmount !== undefined ? { actualAmount: d.actualAmount } : {}),
        ...(d.paidAmount !== undefined ? { paidAmount: d.paidAmount } : {}),
        ...(d.vendorName !== undefined && !chosen ? { vendorName: text(d.vendorName) } : {}),
        ...(d.vendorPhone !== undefined && !chosen ? { vendorPhone: text(d.vendorPhone) } : {}),
        ...(d.vendorInstagram !== undefined && !chosen ? { vendorInstagram: text(d.vendorInstagram) } : {}),
        ...(d.notes !== undefined ? { notes: text(d.notes) } : {}),
      },
    });
    return NextResponse.json({ data: { id: expenseId } });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, expenseId } = await params;
  try {
    const deleted = await prisma.weddingExpense.deleteMany({
      where: { id: expenseId, weddingPlanId: id, weddingPlan: { userId: auth.id } },
    });
    if (deleted.count === 0) return notFound();
    return NextResponse.json({ data: { id: expenseId } });
  } catch {
    return serverError();
  }
}
