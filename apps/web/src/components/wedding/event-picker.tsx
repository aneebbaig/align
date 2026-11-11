"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { budgetStatus, costOf, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BUDGET_TONE, budgetCopy } from "./budget-meter";
import { WeddingEvent, WeddingExpense, getEventInfo } from "./wedding-types";
import { format } from "date-fns";

export const GENERAL = "GENERAL";

/**
 * Pick the event an expense belongs to ("Whole wedding" or one event). Each
 * option shows what that event's budget would look like AFTER the expense lands
 * there, so you see the effect before committing.
 */
export function EventPicker({ open, onOpenChange, events, expenses, totalBudget, symbol, currentValue, cost, adding, onPick, onNewEvent, children, align = "start" }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  events: WeddingEvent[]; expenses: WeddingExpense[]; totalBudget: number; symbol: string;
  /** GENERAL or an event id - the expense's current home (ignored when `adding`). */
  currentValue: string;
  /** What the expense costs (or its typed estimate), used for the "after" figures. */
  cost: number;
  /** True for a not-yet-created expense: its cost isn't in any event yet. */
  adding?: boolean;
  onPick: (value: string) => void;
  onNewEvent?: () => void;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const spent = (id: string | null) => expenses.filter((e) => e.eventId === id).reduce((s, e) => s + costOf(e), 0);
    const general = { value: GENERAL, label: "Whole wedding", emoji: "💍", sub: "", budget: Math.max(0, unallocated(totalBudget, events)) * (totalBudget > 0 ? 1 : 0), projected: spent(null) };
    const rest = [...events].sort((a, b) => a.order - b.order).map((ev) => ({
      value: ev.id, label: ev.name, emoji: getEventInfo(ev.type).emoji,
      sub: ev.date ? format(new Date(ev.date), "d MMM") : "", budget: ev.budgetAllocated, projected: spent(ev.id),
    }));
    return [general, ...rest].map((o) => ({ ...o, after: o.projected + (!adding && currentValue === o.value ? 0 : cost) }));
  }, [events, expenses, totalBudget, currentValue, cost, adding]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const rows = filtered.length + (onNewEvent ? 1 : 0);

  function choose(i: number) {
    if (i < filtered.length) { onPick(filtered[i].value); onOpenChange(false); }
    else if (onNewEvent) { onOpenChange(false); onNewEvent(); }
  }

  return (
    <Popover open={open} onOpenChange={(o) => { onOpenChange(o); if (o) { setQ(""); setActive(0); } }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-1.5">
        <div className="relative mb-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); choose(active); }
            }}
            placeholder="Type an event"
            className="w-full h-8 rounded-md bg-muted/50 pl-7 pr-2 text-sm outline-none focus:bg-muted"
          />
        </div>
        <div className="max-h-64 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
          {filtered.map((o, i) => {
            const st = budgetStatus(o.after, o.budget);
            const current = !adding && currentValue === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn("w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left", i === active && "bg-muted")}
              >
                <span className="text-base leading-none">{o.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">{o.label}{o.sub && <span className="text-muted-foreground"> · {o.sub}</span>}</span>
                  {o.value === GENERAL && o.budget === 0 ? null : (
                    <span className={cn("block text-[11px]", BUDGET_TONE[st.state].text)}>
                      {st.state === "none" ? "No budget" : `${budgetCopy(o.after, o.budget, symbol, true)}${current ? "" : " after"}`}
                    </span>
                  )}
                </span>
                {current && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No event matches.</p>}
        </div>
        {onNewEvent && (
          <button
            type="button"
            onMouseEnter={() => setActive(filtered.length)}
            onClick={() => choose(filtered.length)}
            className={cn("mt-1 w-full flex items-center gap-2 rounded-md border-t border-border px-2 py-2 text-sm text-primary text-left", active === filtered.length && "bg-muted")}
          >
            <Plus className="h-3.5 w-3.5" />New event…
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
