"use client";

import { groupTotals, sumTotals } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { WeddingPlan, fmt, getExpenseCategoryLabel } from "./wedding-types";

/** Where the money goes by category, plus the plan's notes. (Per-event numbers live with the events themselves.) */
export function Insights({ plan, baseSymbol: sym, activeCategory, onPickCategory, onEditNotes }: {
  plan: WeddingPlan; baseSymbol: string; activeCategory: string | null; onPickCategory: (c: string) => void; onEditNotes: () => void;
}) {
  const total = sumTotals(plan.expenses).projected;
  const byCategory = [...groupTotals(plan.expenses, (e) => e.category)].sort((a, b) => b[1].projected - a[1].projected);
  if (plan.expenses.length === 0 && !plan.notes) return null;

  return (
    <details className="group/ins md:[&>summary]:hidden" open>
      <summary className="cursor-pointer text-sm font-semibold py-1 md:hidden">Insights</summary>
      <div className="grid md:grid-cols-2 gap-4 mt-2 md:mt-0">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">By category</h3>
          {byCategory.length === 0 ? <p className="text-xs text-muted-foreground">Nothing yet.</p> : (
            <div className="space-y-2.5">
              {byCategory.map(([cat, t]) => (
                <button key={cat} type="button" onClick={() => onPickCategory(cat)} className="w-full text-left space-y-1 group/cat" title="Show these grouped by category">
                  <div className="flex justify-between text-sm gap-3">
                    <span className={cn("truncate group-hover/cat:text-foreground", activeCategory === cat && "text-primary font-medium")}>{getExpenseCategoryLabel(cat)}</span>
                    <span className="font-medium tabular-nums shrink-0">{fmt(t.projected, sym)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/60" style={{ width: `${total > 0 ? (t.projected / total) * 100 : 0}%` }} /></div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Notes</h3>
            <button type="button" onClick={onEditNotes} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">{plan.notes ? "Edit" : "Add notes"}</button>
          </div>
          {plan.notes ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p> : <p className="text-xs text-muted-foreground">Anything to remember about the wedding.</p>}
        </div>
      </div>
    </details>
  );
}
