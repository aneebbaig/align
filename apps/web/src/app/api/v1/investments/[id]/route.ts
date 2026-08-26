import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import type { Prisma } from "@/generated/prisma/client";
import { deleteContributionTransactionsFor } from "@/lib/investment-contributions";

// Mark-to-market update for a SIP (current value / units / notes / custom
// fields / plan-category link). Contributions are logged via the nested
// /contributions route, not here.
const patchSchema = z.object({
  currentValuePaisas: z.number().int().nonnegative().optional(),
  units: z.number().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  customFields: z.string().nullable().optional(),
  planCategoryId: z.string().nullable().optional(),
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

    if (d.planCategoryId) {
      const owns = await prisma.investmentPlanCategory.findFirst({
        where: { id: d.planCategoryId, plan: { userId: auth.id } },
        select: { id: true },
      });
      if (!owns) return NextResponse.json({ error: "Invalid plan category" }, { status: 400 });
    }

    // Unchecked variant so the scalar planCategoryId FK is directly settable.
    const update: Prisma.InvestmentUncheckedUpdateManyInput = { lastUpdated: new Date() };
    if (d.currentValuePaisas != null) update.currentValue = d.currentValuePaisas;
    if (d.units !== undefined) update.units = d.units;
    if (d.notes !== undefined) update.notes = d.notes;
    if (d.customFields !== undefined) update.customFields = d.customFields;
    if (d.planCategoryId !== undefined) update.planCategoryId = d.planCategoryId;

    const updated = await prisma.investment.updateMany({ where: { id, userId: auth.id }, data: update });
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
    const deleted = await prisma.$transaction(async (tx) => {
      const owned = await tx.investment.findFirst({ where: { id, userId: auth.id }, select: { id: true } });
      if (!owned) return false;
      await deleteContributionTransactionsFor(tx, [id]);
      await tx.investment.delete({ where: { id } });
      return true;
    });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
