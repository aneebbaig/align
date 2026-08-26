import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

// ── GET /api/v1/projects ──────────────────────────────────────────────────────

const querySchema = z.object({
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
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

    const where: { userId: string; status?: string } = { userId: auth.id };
    if (parsed.data.status) where.status = parsed.data.status;

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        tasks: { select: { id: true, title: true, status: true, updatedAt: true } },
      },
    });

    return NextResponse.json({
      data: projects.map(({ tasks, notes, links, ...p }) => ({
        ...p,
        dueDate: p.dueDate ? p.dueDate.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        linkCount: (() => { try { return (JSON.parse(links) as unknown[]).length; } catch { return 0; } })(),
        taskCount: tasks.length,
        doneCount: tasks.filter((t) => t.status === "DONE").length,
        recentTasks: [...tasks]
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 3)
          .map((t) => ({ id: t.id, title: t.title, status: t.status })),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/projects ─────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  client: z.string().max(200).optional(),
  color: z.string().max(20).optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
  dueDate: z.string().optional(),
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

    const { name, description, client, color, status, dueDate } = parsed.data;

    const created = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        client: client ?? null,
        color: color ?? "#6366F1",
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
