import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { lineUpdateSchema } from "@/lib/planner/schemas";
import { deleteLine, updateLine } from "@/lib/planner/store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    await updateLine(userId, id, lineUpdateSchema.parse(await req.json()));
    return { id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    await deleteLine(userId, id);
    return { id };
  });
}
