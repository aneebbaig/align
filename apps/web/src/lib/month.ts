// Budget periods are event-driven: a transaction is filed under the user's "open period"
// (User.currentBudgetMonth / currentBudgetYear), advanced manually when salary lands.
// Period is decoupled from the calendar `date`, so no day-of-month cutoff math lives here.

/** The user's currently-open budget period. Falls back to the calendar month if unset. */
export function getCurrentPeriod(
  currentBudgetMonth?: number | null,
  currentBudgetYear?: number | null,
): { month: number; year: number } {
  if (currentBudgetMonth != null && currentBudgetYear != null) {
    return { month: currentBudgetMonth, year: currentBudgetYear };
  }
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** The period immediately after the given one. */
export function nextPeriod(month: number, year: number): { month: number; year: number } {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

/** The period immediately before the given one. */
export function prevPeriod(month: number, year: number): { month: number; year: number } {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

/**
 * Calendar-month date range. Use ONLY for genuine calendar analytics (e.g. the multi-month
 * trend chart) - NOT for budget-period bucketing, which filters on budgetMonth/budgetYear.
 */
export function getCalendarMonthRange(month: number, year: number) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}
