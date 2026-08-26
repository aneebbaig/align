import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── PATCH /api/v1/tags/[id] ─────────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const name = parsed.data.name?.trim();
    if (name) {
      const dupe = await prisma.tag.findFirst({ where: { userId: auth.id, name, NOT: { id } } });
      if (dupe) return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 });
    }

    const updated = await prisma.tag.updateMany({
      where: { id, userId: auth.id },
      data: { ...(name !== undefined && { name }), ...(parsed.data.color !== undefined && { color: parsed.data.color }) },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/v1/tags/[id] ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const deleted = await prisma.tag.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
