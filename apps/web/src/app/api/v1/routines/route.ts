import { NextRequest } from "next/server";
import { readBody, routineResponse } from "@/lib/routines/http";
import { routineSchema } from "@/lib/routines/schemas";
import { createRoutine, listRoutines } from "@/lib/routines/store";

export async function GET(req: NextRequest) {
  return routineResponse(req, (userId) => listRoutines(userId));
}

export async function POST(req: NextRequest) {
  return routineResponse(req, async (userId) => ({ id: await createRoutine(userId, routineSchema.parse(await readBody(req))) }), 201);
}
