"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { AlertOctagon, Plus, Scale, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateWeddingPlan } from "@/actions/wedding";
import { allocatedTotal, budgetStatus, groupTotals, sumTotals, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetEdit } from "./budget-edit";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { EventDialog } from "./event-form";
import { PlanDialog } from "./plan-form";
import { PlanHeader } from "./plan-header";
import { StarterEvents } from "./starter-events";
import { WeddingPlan, fmt, getEventInfo, getExpenseCategoryLabel, orderEvents, orderExpenses } from "./wedding-types";

const MAX_ATTENTION = 5;

type Attention = { key: string; href: string; text: string; icon: "over" | "quote" | "price" };
const ATTENTION_ICON = { over: AlertOctagon, quote: Scale, price: Tag } as const;

export function WeddingOverview({ plan, baseSymbol: sym }: { plan: WeddingPlan; baseSymbol: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [planDialog, setPlanDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);

  const events = useMemo(() => orderEvents(plan.events), [plan.events]);
  const expenses = useMemo(() => orderExpenses(plan.expenses), [plan.expenses]);
  const totals = sumTotals(expenses);
  const status = budgetStatus(totals.projected, plan.totalBudget);
  const tone = BUDGET_TONE[status.state];
  const allocated = allocatedTotal(events);
  const left = unallocated(plan.totalBudget, events);
  const base = `/wedding/${plan.id}`;

  async function saveBudget(v: number) {
    const r = await updateWeddingPlan(plan.id, { totalBudget: v });
    if (r.success) refresh(); else toast.error(r.error ?? "Failed");
  }

  const cards = [
    { key: "general", href: `${base}/general`, emoji: "💍", name: "Whole wedding", date: null as Date | null, budget: plan.totalBudget > 0 ? Math.max(0, left) : 0, rows: expenses.filter((e) => e.eventId === null) },
    ...events.map((ev) => ({ key: ev.id, href: `${base}/${ev.id}`, emoji: getEventInfo(ev.type).emoji, name: ev.name, date: ev.date, budget: ev.budgetAllocated, rows: expenses.filter((e) => e.eventId === ev.id) })),
  ];

  // ── needs attention ──
  const attention: Attention[] = [];
  for (const c of cards) {
    if (c.key === "general") continue;
    const t = sumTotals(c.rows);
    const st = budgetStatus(t.projected, c.budget);
    if (st.state === "over") attention.push({ key: `over-${c.key}`, href: c.href, text: `${c.name} is ${fmt(st.overBy, sym)} over budget`, icon: "over" });
  }
  const pageOf = (eventId: string | null) => `${base}/${eventId ?? "general"}`;
  for (const e of expenses) {
    if (e.quotes.length >= 2 && !e.quotes.some((q) => q.isChosen)) {
      attention.push({ key: `quote-${e.id}`, href: `${pageOf(e.eventId)}?expense=${e.id}`, text: `Choose a quote for ${e.name}`, icon: "quote" });
    }
  }
  const daysLeft = plan.weddingDate ? differenceInCalendarDays(new Date(plan.weddingDate), new Date()) : null;
  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 60) {
    for (const e of expenses) {
      if (e.actualAmount === null) attention.push({ key: `price-${e.id}`, href: `${pageOf(e.eventId)}?expense=${e.id}`, text: `${e.name} still has no real price`, icon: "price" });
    }
  }

  const byCategory = [...groupTotals(expenses, (e) => e.category)].sort((a, b) => b[1].projected - a[1].projected);

  return (
    <div className="space-y-8">
      <PlanHeader plan={plan} onEdit={() => setPlanDialog(true)} onChanged={refresh} />

      {/* budget */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Budget</p>
          <BudgetEdit valuePaisas={plan.totalBudget} symbol={sym} label="Wedding budget" onSave={saveBudget} />
        </div>
        {plan.totalBudget > 0 ? (
          <p className={cn("text-2xl font-semibold tabular-nums", tone.text)}>{budgetCopy(totals.projected, plan.totalBudget, sym)}</p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">Set a budget above to see where you stand.</p>
        )}
        <BudgetMeter projected={totals.projected} paid={totals.paid} budget={plan.totalBudget} symbol={sym} size="md" />
        <p className="text-sm text-muted-foreground tabular-nums">
          Planned {fmt(totals.projected, sym)} · Paid {fmt(totals.paid, sym)} · To pay {fmt(totals.outstanding, sym)}
        </p>
        {plan.haqMehr ? (
          <p className="text-sm text-muted-foreground">Haq Mehr {fmt(plan.haqMehr, sym)}{plan.haqMehrNote ? ` · ${plan.haqMehrNote}` : ""} – kept separate</p>
        ) : null}
        {plan.totalBudget > 0 && allocated > plan.totalBudget && (
          <p className="text-sm text-amber-600 dark:text-amber-400">Event budgets add up to {fmt(allocated - plan.totalBudget, sym)} more than your total budget.</p>
        )}
      </section>

      {/* events */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Events</h2>
          <Button variant="ghost" size="sm" onClick={() => setEventDialog(true)}><Plus className="h-4 w-4" />Add event</Button>
        </div>
        {events.length === 0 ? (
          <StarterEvents planId={plan.id} onDone={refresh} onCustom={() => setEventDialog(true)} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {cards.map((c) => {
              const t = sumTotals(c.rows);
              const over = budgetStatus(t.projected, c.budget).state === "over";
              return (
                <Link key={c.key} href={c.href} className={cn("block rounded-xl border border-border bg-card p-4 space-y-2 transition-colors hover:border-foreground/20", over && "ring-1 ring-red-500/50")}>
                  <div>
                    <p className="font-medium truncate">{c.emoji} {c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.date ? format(new Date(c.date), "d MMM yyyy") : "No date"}</p>
                  </div>
                  <BudgetMeter size="xs" shortCopy projected={t.projected} paid={t.paid} budget={c.budget} symbol={sym} />
                  <p className="text-xs text-muted-foreground">{t.count} expense{t.count === 1 ? "" : "s"}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* needs attention */}
      {attention.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <ul className="space-y-2">
            {attention.slice(0, MAX_ATTENTION).map((a) => {
              const Icon = ATTENTION_ICON[a.icon];
              return (
                <li key={a.key}>
                  <Link href={a.href} className="flex items-center gap-2 text-sm hover:underline underline-offset-2">
                    <Icon className={cn("h-4 w-4 shrink-0", a.icon === "over" ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400")} />
                    <span className="truncate">{a.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {attention.length > MAX_ATTENTION && <p className="text-sm text-muted-foreground">and {attention.length - MAX_ATTENTION} more</p>}
        </section>
      )}

      {/* category breakdown + notes */}
      <section className="space-y-4">
        {expenses.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium py-1">Spending by category</summary>
            <div className="space-y-3 mt-3">
              {byCategory.map(([cat, t]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm gap-3">
                    <span className="truncate">{getExpenseCategoryLabel(cat)}</span>
                    <span className="font-medium tabular-nums shrink-0">{fmt(t.projected, sym)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/60" style={{ width: `${totals.projected > 0 ? (t.projected / totals.projected) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </details>
        )}
        {plan.notes ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
            <button type="button" onClick={() => setPlanDialog(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Edit</button>
          </div>
        ) : (
          <button type="button" onClick={() => setPlanDialog(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Add notes</button>
        )}
      </section>

      <PlanDialog open={planDialog} onOpenChange={setPlanDialog} plan={plan} baseSymbol={sym} onDone={refresh} />
      <EventDialog open={eventDialog} onOpenChange={setEventDialog} weddingPlanId={plan.id} baseSymbol={sym} onDone={refresh} />
    </div>
  );
}
