import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

function serialize(p: {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  flexibility: string;
  priority: number;
  slideWindowMonths: number;
  categoryId: string | null;
  notes: string | null;
  status: string;
}) {
  return {
    id: p.id,
    name: p.name,
    amountPaisas: p.amount,
    dueDate: p.dueDate.toISOString(),
    flexibility: p.flexibility,
    priority: p.priority,
    slideWindowMonths: p.slideWindowMonths,
    categoryId: p.categoryId,
    notes: p.notes,
    status: p.status,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const expenses = await prisma.plannedExpense.findMany({
      where: { userId: auth.id },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json({ data: expenses.map(serialize) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/planned-expenses ──────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(100),
  amountPaisas: z.number().int().positive(),
  dueDate: z.string().min(1),
  flexibility: z.enum(["FIXED", "FLEXIBLE"]).optional(),
  priority: z.number().int().optional(),
  slideWindowMonths: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  notes: z.string().max(1000).optional(),
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

    const data = parsed.data;
    const created = await prisma.plannedExpense.create({
      data: {
        name: data.name,
        amount: data.amountPaisas,
        dueDate: new Date(data.dueDate),
        flexibility: data.flexibility ?? "FIXED",
        priority: data.priority ?? 0,
        slideWindowMonths: data.slideWindowMonths ?? 0,
        categoryId: data.categoryId ?? null,
        notes: data.notes ?? null,
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
