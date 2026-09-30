import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { recordInvestmentMovement, InvestmentMovementError } from "@/lib/investment-contributions";

// Add money to (DEPOSIT) or take money out of (WITHDRAWAL) an investment. The
// Expenses/Income entry is optional (skipTransaction) and follows the
// budget-period override like every other money flow.
const createSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]).default("DEPOSIT"),
  skipTransaction: z.boolean().optional(),
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const period = (d.budgetMonth && d.budgetYear)
      ? { month: d.budgetMonth, year: d.budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const contributionId = await prisma.$transaction((tx) =>
      recordInvestmentMovement(tx, {
        userId: auth.id,
        investmentId: id,
        type: d.type,
        amount: d.amountPaisas,
        date: new Date(d.date),
        notes: d.notes,
        period,
        book: !d.skipTransaction,
      }),
    );
    return NextResponse.json({ data: { id: contributionId } }, { status: 201 });
  } catch (e) {
    if (e instanceof InvestmentMovementError) {
      const status = e.message === "Investment not found" ? 404 : 422;
      return NextResponse.json({ error: e.message }, { status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
