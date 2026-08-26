import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

function serialize(i: {
  id: string;
  label: string;
  kind: string;
  amount: number;
  variable: boolean;
  countsTowardFloor: boolean;
  dayOfMonth: number | null;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
  occurrences: { month: number; year: number }[];
}) {
  return {
    id: i.id,
    label: i.label,
    kind: i.kind,
    amountPaisas: i.amount,
    variable: i.variable,
    countsTowardFloor: i.countsTowardFloor,
    dayOfMonth: i.dayOfMonth,
    startDate: i.startDate.toISOString(),
    endDate: i.endDate?.toISOString() ?? null,
    active: i.active,
    occurrences: i.occurrences,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const incomes = await prisma.recurringIncome.findMany({
      where: { userId: auth.id },
      include: { occurrences: { select: { month: true, year: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: incomes.map(serialize) });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/recurring-income ──────────────────────────────────────────

const createSchema = z.object({
  label: z.string().min(1).max(100),
  kind: z.enum(["SALARY", "FREELANCE", "OTHER"]),
  amountPaisas: z.number().int().positive(),
  variable: z.boolean().optional(),
  countsTowardFloor: z.boolean().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
    const created = await prisma.recurringIncome.create({
      data: {
        label: data.label,
        kind: data.kind,
        amount: data.amountPaisas,
        variable: data.variable ?? data.kind === "FREELANCE",
        countsTowardFloor: data.countsTowardFloor ?? true,
        dayOfMonth: data.dayOfMonth ?? null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
