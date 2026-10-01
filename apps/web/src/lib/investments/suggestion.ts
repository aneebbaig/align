// ─── Investment contribution suggestion ─────────────────────────────────────
// Pure math: no DB, no dates beyond what's handed in. src/actions/savings.ts
// fetches the inputs and calls this.
//
//   suggestedTotal = max(0, income − obligationsDue − bufferUnmet)
//   bufferUnmet    = max(0, bufferTarget − bufferCurrent)
//   per category   = suggestedTotal x category.percentage / 100

import { isLoanClosed } from "../loans/balance";

type Money = number; // integer, smallest unit (paisas)

export interface SuggestionCategoryInput {
  id: string;
  name: string;
  investmentType: string | null;
  percentage: number; // 0-100
  actualAmount: Money; // already invested this cycle, matched by caller
}

export interface SuggestionInput {
  monthlyIncome: Money;
  obligationsDue: Money;
  bufferTarget: Money;
  bufferCurrent: Money;
  categories: SuggestionCategoryInput[];
}

export interface SuggestionCategoryResult extends SuggestionCategoryInput {
  plannedAmount: Money;
}

export interface SuggestionResult {
  bufferUnmet: Money;
  suggestedTotal: Money;
  categories: SuggestionCategoryResult[];
}

export function computeInvestmentSuggestion(input: SuggestionInput): SuggestionResult {
  const bufferUnmet = Math.max(0, input.bufferTarget - input.bufferCurrent);
  const suggestedTotal = Math.max(0, input.monthlyIncome - input.obligationsDue - bufferUnmet);

  const categories = input.categories.map((c) => ({
    ...c,
    plannedAmount: Math.round((suggestedTotal * c.percentage) / 100),
  }));

  return { bufferUnmet, suggestedTotal, categories };
}

// Money owed back this month: what's left on borrowed loans that are still
// open and due in the given budget month. Subtracted before suggesting how
// much to invest, so the suggestion never spends money that has to be repaid.
export function loansDueThisMonth(
  loans: { type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  month: number,
  year: number,
): number {
  return loans
    .filter((l) => l.type === "RECEIVED" && !isLoanClosed(l.status) && l.dueDate !== null
      && l.dueDate.getMonth() + 1 === month && l.dueDate.getFullYear() === year)
    .reduce((sum, l) => sum + l.remainingAmount, 0);
}
