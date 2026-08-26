import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── GET /api/v1/projects/[id]/tasks ───────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({ where: { id, userId: auth.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({
      data: tasks.map((t) => ({
        ...t,
        tags: t.tags.map((pt) => pt.tag),
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/projects/[id]/tasks ──────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
  dueDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const project = await prisma.project.findFirst({ where: { id, userId: auth.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { title, description, priority, status, dueDate, tagIds } = parsed.data;

    if (tagIds?.length) {
      const owned = await prisma.tag.count({ where: { id: { in: tagIds }, userId: auth.id } });
      if (owned !== tagIds.length) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    const maxOrder = await prisma.projectTask.aggregate({ where: { projectId: id }, _max: { order: true } });
    const order = (maxOrder._max.order ?? 0) + 1;

    const created = await prisma.projectTask.create({
      data: {
        title,
        description: description ?? null,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        order,
        projectId: id,
        ...(tagIds?.length ? { tags: { create: tagIds.map((tagId) => ({ tagId })) } } : {}),
      },
      select: { id: true },
    });
    await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
