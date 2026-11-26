import { prisma } from "@/lib/prisma";
import { rankRepeats, topCategoryIds, recentDescriptions } from "@/lib/expenses/quick-picks";

// Loads what the add form offers as one-tap shortcuts, from the last 120 days
// of one type. Shared by the web action (getQuickPicks) and
// GET /api/v1/quick-picks so the web and the phone offer the same picks.
// Entries owned by a loan, loan payment or investment are left out: they are
// changed there, not repeated from the add form.
export async function loadQuickPicks(userId: string, type: "EXPENSE" | "INCOME") {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const rows = await prisma.transaction.findMany({
    where: {
      userId, type, date: { gte: since },
      loanPrincipalOf: null, loanPaymentOf: null, investmentContributionOf: null,
    },
    select: {
      description: true, categoryId: true, amount: true,
      fundingSource: true, fundingPotId: true, fundingCurrencyId: true,
      category: { select: { name: true, color: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const cat = new Map(rows.map((r) => [r.categoryId, r.category]));
  const isExpense = type === "EXPENSE";
  const repeats = rankRepeats(rows.map((r) => ({ ...r, ...(isExpense ? {} : { fundingSource: undefined }) }))).map((p) => ({
    ...p,
    categoryName: cat.get(p.categoryId)?.name ?? "",
    categoryColor: cat.get(p.categoryId)?.color ?? "#888888",
  }));
  return {
    repeats,
    topCategoryIds: topCategoryIds(rows),
    descriptions: recentDescriptions(rows),
  };
}
