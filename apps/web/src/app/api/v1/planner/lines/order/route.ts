import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { orderSchema } from "@/lib/planner/schemas";
import { reorderLines } from "@/lib/planner/store";

export async function PUT(req: NextRequest) {
  return plannerResponse(req, async (userId) => {
    await reorderLines(userId, orderSchema.parse(await req.json()).ids);
    return { ok: true };
  });
}
