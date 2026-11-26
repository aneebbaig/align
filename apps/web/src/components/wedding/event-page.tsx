"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteWeddingEvent, updateWeddingEvent } from "@/actions/wedding";
import { budgetStatus, sumTotals, tippingExpense, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetEdit } from "./budget-edit";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { EventDialog } from "./event-form";
import { ExpenseAddBar } from "./expense-add-bar";
import { ExpenseList } from "./expense-list";
import { ExpenseSheet } from "./wedding-expense-sheet";
import { useExpenseSheet } from "./use-expense-sheet";
import { WeddingEvent, WeddingPlan, EVENT_STATUS_CONFIG, fmt, getEventInfo, orderEvents, orderExpenses } from "./wedding-types";

/** `eventId` is an event id, or "general" for the whole-wedding bucket. */
export function EventPage({ plan, eventId, baseSymbol: sym }: { plan: WeddingPlan; eventId: string; baseSymbol: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const event: WeddingEvent | null = eventId === "general" ? null : plan.events.find((e) => e.id === eventId) ?? null;
  const events = useMemo(() => orderEvents(plan.events), [plan.events]);
  const allExpenses = useMemo(() => orderExpenses(plan.expenses), [plan.expenses]);
  const rows = useMemo(() => allExpenses.filter((e) => e.eventId === (event?.id ?? null)), [allExpenses, event]);

  const sheet = useExpenseSheet();
  const open = allExpenses.find((e) => e.id === sheet.openId) ?? null;

  const [editEvent, setEditEvent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const t = sumTotals(rows);
  const budget = event ? event.budgetAllocated : plan.totalBudget > 0 ? Math.max(0, unallocated(plan.totalBudget, plan.events)) : 0;
  const st = budgetStatus(t.projected, budget);
  const tone = BUDGET_TONE[st.state];
  const tip = tippingExpense(rows.map((r) => ({ ...r })), budget);
  const perGuest = event?.guestCount && t.projected > 0 ? Math.round(t.projected / event.guestCount) : 0;

  const title = event ? `${getEventInfo(event.type).emoji} ${event.name}` : "💍 Whole wedding";
  const meta = event ? [
    event.date ? format(new Date(event.date), "EEE, d MMM yyyy") : null,
    event.guestCount ? `${event.guestCount} guests` : null,
    (EVENT_STATUS_CONFIG[event.status] ?? EVENT_STATUS_CONFIG.PLANNED).label,
  ].filter(Boolean).join(" · ") : "Costs that belong to no single event";

  const label = event ? event.name : "Whole wedding";

  async function saveBudget(v: number) {
    if (!event) return;
    const r = await updateWeddingEvent(event.id, { budgetAllocated: v });
    if (r.success) refresh(); else toast.error(r.error ?? "Failed");
  }
  async function removeEvent() {
    if (!event) return;
    const r = await deleteWeddingEvent(event.id);
    setConfirmDelete(false);
    if (r.success) {
      toast.success(`Event deleted${rows.length ? ` · ${rows.length} expense${rows.length === 1 ? "" : "s"} moved to Whole wedding` : ""}`);
      router.push(`/wedding/${plan.id}`);
    } else toast.error(r.error ?? "Failed");
  }

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="space-y-3">
        <Link href={`/wedding/${plan.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />{plan.brideName} &amp; {plan.groomName}
        </Link>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{meta}</p>
          </div>
          {event && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditEvent(true)}><Pencil className="h-3.5 w-3.5" />Edit event</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete event</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* budget */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{event ? "Event budget" : "Unallocated budget"}</p>
          {event ? <BudgetEdit valuePaisas={budget} symbol={sym} label="Event budget" onSave={saveBudget} />
            : <p className="text-sm tabular-nums">{budget > 0 ? fmt(budget, sym) : "None"}</p>}
        </div>
        {budget > 0 ? (
          <p className={cn("text-xl font-semibold tabular-nums", tone.text)}>{budgetCopy(t.projected, budget, sym)}</p>
        ) : (
          <p className="text-sm text-amber-600 dark:text-amber-400">{event ? "Set a budget above to see where you stand." : "No total budget set, or all of it is given to events."}</p>
        )}
        <BudgetMeter projected={t.projected} paid={t.paid} budget={budget} symbol={sym} size="md" />
        <p className="text-sm text-muted-foreground tabular-nums">
          Planned {fmt(t.projected, sym)} · Paid {fmt(t.paid, sym)} · To pay {fmt(t.outstanding, sym)}
        </p>
        {perGuest > 0 && <p className="text-sm text-muted-foreground">≈ {fmt(perGuest, sym)} per guest</p>}
      </section>

      {/* add row + list */}
      <section className="space-y-4">
        <ExpenseAddBar
          planId={plan.id} events={events} sym={sym} fixedEventId={event?.id ?? null} onAdded={refresh}
          impactFor={() => ({ projected: t.projected, budget, label })}
        />
        <ExpenseList
          rows={rows} events={events} sym={sym} onChanged={refresh} onOpen={sheet.open}
          tipFor={(e) => (tip?.id === e.id ? { id: e.id, overBy: tip.overBy, label } : null)}
          empty={<EmptyState icon={Plus} title="Nothing planned yet" description="Type everything you can imagine above - dresses, venue, DJ, fireworks. Rough estimates are fine; refine them as quotes come in." className="border border-dashed border-border rounded-xl" />}
        />
      </section>

      <ExpenseSheet
        expense={open} events={events} expenses={allExpenses} totalBudget={plan.totalBudget} baseSymbol={sym}
        initialSection={sheet.section} onClose={sheet.close} onChanged={refresh}
      />
      {event && (
        <>
          <EventDialog
            open={editEvent} onOpenChange={setEditEvent} weddingPlanId={plan.id} event={event} baseSymbol={sym}
            plannedSoFar={{ amount: t.projected, count: t.count }} onDone={refresh}
          />
          <ConfirmDialog
            open={confirmDelete} onOpenChange={setConfirmDelete}
            title={`Delete ${event.name}?`}
            description={`${rows.length} expense(s) in it move to Whole wedding. Nothing else is lost.`}
            onConfirm={removeEvent}
          />
        </>
      )}
    </div>
  );
}
