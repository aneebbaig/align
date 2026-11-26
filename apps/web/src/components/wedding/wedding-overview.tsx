"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { AlertOctagon, ArrowRight, Info, Plus, Scale, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateWeddingEvent } from "@/actions/wedding";
import { budgetOfEvents, budgetStatus, groupTotals, sumTotals } from "@/lib/wedding/totals";
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

const TABS = ["expenses", "events", "summary"] as const;
type Tab = (typeof TABS)[number];

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
  const pathname = usePathname();
  const params = useSearchParams();
  const refresh = () => router.refresh();
  const [planDialog, setPlanDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);

  // The tab lives in the URL (?tab=events|summary; none = expenses) so refresh and back keep it.
  const tabParam = params.get("tab");
  const tab: Tab = TABS.find((t) => t === tabParam) ?? "expenses";
  function setTab(next: Tab) {
    const qs = new URLSearchParams(params.toString());
    if (next === "expenses") qs.delete("tab"); else qs.set("tab", next);
    const str = qs.toString();
    router.replace(str ? `${pathname}?${str}` : pathname, { scroll: false });
  }

  const sheet = useExpenseSheet();
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const events = useMemo(() => orderEvents(plan.events), [plan.events]);
  const expenses = useMemo(() => orderExpenses(plan.expenses), [plan.expenses]);
  const totals = sumTotals(expenses);
  const budget = budgetOfEvents(events);
  const status = budgetStatus(totals.projected, budget);
  const tone = BUDGET_TONE[status.state];
  const base = `/wedding/${plan.id}`;
  const open = expenses.find((e) => e.id === sheet.openId) ?? null;

  const cards = events.map((ev) => ({ ev, href: `${base}/${ev.id}`, rows: expenses.filter((e) => e.eventId === ev.id) }));
  const scoped = expenses.filter((e) => (eventFilter === null || e.eventId === eventFilter) && (categoryFilter === null || e.category === categoryFilter));
  const eventFilterName = events.find((e) => e.id === eventFilter)?.name;
  const impactFor = (eventId: string) => {
    const c = cards.find((x) => x.ev.id === eventId);
    return { projected: sumTotals(c?.rows ?? []).projected, budget: c?.ev.budgetAllocated ?? 0, label: c?.ev.name ?? "event" };
  };
  function filterBy(patch: { event?: string | null; category?: string | null }) {
    if (patch.event !== undefined) setEventFilter(patch.event);
    if (patch.category !== undefined) setCategoryFilter(patch.category);
    setTab("expenses");
  }
  async function saveEventBudget(id: string, v: number) {
    const r = await updateWeddingEvent(id, { budgetAllocated: v });
    if (r.success) refresh(); else toast.error(r.error ?? "Failed");
  }

  // ── needs attention ──
  const attention: Attention[] = [];
  for (const c of cards) {
    const st = budgetStatus(sumTotals(c.rows).projected, c.ev.budgetAllocated);
    if (st.state === "over") attention.push({ key: `over-${c.ev.id}`, href: c.href, text: `${c.ev.name} is ${fmt(st.overBy, sym)} over budget`, icon: "over" });
  }
  for (const e of expenses) {
    if (e.quotes.length >= 2 && !e.quotes.some((q) => q.isChosen)) {
      attention.push({ key: `quote-${e.id}`, href: `${base}/${e.eventId}?expense=${e.id}`, text: `Choose a quote for ${e.name}`, icon: "quote" });
    }
  }
  const daysLeft = plan.weddingDate ? differenceInCalendarDays(new Date(plan.weddingDate), new Date()) : null;
  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 60) {
    for (const e of expenses) {
      if (e.actualAmount === null) attention.push({ key: `price-${e.id}`, href: `${base}/${e.eventId}?expense=${e.id}`, text: `${e.name} still has no real price`, icon: "price" });
    }
  }

  const byCategory = [...groupTotals(expenses, (e) => e.category)].sort((a, b) => b[1].projected - a[1].projected);

  return (
    <div className="space-y-6">
      <PlanHeader plan={plan} onEdit={() => setPlanDialog(true)} onChanged={refresh} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* expenses */}
        <TabsContent value="expenses" className="mt-5 space-y-4">
          <ExpenseAddBar planId={plan.id} events={events} sym={sym} onAdded={refresh} impactFor={impactFor} onNoEvents={() => setTab("events")} />
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
        </TabsContent>

        {/* events */}
        <TabsContent value="events" className="mt-5 space-y-3">
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
                const over = budgetStatus(t.projected, c.ev.budgetAllocated).state === "over";
                return (
                  <div key={c.ev.id} className={cn("rounded-xl border bg-card transition-colors hover:border-foreground/20", over ? "border-red-500/50" : "border-border")}>
                    <Link href={c.href} className="block p-4 pb-2 space-y-2" aria-label={`Open ${c.ev.name}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{getEventInfo(c.ev.type).emoji} {c.ev.name}</p>
                          <p className="text-sm text-muted-foreground">{c.ev.date ? format(new Date(c.ev.date), "d MMM yyyy") : "No date"}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                      </div>
                      <BudgetMeter size="xs" shortCopy projected={t.projected} paid={t.paid} budget={c.ev.budgetAllocated} symbol={sym} />
                    </Link>
                    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
                      <button type="button" onClick={() => filterBy({ event: c.ev.id })} className="text-xs text-muted-foreground tabular-nums hover:text-foreground hover:underline underline-offset-2 text-left" title="Show these expenses">
                        {t.count} expense{t.count === 1 ? "" : "s"} · Planned {fmtShort(t.projected, sym)} · Paid {fmtShort(t.paid, sym)}
                      </button>
                      <BudgetEdit valuePaisas={c.ev.budgetAllocated} symbol={sym} label={`Budget for ${c.ev.name}`} onSave={(v) => saveEventBudget(c.ev.id, v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* summary */}
        <TabsContent value="summary" className="mt-5 space-y-8">
          <section className="rounded-xl border border-border bg-card p-6 space-y-3">
            <p className="text-sm text-muted-foreground">Budget {budget > 0 && <span className="tabular-nums">· {fmt(budget, sym)} across {events.length} event{events.length === 1 ? "" : "s"}</span>}</p>
            {budget > 0 ? (
              <p className={cn("text-2xl font-semibold tabular-nums", tone.text)}>{budgetCopy(totals.projected, budget, sym)}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-amber-600 dark:text-amber-400">Give your events a budget on the Events tab to see where you stand.</p>
                <Button size="sm" variant="outline" onClick={() => setTab("events")}>Go to Events</Button>
              </div>
            )}
            <BudgetMeter projected={totals.projected} paid={totals.paid} budget={budget} symbol={sym} size="md" />
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
              {[
                { k: "Planned", v: fmt(totals.projected, sym), tip: "Each expense counts at its actual price when you've entered one, otherwise at its estimate." },
                { k: "Paid", v: fmt(totals.paid, sym), tip: "Money already handed over, deposits included." },
                { k: "To pay", v: fmt(totals.outstanding, sym), tip: "Planned cost still to be paid." },
                { k: "Left in budget", v: budget > 0 ? (budget >= totals.projected ? fmt(status.left, sym) : `${fmt(status.overBy, sym)} over`) : "-", tip: "Budget (the sum of your event budgets) minus Planned." },
              ].map((x) => (
                <div key={x.k} title={x.tip}>
                  <dt className="text-xs text-muted-foreground flex items-center gap-1">{x.k}<Info className="h-3 w-3 opacity-50" /></dt>
                  <dd className={cn("text-base font-semibold", x.k === "Left in budget" && budget > 0 && tone.text)}>{x.v}</dd>
                </div>
              ))}
            </dl>
            {plan.haqMehr ? (
              <p className="text-sm text-muted-foreground">Haq Mehr {fmt(plan.haqMehr, sym)}{plan.haqMehrNote ? ` · ${plan.haqMehrNote}` : ""} – kept separate</p>
            ) : null}
          </section>

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

          {expenses.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Spending by category</h2>
              <div className="space-y-3">
                {byCategory.map(([cat, t]) => (
                  <button key={cat} type="button" onClick={() => filterBy({ category: cat })} title="Show these expenses"
                    className="block w-full text-left space-y-1 rounded-md -mx-2 px-2 py-1 hover:bg-muted/50">
                    <div className="flex justify-between text-sm gap-3">
                      <span className="truncate">{getExpenseCategoryLabel(cat)}</span>
                      <span className="font-medium tabular-nums shrink-0">{fmt(t.projected, sym)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary/60" style={{ width: `${totals.projected > 0 ? (t.projected / totals.projected) * 100 : 0}%` }} /></div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            {plan.notes ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{plan.notes}</p>
                <button type="button" onClick={() => setPlanDialog(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Edit</button>
              </div>
            ) : (
              <button type="button" onClick={() => setPlanDialog(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Add notes</button>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <ExpenseSheet
        expense={open} events={events} expenses={expenses} baseSymbol={sym}
        initialSection={sheet.section} onClose={sheet.close} onChanged={refresh}
      />
      <PlanDialog open={planDialog} onOpenChange={setPlanDialog} plan={plan} baseSymbol={sym} onDone={refresh} />
      <EventDialog open={eventDialog} onOpenChange={setEventDialog} weddingPlanId={plan.id} baseSymbol={sym} onDone={refresh} />
    </div>
  );
}
