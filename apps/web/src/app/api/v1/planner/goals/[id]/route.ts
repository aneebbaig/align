import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { goalUpdateSchema } from "@/lib/planner/schemas";
import { deleteGoal, updateGoal } from "@/lib/planner/store";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    await updateGoal(userId, id, goalUpdateSchema.parse(await req.json()));
    return { id };
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return plannerResponse(req, async (userId) => {
    await deleteGoal(userId, id);
    return { id };
  });
}
