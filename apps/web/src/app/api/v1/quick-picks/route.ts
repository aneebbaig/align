import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBearerAuth } from "@/lib/v1-auth";
import { loadQuickPicks } from "@/lib/expenses/quick-picks-data";

// ── GET /api/v1/quick-picks?type=EXPENSE|INCOME ───────────────────────────────
// The one-tap shortcuts the add form offers (frequent repeats, top categories,
// recent descriptions) - the same picks the web form shows.

const querySchema = z.object({ type: z.enum(["EXPENSE", "INCOME"]).default("EXPENSE") });

export async function GET(req: NextRequest) {
  const auth = await requireBearerAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  try {
    const picks = await loadQuickPicks(auth.id, parsed.data.type);
    return NextResponse.json({
      data: {
        repeats: picks.repeats.map((r) => ({
          description: r.description,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          categoryColor: r.categoryColor,
          lastAmountPaisas: r.lastAmount,
          fundingSource: r.fundingSource ?? null,
          fundingPotId: r.fundingPotId ?? null,
          fundingCurrencyId: r.fundingCurrencyId ?? null,
        })),
        topCategoryIds: picks.topCategoryIds,
        descriptions: picks.descriptions,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
