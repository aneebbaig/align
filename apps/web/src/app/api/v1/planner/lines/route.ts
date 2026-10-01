import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { lineSchema } from "@/lib/planner/schemas";
import { addLine } from "@/lib/planner/store";

export async function POST(req: NextRequest) {
  return plannerResponse(req, async (userId) => ({ id: await addLine(userId, lineSchema.parse(await req.json())) }), 201);
}
