import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, paisas, readJson, serverError, text } from "../../../_shared";

type Ctx = { params: Promise<{ id: string; eventId: string }> };

const patchSchema = z.object({
  type: z.string().min(1).max(30).optional(),
  name: z.string().trim().min(1, "Give the event a name").max(100).optional(),
  date: z.string().nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  guestCount: z.number().int().min(0).max(100000).nullable().optional(),
  budgetAllocated: paisas.optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["PLANNED", "CONFIRMED", "DONE"]).optional(),
  responsibleParty: z.enum(["BRIDE", "GROOM", "JOINT"]).optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, eventId } = await params;
  try {
    const r = await readJson(req, patchSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    const updated = await prisma.weddingEvent.updateMany({
      where: { id: eventId, weddingPlanId: id, weddingPlan: { userId: auth.id } },
      data: {
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.date !== undefined ? { date: d.date ? new Date(d.date) : null } : {}),
        ...(d.venue !== undefined ? { venue: text(d.venue) } : {}),
        ...(d.guestCount !== undefined ? { guestCount: d.guestCount } : {}),
        ...(d.budgetAllocated !== undefined ? { budgetAllocated: d.budgetAllocated } : {}),
        ...(d.notes !== undefined ? { notes: text(d.notes) } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.responsibleParty !== undefined ? { responsibleParty: d.responsibleParty } : {}),
        ...(d.order !== undefined ? { order: d.order } : {}),
      },
    });
    if (updated.count === 0) return notFound();
    return NextResponse.json({ data: { id: eventId } });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, eventId } = await params;
  try {
    const deleted = await prisma.weddingEvent.deleteMany({
      where: { id: eventId, weddingPlanId: id, weddingPlan: { userId: auth.id } },
    });
    if (deleted.count === 0) return notFound();
    return NextResponse.json({ data: { id: eventId } });
  } catch {
    return serverError();
  }
}
