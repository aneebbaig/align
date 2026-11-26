"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { AlertOctagon, ArrowRight, Info, Plus, Scale, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateWeddingPlan } from "@/actions/wedding";
import { allocatedTotal, budgetStatus, groupTotals, sumTotals, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetEdit } from "./budget-edit";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { EventDialog } from "./event-form";
import { ExpenseAddBar } from "./expense-add-bar";
import { ExpenseList } from "./expense-list";
import { ExpenseSheet } from "./wedding-expense-sheet";
import { useExpenseSheet } from "./use-expense-sheet";
import { PlanDialog } from "./plan-form";
import { PlanHeader } from "./plan-header";
import { StarterEvents } from "./starter-events";
import { WeddingPlan, fmt, fmtShort, getEventInfo, getExpenseCategoryLabel, orderEvents, orderExpenses } from "./wedding-types";

const MAX_ATTENTION = 5;

type Attention = { key: string; href: string; text: string; icon: "over" | "quote" | "price" };
const ATTENTION_ICON = { over: AlertOctagon, quote: Scale, price: Tag } as const;

function ScopeChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 hover:bg-muted/70" aria-label={`Clear ${label} filter`}>
      {label}<X className="h-3 w-3" />
    </button>
  );
}

export function WeddingOverview({ plan, baseSymbol: sym }: { plan: WeddingPlan; baseSymbol: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [planDialog, setPlanDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);

  const sheet = useExpenseSheet();
  const [eventFilter, setEventFilter] = useState<string | null>(null); // event id or "general"
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);

  const events = useMemo(() => orderEvents(plan.events), [plan.events]);
  const expenses = useMemo(() => orderExpenses(plan.expenses), [plan.expenses]);
  const totals = sumTotals(expenses);
  const status = budgetStatus(totals.projected, plan.totalBudget);
  const tone = BUDGET_TONE[status.state];
  const allocated = allocatedTotal(events);
  const left = unallocated(plan.totalBudget, events);
  const base = `/wedding/${plan.id}`;
  const open = expenses.find((e) => e.id === sheet.openId) ?? null;
  const toPlan = Math.max(0, plan.totalBudget - totals.projected);

  async function saveBudget(v: number) {
    const r = await updateWeddingPlan(plan.id, { totalBudget: v });
    if (r.success) refresh(); else toast.error(r.error ?? "Failed");
  }

  const cards = [
    { key: "general", href: `${base}/general`, emoji: "💍", name: "Whole wedding", date: null as Date | null, budget: plan.totalBudget > 0 ? Math.max(0, left) : 0, rows: expenses.filter((e) => e.eventId === null) },
    ...events.map((ev) => ({ key: ev.id, href: `${base}/${ev.id}`, emoji: getEventInfo(ev.type).emoji, name: ev.name, date: ev.date, budget: ev.budgetAllocated, rows: expenses.filter((e) => e.eventId === ev.id) })),
  ];

  const scoped = expenses.filter((e) =>
    (eventFilter === null || (e.eventId ?? "general") === eventFilter) && (categoryFilter === null || e.category === categoryFilter));
  const eventFilterName = cards.find((c) => c.key === eventFilter)?.name;
  const impactFor = (eventId: string | null) => {
    const c = cards.find((x) => x.key === (eventId ?? "general"));
    return { projected: sumTotals(c?.rows ?? []).projected, budget: c?.budget ?? 0, label: c?.name ?? "Whole wedding" };
  };
  function filterBy(patch: { event?: string | null; category?: string | null }) {
    if (patch.event !== undefined) setEventFilter(patch.event);
    if (patch.category !== undefined) setCategoryFilter(patch.category);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

      <ExpenseAddBar planId={plan.id} events={events} sym={sym} onAdded={refresh} impactFor={impactFor} />

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
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
          {[
            { k: "Planned", v: fmt(totals.projected, sym), tip: "Each expense counts at its actual price when you've entered one, otherwise at its estimate." },
            { k: "Paid", v: fmt(totals.paid, sym), tip: "Money already handed over, deposits included." },
            { k: "To pay", v: fmt(totals.outstanding, sym), tip: "Planned cost still to be paid." },
            { k: "Left in budget", v: plan.totalBudget > 0 ? (plan.totalBudget >= totals.projected ? fmt(toPlan, sym) : `${fmt(totals.projected - plan.totalBudget, sym)} over`) : "-", tip: "Budget minus Planned." },
          ].map((x) => (
            <div key={x.k} title={x.tip}>
              <dt className="text-xs text-muted-foreground flex items-center gap-1">{x.k}<Info className="h-3 w-3 opacity-50" /></dt>
              <dd className={cn("text-base font-semibold", x.k === "Left in budget" && plan.totalBudget > 0 && tone.text)}>{x.v}</dd>
            </div>
          ))}
        </dl>
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
              const selected = eventFilter === c.key;
              return (
                <div key={c.key} className={cn("relative rounded-xl border bg-card transition-colors hover:border-foreground/20", selected ? "border-primary ring-1 ring-primary" : "border-border", over && !selected && "ring-1 ring-red-500/50")}>
                  <button type="button" aria-pressed={selected} onClick={() => filterBy({ event: selected ? null : c.key })} className="block w-full text-left p-4 pr-11 space-y-2">
                    <div>
                      <p className="font-medium truncate">{c.emoji} {c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.date ? format(new Date(c.date), "d MMM yyyy") : "No date"}</p>
                    </div>
                    <BudgetMeter size="xs" shortCopy projected={t.projected} paid={t.paid} budget={c.budget} symbol={sym} />
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t.count} expense{t.count === 1 ? "" : "s"} · Planned {fmtShort(t.projected, sym)} · Paid {fmtShort(t.paid, sym)}
                    </p>
                  </button>
                  <Link href={c.href} aria-label={`Open ${c.name}`} title={`Open ${c.name}`} className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
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

      {/* all expenses */}
      <section ref={listRef} className="space-y-3 scroll-mt-4">
        <h2 className="text-lg font-semibold">All expenses</h2>
        <ExpenseList
          rows={scoped} events={events} sym={sym} showEvent groupable onChanged={refresh} onOpen={sheet.open}
          scope={(eventFilter !== null || categoryFilter !== null) ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Showing</span>
              {eventFilter !== null && <ScopeChip label={eventFilterName ?? "Event"} onClear={() => setEventFilter(null)} />}
              {categoryFilter !== null && <ScopeChip label={getExpenseCategoryLabel(categoryFilter)} onClear={() => setCategoryFilter(null)} />}
            </div>
          ) : null}
          empty={<p className="text-sm text-muted-foreground text-center py-6">{expenses.length === 0 ? "Nothing planned yet - add the first expense above." : "No expenses match this event or category."}</p>}
        />
      </section>

      {/* category breakdown + notes */}
      <section className="space-y-4">
        {expenses.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium py-1">Spending by category</summary>
            <div className="space-y-3 mt-3">
              {byCategory.map(([cat, t]) => (
                <button key={cat} type="button" aria-pressed={categoryFilter === cat} onClick={() => filterBy({ category: categoryFilter === cat ? null : cat })}
                  className={cn("block w-full text-left space-y-1 rounded-md -mx-2 px-2 py-1 hover:bg-muted/50", categoryFilter === cat && "bg-muted")}>
                  <div className="flex justify-between text-sm gap-3">
                    <span className="truncate">{getExpenseCategoryLabel(cat)}</span>
                    <span className="font-medium tabular-nums shrink-0">{fmt(t.projected, sym)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/60" style={{ width: `${totals.projected > 0 ? (t.projected / totals.projected) * 100 : 0}%` }} /></div>
                </button>
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

      <ExpenseSheet
        expense={open} events={events} expenses={expenses} totalBudget={plan.totalBudget} baseSymbol={sym}
        initialSection={sheet.section} onClose={sheet.close} onChanged={refresh}
      />
      <PlanDialog open={planDialog} onOpenChange={setPlanDialog} plan={plan} baseSymbol={sym} onDone={refresh} />
      <EventDialog open={eventDialog} onOpenChange={setEventDialog} weddingPlanId={plan.id} baseSymbol={sym} onDone={refresh} />
    </div>
  );
}
