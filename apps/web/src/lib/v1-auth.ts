import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHouseholdOwnerId } from "@/lib/household";

// `id` is the household data scope (owner id); `loginId` is the real person.
export interface BearerUser {
  id: string;
  loginId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Authorize a v1 (mobile) API request via the better-auth session. The bearer
 * plugin lets getSession read the `Authorization: Bearer <token>` header the
 * Flutter client sends, so every v1 data route stays unchanged — it just calls
 * this and gets the user back.
 */
export async function requireBearerAuth(
  req: NextRequest,
): Promise<BearerUser | NextResponse> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const u = session.user as { id: string; email: string; name?: string | null; role?: string | null };
  return { id: await getHouseholdOwnerId(), loginId: u.id, email: u.email, name: u.name ?? "", role: u.role ?? "ADMIN" };
}
