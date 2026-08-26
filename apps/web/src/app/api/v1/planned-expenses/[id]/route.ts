import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import type { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amountPaisas: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
  flexibility: z.enum(["FIXED", "FLEXIBLE"]).optional(),
  priority: z.number().int().optional(),
  slideWindowMonths: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
  // "PAID" is not settable here - it's only reached via POST .../record, which
  // books a real ledger Transaction alongside the status flip.
  status: z.enum(["PLANNED", "SKIPPED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const data = parsed.data;
    const update: Prisma.PlannedExpenseUpdateInput = {};
    if (data.name != null) update.name = data.name;
    if (data.amountPaisas != null) update.amount = data.amountPaisas;
    if (data.dueDate != null) update.dueDate = new Date(data.dueDate);
    if (data.flexibility != null) update.flexibility = data.flexibility;
    if (data.priority != null) update.priority = data.priority;
    if (data.slideWindowMonths != null) update.slideWindowMonths = data.slideWindowMonths;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.status != null) update.status = data.status;

    const updated = await prisma.plannedExpense.updateMany({ where: { id, userId: auth.id }, data: update });
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    const deleted = await prisma.plannedExpense.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
