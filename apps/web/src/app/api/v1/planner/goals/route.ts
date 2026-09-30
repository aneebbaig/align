import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { goalSchema } from "@/lib/planner/schemas";
import { addGoal } from "@/lib/planner/store";

export async function POST(req: NextRequest) {
  return plannerResponse(req, async (userId) => ({ id: await addGoal(userId, goalSchema.parse(await req.json())) }), 201);
}
