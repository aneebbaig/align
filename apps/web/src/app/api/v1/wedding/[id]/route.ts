import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { findPlan, notFound, paisas, readJson, serializePlan, serverError, text } from "../_shared";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const plan = await findPlan(id, auth.id);
    if (!plan) return notFound();
    return NextResponse.json({ data: serializePlan(plan) });
  } catch {
    return serverError();
  }
}

const patchSchema = z.object({
  brideName: z.string().trim().min(1).max(100).optional(),
  groomName: z.string().trim().min(1).max(100).optional(),
  weddingDate: z.string().nullable().optional(),
  totalBudget: paisas.optional(),
  haqMehr: paisas.nullable().optional(),
  haqMehrNote: z.string().max(300).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "DONE"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const r = await readJson(req, patchSchema);
    if (!r.ok) return r.res;
    const d = r.data;
    const updated = await prisma.weddingPlan.updateMany({
      where: { id, userId: auth.id },
      data: {
        ...(d.brideName !== undefined ? { brideName: d.brideName } : {}),
        ...(d.groomName !== undefined ? { groomName: d.groomName } : {}),
        ...(d.weddingDate !== undefined ? { weddingDate: d.weddingDate ? new Date(d.weddingDate) : null } : {}),
        ...(d.totalBudget !== undefined ? { totalBudget: d.totalBudget } : {}),
        ...(d.haqMehr !== undefined ? { haqMehr: d.haqMehr || null } : {}),
        ...(d.haqMehrNote !== undefined ? { haqMehrNote: text(d.haqMehrNote) } : {}),
        ...(d.notes !== undefined ? { notes: text(d.notes) } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
      },
    });
    if (updated.count === 0) return notFound();
    return NextResponse.json({ data: { id } });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const deleted = await prisma.weddingPlan.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return notFound();
    return NextResponse.json({ data: { id } });
  } catch {
    return serverError();
  }
}
