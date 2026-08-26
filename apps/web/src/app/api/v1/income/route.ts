import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";

// ── POST /api/v1/income ───────────────────────────────────────────────────────

const createIncomeSchema = z.object({
  amountPaisas: z.number().int().positive(),
  categoryId: z.string().min(1),
  description: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  date: z.string().min(1),
  // Optional budget-period override. When omitted, the user's open period is used.
  budgetMonth: z.number().int().min(1).max(12).optional(),
  budgetYear: z.number().int().min(2000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const parsed = createIncomeSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { amountPaisas, categoryId, description, notes, date, budgetMonth, budgetYear } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const period = (budgetMonth && budgetYear)
      ? { month: budgetMonth, year: budgetYear }
      : getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);

    const created = await prisma.transaction.create({
      data: {
        amount: amountPaisas,
        type: "INCOME",
        categoryId,
        description,
        notes: notes ?? null,
        date: new Date(date),
        budgetMonth: period.month,
        budgetYear: period.year,
        isRecurring: false,
        tags: "",
        fundingSource: "INCOME",
        userId: auth.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: created.id } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { currentBudgetMonth: true, currentBudgetYear: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const period = getCurrentPeriod(user.currentBudgetMonth, user.currentBudgetYear);
    const { page, limit } = parsed.data;
    const month = parsed.data.month ?? period.month;
    const year = parsed.data.year ?? period.year;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: auth.id, type: "INCOME", budgetMonth: month, budgetYear: year },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          description: true,
          notes: true,
          date: true,
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
      }),
      prisma.transaction.count({
        where: { userId: auth.id, type: "INCOME", budgetMonth: month, budgetYear: year },
      }),
    ]);

    return NextResponse.json({
      data: {
        items: items.map((t) => ({
          id: t.id,
          amountPaisas: t.amount,
          description: t.description,
          notes: t.notes ?? null,
          date: t.date.toISOString(),
          category: t.category,
        })),
        total,
        page,
        hasMore: skip + items.length < total,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
