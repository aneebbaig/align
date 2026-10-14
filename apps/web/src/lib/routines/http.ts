import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireBearerAuth } from "@/lib/v1-auth";
import { RoutineError } from "./store";

// Wraps a v1 routines handler: bearer auth, then { data } on success, and the
// usual { error } with 400 (validation) / RoutineError.status / 500.
export async function routineResponse(
  req: NextRequest,
  handler: (userId: string) => Promise<unknown>,
  successStatus = 200,
): Promise<NextResponse> {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await handler(auth.id);
    return NextResponse.json({ data }, { status: successStatus });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    if (e instanceof RoutineError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[routines]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Reads a JSON body, treating a missing or malformed one as an empty object so zod reports the problem. */
export async function readBody(req: NextRequest): Promise<unknown> {
  return req.json().catch(() => ({}));
}
