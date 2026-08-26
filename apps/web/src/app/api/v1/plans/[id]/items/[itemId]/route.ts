import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// Edit a plan item: status (undo → PENDING) and/or its name/cost. Booking an
// expense goes through the /buy sub-route.
const patchSchema = z.object({
  status: z.enum(["PENDING", "BOOKED", "PAID", "SKIPPED"]).optional(),
  name: z.string().min(1).max(200).optional(),
  estimatedCostPaisas: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).nullable().optional(),
  vendor: z.string().max(100).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, itemId } = await params;

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;
    const data: Record<string, unknown> = {};
    if (d.name != null) data.name = d.name;
    if (d.estimatedCostPaisas != null) data.estimatedCost = d.estimatedCostPaisas;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.vendor !== undefined) data.vendor = d.vendor;
    if (d.status != null) {
      data.status = d.status;
      // Un-marking (back to PENDING) clears the recorded actual cost.
      if (d.status === "PENDING") data.actualCost = null;
    }

    const updated = await prisma.planItem.updateMany({
      where: { id: itemId, planId: id, plan: { userId: auth.id } },
      data,
    });
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id: itemId } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, itemId } = await params;

  try {
    const deleted = await prisma.planItem.deleteMany({
      where: { id: itemId, planId: id, plan: { userId: auth.id } },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id: itemId } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
