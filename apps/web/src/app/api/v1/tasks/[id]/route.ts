import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── PATCH /api/v1/tasks/[id] ─────────────────────────────────────────────────

const patchSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const existing = await prisma.task.findFirst({ where: { id, userId: auth.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { status, title, description, priority, dueDate, dueTime, category } = parsed.data;

    await prisma.task.update({
      where: { id },
      data: {
        ...(status !== undefined && {
          status,
          completedAt: status === "DONE" ? new Date() : null,
        }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(dueTime !== undefined && { dueTime }),
        ...(category !== undefined && { category }),
      },
    });

    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── DELETE /api/v1/tasks/[id] ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const deleted = await prisma.task.deleteMany({ where: { id, userId: auth.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
