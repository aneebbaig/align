import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { writeOffLoanCore } from "@/lib/loans/entries";

// ── POST /api/v1/loans/[id]/write-off - forgive part or all of what's left ──
// bookExpense is honoured only where offersWriteOffExpense allows it.
const schema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  bookExpense: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const result = await writeOffLoanCore(auth.id, id, parsed.data, getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear));
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.error === "Loan not found" ? 404 : 422 });
    }
    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
