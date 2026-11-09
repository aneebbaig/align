import { prisma } from "@/lib/prisma";
import { creditPot, type PotEntryPeriod } from "@/lib/pot-helpers";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { fetchMonthIncomeIntegrityData, baseIntegrity } from "@/lib/income-helpers";

// Deleting a transaction, shared by the web action and the v1 (mobile) DELETE
// routes so both give pot money back and both refuse to strand spending.

export async function deleteTransactionCore(
  userId: string,
  id: string,
  type?: "INCOME" | "EXPENSE",
): Promise<{ error?: string; notFound?: boolean }> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId, ...(type ? { type } : {}) },
    include: { fundingSources: true },
  });
  if (!existing) return { error: "Not found", notFound: true };

  const period: PotEntryPeriod = { budgetMonth: existing.budgetMonth, budgetYear: existing.budgetYear };

  // Income can't go if that month's expenses and deposits were funded from it.
  if (existing.type === "INCOME") {
    const integrity = await fetchMonthIncomeIntegrityData(userId, existing.budgetMonth, existing.budgetYear);
    const base = baseIntegrity(integrity);
    const remainingIncome = base.totalIncome - existing.amount;
    if (remainingIncome < base.expenses + base.potDeposits) {
      const deficit = base.expenses + base.potDeposits - remainingIncome;
      const baseCurrency = await getBaseCurrency();
      return { error: `Cannot delete - ${baseCurrency.symbol} ${(deficit / 100).toLocaleString()} in expenses/savings this month depend on this income. Remove those first.` };
    }
    if (existing.nativeCurrencyId && (existing.nativeAmount ?? 0) > 0) {
      const native = integrity.perCurrency.find((c) => c.currencyId === existing.nativeCurrencyId);
      if (native) {
        const remainingNative = native.totalIncome - (existing.nativeAmount ?? 0);
        if (remainingNative < native.potDeposits) {
          const deficit = native.potDeposits - remainingNative;
          return { error: `Cannot delete - ${native.symbol} ${(deficit / 100).toFixed(2)} in savings depends on this ${native.code} income. Remove those pot deposits first.` };
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (existing.type === "EXPENSE") {
      if (existing.fundingSource === "SAVINGS_POT" && existing.fundingPotId && existing.fundingAmount && existing.fundingCurrencyId) {
        await creditPot(tx, existing.fundingPotId, existing.fundingAmount, existing.fundingCurrencyId, `Deleted expense reversal: ${existing.description}`, "MANUAL", period);
      } else if (existing.fundingSource === "SPLIT") {
        for (const row of existing.fundingSources) {
          if (row.source === "SAVINGS_POT" && row.potId && row.potAmount && row.currencyId) {
            await creditPot(tx, row.potId, row.potAmount, row.currencyId, `Reversal: ${existing.description}`, "MANUAL", period);
          }
        }
      }
    }
    await tx.transaction.delete({ where: { id } });
  });

  return {};
}
