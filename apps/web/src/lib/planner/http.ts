import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireBearerAuth } from "@/lib/v1-auth";
import { PlannerError } from "./store";

// Wraps a v1 planner handler: bearer auth, then { data } on success, and the
// usual { error } with 400 (validation) / PlannerError.status / 500.
export async function plannerResponse(
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
    if (e instanceof PlannerError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[planner]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
