import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { parseHiddenSections } from "@/lib/hidden-sections";

// Personal to the login (auth.loginId), not the household.
export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const me = await prisma.user.findUnique({ where: { id: auth.loginId }, select: { hiddenSections: true } });
    return NextResponse.json({ data: { hiddenSections: me?.hiddenSections ?? [] } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const patchSchema = z.object({ hiddenSections: z.array(z.string()) });

export async function PATCH(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = patchSchema.safeParse(await req.json());
    const clean = parsed.success ? parseHiddenSections(parsed.data.hiddenSections) : null;
    if (!clean) return NextResponse.json({ error: "Invalid hiddenSections" }, { status: 400 });
    await prisma.user.update({ where: { id: auth.loginId }, data: { hiddenSections: clean } });
    return NextResponse.json({ data: { hiddenSections: clean } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
