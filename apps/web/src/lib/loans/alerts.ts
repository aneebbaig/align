import { isLoanClosed } from "./balance";
import { APP_TIME_ZONE, dayNumber } from "../day";

// Loans due soon or overdue, for the notification bell. Open loans of either
// type, most overdue first.

export interface LoanAlert {
  loanId: string;
  personName: string;
  type: string; // GIVEN (they owe you) | RECEIVED (you owe them)
  amount: number; // remaining, paisas
  dueDate: Date;
  daysUntil: number; // 0 = today, negative = overdue
}

// Overdue loans (negative daysUntil) are always included; upcoming ones only
// within `days`. Days are counted in the household's timezone.
export function upcomingLoanAlerts(
  loans: { id: string; personName: string; type: string; status: string; remainingAmount: number; dueDate: Date | null }[],
  today: Date,
  days = 7,
  timeZone: string = APP_TIME_ZONE,
): LoanAlert[] {
  const todayDay = dayNumber(today, timeZone);
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
        daysUntil: dayNumber(due, timeZone) - todayDay,
      };
    })
    .filter((a) => a.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
