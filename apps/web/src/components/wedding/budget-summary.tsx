"use client";

import { Info } from "lucide-react";
import { toast } from "sonner";
import { InlineAmount } from "@/components/shared/inline-fields";
import { updateWeddingEvent, updateWeddingPlan } from "@/actions/wedding";
import { allocatedTotal, budgetStatus, sumTotals, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { WeddingPlan, fmt } from "./wedding-types";

export const ALL = "ALL";
export const GENERAL_FOCUS = "GENERAL";

/** The headline numbers. They follow the focus: whole wedding, one event, or the whole-wedding bucket. */
export function BudgetSummary({ plan, focus, baseSymbol: sym, onChanged }: { plan: WeddingPlan; focus: string; baseSymbol: string; onChanged: () => void }) {
  const event = plan.events.find((e) => e.id === focus) ?? null;
  const rows = focus === ALL ? plan.expenses : focus === GENERAL_FOCUS ? plan.expenses.filter((e) => e.eventId === null) : plan.expenses.filter((e) => e.eventId === focus);
  const t = sumTotals(rows);

  const allocated = allocatedTotal(plan.events);
  const left = unallocated(plan.totalBudget, plan.events);
  const budget = focus === ALL ? plan.totalBudget : event ? event.budgetAllocated : plan.totalBudget > 0 ? Math.max(0, left) : 0;
  const label = focus === ALL ? "Wedding budget" : event ? `${event.name} budget` : "Unallocated budget";
  const editable = focus === ALL || !!event;
  const st = budgetStatus(t.projected, budget);
  const tone = BUDGET_TONE[st.state];

  async function saveBudget(v: number | null) {
    const r = focus === ALL
      ? await updateWeddingPlan(plan.id, { totalBudget: v ?? 0 })
      : await updateWeddingEvent(focus, { budgetAllocated: v ?? 0 });
    if (r.success) onChanged(); else toast.error(r.error ?? "Failed");
  }

  const perGuest = event?.guestCount && t.projected > 0 ? Math.round(t.projected / event.guestCount) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-border rounded-xl overflow-hidden border border-border">
      <div className="col-span-2 bg-card px-5 py-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{label}</p>
          {editable && <div className="w-32"><InlineAmount variant="bare" label={label} symbol={sym} valuePaisas={budget || null} optional onSave={saveBudget} /></div>}
        </div>
        <p className={cn("text-2xl font-bold tabular-nums", tone.text)}>
          {budget > 0 ? budgetCopy(t.projected, budget, sym) : fmt(t.projected, sym)}
        </p>
        {budget > 0 ? <BudgetMeter projected={t.projected} paid={t.paid} budget={budget} symbol={sym} size="md" /> : (
          <p className="text-xs text-amber-600 dark:text-amber-400">{editable ? "Set a budget above to see where you stand." : "No total budget set, or all of it is given to events."}</p>
        )}
        <p className="text-xs text-muted-foreground tabular-nums flex items-center gap-1" title={`Estimates alone: ${fmt(t.estimated, sym)}`}>
          {fmt(t.projected, sym)} planned{budget > 0 ? ` of ${fmt(budget, sym)}` : ""}
          {perGuest > 0 && ` · ≈ ${fmt(perGuest, sym)} per guest`}
          <span title="Planned uses the real price where you've entered one, otherwise the estimate." className="cursor-help"><Info className="h-3 w-3" /></span>
        </p>
      </div>
      <div className="bg-card px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Paid</p>
        <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(t.paid, sym)}</p>
        <p className="text-xs text-muted-foreground">so far</p>
      </div>
      <div className="bg-card px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">To pay</p>
        <p className="text-lg font-bold tabular-nums">{fmt(t.outstanding, sym)}</p>
        <p className="text-xs text-muted-foreground">still owed</p>
      </div>
      <div className="bg-card px-4 py-4 col-span-2 sm:col-span-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Priced</p>
        <p className="text-lg font-bold tabular-nums">{t.priced} of {t.count}</p>
        <p className="text-xs text-muted-foreground">with a real price</p>
      </div>

      {focus === ALL && plan.totalBudget > 0 && allocated > plan.totalBudget && (
        <p className="col-span-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs px-5 py-2">
          Event budgets add up to {fmt(allocated - plan.totalBudget, sym)} more than your total budget.
        </p>
      )}
      {focus === ALL && plan.haqMehr ? (
        <p className="col-span-full bg-card px-5 py-2.5 text-xs text-muted-foreground">
          Haq Mehr <span className="font-medium text-pink-600 dark:text-pink-400">{fmt(plan.haqMehr, sym)}</span>{plan.haqMehrNote ? ` · ${plan.haqMehrNote}` : ""} - kept separate from the expenses
        </p>
      ) : null}
    </div>
  );
}
