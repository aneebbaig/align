import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearerAuth } from "@/lib/v1-auth";
import { getCurrentPeriod } from "@/lib/month";
import { getFundingContextForMonth } from "@/lib/expenses/funding";

// ── GET /api/v1/expenses/funding-context ──────────────────────────────────────
// Income-available + pot balances for a target budget period. Mobile calls
// this reactively (keyed on month/year) so the "pay from" preview never goes
// stale when the date-budget checkbox targets a different period than the
// user's current open one - mirrors the web app's `getExpenseFundingContext`.

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
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
    const month = parsed.data.month ?? period.month;
    const year = parsed.data.year ?? period.year;

    const ctx = await getFundingContextForMonth(auth.id, month, year);

    return NextResponse.json({
      data: {
        monthlyIncomeAvailablePaisas: ctx.monthlyIncomeAvailable,
        pots: ctx.pots.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          balances: p.balances.map((b) => ({
            amountPaisas: b.amount,
            currency: { id: b.currency.id, code: b.currency.code, symbol: b.currency.symbol, isBase: b.currency.isBase },
          })),
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
