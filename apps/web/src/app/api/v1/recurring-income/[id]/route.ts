import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import type { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  amountPaisas: z.number().int().positive().optional(),
  variable: z.boolean().optional(),
  countsTowardFloor: z.boolean().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  endDate: z.string().nullable().optional(),
  active: z.boolean().optional(),
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
    const update: Prisma.RecurringIncomeUpdateInput = {};
    if (data.label != null) update.label = data.label;
    if (data.amountPaisas != null) update.amount = data.amountPaisas;
    if (data.variable != null) update.variable = data.variable;
    if (data.countsTowardFloor != null) update.countsTowardFloor = data.countsTowardFloor;
    if (data.dayOfMonth !== undefined) update.dayOfMonth = data.dayOfMonth;
    if (data.endDate !== undefined) update.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.active != null) update.active = data.active;

    const updated = await prisma.recurringIncome.updateMany({ where: { id, userId: auth.id }, data: update });
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
    const deleted = await prisma.recurringIncome.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
