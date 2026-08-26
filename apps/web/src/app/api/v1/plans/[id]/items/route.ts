import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// Add a checklist item to a plan.
const createSchema = z.object({
  name: z.string().min(1).max(200),
  estimatedCostPaisas: z.number().int().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
  vendor: z.string().max(100).optional(),
  dueDate: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    const plan = await prisma.plan.findFirst({ where: { id, userId: auth.id }, select: { id: true } });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const created = await prisma.planItem.create({
      data: {
        planId: id,
        name: d.name,
        estimatedCost: d.estimatedCostPaisas,
        notes: d.notes ?? null,
        vendor: d.vendor ?? null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
