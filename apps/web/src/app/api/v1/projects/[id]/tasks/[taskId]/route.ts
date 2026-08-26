import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── PATCH /api/v1/projects/[id]/tasks/[taskId] ────────────────────────────────

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  order: z.number().int().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id, taskId } = await params;

  try {
    const existing = await prisma.projectTask.findFirst({
      where: { id: taskId, projectId: id, project: { userId: auth.id } },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { title, description, status, priority, dueDate, order, tagIds } = parsed.data;

    if (tagIds) {
      const owned = await prisma.tag.count({ where: { id: { in: tagIds }, userId: auth.id } });
      if (owned !== tagIds.length) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectTask.update({
        where: { id: taskId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(order !== undefined && { order }),
        },
      });
      if (tagIds !== undefined) {
        await tx.projectTaskTag.deleteMany({ where: { taskId } });
        if (tagIds.length > 0) {
          await tx.projectTaskTag.createMany({ data: tagIds.map((tagId) => ({ taskId, tagId })) });
        }
      }
    });
    await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ data: { id: taskId } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/v1/projects/[id]/tasks/[taskId] ───────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id, taskId } = await params;

  try {
    const deleted = await prisma.projectTask.deleteMany({
      where: { id: taskId, projectId: id, project: { userId: auth.id } },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ data: { id: taskId } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
