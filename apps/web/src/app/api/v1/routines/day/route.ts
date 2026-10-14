import { NextRequest } from "next/server";
import { z } from "zod";
import { routineResponse } from "@/lib/routines/http";
import { dateSchema } from "@/lib/routines/schemas";
import { getDay } from "@/lib/routines/store";

export async function GET(req: NextRequest) {
  return routineResponse(req, async (userId) => {
    const { date } = z.object({ date: dateSchema }).parse({ date: req.nextUrl.searchParams.get("date") });
    return getDay(userId, date);
  });
}
