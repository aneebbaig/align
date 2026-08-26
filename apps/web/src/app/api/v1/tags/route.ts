import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── GET /api/v1/tags ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const tags = await prisma.tag.findMany({
      where: { userId: auth.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ data: tags });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/tags ──────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const name = parsed.data.name.trim();
    const existing = await prisma.tag.findUnique({ where: { userId_name: { userId: auth.id, name } } });
    if (existing) return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });

    const created = await prisma.tag.create({
      data: { name, color: parsed.data.color || "#6366f1", userId: auth.id },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
