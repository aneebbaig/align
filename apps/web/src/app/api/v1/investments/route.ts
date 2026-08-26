import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod, getCalendarMonthRange } from "@/lib/month";
import { bookContributionTransaction } from "@/lib/investment-contributions";

// Mobile investments = SIP vehicles (Investment) each with a contribution
// ledger, plus the target-allocation plan. Amounts are paisas (base currency),
// matching the rest of the v1 API the Flutter client consumes.

interface ContributionRow {
  id: string;
  amount: number;
  date: Date;
  notes: string | null;
}
interface InvestmentRow {
  id: string;
  name: string;
  type: string;
  platform: string;
  investedAmount: number;
  currentValue: number;
  units: number | null;
  purchaseDate: Date;
  notes: string | null;
  customFields: string | null;
  planCategoryId: string | null;
  contributions: ContributionRow[];
}

function serializeInvestment(i: InvestmentRow) {
  return {
    id: i.id,
    name: i.name,
    type: i.type,
    platform: i.platform,
    investedAmountPaisas: i.investedAmount,
    currentValuePaisas: i.currentValue,
    units: i.units,
    purchaseDate: i.purchaseDate.toISOString(),
    notes: i.notes,
    customFields: i.customFields,
    planCategoryId: i.planCategoryId,
    contributions: i.contributions.map((c) => ({
      id: c.id,
      amountPaisas: c.amount,
      date: c.date.toISOString(),
      notes: c.notes,
    })),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const [user, investments, plan] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.id },
        select: { currentBudgetMonth: true, currentBudgetYear: true },
      }),
      prisma.investment.findMany({
        where: { userId: auth.id },
        include: { contributions: { orderBy: { date: "desc" } } },
        orderBy: { purchaseDate: "desc" },
      }),
      prisma.investmentPlan.findUnique({
        where: { userId: auth.id },
        include: { categories: { orderBy: { order: "asc" } } },
      }),
    ]);

    const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
    const totalCurrentValue = investments.reduce((s, i) => s + i.currentValue, 0);

    // Per-category planned (from monthly target × %) vs actual (contributions
    // this calendar month for SIPs linked to that category).
    const { month, year } = getCurrentPeriod(user?.currentBudgetMonth, user?.currentBudgetYear);
    const { start, end } = getCalendarMonthRange(month, year);
    const periodContributions = plan && plan.categories.length > 0
      ? await prisma.investmentContribution.findMany({
          where: {
            date: { gte: start, lte: end },
            investment: { userId: auth.id, planCategoryId: { in: plan.categories.map((c) => c.id) } },
          },
          select: { amount: true, investment: { select: { planCategoryId: true } } },
        })
      : [];

    const planPayload = plan
      ? {
          id: plan.id,
          monthlyTargetPaisas: plan.monthlyTarget,
          autoFromSurplus: plan.autoFromSurplus,
          categories: plan.categories.map((c) => ({
            id: c.id,
            name: c.name,
            investmentType: c.investmentType,
            percentage: c.percentage,
            plannedPaisas: Math.round((plan.monthlyTarget * c.percentage) / 100),
            actualPaisas: periodContributions
              .filter((ct) => ct.investment.planCategoryId === c.id)
              .reduce((s, ct) => s + ct.amount, 0),
          })),
        }
      : null;

    return NextResponse.json({
      data: {
        summary: {
          totalInvestedPaisas: totalInvested,
          totalCurrentValuePaisas: totalCurrentValue,
          totalGainPaisas: totalCurrentValue - totalInvested,
        },
        plan: planPayload,
        investments: investments.map(serializeInvestment),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST /api/v1/investments — create a SIP + its first contribution ─────────

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["MUTUAL_FUND", "STOCKS", "GOLD", "CRYPTO", "FIXED_DEPOSIT", "OTHER"]),
  platform: z.string().max(100).default(""),
  investedAmountPaisas: z.number().int().positive(),
  currentValuePaisas: z.number().int().nonnegative().optional(),
  units: z.number().optional(),
  purchaseDate: z.string().min(1),
  notes: z.string().max(1000).optional(),
  customFields: z.string().optional(),
  planCategoryId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;

    // If a plan category is given, verify it belongs to this user's plan.
    if (d.planCategoryId) {
      const owns = await prisma.investmentPlanCategory.findFirst({
        where: { id: d.planCategoryId, plan: { userId: auth.id } },
        select: { id: true },
      });
      if (!owns) return NextResponse.json({ error: "Invalid plan category" }, { status: 400 });
    }

    const firstAmount = d.investedAmountPaisas;
    const purchaseDate = new Date(d.purchaseDate);
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const period = getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const created = await prisma.$transaction(async (tx) => {
      const inv = await tx.investment.create({
        data: {
          name: d.name,
          type: d.type,
          platform: d.platform,
          investedAmount: firstAmount,
          currentValue: d.currentValuePaisas ?? firstAmount,
          units: d.units ?? null,
          purchaseDate,
          notes: d.notes ?? null,
          customFields: d.customFields ?? null,
          planCategoryId: d.planCategoryId ?? null,
          userId: auth.id,
        },
        select: { id: true },
      });
      const transactionId = await bookContributionTransaction(tx, {
        userId: auth.id, investmentName: d.name, amount: firstAmount, date: purchaseDate, notes: "Initial contribution", period,
      });
      await tx.investmentContribution.create({
        data: { investmentId: inv.id, amount: firstAmount, date: purchaseDate, notes: "Initial contribution", transactionId },
      });
      return inv;
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
