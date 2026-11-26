import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { notFound, ownedPlan, paisas, readJson, serverError, text } from "../../_shared";

const eventSchema = z.object({
  type: z.string().min(1).max(30).default("OTHER"),
  name: z.string().trim().min(1, "Give the event a name").max(100),
  date: z.string().nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  guestCount: z.number().int().min(0).max(100000).nullable().optional(),
  budgetAllocated: paisas.optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["PLANNED", "CONFIRMED", "DONE"]).optional(),
  responsibleParty: z.enum(["BRIDE", "GROOM", "JOINT"]).optional(),
  order: z.number().int().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const r = await readJson(req, eventSchema);
    if (!r.ok) return r.res;
    if (!(await ownedPlan(id, auth.id))) return notFound();
    const d = r.data;
    const created = await prisma.weddingEvent.create({
      data: {
        weddingPlanId: id,
        type: d.type,
        name: d.name,
        date: d.date ? new Date(d.date) : null,
        venue: text(d.venue),
        guestCount: d.guestCount ?? null,
        budgetAllocated: d.budgetAllocated ?? 0,
        notes: text(d.notes),
        responsibleParty: d.responsibleParty ?? "JOINT",
        status: d.status ?? "PLANNED",
        order: d.order ?? 0,
      },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return serverError();
  }
}
