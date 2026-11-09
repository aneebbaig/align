import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toLocalDate } from "@/lib/utils";
import { creditPot, debitPot, type PotEntryPeriod } from "@/lib/pot-helpers";
import { getBaseCurrency } from "@/lib/currency-helpers";
import { fetchMonthIncomeIntegrityData, baseIntegrity } from "@/lib/income-helpers";
import { MAX_FUNDING_SOURCES } from "@/lib/constants";
import { validateFundingSources, getPotUnits, type FundingSource } from "@/lib/expenses/funding";

// Editing a transaction, shared by the web server action and the v1 (mobile)
// PATCH routes. Every figure the transaction feeds - the month's budget spend,
// income available, pot balances and the pot ledger - is reversed and re-applied
// inside one database transaction, after checking the new state is still funded.

export interface TransactionEditInput {
  amountPaisas: number;
  categoryId: string;
  description: string;
  notes?: string | null;
  date: string;
  // Re-file under another budget period. Omitted = keep the current one.
  budgetMonth?: number;
  budgetYear?: number;
  isRecurring?: boolean;
  recurringFrequency?: string | null;
  tags?: string;
  isRegretPurchase?: boolean;
  // Income entered in a non-base currency: the amount in that currency (smallest unit).
  nativeAmountPaisas?: number;
  // Expense funding. Omitted = keep the current funding (re-applied at the new amount).
  fundingSource?: "INCOME" | "SAVINGS_POT";
  fundingPotId?: string;
  fundingCurrencyId?: string;
  splitSources?: FundingSource[];
}

type Result = { error?: string };

async function creditOldFunding(
  tx: Prisma.TransactionClient,
  existing: {
    description: string; fundingSource: string; fundingPotId: string | null; fundingAmount: number | null; fundingCurrencyId: string | null;
    fundingSources: { source: string; potId: string | null; currencyId: string | null; potAmount: number | null }[];
  },
  period: PotEntryPeriod,
) {
  if (existing.fundingSource === "SAVINGS_POT" && existing.fundingPotId && existing.fundingAmount && existing.fundingCurrencyId) {
    await creditPot(tx, existing.fundingPotId, existing.fundingAmount, existing.fundingCurrencyId, `Reversal: ${existing.description}`, "MANUAL", period);
  } else if (existing.fundingSource === "SPLIT") {
    for (const row of existing.fundingSources) {
      if (row.source === "SAVINGS_POT" && row.potId && row.potAmount && row.currencyId) {
        await creditPot(tx, row.potId, row.potAmount, row.currencyId, `Reversal: ${existing.description}`, "MANUAL", period);
      }
    }
  }
}

export async function updateTransactionCore(userId: string, id: string, input: TransactionEditInput): Promise<Result> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      fundingSources: true,
      loanPrincipalOf: { select: { id: true } },
      loanPaymentOf: { select: { id: true } },
      investmentContributionOf: { select: { id: true } },
    },
  });
  if (!existing) return { error: "Not found" };

  const base = await getBaseCurrency();
  const isExpense = existing.type === "EXPENSE";
  const oldPeriod: PotEntryPeriod = { budgetMonth: existing.budgetMonth, budgetYear: existing.budgetYear };

  // Owned by a loan, loan payment or investment: its amount, period and funding
  // belong to that record, so changing them here would leave it out of step.
  const owned = !!(existing.loanPrincipalOf || existing.loanPaymentOf || existing.investmentContributionOf);
  if (owned) {
    if (input.amountPaisas !== existing.amount) {
      return { error: "This entry belongs to a loan or investment - change its amount there." };
    }
    if (input.budgetMonth && input.budgetYear && (input.budgetMonth !== existing.budgetMonth || input.budgetYear !== existing.budgetYear)) {
      return { error: "This entry belongs to a loan or investment - its budget period can't be moved here." };
    }
  }

  const newPeriod: PotEntryPeriod = owned || !(input.budgetMonth && input.budgetYear)
    ? oldPeriod
    : { budgetMonth: input.budgetMonth, budgetYear: input.budgetYear };
  const amount = owned ? existing.amount : input.amountPaisas;
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Amount must be positive" };
  const samePeriod = newPeriod.budgetMonth === oldPeriod.budgetMonth && newPeriod.budgetYear === oldPeriod.budgetYear;

  // ── income ──────────────────────────────────────────────────────────────
  if (!isExpense) {
    if (existing.nativeCurrencyId && input.nativeAmountPaisas == null && amount !== existing.amount) {
      return { error: "This income was entered in another currency - change its amount in that currency." };
    }
    const nativeEdited = !!existing.nativeCurrencyId && input.nativeAmountPaisas != null;
    const newNative = nativeEdited ? input.nativeAmountPaisas! : existing.nativeAmount;
    if (nativeEdited && newNative! <= 0) return { error: "Amount must be positive" };

    // The month it leaves (or shrinks in) must still cover what was spent from it.
    const oldInt = await fetchMonthIncomeIntegrityData(userId, oldPeriod.budgetMonth, oldPeriod.budgetYear);
    const oldBase = baseIntegrity(oldInt);
    const keptBase = samePeriod ? amount : 0;
    if (keptBase < existing.amount) {
      const left = oldBase.totalIncome - existing.amount + keptBase;
      if (left < oldBase.expenses + oldBase.potDeposits) {
        const deficit = oldBase.expenses + oldBase.potDeposits - left;
        return { error: `Cannot reduce or move this income - ${base.symbol} ${(deficit / 100).toLocaleString()} in expenses/savings that month would be left unfunded.` };
      }
    }
    if (existing.nativeCurrencyId && (existing.nativeAmount ?? 0) > 0) {
      const native = oldInt.perCurrency.find((c) => c.currencyId === existing.nativeCurrencyId);
      const keptNative = samePeriod ? (newNative ?? 0) : 0;
      if (native && keptNative < (existing.nativeAmount ?? 0)) {
        const left = native.totalIncome - (existing.nativeAmount ?? 0) + keptNative;
        if (left < native.potDeposits) {
          return { error: `Cannot reduce or move this income - ${native.symbol} ${((native.potDeposits - left) / 100).toFixed(2)} in savings depends on this ${native.code} income.` };
        }
      }
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        categoryId: input.categoryId,
        description: input.description,
        notes: input.notes ?? null,
        date: toLocalDate(input.date),
        budgetMonth: newPeriod.budgetMonth,
        budgetYear: newPeriod.budgetYear,
        ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring, recurringFrequency: input.recurringFrequency ?? null } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(nativeEdited ? { nativeAmount: newNative, exchangeRateUsed: amount / newNative! } : {}),
      },
    });
    return {};
  }

  // ── expense ─────────────────────────────────────────────────────────────
  type Funding = { sources: FundingSource[]; split: boolean };
  let funding: Funding;
  if (input.splitSources && input.splitSources.length > 1) {
    funding = { sources: input.splitSources, split: true };
  } else if (input.splitSources?.length === 1) {
    funding = { sources: [{ ...input.splitSources[0], pkrAmount: amount }], split: false };
  } else if (input.fundingSource) {
    funding = { sources: [{ source: input.fundingSource, potId: input.fundingPotId, currencyId: input.fundingCurrencyId, pkrAmount: amount }], split: false };
  } else if (existing.fundingSource === "SPLIT") {
    if (amount !== existing.amount) return { error: "This expense is split across sources - set the new split when changing its amount." };
    funding = {
      sources: [...existing.fundingSources].sort((a, b) => a.priority - b.priority).map((r) => ({
        source: r.source as "INCOME" | "SAVINGS_POT", potId: r.potId ?? undefined, currencyId: r.currencyId ?? undefined, pkrAmount: r.pkrAmount,
      })),
      split: true,
    };
  } else if (existing.fundingSource === "SAVINGS_POT") {
    funding = { sources: [{ source: "SAVINGS_POT", potId: existing.fundingPotId ?? undefined, currencyId: existing.fundingCurrencyId ?? undefined, pkrAmount: amount }], split: false };
  } else {
    funding = { sources: [{ source: "INCOME", pkrAmount: amount }], split: false };
  }

  if (funding.sources.length > MAX_FUNDING_SOURCES) return { error: `Maximum ${MAX_FUNDING_SOURCES} funding sources` };
  if (funding.sources.reduce((s, x) => s + x.pkrAmount, 0) !== amount) return { error: "Funding amounts must add up to the expense total" };

  // Owned expenses keep their funding as is, so there is nothing new to validate.
  const fundingChanged = !owned;
  if (fundingChanged) {
    const err = await validateFundingSources(userId, funding.sources, newPeriod.budgetMonth, newPeriod.budgetYear, id);
    if (err) return { error: err };
  }

  const first = funding.sources[0];
  const single = !funding.split && first.source === "SAVINGS_POT" ? first : null;
  const singleCurrency = single?.currencyId ? await prisma.currency.findUnique({ where: { id: single.currencyId } }) : null;
  const singleUnits = singleCurrency ? getPotUnits(amount, singleCurrency) : null;
  const newFundingSource = funding.split ? "SPLIT" : single ? "SAVINGS_POT" : "INCOME";

  await prisma.$transaction(async (tx) => {
    if (fundingChanged) {
      await creditOldFunding(tx, existing, oldPeriod);
      await tx.transactionFundingSource.deleteMany({ where: { transactionId: id } });
    }

    await tx.transaction.update({
      where: { id },
      data: {
        amount,
        categoryId: input.categoryId,
        description: input.description,
        notes: input.notes ?? null,
        date: toLocalDate(input.date),
        budgetMonth: newPeriod.budgetMonth,
        budgetYear: newPeriod.budgetYear,
        ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring, recurringFrequency: input.recurringFrequency ?? null } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.isRegretPurchase !== undefined ? { isRegretPurchase: input.isRegretPurchase } : {}),
        ...(fundingChanged
          ? {
              fundingSource: newFundingSource,
              fundingPotId: single?.potId ?? null,
              fundingCurrencyId: singleCurrency?.id ?? null,
              fundingAmount: singleUnits,
            }
          : {}),
      },
    });

    if (!fundingChanged) return;
    const entryDescription = `Expense: ${input.description}`;
    if (funding.split) {
      for (let i = 0; i < funding.sources.length; i++) {
        const src = funding.sources[i];
        const isPot = src.source === "SAVINGS_POT" && !!src.currencyId;
        const currency = isPot ? await tx.currency.findUnique({ where: { id: src.currencyId! } }) : null;
        const units = currency ? getPotUnits(src.pkrAmount, currency) : null;
        await tx.transactionFundingSource.create({
          data: {
            transactionId: id, priority: i + 1, source: src.source, potId: src.potId ?? null,
            currencyId: isPot ? src.currencyId : null, potAmount: units, pkrAmount: src.pkrAmount,
          },
        });
        if (src.source === "SAVINGS_POT" && src.potId && src.currencyId && units) {
          await debitPot(tx, src.potId, units, src.currencyId, entryDescription, "MANUAL", newPeriod);
        }
      }
    } else if (single?.potId && single.currencyId && singleUnits) {
      await debitPot(tx, single.potId, singleUnits, single.currencyId, entryDescription, "MANUAL", newPeriod);
    }
  });

  return {};
}
