import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id: loanId } = await params;

  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId: auth.id } });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    const schedules = await prisma.loanSchedule.findMany({
      where: { loanId, userId: auth.id },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({
      data: schedules.map((s) => ({
        id: s.id,
        loanId: s.loanId,
        kind: s.kind,
        amountPaisas: s.amount,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() ?? null,
        flexibility: s.flexibility,
        priority: s.priority,
        slideWindowMonths: s.slideWindowMonths,
        interestRate: s.interestRate,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/loans/[id]/schedules ──────────────────────────────────────

const createScheduleSchema = z.object({
  kind: z.enum(["LUMP_SUM", "FIXED_INSTALLMENT"]),
  amountPaisas: z.number().int().positive(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  flexibility: z.enum(["FIXED", "FLEXIBLE"]).optional(),
  priority: z.number().int().optional(),
  slideWindowMonths: z.number().int().min(0).optional(),
  interestRate: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id: loanId } = await params;

  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId: auth.id } });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const data = parsed.data;
    if (data.kind === "FIXED_INSTALLMENT" && !data.endDate) {
      return NextResponse.json({ error: "Fixed installment schedules need an end date" }, { status: 400 });
    }

    const created = await prisma.loanSchedule.create({
      data: {
        loanId,
        kind: data.kind,
        amount: data.amountPaisas,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        flexibility: data.flexibility ?? "FIXED",
        priority: data.priority ?? 0,
        slideWindowMonths: data.slideWindowMonths ?? 0,
        interestRate: data.interestRate ?? null,
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
