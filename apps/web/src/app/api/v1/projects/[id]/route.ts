import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── GET /api/v1/projects/[id] ─────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: auth.id },
      include: {
        tasks: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { tags: { include: { tag: true } } },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { tasks, links, ...rest } = project;
    return NextResponse.json({
      data: {
        ...rest,
        links: (() => { try { return JSON.parse(links); } catch { return []; } })(),
        dueDate: rest.dueDate ? rest.dueDate.toISOString() : null,
        createdAt: rest.createdAt.toISOString(),
        updatedAt: rest.updatedAt.toISOString(),
        tasks: tasks.map((t) => ({
          ...t,
          tags: t.tags.map((pt) => pt.tag),
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── PATCH /api/v1/projects/[id] ───────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  client: z.string().max(200).nullable().optional(),
  color: z.string().max(20).optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  links: z.array(z.object({ id: z.string(), label: z.string().max(120), url: z.string().max(2000) })).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const existing = await prisma.project.findFirst({ where: { id, userId: auth.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { name, description, client, color, status, dueDate, notes, links } = parsed.data;

    await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(client !== undefined && { client }),
        ...(color !== undefined && { color }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(links !== undefined && { links: JSON.stringify(links) }),
      },
    });

    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/v1/projects/[id] ──────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const deleted = await prisma.project.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
