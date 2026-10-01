// ─── Investment contribution suggestion ─────────────────────────────────────
// Pure math: no DB, no dates beyond what's handed in. src/actions/savings.ts
// fetches the inputs and calls this.
//
//   suggestedTotal = max(0, income − obligationsDue − bufferUnmet)
//   bufferUnmet    = max(0, bufferTarget − bufferCurrent)
//   per category   = suggestedTotal x category.percentage / 100

import { isLoanClosed } from "../loans/balance";
import { APP_TIME_ZONE, dayNumber, lastDayOfMonth } from "../day";

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

// Money owed back by the end of this budget month: what's left on borrowed
// loans that are still open and due on or before its last day - overdue ones
// included (they still have to be repaid), and so are loans due in the days
// before an early-started budget month. Subtracted before suggesting how much
// to invest, so the suggestion never spends money that has to go back.
export function loansDueThisMonth(
  loans: { type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  month: number,
  year: number,
  timeZone: string = APP_TIME_ZONE,
): number {
  const lastDay = lastDayOfMonth(month, year);
  return loans
    .filter((l) => l.type === "RECEIVED" && !isLoanClosed(l.status) && l.dueDate !== null
      && dayNumber(l.dueDate, timeZone) <= lastDay)
    .reduce((sum, l) => sum + l.remainingAmount, 0);
}
