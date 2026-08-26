import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// The target-allocation plan (one per user): a monthly target split across
// editable categories. Also returned inside GET /investments, but exposed
// standalone so mobile can edit it directly.
export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const plan = await prisma.investmentPlan.findUnique({
      where: { userId: auth.id },
      include: { categories: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({
      data: plan
        ? {
            id: plan.id,
            monthlyTargetPaisas: plan.monthlyTarget,
            autoFromSurplus: plan.autoFromSurplus,
            categories: plan.categories.map((c) => ({
              id: c.id,
              name: c.name,
              investmentType: c.investmentType,
              percentage: c.percentage,
            })),
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const putSchema = z.object({
  monthlyTargetPaisas: z.number().int().nonnegative().optional(),
  autoFromSurplus: z.boolean().optional(),
  categories: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(100),
        investmentType: z.string().nullable().optional(),
        percentage: z.number().int().min(0).max(100),
      }),
    )
    .max(20),
});

export async function PUT(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    await prisma.$transaction(async (tx) => {
      const plan = await tx.investmentPlan.upsert({
        where: { userId: auth.id },
        create: {
          userId: auth.id,
          monthlyTarget: d.monthlyTargetPaisas ?? 0,
          autoFromSurplus: d.autoFromSurplus ?? true,
        },
        update: {
          ...(d.monthlyTargetPaisas != null && { monthlyTarget: d.monthlyTargetPaisas }),
          ...(d.autoFromSurplus != null && { autoFromSurplus: d.autoFromSurplus }),
        },
      });

      // Diff, not delete-all-recreate: categories are the object
      // Investment.planCategoryId points at, so re-minting ids on every save
      // would silently unlink every SIP from its category (SetNull FK).
      const existing = await tx.investmentPlanCategory.findMany({ where: { planId: plan.id }, select: { id: true } });
      const existingIds = new Set(existing.map((c) => c.id));
      const keepIds = new Set(d.categories.filter((c) => c.id).map((c) => c.id as string));
      const removedIds = [...existingIds].filter((id) => !keepIds.has(id));

      if (removedIds.length > 0) {
        await tx.investment.deleteMany({ where: { planCategoryId: { in: removedIds } } });
        await tx.investmentPlanCategory.deleteMany({ where: { id: { in: removedIds } } });
      }

      for (const [i, c] of d.categories.entries()) {
        if (c.id && existingIds.has(c.id)) {
          await tx.investmentPlanCategory.update({
            where: { id: c.id },
            data: { name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        } else {
          await tx.investmentPlanCategory.create({
            data: { planId: plan.id, name: c.name, investmentType: c.investmentType ?? null, percentage: c.percentage, order: i },
          });
        }
      }
    });

    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
