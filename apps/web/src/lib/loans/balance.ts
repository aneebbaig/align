// Pure loan balance rules - no DB. principalAmount = original + top-ups;
// remainingAmount = principal - repaid - written off.

export type LoanEntryKind = "PAYMENT" | "TOP_UP" | "WRITE_OFF";

// Closed loans drop out of forecasts, net position, and due-date reminders.
export const CLOSED_LOAN_STATUSES: string[] = ["PAID", "WRITTEN_OFF"];

export function isLoanClosed(status: string): boolean {
  return CLOSED_LOAN_STATUSES.includes(status);
}

export function loanStatusFor(remaining: number, principal: number, hasWriteOff = false): string {
  if (remaining <= 0) return hasWriteOff ? "WRITTEN_OFF" : "PAID";
  if (remaining >= principal) return "ACTIVE";
  return "PARTIALLY_PAID";
}

// A write-off only books an expense when that's the first time the loss hits
// the budget: money you lent, where lending it booked nothing ("track only").
// Otherwise the amount was already counted when the loan was created.
export function offersWriteOffExpense(loan: { type: string; transactionId: string | null }): boolean {
  return loan.type === "GIVEN" && loan.transactionId === null;
}

export interface LoanBalance {
  principalAmount: number;
  remainingAmount: number;
}

interface Entry {
  kind: LoanEntryKind;
  amount: number;
}

export function applyLoanEntry(b: LoanBalance, e: Entry): LoanBalance | { error: string } {
  if (!Number.isInteger(e.amount) || e.amount <= 0) return { error: "Amount must be greater than zero" };
  if (e.kind === "TOP_UP") {
    return { principalAmount: b.principalAmount + e.amount, remainingAmount: b.remainingAmount + e.amount };
  }
  if (e.amount > b.remainingAmount) return { error: "That's more than what's left on this loan" };
  return { principalAmount: b.principalAmount, remainingAmount: b.remainingAmount - e.amount };
}

export function reverseLoanEntry(b: LoanBalance, e: Entry): LoanBalance | { error: string } {
  if (e.kind === "TOP_UP") {
    if (b.remainingAmount - e.amount < 0) {
      return { error: "Can't remove this - more than that has already been repaid or written off" };
    }
    return { principalAmount: b.principalAmount - e.amount, remainingAmount: b.remainingAmount - e.amount };
  }
  return { principalAmount: b.principalAmount, remainingAmount: Math.min(b.principalAmount, b.remainingAmount + e.amount) };
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
