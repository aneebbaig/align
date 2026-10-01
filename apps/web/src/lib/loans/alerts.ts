import { isLoanClosed } from "./balance";

// Loans coming due soon, for the notification bell. Open loans of either type
// with a due date from today through `days` days ahead, soonest first.

export interface LoanAlert {
  loanId: string;
  personName: string;
  type: string; // GIVEN (they owe you) | RECEIVED (you owe them)
  amount: number; // remaining, paisas
  dueDate: Date;
  daysUntil: number; // 0 = today
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function upcomingLoanAlerts(
  loans: { id: string; personName: string; type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  today: Date,
  days = 7,
): LoanAlert[] {
  const start = startOfDay(today).getTime();
  return loans
    .filter((l) => !isLoanClosed(l.status) && l.dueDate !== null)
    .map((l) => {
      const due = l.dueDate as Date;
      return {
        loanId: l.id,
        personName: l.personName,
        type: l.type,
        amount: l.remainingAmount,
        dueDate: due,
        daysUntil: Math.round((startOfDay(due).getTime() - start) / DAY),
      };
    })
    .filter((a) => a.daysUntil >= 0 && a.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
