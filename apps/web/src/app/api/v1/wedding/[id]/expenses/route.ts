import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { expenseFields, fail, notFound, ownedPlan, readJson, serverError, text } from "../../_shared";

const createSchema = z.object({
  name: expenseFields.name,
  category: expenseFields.category.default("MISC"),
  eventId: expenseFields.eventId,
  estimatedAmount: expenseFields.estimatedAmount.default(0),
  actualAmount: expenseFields.actualAmount.optional(),
  paidAmount: expenseFields.paidAmount.default(0),
  vendorName: expenseFields.vendorName,
  vendorPhone: expenseFields.vendorPhone,
  vendorInstagram: expenseFields.vendorInstagram,
  notes: expenseFields.notes,
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const r = await readJson(req, createSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    if (!(await ownedPlan(id, auth.id))) return notFound();
    const event = await prisma.weddingEvent.findFirst({ where: { id: d.eventId, weddingPlanId: id }, select: { id: true } });
    if (!event) return fail("Event not found", 400);
    const created = await prisma.weddingExpense.create({
      data: {
        weddingPlanId: id,
        name: d.name,
        category: d.category,
        eventId: d.eventId,
        estimatedAmount: d.estimatedAmount,
        actualAmount: d.actualAmount ?? null,
        paidAmount: d.paidAmount,
        vendorName: text(d.vendorName),
        vendorPhone: text(d.vendorPhone),
        vendorInstagram: text(d.vendorInstagram),
        notes: text(d.notes),
      },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return serverError();
  }
}
