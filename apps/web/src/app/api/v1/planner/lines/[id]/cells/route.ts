import { NextRequest } from "next/server";
import { z } from "zod";
import { plannerResponse } from "@/lib/planner/http";
import { cellSchema } from "@/lib/planner/schemas";
import { removeOverride, setCell } from "@/lib/planner/store";

// PUT: set a cell "FROM_HERE" (step) or "THIS_MONTH" (override).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    await setCell(userId, id, cellSchema.parse(await req.json()));
    return { ok: true };
  });
}

const monthQuery = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
});

// DELETE ?month=&year= removes that month's override (back to the steps).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    const q = monthQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
    await removeOverride(userId, id, q.month, q.year);
    return { ok: true };
  });
}
