"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createWeddingExpense, deleteWeddingEvent, updateWeddingEvent } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { budgetStatus, costOf, paymentStatus, sumTotals, tippingExpense, unallocated } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BudgetEdit } from "./budget-edit";
import { BudgetMeter, BUDGET_TONE, budgetCopy } from "./budget-meter";
import { EventDialog } from "./event-form";
import { ExpenseSheet } from "./wedding-expense-sheet";
import { WeddingEvent, WeddingPlan, EVENT_STATUS_CONFIG, fmt, getEventInfo, orderEvents, orderExpenses } from "./wedding-types";

type Filter = "ALL" | "TO_PAY" | "NEEDS_PRICE";
const FILTERS: { value: Filter; label: string }[] = [{ value: "ALL", label: "All" }, { value: "TO_PAY", label: "To pay" }, { value: "NEEDS_PRICE", label: "Needs price" }];
const FILTER_AFTER = 6;

const STATUS_TEXT = {
  UNPAID: { label: "Unpaid", text: "text-muted-foreground" },
  PART_PAID: { label: "Part paid", text: "text-amber-600 dark:text-amber-400" },
  PAID: { label: "Paid", text: "text-emerald-600 dark:text-emerald-400" },
} as const;

/** `eventId` is an event id, or "general" for the whole-wedding bucket. */
export function EventPage({ plan, eventId, baseSymbol: sym }: { plan: WeddingPlan; eventId: string; baseSymbol: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const refresh = () => router.refresh();

  const event: WeddingEvent | null = eventId === "general" ? null : plan.events.find((e) => e.id === eventId) ?? null;
  const events = useMemo(() => orderEvents(plan.events), [plan.events]);
  const allExpenses = useMemo(() => orderExpenses(plan.expenses), [plan.expenses]);
  const rows = useMemo(() => allExpenses.filter((e) => e.eventId === (event?.id ?? null)), [allExpenses, event]);

  const openId = params.get("expense");
  const open = allExpenses.find((e) => e.id === openId) ?? null;
  function setExpenseParam(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("expense", id); else next.delete("expense");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [filter, setFilter] = useState<Filter>("ALL");
  const [editEvent, setEditEvent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const t = sumTotals(rows);
  const budget = event ? event.budgetAllocated : plan.totalBudget > 0 ? Math.max(0, unallocated(plan.totalBudget, plan.events)) : 0;
  const st = budgetStatus(t.projected, budget);
  const tone = BUDGET_TONE[st.state];
  const tip = tippingExpense(rows.map((r) => ({ ...r })), budget);
  const perGuest = event?.guestCount && t.projected > 0 ? Math.round(t.projected / event.guestCount) : 0;

  const shown = filter === "ALL" || rows.length <= FILTER_AFTER ? rows
    : rows.filter((e) => (filter === "TO_PAY" ? paymentStatus(e) !== "PAID" : e.actualAmount === null));

  const title = event ? `${getEventInfo(event.type).emoji} ${event.name}` : "💍 Whole wedding";
  const meta = event ? [
    event.date ? format(new Date(event.date), "EEE, d MMM yyyy") : null,
    event.guestCount ? `${event.guestCount} guests` : null,
    (EVENT_STATUS_CONFIG[event.status] ?? EVENT_STATUS_CONFIG.PLANNED).label,
  ].filter(Boolean).join(" · ") : "Costs that belong to no single event";

  // ── add row ──
  const [name, setName] = useState("");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const parsed = estimate.trim() ? evaluateAmount(estimate) : null;
  const typed = parsed?.ok ? Math.round(parsed.value * 100) : 0;
  const impact = budgetStatus(t.projected + typed, budget);
  const label = event ? event.name : "Whole wedding";

  async function add() {
    if (!name.trim() || busy) return;
    if (parsed && !parsed.ok) { toast.error(parsed.error); return; }
    setBusy(true);
    const r = await createWeddingExpense(plan.id, { name, estimated: parsed?.ok ? parsed.value : 0, eventId: event?.id ?? null });
    setBusy(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return; }
    setName(""); setEstimate("");
    refresh();
    nameRef.current?.focus(); // keep going - brain-dump the next one
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void add(); } };

  // "/" jumps to the add row, unless you're already typing somewhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el?.matches("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      nameRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        <div className="space-y-1.5" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          <div className="flex items-center gap-2">
            <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} placeholder="Add an expense – e.g. Venue, Photographer" aria-label="New expense name" className="flex-1 min-w-0 h-10" />
            <div className="relative w-28 sm:w-36 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{sym}</span>
              <Input value={estimate} onChange={(e) => setEstimate(e.target.value)} onKeyDown={onKey} inputMode="decimal" placeholder="Estimate" aria-label="Estimate" className="pl-8 h-10" />
            </div>
            <Button onClick={add} disabled={!name.trim() || busy} className="h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add</Button>
          </div>
          {focused && typed > 0 && budget > 0 && (
            <p className={cn("text-xs pl-1", BUDGET_TONE[impact.state].text)}>
              {impact.state === "over" ? `Would take ${label} ${fmt(impact.overBy, sym)} over budget` : `Leaves ${fmt(impact.left, sym)} in ${label}`}
            </p>
          )}
        </div>

        {rows.length > FILTER_AFTER && (
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Filter expenses">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}
                className={cn("px-3 h-7 text-xs rounded-md transition-colors", filter === f.value ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{f.label}</button>
            ))}
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState icon={Plus} title="Nothing planned yet" description="Type everything you can imagine above - dresses, venue, DJ, fireworks. Rough estimates are fine; refine them as quotes come in." className="border border-dashed border-border rounded-xl" />
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nothing matches.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {shown.map((e) => {
              const status = STATUS_TEXT[paymentStatus(e)];
              const sub = [e.vendorName, e.quotes.length > 0 ? `${e.quotes.length} quote${e.quotes.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
              const tipping = tip?.id === e.id;
              return (
                <button key={e.id} type="button" onClick={() => setExpenseParam(e.id)} className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate flex items-center gap-2">
                      {e.name}
                      {tipping && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" title={`Takes ${label} ${fmt(tip.overBy, sym)} over budget`} />}
                    </p>
                    {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium tabular-nums">{e.actualAmount === null && <span className="text-xs font-normal text-muted-foreground mr-1">est.</span>}{fmt(costOf(e), sym)}</p>
                    <p className={cn("text-xs", status.text)}>{status.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <ExpenseSheet
        expense={open} events={events} expenses={allExpenses} totalBudget={plan.totalBudget} baseSymbol={sym}
        onClose={() => setExpenseParam(null)} onChanged={refresh}
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
