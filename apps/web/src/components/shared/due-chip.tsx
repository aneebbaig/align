import { format, differenceInCalendarDays } from "date-fns";
import { AlertCircle, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/** A due date that says how urgent it is: overdue (red), within a week (amber), otherwise calm. */
export function DueChip({ date, className }: { date: Date | string; className?: string }) {
  const d = new Date(date);
  const days = differenceInCalendarDays(d, new Date());
  const [Icon, tone, text] =
    days < 0 ? [AlertCircle, "text-red-500 dark:text-red-400", `Overdue · ${format(d, "d MMM")}`]
    : days <= 7 ? [Clock, "text-amber-600 dark:text-amber-400", days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`]
    : [CalendarDays, "text-muted-foreground", `Due ${format(d, "d MMM")}`];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs whitespace-nowrap", tone, className)}>
      <Icon className="h-3 w-3" />{text}
    </span>
  );
}
