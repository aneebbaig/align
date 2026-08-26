import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { bookContributionTransaction } from "@/lib/investment-contributions";

// Log a top-up into a SIP, any amount, any time. Keeps the cached
// Investment.investedAmount total in sync in the same transaction.
const createSchema = z.object({
  amountPaisas: z.number().int().positive(),
  date: z.string().min(1),
  notes: z.string().max(1000).optional(),
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
    const period = getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);
    const date = new Date(d.date);

    const contributionId = await prisma.$transaction(async (tx) => {
      const inv = await tx.investment.findFirst({ where: { id, userId: auth.id }, select: { id: true, name: true } });
      if (!inv) return null;
      const transactionId = await bookContributionTransaction(tx, {
        userId: auth.id, investmentName: inv.name, amount: d.amountPaisas, date, notes: d.notes, period,
      });
      const c = await tx.investmentContribution.create({
        data: { investmentId: id, amount: d.amountPaisas, date, notes: d.notes ?? null, transactionId },
        select: { id: true },
      });
      await tx.investment.update({
        where: { id },
        data: { investedAmount: { increment: d.amountPaisas }, lastUpdated: new Date() },
      });
      return c.id;
    });

    if (!contributionId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { id: contributionId } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
