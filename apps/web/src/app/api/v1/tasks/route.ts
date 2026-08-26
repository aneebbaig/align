import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── GET /api/v1/tasks ─────────────────────────────────────────────────────────

const querySchema = z.object({
  type: z.enum(["DAILY", "ONE_TIME"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"]).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const where: { userId: string; type?: string; status?: string } = { userId: auth.id };
    if (parsed.data.type) where.type = parsed.data.type;
    if (parsed.data.status) where.status = parsed.data.status;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        priority: true,
        status: true,
        dueDate: true,
        dueTime: true,
        category: true,
        order: true,
      },
    });

    return NextResponse.json({
      data: tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/tasks ────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["DAILY", "ONE_TIME"]).default("ONE_TIME"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
  category: z.string().optional(),
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

    const { title, description, type, priority, dueDate, dueTime, category } = parsed.data;

    const maxOrder = await prisma.task.aggregate({ where: { userId: auth.id }, _max: { order: true } });
    const order = (maxOrder._max.order ?? 0) + 1;

    const created = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        type,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime ?? null,
        category: category ?? null,
        order,
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
