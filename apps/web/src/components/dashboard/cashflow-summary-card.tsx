import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CashflowMonthSummary } from "@/actions/cashflow";
import type { UpcomingDue } from "@/lib/cashflow/adapter";

const fmt = (n: number) => n.toLocaleString();

export function CashflowSummaryCard({
  summary,
  upcoming,
  baseSymbol = "Rs",
}: {
  summary: CashflowMonthSummary;
  upcoming: UpcomingDue[];
  baseSymbol?: string;
}) {
  const { dueTotal, leftAfterObligations, flagged, shortfall, soonest } = summary;

  return (
    <div className={cn(
      "rounded-xl border p-5 space-y-3",
      flagged ? "border-red-500/40 bg-red-500/5" : "border-border bg-card",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className={cn("h-4 w-4", flagged ? "text-red-500" : "text-muted-foreground")} />
          <h3 className="font-semibold text-foreground">This Month</h3>
        </div>
        <Link href="/loans" className="text-xs text-primary hover:underline">View loans</Link>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">
        <span className="font-semibold tabnum">{baseSymbol} {fmt(dueTotal / 100)}</span> due this month
        {soonest && (
          <>
            {" · "}
            <span className="font-semibold tabnum">{baseSymbol} {fmt(soonest.amount / 100)}</span> to{" "}
            <span className="font-medium">{soonest.payee}</span> on{" "}
            <span className="font-medium">{format(soonest.dueDate, "d MMM")}</span>
          </>
        )}
        {" · "}
        {leftAfterObligations >= 0 ? (
          <><span className="font-semibold tabnum text-emerald-500">{baseSymbol} {fmt(leftAfterObligations / 100)}</span> left after obligations</>
        ) : (
          <><span className="font-semibold tabnum text-red-500">{baseSymbol} {fmt(Math.abs(leftAfterObligations) / 100)}</span> short after obligations</>
        )}
      </p>

      {flagged && (
        <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{baseSymbol} {fmt(shortfall / 100)} over your reliable income floor this month.</span>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">Coming up</p>
          {upcoming.slice(0, 4).map((item) => (
            <div key={`${item.sourceId}-${item.dueDate.getTime()}`} className="flex items-center justify-between text-sm">
              <span className="text-foreground/80">
                {item.payee} <span className="text-xs text-muted-foreground">· {item.daysUntil === 0 ? "today" : item.daysUntil === 1 ? "tomorrow" : `in ${item.daysUntil}d`}</span>
              </span>
              <span className="font-medium tabnum">{baseSymbol} {fmt(item.amount / 100)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
