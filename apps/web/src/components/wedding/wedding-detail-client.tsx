"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createWeddingExpense, deleteWeddingEvent, deleteWeddingExpense, updateWeddingExpense } from "@/actions/wedding";
import { evaluateAmount } from "@/lib/amount-expr";
import { allocatedTotal, budgetStatus, costOf, groupTotals, paymentStatus, sumTotals } from "@/lib/wedding/totals";
import { cn } from "@/lib/utils";
import { BUDGET_TONE } from "./budget-meter";
import { ALL, BudgetSummary, GENERAL_FOCUS } from "./budget-summary";
import { EventDialog } from "./event-form";
import { EventPicker, GENERAL } from "./event-picker";
import { EventSection, CategorySection } from "./event-section";
import { EventStrip } from "./event-strip";
import type { SheetSection } from "./expense-row";
import { Insights } from "./insights";
import { PlanDialog } from "./plan-form";
import { PlanHeader } from "./plan-header";
import { ExpenseSheet } from "./wedding-expense-sheet";
import { WeddingEvent, WeddingExpense, WeddingPlan, fmt, getEventInfo, getExpenseCategoryLabel } from "./wedding-types";

type Chip = "ALL" | "UNPAID" | "PART_PAID" | "PAID" | "NEEDS_PRICE" | "QUOTES";
const CHIPS: { value: Chip; label: string }[] = [
  { value: "ALL", label: "All" }, { value: "UNPAID", label: "Unpaid" }, { value: "PART_PAID", label: "Part paid" },
  { value: "PAID", label: "Paid" }, { value: "NEEDS_PRICE", label: "Needs price" }, { value: "QUOTES", label: "Quotes to choose" },
];

const matchesChip = (e: WeddingExpense, chip: Chip) =>
  chip === "ALL" ? true
  : chip === "NEEDS_PRICE" ? e.actualAmount === null
  : chip === "QUOTES" ? e.quotes.length >= 2 && !e.quotes.some((q) => q.isChosen)
  : paymentStatus(e) === chip;

export function WeddingDetailClient({ plan, baseSymbol = "Rs" }: { plan: WeddingPlan; baseSymbol?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const refresh = () => router.refresh();

  // What you're looking at lives in the URL, so Back, refresh and shared links all land in the same place.
  const eventParam = params.get("event");
  const focus = eventParam && (eventParam === GENERAL_FOCUS || plan.events.some((e) => e.id === eventParam)) ? eventParam : ALL;
  const view = params.get("view") === "category" ? "category" : "event";
  const openId = params.get("expense");
  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null) next.delete(k); else next.set(k, v); }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [chip, setChip] = useState<Chip>("ALL");
  const [search, setSearch] = useState("");
  const [sheetSection, setSheetSection] = useState<SheetSection | undefined>();
  const [planDialog, setPlanDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState<{ event: WeddingEvent | null; moveExpenseId?: string | null; forQuickAdd?: boolean } | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<WeddingEvent | null>(null);

  // One order for everything - the row that "tips an event over budget" is judged in exactly this order.
  const expenses = useMemo(
    () => [...plan.expenses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id)),
    [plan.expenses],
  );
  const events = useMemo(() => [...plan.events].sort((a, b) => a.order - b.order || (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0)), [plan.events]);

  const q = search.trim().toLowerCase();
  const filtered = chip !== "ALL" || q !== "";
  const matches = (e: WeddingExpense) =>
    matchesChip(e, chip) && (!q || [e.name, e.vendorName, e.notes].some((t) => t?.toLowerCase().includes(q)));
  const inFocus = (e: WeddingExpense) => focus === ALL || (focus === GENERAL_FOCUS ? e.eventId === null : e.eventId === focus);

  const open = expenses.find((e) => e.id === openId) ?? null;
  const general = Math.max(0, plan.totalBudget > 0 ? plan.totalBudget - allocatedTotal(events) : 0);

  // ── quick add ──
  const [targetOverride, setTargetOverride] = useState<string | null>(null);
  useEffect(() => setTargetOverride(null), [focus]);
  const target = targetOverride ?? (focus === ALL ? GENERAL : focus);
  const targetEvent = events.find((e) => e.id === target) ?? null;
  const targetName = targetEvent ? targetEvent.name : "Whole wedding";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaEstimate, setQaEstimate] = useState("");
  const [qaBusy, setQaBusy] = useState(false);
  const [qaFocused, setQaFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const qaParsed = qaEstimate.trim() ? evaluateAmount(qaEstimate) : null;
  const qaTyped = qaParsed?.ok ? Math.round(qaParsed.value * 100) : 0;
  const targetBudget = targetEvent ? targetEvent.budgetAllocated : general;
  const targetProjected = expenses.filter((e) => (e.eventId ?? GENERAL) === target).reduce((s, e) => s + costOf(e), 0);
  const impact = budgetStatus(targetProjected + qaTyped, targetBudget);

  async function quickAdd() {
    if (!qaName.trim() || qaBusy) return;
    if (qaParsed && !qaParsed.ok) { toast.error(qaParsed.error); return; }
    setQaBusy(true);
    const r = await createWeddingExpense(plan.id, { name: qaName, estimated: qaParsed?.ok ? qaParsed.value : 0, eventId: target === GENERAL ? null : target });
    setQaBusy(false);
    if (!r.success) { toast.error(r.error ?? "Failed"); return; }
    setQaName(""); setQaEstimate("");
    refresh();
    nameRef.current?.focus(); // keep going - brain-dump the next one
  }
  const onQaKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); void quickAdd(); } };

  // "/" jumps to quick add, unless you're already typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el?.matches("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      nameRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── handlers shared by every row ──
  const callbacks = {
    events, allExpenses: expenses, totalBudget: plan.totalBudget, baseSymbol,
    onOpen: (id: string, section?: SheetSection) => { setSheetSection(section); setParams({ expense: id }); },
    onDelete: (id: string) => setDeleteExpenseId(id),
    onChanged: refresh,
    onNewEvent: (expenseId: string | null) => setEventDialog({ event: null, moveExpenseId: expenseId }),
  };

  async function confirmDeleteExpense() {
    if (!deleteExpenseId) return;
    const r = await deleteWeddingExpense(deleteExpenseId);
    if (r.success) toast.success("Expense deleted"); else toast.error(r.error ?? "Failed");
    setDeleteExpenseId(null);
    if (openId === deleteExpenseId) setParams({ expense: null });
    refresh();
  }
  async function confirmDeleteEvent() {
    if (!deleteEvent) return;
    const moved = expenses.filter((e) => e.eventId === deleteEvent.id).length;
    const r = await deleteWeddingEvent(deleteEvent.id);
    if (r.success) {
      toast.success(`Event deleted${moved ? ` · ${moved} expense${moved === 1 ? "" : "s"} moved to Whole wedding` : ""}`);
      if (focus === deleteEvent.id) setParams({ event: null });
    } else toast.error(r.error ?? "Failed");
    setDeleteEvent(null);
    refresh();
  }
  async function onEventSaved(createdId?: string) {
    const ctx = eventDialog;
    if (createdId && ctx?.moveExpenseId) {
      const r = await updateWeddingExpense(ctx.moveExpenseId, { eventId: createdId });
      if (!r.success) toast.error(r.error ?? "Couldn't move the expense");
    }
    if (createdId && ctx?.forQuickAdd) setTargetOverride(createdId);
    refresh();
  }

  // ── sections ──
  const sectionDefs: { event: WeddingEvent | null }[] = [
    ...(focus === ALL || focus === GENERAL_FOCUS ? [{ event: null }] : []),
    ...events.filter((e) => focus === ALL || focus === e.id).map((event) => ({ event })),
  ];
  const rowsOf = (ev: WeddingEvent | null) => expenses.filter((e) => e.eventId === (ev?.id ?? null));

  const byCategory = [...groupTotals(expenses.filter((e) => inFocus(e) && matches(e)), (e) => e.category)].sort((a, b) => b[1].projected - a[1].projected);
  const counts = (c: Chip) => expenses.filter((e) => inFocus(e) && matchesChip(e, c)).length;

  function pickCategory() {
    setParams({ view: "category" });
    setTimeout(() => document.getElementById("board")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <div className="space-y-5">
      <PlanHeader plan={plan} baseSymbol={baseSymbol} onEdit={() => setPlanDialog(true)} onChanged={refresh} />

      <BudgetSummary plan={plan} focus={focus} baseSymbol={baseSymbol} onChanged={refresh} />

      <EventStrip
        plan={plan} focus={focus} baseSymbol={baseSymbol}
        onFocus={(f) => setParams({ event: f === ALL ? null : f })}
        onEdit={(ev) => setEventDialog({ event: ev })}
        onAdd={() => setEventDialog({ event: null })}
        onChanged={refresh}
      />

      {/* board toolbar */}
      <div id="board" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Group expenses by">
            {([["event", "By event"], ["category", "By category"]] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setParams({ view: v === "event" ? null : v })}
                className={cn("px-3 h-7 text-xs rounded-md transition-colors", view === v ? "bg-card shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses" aria-label="Search expenses" className="h-8 w-48 pl-8 text-sm" />
          </div>
        </div>
        {expenses.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {CHIPS.map((c) => (
              <button key={c.value} type="button" aria-pressed={chip === c.value} onClick={() => setChip(c.value)}
                className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors", chip === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground")}>
                {c.label}{c.value !== "ALL" && <span className="ml-1 opacity-70">{counts(c.value)}</span>}
              </button>
            ))}
          </div>
        )}

        {/* quick add: the event is always explicit */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-1.5" onFocus={() => setQaFocused(true)} onBlur={() => setQaFocused(false)}>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <EventPicker
              open={pickerOpen} onOpenChange={setPickerOpen}
              events={events} expenses={expenses} totalBudget={plan.totalBudget} symbol={baseSymbol}
              currentValue={target} cost={qaTyped} adding
              onPick={(v) => setTargetOverride(v)} onNewEvent={() => setEventDialog({ event: null, forQuickAdd: true })}
            >
              <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" title="Which event this expense is for">
                {targetEvent ? getEventInfo(targetEvent.type).emoji : "💍"} <span className="max-w-[8rem] truncate">{targetName}</span><ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </EventPicker>
            <Input ref={nameRef} value={qaName} onChange={(e) => setQaName(e.target.value)} onKeyDown={onQaKey} placeholder="Add an expense - Bridal dress, DJ, Fireworks…  (press / to jump here)" aria-label="New expense name" className="flex-1 min-w-[10rem] h-9" />
            <div className="relative w-36 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{baseSymbol}</span>
              <Input value={qaEstimate} onChange={(e) => setQaEstimate(e.target.value)} onKeyDown={onQaKey} inputMode="decimal" placeholder="Estimate" aria-label="Estimate" className="pl-8 h-9" />
            </div>
            <Button onClick={quickAdd} disabled={!qaName.trim() || qaBusy} className="h-9">{qaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add</Button>
          </div>
          {qaFocused && qaTyped > 0 && targetBudget > 0 && (
            <p className={cn("text-xs pl-1", BUDGET_TONE[impact.state].text)}>
              {impact.state === "over" ? `Would take ${targetName} ${fmt(impact.overBy, baseSymbol)} over budget` : `Leaves ${fmt(impact.left, baseSymbol)} in ${targetName}`}
            </p>
          )}
        </div>
      </div>

      {/* board */}
      {expenses.length === 0 ? (
        <EmptyState icon={Plus} title="Nothing planned yet" description="Type everything you can imagine above - dresses, venue, DJ, fireworks. Rough estimates are fine; refine them as quotes come in." className="border border-dashed border-border rounded-xl" />
      ) : view === "event" ? (
        <div className="space-y-4">
          {focus !== ALL && (
            <button type="button" onClick={() => setParams({ event: null })} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">Show all events</button>
          )}
          {sectionDefs.map(({ event }) => {
            const all = rowsOf(event);
            return (
              <EventSection
                key={event?.id ?? "GENERAL"} planId={plan.id} event={event}
                allRows={all} rows={all.filter(matches)} generalBudget={general} filtered={filtered}
                onEditEvent={(ev) => setEventDialog({ event: ev })} onDeleteEvent={setDeleteEvent}
                {...callbacks}
              />
            );
          })}
        </div>
      ) : byCategory.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nothing matches.</p>
      ) : (
        <div className="space-y-4">
          {byCategory.map(([cat]) => (
            <CategorySection key={cat} title={getExpenseCategoryLabel(cat)} rows={expenses.filter((e) => e.category === cat && inFocus(e) && matches(e))} {...callbacks} />
          ))}
        </div>
      )}

      <Insights plan={plan} baseSymbol={baseSymbol} activeCategory={null} onPickCategory={pickCategory} onEditNotes={() => setPlanDialog(true)} />

      {/* mounted once, controlled from here */}
      <ExpenseSheet
        expense={open} events={events} expenses={expenses} totalBudget={plan.totalBudget} baseSymbol={baseSymbol}
        initialSection={sheetSection} onClose={() => { setSheetSection(undefined); setParams({ expense: null }); }} onChanged={refresh}
      />
      <PlanDialog open={planDialog} onOpenChange={setPlanDialog} plan={plan} baseSymbol={baseSymbol} onDone={refresh} />
      <EventDialog
        open={!!eventDialog} onOpenChange={(o) => !o && setEventDialog(null)} weddingPlanId={plan.id} event={eventDialog?.event} baseSymbol={baseSymbol}
        plannedSoFar={eventDialog?.event ? (() => { const t = sumTotals(rowsOf(eventDialog.event)); return { amount: t.projected, count: t.count }; })() : undefined}
        onDone={onEventSaved}
      />
      <ConfirmDialog open={!!deleteExpenseId} onOpenChange={(o) => !o && setDeleteExpenseId(null)} title="Delete this expense?" description="Its quotes go with it. This can't be undone." onConfirm={confirmDeleteExpense} />
      <ConfirmDialog
        open={!!deleteEvent} onOpenChange={(o) => !o && setDeleteEvent(null)}
        title={`Delete ${deleteEvent?.name ?? "this event"}?`}
        description={`${deleteEvent ? expenses.filter((e) => e.eventId === deleteEvent.id).length : 0} expense(s) in it move to Whole wedding. Nothing else is lost.`}
        onConfirm={confirmDeleteEvent}
      />
    </div>
  );
}
