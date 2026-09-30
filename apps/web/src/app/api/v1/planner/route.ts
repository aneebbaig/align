import { NextRequest } from "next/server";
import { plannerResponse } from "@/lib/planner/http";
import { getPlanner } from "@/lib/planner/store";

// ── GET /api/v1/planner - settings, lines, goals, and the computed table ──
export async function GET(req: NextRequest) {
  return plannerResponse(req, (userId) => getPlanner(userId));
}
