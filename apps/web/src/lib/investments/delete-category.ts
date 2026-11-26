import { prisma } from "@/lib/prisma";
import { deleteContributionTransactionsFor } from "@/lib/investment-contributions";

/**
 * Deletes an investment-plan category together with its investment(s) and the
 * expense/income entries their contributions booked, in one transaction. The
 * other categories keep their percentages. Returns false when the category is
 * not in the household's plan.
 */
export async function deleteInvestmentCategoryCore(householdId: string, planCategoryId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const category = await tx.investmentPlanCategory.findFirst({
      where: { id: planCategoryId, plan: { userId: householdId } },
      select: { id: true },
    });
    if (!category) return false;
    const investments = await tx.investment.findMany({
      where: { planCategoryId, userId: householdId },
      select: { id: true },
    });
    const ids = investments.map((i) => i.id);
    if (ids.length > 0) {
      await deleteContributionTransactionsFor(tx, ids);
      await tx.investment.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.investmentPlanCategory.delete({ where: { id: planCategoryId } });
    return true;
  });
}
