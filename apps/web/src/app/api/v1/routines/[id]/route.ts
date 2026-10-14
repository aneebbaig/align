import { NextRequest } from "next/server";
import { readBody, routineResponse } from "@/lib/routines/http";
import { routineUpdateSchema } from "@/lib/routines/schemas";
import { deleteRoutine, updateRoutine } from "@/lib/routines/store";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return routineResponse(req, async (userId) => {
    await updateRoutine(userId, id, routineUpdateSchema.parse(await readBody(req)));
    return { id };
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return routineResponse(req, async (userId) => {
    await deleteRoutine(userId, id);
    return { id };
  });
}
