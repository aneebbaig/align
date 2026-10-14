import { NextRequest } from "next/server";
import { z } from "zod";
import { routineResponse } from "@/lib/routines/http";
import { dateSchema } from "@/lib/routines/schemas";
import { getStats } from "@/lib/routines/store";

export async function GET(req: NextRequest) {
  return routineResponse(req, async (userId) => {
    const q = req.nextUrl.searchParams;
    const { from, to } = z.object({ from: dateSchema, to: dateSchema }).parse({ from: q.get("from"), to: q.get("to") });
    return getStats(userId, from, to);
  });
}
