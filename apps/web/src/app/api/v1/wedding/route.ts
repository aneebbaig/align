import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { paisas, planInclude, readJson, serializePlanSummary, serverError, text } from "./_shared";

// Wedding planner for the Flutter client. Amounts are paisas.
export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const plans = await prisma.weddingPlan.findMany({
      where: { userId: auth.id },
      include: planInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: plans.map(serializePlanSummary) });
  } catch {
    return serverError();
  }
}

const createSchema = z.object({
  brideName: z.string().trim().min(1, "Enter the bride's name").max(100),
  groomName: z.string().trim().min(1, "Enter the groom's name").max(100),
  weddingDate: z.string().nullable().optional(),
  totalBudget: paisas.optional(),
  haqMehr: paisas.nullable().optional(),
  haqMehrNote: z.string().max(300).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const r = await readJson(req, createSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    const created = await prisma.weddingPlan.create({
      data: {
        userId: auth.id,
        brideName: d.brideName,
        groomName: d.groomName,
        weddingDate: d.weddingDate ? new Date(d.weddingDate) : null,
        totalBudget: d.totalBudget ?? 0,
        haqMehr: d.haqMehr || null,
        haqMehrNote: text(d.haqMehrNote),
        notes: text(d.notes),
      },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return serverError();
  }
}
