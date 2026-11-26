"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { STATUS_FILTERS, matchesSearch, matchesStatus, statusCounts, type StatusFilter } from "@/lib/wedding/filters";
import { sumTotals } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { ExpenseRow, ROW_COLS, type SheetSection, type Tip } from "./expense-row";
import { WeddingEvent, WeddingExpense, fmt, getEventInfo, getExpenseCategoryLabel } from "./wedding-types";

export type GroupBy = "none" | "event" | "category";

/**
 * Search box + always-visible status chips (with counts) + the rows, optionally grouped
 * by event or category with per-group totals. `rows` is already scoped by the caller.
 */
export function ExpenseList({ rows, events, sym, showEvent, groupable, tipFor, scope, empty, onOpen, onChanged }: {
  rows: WeddingExpense[]; events: WeddingEvent[]; sym: string; showEvent?: boolean;
  /** Offer the Event | Category grouping toggle. */
  groupable?: boolean;
  tipFor?: (e: WeddingExpense) => Tip;
  /** Active scope chips (selected event, category) shown above the list. */
  scope?: React.ReactNode;
  empty?: React.ReactNode;
  onOpen: (id: string, section?: SheetSection) => void; onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [groupBy, setGroupBy] = useState<Exclude<GroupBy, "none">>("event");

  const searched = useMemo(() => rows.filter((r) => matchesSearch(r, query)), [rows, query]);
  const counts = useMemo(() => statusCounts(searched), [searched]);
  const shown = useMemo(() => searched.filter((r) => matchesStatus(r, status)), [searched, status]);

  const groups = useMemo(() => {
    if (!groupable) return [{ key: "all", title: null as string | null, rows: shown }];
    const map = new Map<string, WeddingExpense[]>();
    for (const r of shown) {
      const k = groupBy === "event" ? r.eventId : r.category;
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    const title = (k: string) => {
      if (groupBy === "category") return getExpenseCategoryLabel(k);
      const ev = events.find((x) => x.id === k);
      return ev ? `${getEventInfo(ev.type).emoji} ${ev.name}` : k;
    };
    const out = [...map].map(([key, r]) => ({ key, title: title(key), rows: r }));
    if (groupBy === "category") return out.sort((a, b) => sumTotals(b.rows).projected - sumTotals(a.rows).projected);
    const order = (k: string) => events.findIndex((x) => x.id === k);
    return out.sort((a, b) => order(a.key) - order(b.key));
  }, [shown, groupable, groupBy, events]);

  const showHeader = shown.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 basis-48 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, vendor, notes" aria-label="Search expenses" className="h-9 pl-8 pr-8" />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          )}
        </div>
        {groupable && (
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Group by">
            <span className="px-2 text-xs text-muted-foreground">Group</span>
            {(["event", "category"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => setGroupBy(g)}
                className={cn("px-3 h-7 text-xs rounded-md transition-colors capitalize", groupBy === g ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{g}</button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={status === f.value} onClick={() => setStatus(f.value)}
            className={cn("inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs transition-colors",
              status === f.value ? "bg-foreground text-background border-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30")}>
            {f.label}<span className="tabular-nums opacity-70">{counts[f.value]}</span>
          </button>
        ))}
      </div>

      {scope}

      {rows.length === 0 ? empty ?? <p className="text-sm text-muted-foreground text-center py-6">Nothing here yet.</p>
        : shown.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nothing matches.</p>
        : (
          <div className="space-y-4">
            {showHeader && (
              <div className="hidden sm:flex items-center gap-3 px-4 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="flex-1">Expense</span>
                <span className="flex items-center gap-2">
                  <span className={cn(ROW_COLS.amount, "text-right pr-2")}>Estimate</span>
                  <span className={cn(ROW_COLS.amount, "text-right pr-2")}>Actual</span>
                  <span className={cn(ROW_COLS.pill, "text-center")}>Status</span>
                  <span className="w-[4.25rem]" />
                </span>
              </div>
            )}
            {groups.map((g) => {
              const t = sumTotals(g.rows);
              return (
                <div key={g.key} className="space-y-1.5">
                  {g.title && (
                    <div className="flex items-baseline justify-between gap-3 px-1">
                      <p className="text-sm font-medium truncate">{g.title} <span className="text-xs font-normal text-muted-foreground">{t.count}</span></p>
                      <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                        Planned {fmt(t.projected, sym)} · Paid {fmt(t.paid, sym)} · To pay {fmt(t.outstanding, sym)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-card divide-y divide-border">
                    {g.rows.map((e) => (
                      <ExpenseRow key={e.id} expense={e} events={events} sym={sym} showEvent={showEvent && !(groupable && groupBy === "event")} tip={tipFor?.(e) ?? null} onOpen={onOpen} onChanged={onChanged} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
