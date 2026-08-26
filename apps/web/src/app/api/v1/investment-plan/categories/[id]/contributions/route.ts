import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { bookContributionTransaction } from "@/lib/investment-contributions";

// Add money to a plan category directly - lazily creates the category's
// linked Investment on first use (name/type inherited from the category), so
// mobile's "add to plan, then add money" flow needs no separate SIP-creation
// endpoint. Mirrors the web addMoneyToCategory action.
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

    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.investmentPlanCategory.findFirst({
        where: { id, plan: { userId: auth.id } },
        select: { id: true, name: true, investmentType: true },
      });
      if (!category) return null;

      const investment = await tx.investment.findFirst({
        where: { planCategoryId: category.id, userId: auth.id },
        select: { id: true, name: true },
      });

      if (!investment) {
        const created = await tx.investment.create({
          data: {
            name: category.name,
            type: category.investmentType ?? "OTHER",
            platform: "",
            investedAmount: d.amountPaisas,
            currentValue: d.amountPaisas,
            purchaseDate: date,
            planCategoryId: category.id,
            userId: auth.id,
          },
          select: { id: true },
        });
        const transactionId = await bookContributionTransaction(tx, {
          userId: auth.id, investmentName: category.name, amount: d.amountPaisas, date, notes: d.notes ?? "Initial contribution", period,
        });
        const c = await tx.investmentContribution.create({
          data: { investmentId: created.id, amount: d.amountPaisas, date, notes: d.notes ?? "Initial contribution", transactionId },
          select: { id: true },
        });
        return { investmentId: created.id, contributionId: c.id };
      }

      const transactionId = await bookContributionTransaction(tx, {
        userId: auth.id, investmentName: investment.name, amount: d.amountPaisas, date, notes: d.notes, period,
      });
      const c = await tx.investmentContribution.create({
        data: { investmentId: investment.id, amount: d.amountPaisas, date, notes: d.notes ?? null, transactionId },
        select: { id: true },
      });
      await tx.investment.update({
        where: { id: investment.id },
        data: { investedAmount: { increment: d.amountPaisas }, lastUpdated: new Date() },
      });
      return { investmentId: investment.id, contributionId: c.id };
    });

    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
