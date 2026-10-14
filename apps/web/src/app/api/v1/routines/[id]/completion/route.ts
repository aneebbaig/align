import { NextRequest } from "next/server";
import { z } from "zod";
import { readBody, routineResponse } from "@/lib/routines/http";
import { completionSchema, dateSchema } from "@/lib/routines/schemas";
import { clearCompletion, setCompletion } from "@/lib/routines/store";

type Ctx = { params: Promise<{ id: string }> };

// PUT marks the routine done for a date; DELETE (with ?date=) un-ticks it.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return routineResponse(req, async (userId) => {
    await setCompletion(userId, id, completionSchema.parse(await readBody(req)));
    return { id };
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  return routineResponse(req, async (userId) => {
    const date = z.object({ date: dateSchema }).parse({ date: req.nextUrl.searchParams.get("date") }).date;
    await clearCompletion(userId, id, date);
    return { id };
  });
}
